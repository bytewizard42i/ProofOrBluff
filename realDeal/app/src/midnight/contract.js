/**
 * midnight/contract.js — Phase 2 wiring of every exported circuit on
 * proof-or-bluff.compact, browser flavour, v8 SDK matrix.
 *
 * Mirrors realDeal/cli/src/contract.js. Differences:
 *   - Wallet bridge: comes from Lace / 1AM via the DApp Connector
 *     (`walletHandle.api`) rather than a headless WalletFacade.
 *   - ZK assets: served over HTTP from /managed/proof-or-bluff/ by Vite
 *     (fetchZkConfigProvider) rather than read from disk.
 *   - Persistence: browser localStorage rather than .pob-state/.
 *
 * The on-chain coding (commits, witness staging, result decoding) is
 * identical to the CLI so behaviour is consistent across surfaces.
 */

import {
  findDeployedContract,
  deployContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from
  '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from
  '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from
  '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from
  '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';

import { Contract, pureCircuits, ledger as decodeContractLedger } from '@pob/contract';
import { readPublicMatch } from '../../../shared/publicMatch.js';
import {
  ENDPOINTS, NETWORK_ID, CONTRACT_VARIANT, CONTRACT_ASSET_NAME,
  getContractAddress, setContractAddress,
} from './config.js';

// ---------------------------------------------------------------------------
// Network registration (NetworkId is just a string in v4.0.4 — pass through).

setNetworkId(NETWORK_ID);

// ---------------------------------------------------------------------------
// Witness staging — used by resolveChallenge.

let _pendingReveal = null;
export function setPendingReveal(reveal) { _pendingReveal = reveal; }
export function clearPendingReveal() { _pendingReveal = null; }

// Provably fair edition: private inputs for playCards. Staged immediately
// before the call and cleared in a finally block, never persisted here.
let _stagedPlay = null;
let _stagedHandSalt = null;
let _stagedSeed = null;
let _stagedHandCounts = null;
function requireStaged(value, name) {
  if (value == null) throw new Error(`${name} witness requested with nothing staged.`);
  return value;
}

const witnesses = {
  revealLastPlay(context) {
    if (!_pendingReveal) {
      throw new Error(
        'revealLastPlay called with no pending reveal staged. Call '
        + 'setPendingReveal(witness) before resolveChallenge.'
      );
    }
    return [context.privateState, _pendingReveal];
  },
  nextPlay(context) { return [context.privateState, requireStaged(_stagedPlay, 'nextPlay')]; },
  handSalt(context) { return [context.privateState, requireStaged(_stagedHandSalt, 'handSalt')]; },
  sharedSeed(context) { return [context.privateState, requireStaged(_stagedSeed, 'sharedSeed')]; },
  currentHandCounts(context) { return [context.privateState, requireStaged(_stagedHandCounts, 'currentHandCounts')]; },
};

// ---------------------------------------------------------------------------
// Encoding helpers.

function randomBytes32() {
  const out = new Uint8Array(32);
  crypto.getRandomValues(out);
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

// Result-shape extraction tolerant to v8 SDK key changes.
const extractTxId = (r) =>
  r?.public?.txId ?? r?.public?.txHash ?? r?.public?.transactionId ?? null;
const extractResult = (r) =>
  r?.public?.result
    ?? r?.public?.callResult?.result
    ?? r?.private?.result
    ?? r?.result
    ?? null;

// ---------------------------------------------------------------------------
// LocalStorage keys (private state per matchId).

const KEY_ENTROPY     = (mid, role) => `pob:realdeal:entropy:${mid}:${role}`;
const KEY_PLAY_REVEAL = (mid)       => `pob:realdeal:play:${mid}`;
// Provably fair edition. The hand salt is the secret that makes this player's
// deal unpredictable to everyone else; it never leaves this browser. The hand
// record mirrors the 13 per-rank counts the contract has committed to.
const KEY_HAND_SALT   = (mid, role) => `pob:realdeal:hand-salt:${mid}:${role}`;
const KEY_HAND_COUNTS = (mid, role) => `pob:realdeal:hand:${mid}:${role}`;

function persistEntropy(matchId, role, entropyHex) {
  window.localStorage.setItem(KEY_ENTROPY(matchId, role), entropyHex);
}

function persistHandSalt(matchId, role, saltHex) {
  window.localStorage.setItem(KEY_HAND_SALT(matchId, role), saltHex);
}
function getStoredHandSalt(matchId, role) {
  return window.localStorage.getItem(KEY_HAND_SALT(matchId, role));
}
function persistHandCounts(matchId, role, round, counts) {
  window.localStorage.setItem(KEY_HAND_COUNTS(matchId, role), JSON.stringify({
    round: round.toString(),
    counts: counts.map((count) => count.toString()),
  }));
}
function loadHandCounts(matchId, role) {
  const raw = window.localStorage.getItem(KEY_HAND_COUNTS(matchId, role));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.counts) || parsed.counts.length !== 13) return null;
    return { round: BigInt(parsed.round), counts: parsed.counts.map((count) => BigInt(count)) };
  } catch {
    return null;
  }
}

