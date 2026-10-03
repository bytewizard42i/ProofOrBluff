/**
 * cli/src/contract.js — v8 SDK Node mirror of the browser contract.js.
 *
 * Wires up the realDeal Compact contract bindings with the v8 wallet
 * stack: WalletFacade -> custom WalletProvider/MidnightProvider ->
 * midnight-js providers -> deployContract / findDeployedContract.
 *
 * Provider construction follows the canonical pattern in
 * midnightntwrk/example-counter/counter-cli/src/api.ts, including the
 * `signTransactionIntents` workaround for a wallet SDK bug where
 * `signRecipe` hardcodes 'pre-proof' but proven intents need 'proof'.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Buffer } from 'buffer';
import * as Rx from 'rxjs';

import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  deployContract,
  findDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from
  '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from
  '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from
  '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from
  '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';

import * as state from './state.js';
import { readPublicMatch } from '../../shared/publicMatch.js';

// ---------------------------------------------------------------------------
// Bindings loader

async function loadContractModule(managedDir) {
  const indexJs = path.resolve(managedDir, 'contract', 'index.js');
  const url = pathToFileURL(indexJs).href;
  return import(url);
}

// ---------------------------------------------------------------------------
// Helpers

function setNetwork(networkId) {
  setNetworkId(networkId);
}

// ---------------------------------------------------------------------------
// Resilient submit (pattern from eddalabs/midnight-starter-template
// counter-cli/src/resilient-submit.ts, Aug 2026).
//
// On public networks a transaction's DUST fee proof can be rejected with
// `1010: Invalid Transaction: Custom error: 170` (InvalidDustSpendProof) when
// it was balanced against a DUST state the chain already advanced past (stale
// wallet checkpoint, or indexer a step behind the node). Resubmitting the SAME
// finalized tx can never clear a 170 — the stale proof is baked in. The only
// fix is to REBUILD the transaction so it re-balances DUST and re-proves.
// Hence this retries the *builder* (deployContract / callTx.x), never a bare
// submit. Anything that is not a transient dust/socket failure is re-thrown
// at once so real contract assertion failures are never masked.

function flattenErrorText(error) {
  let text = '';
  let current = error;
  while (current) {
    text += ` ${String(current.message ?? current)}`;
    current = current.cause;
  }
  return text;
}

export async function withDustRetry(label, build, { attempts = 5, backoffMs = 2_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await build();
    } catch (error) {
      lastError = error;
      const text = flattenErrorText(error);
      const staleDust = /\b170\b/.test(text) || /balance dust|InsufficientFunds/i.test(text);
      const socketDrop = /Normal Closure|disconnected/i.test(text);
      if (attempt < attempts && (staleDust || socketDrop)) {
        // eslint-disable-next-line no-console
        console.warn(`[${label}] attempt ${attempt}/${attempts} failed (${staleDust ? 'stale DUST fee proof — rebuilding' : 'socket drop — retrying'})`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

function randomBytes32() {
  const out = new Uint8Array(32);
  globalThis.crypto.getRandomValues(out);
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${clean.length}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function emptyWitnessSlot() {
  return { rank: 0n, salt: new Uint8Array(32) };
}

function buildPlayReveal(cards) {
  if (cards.length < 1 || cards.length > 4) {
    throw new Error('Play must declare 1-4 cards');
  }
  const slots = [0, 1, 2, 3].map((i) => {
    if (i < cards.length) {
      return { rank: BigInt(cards[i]), salt: randomBytes32() };
    }
    return emptyWitnessSlot();
  });
  return {
    count: BigInt(cards.length),
    rank0: slots[0].rank, salt0: slots[0].salt,
    rank1: slots[1].rank, salt1: slots[1].salt,
    rank2: slots[2].rank, salt2: slots[2].salt,
    rank3: slots[3].rank, salt3: slots[3].salt,
  };
}

function dumpReveal(reveal) {
  return {
    count: reveal.count.toString(),
    rank0: reveal.rank0.toString(), salt0: bytesToHex(reveal.salt0),
    rank1: reveal.rank1.toString(), salt1: bytesToHex(reveal.salt1),
    rank2: reveal.rank2.toString(), salt2: bytesToHex(reveal.salt2),
    rank3: reveal.rank3.toString(), salt3: bytesToHex(reveal.salt3),
  };
}

function rehydrateReveal(j) {
  return {
    count: BigInt(j.count),
    rank0: BigInt(j.rank0), salt0: hexToBytes(j.salt0),
    rank1: BigInt(j.rank1), salt1: hexToBytes(j.salt1),
    rank2: BigInt(j.rank2), salt2: hexToBytes(j.salt2),
    rank3: BigInt(j.rank3), salt3: hexToBytes(j.salt3),
  };
}

// ---------------------------------------------------------------------------
// signTransactionIntents — wallet SDK workaround
//
// signRecipe in @midnight-ntwrk/wallet-sdk-facade hardcodes 'pre-proof'
// when cloning intents, which fails on already-proven UnboundTransaction
// intents that carry 'proof' data. We sign manually with the correct
// proof markers (per the example-counter v2.1.1 workaround).

function signTransactionIntents(tx, signFn, proofMarker) {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;

    const cloned = ledger.Intent.deserialize(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );

    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);

    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_input, i) =>
          cloned.fallibleUnshieldedOffer.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer =
        cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_input, i) =>
          cloned.guaranteedUnshieldedOffer.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer =
        cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }

    tx.intents.set(segment, cloned);
  }
}

// ---------------------------------------------------------------------------
// WalletProvider + MidnightProvider bridge

async function createWalletAndMidnightProvider(walletCtx) {
  const synced = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced))
  );
  return {
    getCoinPublicKey() {
      return synced.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return synced.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: walletCtx.shieldedSecretKeys,
          dustSecretKey: walletCtx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload) =>
        walletCtx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return walletCtx.wallet.submitTransaction(tx);
    },
  };
}

// ---------------------------------------------------------------------------
// Public factory

export async function getContractApi({
  walletHandle,
  endpoints,
  networkId,
  managedDir,
  variant = 'wagered',
  // Deploying is an explicit, intentional act. Only createMatch-style entry
  // points may pass true; everything else must find an existing address or
  // fail loudly. (In Aug 2026 a challenge command run in a fresh state
  // namespace silently deployed an empty contract and then couldn't find the
  // match — this flag prevents that whole class of accident.)
  allowDeploy = false,
}) {
  setNetwork(networkId);

  const walletCtx = walletHandle.ctx;
  if (!walletCtx) {
    throw new Error(
      'walletHandle.ctx missing — caller must build via buildWalletFromSeed.'
    );
  }

  const { Contract, pureCircuits, ledger: decodeContractLedger } = await loadContractModule(managedDir);

  // Witness staging. Each value is set immediately before the circuit call
  // that needs it and cleared afterwards, so a stale witness can never leak
  // into an unrelated transaction.
  let pendingReveal = null;
  // Provably fair edition only: the private material playCards proves against.
  let stagedPlay = null;
  let stagedHandSalt = null;
  let stagedSeed = null;
  let stagedHandCounts = null;
  const requireStaged = (value, name) => {
    if (value == null) throw new Error(`${name} witness requested with nothing staged.`);
    return value;
  };
  const witnesses = {
    revealLastPlay(context) {
      return [context.privateState, requireStaged(pendingReveal, 'revealLastPlay')];
    },
    nextPlay(context) {
      return [context.privateState, requireStaged(stagedPlay, 'nextPlay')];
    },
    handSalt(context) {
      return [context.privateState, requireStaged(stagedHandSalt, 'handSalt')];
    },
    sharedSeed(context) {
      return [context.privateState, requireStaged(stagedSeed, 'sharedSeed')];
    },
    currentHandCounts(context) {
      return [context.privateState, requireStaged(stagedHandCounts, 'currentHandCounts')];
    },
  };

  // The v8 midnight-js requires a CompiledContract wrapper around the
  // raw Contract class — see example-counter v2.1.1 for the canonical
  // pattern. We attach our witnesses and point at the managed/ dir for
  // ZK assets (zkir + prover/verifier keys).
  const compiledContract = CompiledContract.make(
    variant === 'state-only' ? 'proof-or-bluff-mainnet' : 'proof-or-bluff', Contract
  ).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(managedDir),
  );

  // Build providers
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletCtx);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  // The old local-only password was derived from a PUBLIC key. That provides
  // no secrecy. Public networks require a private operator-chosen password.
  // Keep the old fallback only for disposable undeployed test wallets so
  // historical local LevelDB state remains readable.
  const storagePassword = networkId === 'undeployed'
    ? process.env.POB_PRIVATE_STATE_PASSWORD || `${Buffer.from(accountId, 'hex').toString('base64')}!pob`
    : process.env.POB_PRIVATE_STATE_PASSWORD;
  if (!storagePassword || storagePassword.length < 16) {
    throw new Error('Set POB_PRIVATE_STATE_PASSWORD (at least 16 characters) before connecting to a public network.');
  }

  const zkConfigProvider = new NodeZkConfigProvider(managedDir);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'pob-realdeal',
      privateStateStorePath: state.privateStateDir(networkId, variant),
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(
      endpoints.indexer,
      endpoints.indexerWs,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(endpoints.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };

  const persisted = state.getContractAddress(networkId, variant);
  if (!persisted && !allowDeploy) {
    throw new Error(
      `No contract address stored for network "${networkId}" in state dir `
      + `${state.stateRoot()}. Run \`pob-cli create-match\` (which deploys), or `
      + `import a known address with \`pob-cli set-address --address <hex>\`.`
    );
  }

  let deployed;
  if (persisted) {
    deployed = await findDeployedContract(providers, {
      contractAddress: persisted,
      compiledContract,
      privateStateId: 'pob:realdeal:private',
      initialPrivateState: {},
    });
  } else {
    deployed = await withDustRetry('deploy', () => deployContract(providers, {
      compiledContract,
      privateStateId: 'pob:realdeal:private',
      initialPrivateState: {},
    }));
    state.setContractAddress(
      networkId,
      deployed.deployTxData.public.contractAddress,
      variant,
    );
  }

  const tx = deployed.callTx;
  // Every circuit call goes through the rebuild-on-170 wrapper. Witness
  // staging happens before the call and is cleared in the callers' finally
  // blocks, so a rebuilt attempt sees the same private inputs.
  const ensure = (name) => {
    const fn = tx[name];
    if (!fn) throw new Error(`Circuit "${name}" not callable.`);
    return (...args) => withDustRetry(name, () => fn(...args));
  };
  // Result-shape extraction helpers — v8 SDK changed several field
  // names (txHash → txId, etc.). These tolerate both shapes so we
  // don't crash if the SDK pin shifts again under us.
  const extractTxId = (r) =>
    r?.public?.txId ?? r?.public?.txHash ?? r?.public?.transactionId ?? null;
  const extractResult = (r) =>
    r?.public?.result ?? r?.public?.callResult?.result ?? r?.private?.result ?? r?.result ?? null;
  const nowSec = () => BigInt(Math.floor(Date.now() / 1000));
  // The contract's ShieldedCoinInfo.color is a Bytes<32>. ledger-v8's
  // nativeToken().raw returns the hex *string* used as a balance-map
  // key; we convert to bytes for the on-chain payload.
  const nativeColorBytes = hexToBytes(ledger.nativeToken().raw);
  const nativeCoin = (value) => ({
    nonce: randomBytes32(),
    color: nativeColorBytes,
    value: BigInt(value),
  });

  return {
    address: deployed.deployTxData?.public?.contractAddress
      || state.getContractAddress(networkId, variant),

    async createMatch({ mode, wagerAmount }) {
      const entropy = randomBytes32();
      const entropyHex = bytesToHex(entropy);
      const commit = pureCircuits.commitEntropy(entropy);
      // The hand salt is generated here, before the opponent's entropy exists,
      // which is exactly what makes grinding for a good hand impossible.
      const handSalt = variant === 'state-only' ? randomBytes32() : null;
      const result = variant === 'state-only'
        ? await ensure('createMatch')(BigInt(mode), commit, pureCircuits.commitHandSalt(handSalt), nowSec())
        : await ensure('createMatch')(
          BigInt(mode), BigInt(wagerAmount), commit, nowSec(), nativeCoin(wagerAmount)
        );
      if (process.env.POB_DEBUG_RESULT) {
        // eslint-disable-next-line no-console
        console.log('[debug] createMatch result keys:', Object.keys(result || {}));
        // eslint-disable-next-line no-console
        console.log('[debug] result.public keys:', Object.keys(result?.public || {}));
        // eslint-disable-next-line no-console
        console.log('[debug] result:', JSON.stringify(result, (_k, v) =>
          typeof v === 'bigint' ? v.toString() + 'n'
          : v instanceof Uint8Array ? '0x' + Array.from(v).map(b => b.toString(16).padStart(2, '0')).join('')
          : v, 2).slice(0, 4000));
      }
      const matchIdBytes =
        result?.public?.result
          ?? result?.public?.callResult?.result
          ?? result?.private?.result
          ?? result?.result;
      const txId =
        result?.public?.txId
          ?? result?.public?.txHash
          ?? result?.public?.transactionId
          ?? null;
      const matchId = matchIdBytes ? bytesToHex(matchIdBytes) : null;
      if (matchId) state.persistEntropy(matchId, 'p1', entropyHex);
      if (matchId && handSalt) state.persistHandSalt(matchId, 'p1', bytesToHex(handSalt));
      return { matchId, entropy: entropyHex, txId };
    },

    async joinMatch({ matchId, wagerAmount }) {
      const entropy = randomBytes32();
      const entropyHex = bytesToHex(entropy);
      const commit = pureCircuits.commitEntropy(entropy);
      const handSalt = variant === 'state-only' ? randomBytes32() : null;
      const result = variant === 'state-only'
        ? await ensure('joinMatch')(hexToBytes(matchId), commit, pureCircuits.commitHandSalt(handSalt))
        : await ensure('joinMatch')(
          hexToBytes(matchId), commit, nativeCoin(wagerAmount)
        );
      state.persistEntropy(matchId, 'p2', entropyHex);
      if (handSalt) state.persistHandSalt(matchId, 'p2', bytesToHex(handSalt));
      return { entropy: entropyHex, txId: extractTxId(result) };
    },

    importEntropy(matchId, role, entropyHex) {
      if (!/^(0x)?[0-9a-fA-F]{64}$/.test(entropyHex)) {
        throw new Error('Entropy must be a 32-byte hex string');
      }
      state.persistEntropy(matchId, role, entropyHex.replace(/^0x/, ''));
    },

    getPrivateDealSeed(matchId) {
      if (variant !== 'state-only') throw new Error('Private seed is only used by the state-only contract.');
      const p1 = state.getEntropy(matchId, 'p1');
      const p2 = state.getEntropy(matchId, 'p2');
      if (!p1 || !p2) throw new Error('Both entropy values are needed to reconstruct the private deal.');
      return pureCircuits.combineEntropy(hexToBytes(p1), hexToBytes(p2));
    },

    verifySeedCommitment(matchId, publishedCommitment) {
      const seed = this.getPrivateDealSeed(matchId);
      const expected = pureCircuits.commitSeed(seed);
      return Buffer.from(expected).equals(Buffer.from(publishedCommitment));
    },

    async revealSeed({ matchId, startingRank = 0 }) {
      const p1 = state.getEntropy(matchId, 'p1');
      const p2 = state.getEntropy(matchId, 'p2');
      if (!p1 || !p2) {
        throw new Error(
          `revealSeed needs both entropies. Have p1=${!!p1} p2=${!!p2}.`
        );
      }
      const result = await ensure('revealSeed')(
        hexToBytes(matchId), hexToBytes(p1), hexToBytes(p2),
        BigInt(startingRank), nowSec(),
      );
      return { txId: extractTxId(result) };
    },

    // Provably fair edition: the hand the contract currently binds this player
    // to. On the first play of a round it is dealt from committed material; on
    // later plays it is the locally mirrored remainder of that deal.
    // Returns { round, counts, ranks } where ranks lists each held card's
    // rank index (duplicates included), ready for the scripted AI.
    async getHand({ matchId, role, match = null }) {
      if (variant !== 'state-only') throw new Error('getHand is only available for the state-only contract.');
      if (role !== 'p1' && role !== 'p2') throw new Error('role must be "p1" or "p2"');
      const current = match || await this.getMatch(matchId);
      const saltHex = state.getHandSalt(matchId, role);
      if (!saltHex) {
        throw new Error(`No hand salt stored for ${role} in match ${matchId}. Only the wallet that created/joined this match can play it.`);
      }
      const salt = hexToBytes(saltHex);
      const seed = this.getPrivateDealSeed(matchId);
      const round = BigInt(current.round);
      const drawn = role === 'p1' ? Boolean(current.p1HandDrawn) : Boolean(current.p2HandDrawn);
      const handSize = BigInt(current.mode) === 0n ? 5n : 7n;
      let counts;
      if (!drawn) {
        counts = pureCircuits.handCountsFromRanks(pureCircuits.dealHandRanks(salt, seed, round), handSize);
      } else {
        const stored = state.loadHandCounts(matchId, role);
        if (!stored || stored.round !== round) {
          throw new Error(`Local hand record for ${role} is missing or from another round; cannot open the on-chain hand commitment.`);
        }
        counts = stored.counts;
      }
      const ranks = [];
      counts.forEach((count, rank) => { for (let i = 0n; i < count; i += 1n) ranks.push(rank); });
      return { round, counts, ranks, salt, seed };
    },

    async playCards({ matchId, cards, claimedRank, claimedCount, role = null }) {
      if (claimedCount !== cards.length) {
        throw new Error('claimedCount must equal cards.length');
      }
      const reveal = buildPlayReveal(cards);
      const playCommit = pureCircuits.commitPlay(reveal);
      let hand = null;
      if (variant === 'state-only') {
        if (!role) throw new Error('playCards on the state-only contract needs role: "p1" | "p2".');
        hand = await this.getHand({ matchId, role });
        // Fail here, with a readable message, rather than inside the prover.
        const held = [...hand.ranks];
        for (const card of cards) {
          const index = held.indexOf(Number(card));
          if (index === -1) {
            throw new Error(`You do not hold a card of rank index ${card}; the proof would be rejected. Held: [${hand.ranks.join(', ')}]`);
          }
          held.splice(index, 1);
        }
        stagedPlay = reveal;
        stagedHandSalt = hand.salt;
        stagedSeed = hand.seed;
        stagedHandCounts = hand.counts;
      }
      try {
        const result = await ensure('playCards')(
          hexToBytes(matchId), playCommit,
          BigInt(claimedRank), BigInt(claimedCount), nowSec(),
        );
        state.persistPlayReveal(matchId, dumpReveal(reveal));
        if (hand) {
          state.persistHandCounts(matchId, role, hand.round, pureCircuits.removePlayed(hand.counts, reveal));
        }
        return { playCommit: bytesToHex(playCommit), txId: extractTxId(result) };
      } finally {
        stagedPlay = null;
        stagedHandSalt = null;
        stagedSeed = null;
        stagedHandCounts = null;
      }
    },

    async acceptClaim({ matchId }) {
      const r = await ensure('acceptClaim')(hexToBytes(matchId), nowSec());
      return { txId: extractTxId(r) };
    },

    async challengeClaim({ matchId }) {
      const r = await ensure('challengeClaim')(hexToBytes(matchId), nowSec());
      return { txId: extractTxId(r) };
    },

    async resolveChallenge({ matchId }) {
      const dump = state.loadPlayReveal(matchId);
      if (!dump) {
        throw new Error(
          `No stored play reveal for match ${matchId}. The challenged `
          + `player must call resolveChallenge from the same surface that `
          + `submitted playCards.`
        );
      }
      pendingReveal = rehydrateReveal(dump);
      try {
        const r = await ensure('resolveChallenge')(
          hexToBytes(matchId), nowSec(),
        );
        return {
          honest: Boolean(extractResult(r)),
          txId: extractTxId(r),
        };
      } finally {
        pendingReveal = null;
      }
    },

    async claimPayout({ matchId }) {
      if (variant === 'state-only') throw new Error('The state-only contract holds no funds and has no payout.');
      const r = await ensure('claimPayout')(hexToBytes(matchId));
      return { txId: extractTxId(r) };
    },

    async cancelUnjoinedMatch({ matchId }) {
      const r = await ensure('cancelUnjoinedMatch')(hexToBytes(matchId));
      return { txId: extractTxId(r) };
    },

    async forfeitAbandonedMatch({ matchId, timeoutSeconds = 86_400n }) {
      const r = await ensure('forfeitAbandonedMatch')(
        hexToBytes(matchId), nowSec(), BigInt(timeoutSeconds),
      );
      return { txId: extractTxId(r) };
    },

    async forfeitStalledChallenge({ matchId, timeoutSeconds = 3600n }) {
      const r = await ensure('forfeitStalledChallenge')(
        hexToBytes(matchId), nowSec(), BigInt(timeoutSeconds),
      );
      return { txId: extractTxId(r) };
    },

    async getMatch(matchId) {
      return readPublicMatch(providers.publicDataProvider, decodeContractLedger, this.address, matchId);
    },

    async getMatchPhase(matchId) {
      return Number((await this.getMatch(matchId)).phase);
    },

    async getWinner(matchId) {
      return Number((await this.getMatch(matchId)).winner);
    }
  };
}