export function getStoredEntropy(matchId, role) {
  return window.localStorage.getItem(KEY_ENTROPY(matchId, role));
}

export function importEntropy(matchId, role, entropyHex) {
  if (!/^[0-9a-fA-F]{64}$/.test(entropyHex.replace(/^0x/, ''))) {
    throw new Error('Entropy must be a 32-byte hex string');
  }
  persistEntropy(matchId, role, entropyHex.replace(/^0x/, ''));
}

function persistPlayReveal(matchId, reveal) {
  const dump = {
    count: reveal.count.toString(),
    rank0: reveal.rank0.toString(), salt0: bytesToHex(reveal.salt0),
    rank1: reveal.rank1.toString(), salt1: bytesToHex(reveal.salt1),
    rank2: reveal.rank2.toString(), salt2: bytesToHex(reveal.salt2),
    rank3: reveal.rank3.toString(), salt3: bytesToHex(reveal.salt3),
  };
  window.localStorage.setItem(KEY_PLAY_REVEAL(matchId), JSON.stringify(dump));
}

function loadPlayReveal(matchId) {
  const raw = window.localStorage.getItem(KEY_PLAY_REVEAL(matchId));
  if (!raw) {
    throw new Error(
      `No stored play reveal for match ${matchId}. The challenged player `
      + `must call resolveChallenge from the same browser that submitted `
      + `the original playCards.`
    );
  }
  const j = JSON.parse(raw);
  return {
    count: BigInt(j.count),
    rank0: BigInt(j.rank0), salt0: hexToBytes(j.salt0),
    rank1: BigInt(j.rank1), salt1: hexToBytes(j.salt1),
    rank2: BigInt(j.rank2), salt2: hexToBytes(j.salt2),
    rank3: BigInt(j.rank3), salt3: hexToBytes(j.salt3),
  };
}

// ---------------------------------------------------------------------------
// In-memory PrivateStateProvider implementation. Satisfies the interface
// from @midnight-ntwrk/midnight-js-types without pulling in the level
// stack (which fails to bundle for the browser due to its EventEmitter
// dependency). Private states are scoped by contract address to mirror
// the on-disk provider's namespace isolation.
// ---------------------------------------------------------------------------

function createMemoryPrivateStateProvider() {
  let scopedAddress = null;
  const states = new Map();        // key: `${address}::${psi}` -> private state
  const signingKeys = new Map();   // key: address -> signing key
  const k = (psi) => `${scopedAddress ?? '_'}::${psi}`;

  return {
    setContractAddress(address) { scopedAddress = address; },
    async set(psi, state)        { states.set(k(psi), state); },
    async get(psi)               { return states.has(k(psi)) ? states.get(k(psi)) : null; },
    async remove(psi)            { states.delete(k(psi)); },
    async clear()                { states.clear(); },
    async setSigningKey(addr, key)   { signingKeys.set(addr, key); },
    async getSigningKey(addr)        { return signingKeys.has(addr) ? signingKeys.get(addr) : null; },
    async removeSigningKey(addr)     { signingKeys.delete(addr); },
    async clearSigningKeys()         { signingKeys.clear(); },
    // Export/import are not required by deployContract / findDeployedContract;
    // implement as no-ops so the interface is satisfied if midnight-js
    // ever introspects them.
    async exportPrivateStates() { return { version: 1, states: [] }; },
    async importPrivateStates() { return { imported: 0, skipped: 0, overwritten: 0 }; },
    async exportSigningKeys()   { return { version: 1, keys: [] }; },
    async importSigningKeys()   { return { imported: 0, skipped: 0, overwritten: 0 }; },
  };
}

// ---------------------------------------------------------------------------
// Provider bundle.

function buildProviders({ walletHandle }) {
  const baseURL = `${window.location.origin}/managed/${CONTRACT_ASSET_NAME}`;
  const innerProvider = new FetchZkConfigProvider(baseURL);
  // Wrap to surface the underlying fetch/parse error. The default
  // FetchZkConfigProvider rejects with response.statusText (often empty)
  // and the surrounding Effect.tryPromise.catch wraps it as a
  // ZKConfigurationReadError without the cause attached, hiding what
  // actually went wrong (CORS, MIME, parse, etc.).
  const wrap = (label, fn) => async (circuitId) => {
    // Built-in circuits (zswap inputs/outputs, dust spend, …) are
    // identified by paths like "midnight/zswap/output". Proof-server has
    // these compiled in; midnight-js only asks our provider so it can
    // *try* to supply overrides. We must signal "not here" by throwing —
    // httpClientProofProvider wraps the call in try/catch and falls
    // back to the built-in keys when undefined is returned. If we let
    // the fetch resolve to Vite's SPA fallback (1146 bytes of HTML),
    // proof-server tries to parse HTML as an IR and rejects with 400.
    if (circuitId.startsWith('midnight/')) {
      throw new Error(`built-in circuit ${circuitId} is handled by proof-server`);
    }
    // compactc emits two ZKIR formats: <name>.zkir (JSON debug) and
    // <name>.bzkir (binary). The proof server expects the BINARY form;
    // the JSON one is rejected with "Unsupported ZKIR version".
    const ext = label === 'zkir' ? 'bzkir' : label;
    const dir = label === 'zkir' ? 'zkir' : 'keys';
    const url = `${baseURL}/${dir}/${circuitId}.${ext}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(`[ZK fetch FAIL] ${url} -> HTTP ${res.status} ${res.statusText}`);
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      // eslint-disable-next-line no-console
      console.log(`[ZK fetch OK]   ${url} -> ${buf.byteLength} bytes`);
      return buf;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[ZK fetch THREW] ${url}`, err);
      throw err;
    }
  };
  const getVerifierKey = wrap('verifier');
  const getProverKey   = wrap('prover');
  const getZKIR        = wrap('zkir');
  const zkConfigProvider = {
    getVerifierKey,
    getProverKey,
    getZKIR,
    // Batch helpers. The base ZKConfigProvider class supplies these by
    // default; our plain wrapped object needs them explicitly because
    // midnight-js calls them in several places (deploy, find, callTx).
    async getVerifierKeys(circuitIds) {
      return Promise.all(
        circuitIds.map((id) => getVerifierKey(id).then((k) => [id, k]))
      );
    },
    // httpClientProofProvider calls .get(keyLocation) to bundle all three
    // pieces into a single { proverKey, verifierKey, zkir } object.
    async get(circuitId) {
      const [proverKey, verifierKey, zkir] = await Promise.all([
        getProverKey(circuitId),
        getVerifierKey(circuitId),
        getZKIR(circuitId),
      ]);
      return { proverKey, verifierKey, zkir };
    },
  };
  // Tiny in-memory PrivateStateProvider. The real
  // levelPrivateStateProvider depends on `level` / `abstract-level`,
  // which extend Node's `events.EventEmitter` — externalised by Vite for
  // the browser, breaking module init. For our local-dev hackathon demo
  // we don't need persistence across reloads (the contract address is
  // stored separately in localStorage by setContractAddress), so a
  // map-backed implementation is sufficient and ships zero new deps.
  const privateStateProvider = createMemoryPrivateStateProvider();
  return {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(
      ENDPOINTS.indexer,
      ENDPOINTS.indexerWs
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(ENDPOINTS.proofServer, zkConfigProvider),
    // The DApp Connector's ConnectedAPI does not implement the midnight-js
    // WalletProvider / MidnightProvider interfaces. wallet.js builds an
    // adapter that does — use it for both roles.
    walletProvider: walletHandle.adapter,
    midnightProvider: walletHandle.adapter,
  };
}

async function resolveContract(providers, compiledContract, allowDeploy) {
  const persisted = getContractAddress();
  if (!persisted && !allowDeploy) {
    // Deploying must be an intentional act (it costs a transaction and makes
    // every other stored match unreachable from this fresh, empty contract).
    // Only match-creation flows pass allowDeploy: true.
    throw new Error(
      'No deployed contract address is stored in this browser. Start a new '
      + 'match (which deploys), or paste a known address into the '
      + 'localStorage key "pob:realdeal:contract-address" and reload.'
    );
  }

  if (persisted) {
    return findDeployedContract(providers, {
      contractAddress: persisted,
      compiledContract,
      privateStateId: 'pob:realdeal:private',
      initialPrivateState: {},
    });
  }

  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: 'pob:realdeal:private',
    initialPrivateState: {},
  });
  setContractAddress(deployed.deployTxData.public.contractAddress);
  return deployed;
}

// ---------------------------------------------------------------------------
// Public factory.

export async function getContractApi({ walletHandle, allowDeploy = false }) {
  const providers = buildProviders({ walletHandle });

  // v8 midnight-js requires the CompiledContract wrapper around the
  // raw Contract class. fetchZkConfigProvider serves the assets over
  // HTTP, but the CompiledContract still needs an asset path tag so
  // the runtime can locate them.
  const compiledContract = CompiledContract.make(CONTRACT_ASSET_NAME, Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(
      `${window.location.origin}/managed/${CONTRACT_ASSET_NAME}`
    ),
  );

  const deployed = await resolveContract(providers, compiledContract, allowDeploy);
  const tx = deployed.callTx;

  const ensure = (name) => {
    const fn = tx[name];
    if (!fn) {
      throw new Error(
        `Circuit "${name}" not callable on the deployed contract. The `
        + `bindings may be stale — rerun the realDeal contract compile.`
      );
    }
    return fn;
  };

  function nowSec() {
    return BigInt(Math.floor(Date.now() / 1000));
  }

  // ShieldedCoinInfo.color is Bytes<32>. ledger-v8's nativeToken().raw
  // is a hex string used as a balance-map key — convert to bytes here.
  const nativeColorBytes = hexToBytes(ledger.nativeToken().raw);
  function nativeCoin(value) {
    return {
      nonce: randomBytes32(),
      color: nativeColorBytes,
      value: BigInt(value),
    };
  }

  return {
    address: deployed.deployTxData?.public?.contractAddress
      || getContractAddress(),

    async getMatch(matchId) {
      return readPublicMatch(providers.publicDataProvider, decodeContractLedger, this.address, matchId);
    },
    async getMatchPhase(matchId) {
      return Number((await this.getMatch(matchId)).phase);
    },
    async getWinner(matchId) {
      return Number((await this.getMatch(matchId)).winner);
    },

    async createMatch({ mode, wagerAmount }) {
      const entropy = randomBytes32();
      const entropyHex = bytesToHex(entropy);
      const commit = pureCircuits.commitEntropy(entropy);
      if (CONTRACT_VARIANT === 'state-only' && wagerAmount !== 0) {
        throw new Error('The state-only contract does not take a wager. Set wager to 0.');
      }
      // The hand salt is generated before the opponent's entropy exists, which
      // is exactly what makes grinding for a good hand impossible.
      const handSalt = CONTRACT_VARIANT === 'state-only' ? randomBytes32() : null;
      const result = CONTRACT_VARIANT === 'state-only'
        ? await ensure('createMatch')(BigInt(mode), commit, pureCircuits.commitHandSalt(handSalt), nowSec())
        : await ensure('createMatch')(
          BigInt(mode), BigInt(wagerAmount), commit, nowSec(), nativeCoin(wagerAmount)
        );
      const matchIdBytes = extractResult(result);
      const matchId = matchIdBytes ? bytesToHex(matchIdBytes) : null;
      if (matchId) persistEntropy(matchId, 'p1', entropyHex);
      if (matchId && handSalt) persistHandSalt(matchId, 'p1', bytesToHex(handSalt));
      return { matchId, entropy: entropyHex, txId: extractTxId(result) };
    },

    async joinMatch({ matchId, wagerAmount }) {
      const entropy = randomBytes32();
      const entropyHex = bytesToHex(entropy);
      const commit = pureCircuits.commitEntropy(entropy);
      if (CONTRACT_VARIANT === 'state-only' && wagerAmount !== 0) {
        throw new Error('The state-only contract does not take a wager. Set wager to 0.');
      }
      const handSalt = CONTRACT_VARIANT === 'state-only' ? randomBytes32() : null;
      const result = CONTRACT_VARIANT === 'state-only'
        ? await ensure('joinMatch')(hexToBytes(matchId), commit, pureCircuits.commitHandSalt(handSalt))
        : await ensure('joinMatch')(hexToBytes(matchId), commit, nativeCoin(wagerAmount));
      persistEntropy(matchId, 'p2', entropyHex);
      if (handSalt) persistHandSalt(matchId, 'p2', bytesToHex(handSalt));
      return { entropy: entropyHex, txId: extractTxId(result) };
    },

    /**
     * Provably fair edition: the hand the contract currently binds this player
     * to. Dealt from committed material on a round's first play; afterwards the
     * locally mirrored remainder. Synchronous — pure circuits plus localStorage.
     * `match` must carry round, mode, p1HandDrawn/p2HandDrawn and seedCommitment.
     */
    getProvableHand({ matchId, role, match }) {
      if (CONTRACT_VARIANT !== 'state-only') throw new Error('getProvableHand is only available in the state-only edition.');
      if (role !== 'p1' && role !== 'p2') throw new Error('role must be "p1" or "p2"');
      const saltHex = getStoredHandSalt(matchId, role);
      if (!saltHex) {
        throw new Error(`No hand salt stored in this browser for ${role} of match ${matchId}. Only the browser that created the match can play it.`);
      }
      const salt = hexToBytes(saltHex);
      const seed = this.getPrivateDealSeed(matchId, match.seedCommitment);
      const round = BigInt(match.round);
      const drawn = role === 'p1' ? Boolean(match.p1HandDrawn) : Boolean(match.p2HandDrawn);
      const handSize = BigInt(match.mode) === 0n ? 5n : 7n;
      let counts;
      if (!drawn) {
        counts = pureCircuits.handCountsFromRanks(pureCircuits.dealHandRanks(salt, seed, round), handSize);
      } else {
        const stored = loadHandCounts(matchId, role);
        if (!stored || stored.round !== round) {
          throw new Error('This browser has no hand record for the current round, so it cannot open the on-chain hand commitment.');
        }
        counts = stored.counts;
      }
      const ranks = [];
      counts.forEach((count, rank) => { for (let i = 0n; i < count; i += 1n) ranks.push(rank); });
      return { round, counts, ranks, salt, seed };
    },

    getPrivateDealSeed(matchId, publishedCommitment) {
      if (CONTRACT_VARIANT !== 'state-only') throw new Error('Private seed is only used in the state-only edition.');
      const p1 = getStoredEntropy(matchId, 'p1');
      const p2 = getStoredEntropy(matchId, 'p2');
      if (!p1 || !p2) throw new Error('Both private entropy values are needed to reconstruct the deal.');
      const seed = pureCircuits.combineEntropy(hexToBytes(p1), hexToBytes(p2));
      if (publishedCommitment) {
        const expected = pureCircuits.commitSeed(seed);
        if (bytesToHex(expected) !== bytesToHex(hexToBytes(publishedCommitment))) {
          throw new Error('Private deal seed does not match public commitment. Do not play this match.');
        }
      }
      return seed;
    },

    async revealSeed({ matchId, startingRank = 0 }) {
      const p1 = getStoredEntropy(matchId, 'p1');
      const p2 = getStoredEntropy(matchId, 'p2');
      if (!p1 || !p2) {
        throw new Error(
          `revealSeed needs both entropies. Have: p1=${!!p1} p2=${!!p2}. `
          + `Call importEntropy(matchId, role, hex) first.`
        );
      }
      const result = await ensure('revealSeed')(
        hexToBytes(matchId),
        hexToBytes(p1),
        hexToBytes(p2),
        BigInt(startingRank),
        nowSec()
      );
      return { txId: extractTxId(result) };
    },

    async playCards({ matchId, cards, claimedRank, claimedCount, role = null, match = null }) {
      if (claimedCount !== cards.length) {
        throw new Error('claimedCount must equal cards.length');
      }
      const reveal = buildPlayReveal(cards);
      const playCommit = pureCircuits.commitPlay(reveal);
      let hand = null;
      if (CONTRACT_VARIANT === 'state-only') {
        if (!role || !match) throw new Error('playCards on the state-only contract needs role and the current match state.');
        hand = this.getProvableHand({ matchId, role, match });
        const held = [...hand.ranks];
        for (const card of cards) {
          const index = held.indexOf(Number(card));
          if (index === -1) {
            throw new Error(`You do not hold a card of rank index ${card}; the proof would be rejected.`);
          }
          held.splice(index, 1);
        }
        _stagedPlay = reveal;
        _stagedHandSalt = hand.salt;
        _stagedSeed = hand.seed;
        _stagedHandCounts = hand.counts;
      }
      try {
        const result = await ensure('playCards')(
          hexToBytes(matchId),
          playCommit,
          BigInt(claimedRank),
          BigInt(claimedCount),
          nowSec()
        );
        persistPlayReveal(matchId, reveal);
        if (hand) persistHandCounts(matchId, role, hand.round, pureCircuits.removePlayed(hand.counts, reveal));
        return {
          playCommit: bytesToHex(playCommit),
          txId: extractTxId(result),
        };
      } finally {
        _stagedPlay = null;
        _stagedHandSalt = null;
        _stagedSeed = null;
        _stagedHandCounts = null;
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
      const reveal = loadPlayReveal(matchId);
      setPendingReveal(reveal);
      try {
        const r = await ensure('resolveChallenge')(
          hexToBytes(matchId),
          nowSec()
        );
        return {
          honest: Boolean(extractResult(r)),
          txId: extractTxId(r),
        };
      } finally {
        clearPendingReveal();
      }
    },

    async claimPayout({ matchId }) {
      if (CONTRACT_VARIANT === 'state-only') throw new Error('This contract holds no funds and has no payout.');
      const r = await ensure('claimPayout')(hexToBytes(matchId));
      return { txId: extractTxId(r) };
    },

    async cancelUnjoinedMatch({ matchId }) {
      const r = await ensure('cancelUnjoinedMatch')(hexToBytes(matchId));
      return { txId: extractTxId(r) };
    },

    async forfeitAbandonedMatch({ matchId, timeoutSeconds = 86_400n }) {
      const r = await ensure('forfeitAbandonedMatch')(
        hexToBytes(matchId),
        nowSec(),
        BigInt(timeoutSeconds)
      );
      return { txId: extractTxId(r) };
    },

    async forfeitStalledChallenge({ matchId, timeoutSeconds = 3600n }) {
      const r = await ensure('forfeitStalledChallenge')(
        hexToBytes(matchId),
        nowSec(),
        BigInt(timeoutSeconds)
      );
      return { txId: extractTxId(r) };
    },
  };
}
