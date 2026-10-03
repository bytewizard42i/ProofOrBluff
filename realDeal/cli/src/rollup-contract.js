/**
 * cli/src/rollup-contract.js — chain binding for the "one proof per game"
 * rollup contract (realDeal/contracts/proof-or-bluff-rollup.compact).
 *
 * WHAT: a thin Node wrapper around the compiled rollup bindings that knows how
 * to deploy / attach to the contract, stage the private closeGame witnesses
 * for exactly one call, submit with the DUST rebuild-on-170 retry, and read
 * game records back from the indexer.
 *
 * WHY a separate module from contract.js: the per-move contract has a dozen
 * circuits and per-player private material (hand salt, play reveals). The
 * rollup has three circuits and one big witness bundle produced off-chain by
 * rollup-referee.js. Mixing the two would make both harder to audit, and the
 * mainnet runbook wants every chain-touching path to be small and readable.
 *
 * Mirrors contract.js: same provider stack (example-counter pattern), same
 * witness-slot trick, same withDustRetry wrapper, same network guards as
 * cli.js openSession. Nothing here holds funds — the rollup contract is
 * state-only.
 */

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Buffer } from 'buffer';
import * as Rx from 'rxjs';

import * as ledger from '@midnight-ntwrk/ledger-v8';
import {
  deployContract as midnightDeployContract,
  findDeployedContract as midnightFindDeployedContract,
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

import { withDustRetry } from './contract.js';
import { challengeReductionWitness } from './rollup-consent.js';
import * as state from './state.js';

// ---------------------------------------------------------------------------
// Constants that mirror the Compact source. If the .compact changes these,
// the compiled index.d.ts changes too and the tests in rollup-contract.test.js
// will tell us.

export const ROLLUP_CONTRACT_NAME = 'proof-or-bluff-rollup';
export const ROLLUP_TRANSCRIPT_LENGTH = 64;         // Vector<64, Move>
export const ROLLUP_SNAPSHOT_LENGTH = 65;           // Vector<65, GameState>
export const ROLLUP_HAND_RANKS = 13;                // Vector<13, Uint<8>>
export const ROLLUP_CLAIM_CARD_SLOTS = 4;           // Vector<4, Uint<8>>
export const ROLLUP_PRIVATE_STATE_ID = 'pob:rollup:private';
// assertRecentBlockTime in the circuit: block time must be in
// [currentTime, currentTime + 120]. Anything older is rejected on-chain.
export const ROLLUP_TIMESTAMP_WINDOW_SECONDS = 120;

const MAINNET_APPROVAL_TOKEN = 'I_APPROVE_MAINNET_DEPLOYMENT';
const SUPPORTED_NETWORKS = ['undeployed', 'preview', 'preprod', 'mainnet'];

const cliSourceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROLLUP_MANAGED_DIR = path.resolve(
  cliSourceDirectory, '..', '..', 'contracts', 'managed', ROLLUP_CONTRACT_NAME,
);

// ---------------------------------------------------------------------------
// Small pure helpers (exported so the tests can pin their behaviour)

/**
 * Seconds since epoch as a bigint, the type the circuit's Uint<64>
 * `currentTime` parameter expects. The circuit rejects a timestamp that is in
 * the future or more than ROLLUP_TIMESTAMP_WINDOW_SECONDS behind block time,
 * so call this immediately before submitting — never cache it.
 */
export function currentTimeSeconds(nowMilliseconds = Date.now()) {
  return BigInt(Math.floor(nowMilliseconds / 1000));
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes32(hex, label = 'value') {
  if (typeof hex !== 'string') {
    throw new Error(`${label} must be a 64-hex string (got ${typeof hex}).`);
  }
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`${label} must be exactly 32 bytes as 64 hex characters (got ${clean.length} chars).`);
  }
  const out = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    out[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

/** Accepts a Uint8Array(32) or a 64-hex string; always returns Uint8Array(32). */
export function toBytes32(value, label = 'value') {
  if (value instanceof Uint8Array) {
    if (value.length !== 32) throw new Error(`${label} must be 32 bytes (got ${value.length}).`);
    return value;
  }
  return hexToBytes32(value, label);
}

function toUint8Bigint(value, label) {
  const asBigint = BigInt(value);
  if (asBigint < 0n || asBigint > 255n) {
    throw new Error(`${label} must fit Uint<8> (0..255), got ${asBigint}.`);
  }
  return asBigint;
}

// ---------------------------------------------------------------------------
// Zero-shaped witnesses
//
// WHY: openGame and pruneExpired do not read any private witness, but the
// compact runtime still constructs the Contract with all four witness
// functions and may invoke them. Returning `undefined` or a short array makes
// the runtime throw a cryptic encoding error deep inside the prover, so we
// always hand it a correctly-shaped all-zero structure instead.

export function zeroMove() {
  return {
    kind: 0n,
    rank: 0n,
    count: 0n,
    cards: new Array(ROLLUP_CLAIM_CARD_SLOTS).fill(0n),
    playSalt: 0n,
  };
}

export function zeroGameState() {
  return {
    hand0: new Array(ROLLUP_HAND_RANKS).fill(0n),
    hand1: new Array(ROLLUP_HAND_RANKS).fill(0n),
    turn: 0n,
    currentRank: 0n,
    pending: false,
    claimRank: 0n,
    claimCount: 0n,
    claimCards: new Array(ROLLUP_CLAIM_CARD_SLOTS).fill(0n),
    claimer: 0n,
    score0: 0n,
    score1: 0n,
    round: 0n,
    ended: false,
    chain: 0n,
  };
}

/** Zero-shaped SignedCredential<CloseConsent> for circuits that never read it. */
export function zeroConsent() {
  const zeroPoint = { x: 0n, y: 0n };
  return {
    credential: {
      sep: new Uint8Array(32), gameId: new Uint8Array(32), transcriptRoot: 0n,
      p1Score: 0n, p2Score: 0n, winner: 0n,
    },
    signature: { r: zeroPoint, s: 0n },
    pk: zeroPoint,
  };
}

export function zeroWitnessBundle() {
  return {
    entropyPair: [new Uint8Array(32), new Uint8Array(32)],
    saltPair: [new Uint8Array(32), new Uint8Array(32)],
    transcript: Array.from({ length: ROLLUP_TRANSCRIPT_LENGTH }, zeroMove),
    snapshots: Array.from({ length: ROLLUP_SNAPSHOT_LENGTH }, zeroGameState),
    p1CloseConsent: zeroConsent(),
    p2CloseConsent: zeroConsent(),
  };
}

/**
 * Validates the witness bundle a caller hands to closeGame before it reaches
 * the prover, so a referee bug surfaces as a readable error rather than a
 * failed proof several minutes later.
 */
export function assertCloseGameWitnessShape(witnesses) {
  if (!witnesses || typeof witnesses !== 'object') {
    throw new Error('closeGame needs witnesses: { entropyPair, saltPair, transcript, snapshots, p1CloseConsent, p2CloseConsent } (from rollup-referee result() plus entropy, salts and both signed consents).');
  }
  const { entropyPair, saltPair, transcript, snapshots, p1CloseConsent, p2CloseConsent } = witnesses;
  for (const [name, pair] of [['entropyPair', entropyPair], ['saltPair', saltPair]]) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error(`witnesses.${name} must be a 2-element array of 32-byte values.`);
    }
  }
  if (!Array.isArray(transcript) || transcript.length !== ROLLUP_TRANSCRIPT_LENGTH) {
    throw new Error(`witnesses.transcript must have exactly ${ROLLUP_TRANSCRIPT_LENGTH} moves (got ${transcript?.length}). Call referee.pad() before result().`);
  }
  if (!Array.isArray(snapshots) || snapshots.length !== ROLLUP_SNAPSHOT_LENGTH) {
    throw new Error(`witnesses.snapshots must have exactly ${ROLLUP_SNAPSHOT_LENGTH} states (got ${snapshots?.length}).`);
  }
  for (const [name, consent] of [['p1CloseConsent', p1CloseConsent], ['p2CloseConsent', p2CloseConsent]]) {
    const ok = consent
      && consent.credential?.gameId instanceof Uint8Array
      && typeof consent.signature?.s === 'bigint'
      && typeof consent.signature?.r?.x === 'bigint'
      && typeof consent.pk?.x === 'bigint' && typeof consent.pk?.y === 'bigint';
    if (!ok) {
      throw new Error(`witnesses.${name} must be a SignedCredential<CloseConsent> { credential, signature: { r, s }, pk } (see rollup-consent.js signCloseConsent).`);
    }
  }
}

// ---------------------------------------------------------------------------
// Network guards
//
// Source of truth: cli.js openSession() (mainnet lock) and envSeed() (fresh
// seed rules). Those are module-private in cli.js and importing cli.js would
// pull in dotenv side effects and the whole command table, so the rules are
// restated here verbatim. Keep the messages identical — network-guards.test.js
// greps for them.

export function assertSupportedNetwork(networkId) {
  if (!SUPPORTED_NETWORKS.includes(networkId)) {
    throw new Error(`Unsupported network: ${networkId} (use ${SUPPORTED_NETWORKS.join('|')})`);
  }
}

export function assertMainnetDeployApproved(networkId, environment = process.env) {
  if (networkId === 'mainnet' && environment.POB_ALLOW_MAINNET_DEPLOY !== MAINNET_APPROVAL_TOKEN) {
    throw new Error('Mainnet deployment is locked. John must review the preprod run and explicitly set POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT for that one command.');
  }
}

/**
 * Public networks must never be signed by a seed that is committed to the
 * repo as a local fixture. Mirrors cli.js envSeed().
 */
export function assertFreshPublicSeed(seedHex, networkId, environment = process.env) {
  if (networkId === 'undeployed') return;
  if (!seedHex || !/^[0-9a-fA-F]{64}$/.test(seedHex)) {
    throw new Error(`A fresh, private 64-hex seed is required for ${networkId}. Local test seeds are forbidden.`);
  }
  const committedLocalSeeds = [
    environment.POB_SEED_GENESIS, environment.POB_SEED_P1, environment.POB_SEED_P2,
  ];
  if (committedLocalSeeds.some((localSeed) => localSeed?.toLowerCase() === seedHex.toLowerCase())) {
    throw new Error('Refusing to use a committed local test seed on a public network. Generate a fresh private seed.');
  }
}

// ---------------------------------------------------------------------------
// Bindings loader + provider bridge
//
// NOTE: contract.js keeps loadContractModule / createWalletAndMidnightProvider
// / signTransactionIntents module-private. We do not modify contract.js here,
// so the bridge is restated below. contract.js remains the source of truth for
// the wallet-SDK 'proof' / 'pre-proof' signing workaround; if it changes,
// change this copy too (or, better, export it from contract.js and import it).

async function loadRollupContractModule(managedDir) {
  const indexJs = path.resolve(managedDir, 'contract', 'index.js');
  return import(pathToFileURL(indexJs).href);
}

function signTransactionIntents(tx, signFn, proofMarker) {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize('signature', proofMarker, 'pre-binding', intent.serialize());
    const signature = signFn(cloned.signatureData(segment));
    for (const offerName of ['fallibleUnshieldedOffer', 'guaranteedUnshieldedOffer']) {
      const offer = cloned[offerName];
      if (!offer) continue;
      const signatures = offer.inputs.map((_input, index) => offer.signatures.at(index) ?? signature);
      cloned[offerName] = offer.addSignatures(signatures);
    }
    tx.intents.set(segment, cloned);
  }
}

async function createWalletAndMidnightProvider(walletCtx) {
  const synced = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((walletState) => walletState.isSynced)),
  );
  return {
    getCoinPublicKey() { return synced.shielded.coinPublicKey.toHexString(); },
    getEncryptionPublicKey() { return synced.shielded.encryptionPublicKey.toHexString(); },
    async balanceTx(tx, ttl) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload) => walletCtx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) { return walletCtx.wallet.submitTransaction(tx); },
  };
}

function resolvePrivateStatePassword(networkId, accountId, environment = process.env) {
  // Same policy as contract.js: a public-key-derived fallback is only
  // acceptable for disposable local wallets.
  const password = networkId === 'undeployed'
    ? environment.POB_PRIVATE_STATE_PASSWORD || `${Buffer.from(accountId, 'hex').toString('base64')}!pob`
    : environment.POB_PRIVATE_STATE_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error('Set POB_PRIVATE_STATE_PASSWORD (at least 16 characters) before connecting to a public network.');
  }
  return password;
}

async function buildDefaultProviders({ walletHandle, endpoints, networkId, managedDir, proofServerUrl }) {
  const walletCtx = walletHandle?.ctx;
  if (!walletCtx) {
    throw new Error('walletHandle.ctx missing — build it with buildWalletFromSeed() from wallet-node.js first.');
  }
  if (!endpoints?.indexer || !endpoints?.indexerWs) {
    throw new Error('endpoints.indexer and endpoints.indexerWs are required (see cli.js endpointsFromEnv).');
  }
  const proofServer = proofServerUrl ?? endpoints.proofServer;
  if (!proofServer) {
    throw new Error('No proof server URL. Pass proofServerUrl or endpoints.proofServer (POB_PROOF_SERVER).');
  }
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletCtx);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const zkConfigProvider = new NodeZkConfigProvider(managedDir);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'pob-rollup',
      // state.privateStateDir() only distinguishes wagered/state-only; the
      // rollup gets its own folder so LevelDB locks never collide.
      privateStateStorePath: path.join(state.stateRoot(), networkId, 'private-state-rollup'),
      accountId,
      privateStoragePasswordProvider: () => resolvePrivateStatePassword(networkId, accountId),
    }),
    publicDataProvider: indexerPublicDataProvider(endpoints.indexer, endpoints.indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
}

// ---------------------------------------------------------------------------
// Result-shape extraction (tolerant of the v8 field renames, like contract.js)

function extractTxHash(finalized) {
  const pub = finalized?.public ?? finalized;
  return pub?.txHash ?? pub?.txId ?? pub?.transactionId ?? null;
}

function extractBlockHeight(finalized) {
  const pub = finalized?.public ?? finalized;
  const height = pub?.blockHeight ?? pub?.tx?.blockHeight ?? null;
  return height == null ? null : Number(height);
}

function extractCircuitResult(finalized) {
  return finalized?.public?.result
    ?? finalized?.public?.callResult?.result
    ?? finalized?.private?.result
    ?? finalized?.result
    ?? null;
}

// ---------------------------------------------------------------------------
// Public factory

/**
 * @param {object} options
 * @param {string} options.networkId          undeployed | preview | preprod | mainnet
 * @param {object} [options.walletHandle]     from buildWalletFromSeed (required unless _internals.buildProviders is given)
 * @param {object} [options.endpoints]        { node, indexer, indexerWs, proofServer } from cli.js endpointsFromEnv
 * @param {string} [options.seedHex]          only used for the fresh-seed guard on public networks
 * @param {string} [options.managedDir]       compiled rollup bindings dir
 * @param {string} [options.proofServerUrl]   overrides endpoints.proofServer
 * @param {object} [options._internals]       test seams: loadContractModule, buildProviders, deployContract, findDeployedContract, now
 */
export async function getRollupContractApi({
  networkId,
  walletHandle,
  endpoints,
  seedHex,
  managedDir = DEFAULT_ROLLUP_MANAGED_DIR,
  proofServerUrl,
  _internals = {},
}) {
  assertSupportedNetwork(networkId);
  if (seedHex !== undefined) assertFreshPublicSeed(seedHex, networkId);
  setNetworkId(networkId);

  const internals = {
    loadContractModule: loadRollupContractModule,
    buildProviders: buildDefaultProviders,
    deployContract: midnightDeployContract,
    findDeployedContract: midnightFindDeployedContract,
    now: currentTimeSeconds,
    ..._internals,
  };

  const { Contract, ledger: decodeRollupLedger } = await internals.loadContractModule(managedDir);
  if (typeof Contract !== 'function' || typeof decodeRollupLedger !== 'function') {
    throw new Error(`Rollup bindings at ${managedDir} are incomplete. Compile the contract: compactc realDeal/contracts/proof-or-bluff-rollup.compact ${managedDir} (never bare \`compact update\` — see docs/MAINNET_LAUNCH_RUNBOOK.md).`);
  }

  // Witness slot. Null means "nothing staged": the witnesses then return
  // zero-shaped structures so openGame / pruneExpired never see undefined.
  // closeGame sets the slot right before the call and clears it in finally,
  // so a rebuilt attempt inside withDustRetry sees the same private inputs
  // and no later transaction can pick up stale material.
  let stagedWitnesses = null;
  const witnessValue = (name) => (stagedWitnesses ?? zeroWitnessBundle())[name];
  const witnesses = {
    entropyPair(context) { return [context.privateState, witnessValue('entropyPair')]; },
    saltPair(context) { return [context.privateState, witnessValue('saltPair')]; },
    transcript(context) { return [context.privateState, witnessValue('transcript')]; },
    snapshots(context) { return [context.privateState, witnessValue('snapshots')]; },
    p1CloseConsent(context) { return [context.privateState, witnessValue('p1CloseConsent')]; },
    p2CloseConsent(context) { return [context.privateState, witnessValue('p2CloseConsent')]; },
    // The SignedCredentials module's reduction witness is generic: compute
    // (q, r) for whatever challenge hash the circuit hands us.
    get_challenge_reduction: challengeReductionWitness,
  };

  const compiledContract = CompiledContract.make(ROLLUP_CONTRACT_NAME, Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(managedDir),
  );

  const providers = await internals.buildProviders({
    walletHandle, endpoints, networkId, managedDir, proofServerUrl,
  });

  let deployed = null;
  let contractAddress = null;
  let mutationQueue = Promise.resolve();
  const serializeMutation = (operation) => (...args) => {
    const pending = mutationQueue.then(() => operation(...args));
    mutationQueue = pending.catch(() => {});
    return pending;
  };

  const requireAttached = (operation) => {
    if (!deployed) {
      throw new Error(`${operation} called before deploy() or joinAt(address). Attach to a rollup contract first.`);
    }
    return deployed;
  };

  // Every circuit call goes through the rebuild-on-170 wrapper.
  const callCircuit = (name, ...args) => {
    const callTx = requireAttached(name).callTx;
    const circuit = callTx?.[name];
    if (typeof circuit !== 'function') {
      throw new Error(`Circuit "${name}" is not callable on the attached rollup contract. Are the bindings in ${managedDir} current?`);
    }
    return withDustRetry(name, () => circuit(...args));
  };

  const readLedger = async () => {
    const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!contractState) {
      throw new Error(`The indexer has no state for rollup contract ${contractAddress} yet. Wait for the deploy tx to be indexed and retry.`);
    }
    return decodeRollupLedger(contractState.data);
  };

  return {
    get address() { return contractAddress; },

    /**
     * Deploys a fresh rollup contract. Explicit and guarded: mainnet needs
     * POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT in the environment.
     * The caller is responsible for persisting the returned address.
     */
    deploy: serializeMutation(async () => {
      assertMainnetDeployApproved(networkId);
      if (deployed) {
        throw new Error(`Already attached to ${contractAddress}. Create a new api instance to deploy another contract.`);
      }
      deployed = await withDustRetry('deploy-rollup', () => internals.deployContract(providers, {
        compiledContract,
        privateStateId: ROLLUP_PRIVATE_STATE_ID,
        initialPrivateState: {},
      }));
      contractAddress = deployed.deployTxData?.public?.contractAddress ?? null;
      if (!contractAddress) {
        throw new Error('deployContract returned no contractAddress — inspect deployTxData.public.');
      }
      return {
        contractAddress,
        txHash: extractTxHash(deployed.deployTxData),
        blockHeight: extractBlockHeight(deployed.deployTxData),
      };
    }),

    /** Attaches to an existing rollup contract (no transaction is sent). */
    joinAt: serializeMutation(async (existingContractAddress) => {
      if (typeof existingContractAddress !== 'string' || !/^(0x)?[0-9a-fA-F]{64,}$/.test(existingContractAddress)) {
        throw new Error('joinAt needs the hex contract address printed by deploy().');
      }
      deployed = await internals.findDeployedContract(providers, {
        contractAddress: existingContractAddress,
        compiledContract,
        privateStateId: ROLLUP_PRIVATE_STATE_ID,
        initialPrivateState: {},
      });
      contractAddress = existingContractAddress;
      return { contractAddress };
    }),

    /**
     * Registers both players' commitments. No private witness is needed; the
     * slot stays null so the zero-shaped bundle is what the runtime sees.
     */
    openGame: serializeMutation(async ({
      playerOne, playerTwo, mode,
      p1EntropyCommit, p1SaltCommit, p2EntropyCommit, p2SaltCommit,
      currentTime = internals.now(),
    }) => {
      const finalized = await callCircuit(
        'openGame',
        toBytes32(playerOne, 'playerOne'),
        toBytes32(playerTwo, 'playerTwo'),
        toUint8Bigint(mode, 'mode'),
        toBytes32(p1EntropyCommit, 'p1EntropyCommit'),
        toBytes32(p1SaltCommit, 'p1SaltCommit'),
        toBytes32(p2EntropyCommit, 'p2EntropyCommit'),
        toBytes32(p2SaltCommit, 'p2SaltCommit'),
        BigInt(currentTime),
      );
      const gameIdBytes = extractCircuitResult(finalized);
      return {
        gameId: gameIdBytes ? bytesToHex(gameIdBytes) : null,
        txHash: extractTxHash(finalized),
        blockHeight: extractBlockHeight(finalized),
      };
    }),

    /**
     * Submits the single proof for a finished game. `publicInputs` come from
     * rollup-referee result(); `witnesses` are the referee's transcript +
     * snapshots plus the two players' raw entropy and hand salts.
     */
    closeGame: serializeMutation(async ({ gameId, publicInputs, witnesses: closeWitnesses, currentTime = internals.now() }) => {
      if (!publicInputs) {
        throw new Error('closeGame needs publicInputs: { transcriptRoot, p1Score, p2Score, winner } from rollup-referee result().');
      }
      assertCloseGameWitnessShape(closeWitnesses);
      const orderedArguments = [
        toBytes32(gameId, 'gameId'),
        BigInt(publicInputs.transcriptRoot),
        toUint8Bigint(publicInputs.p1Score, 'p1Score'),
        toUint8Bigint(publicInputs.p2Score, 'p2Score'),
        toUint8Bigint(publicInputs.winner, 'winner'),
        BigInt(currentTime),
      ];
      stagedWitnesses = {
        entropyPair: closeWitnesses.entropyPair.map((value, index) => toBytes32(value, `entropyPair[${index}]`)),
        saltPair: closeWitnesses.saltPair.map((value, index) => toBytes32(value, `saltPair[${index}]`)),
        transcript: closeWitnesses.transcript,
        snapshots: closeWitnesses.snapshots,
        p1CloseConsent: closeWitnesses.p1CloseConsent,
        p2CloseConsent: closeWitnesses.p2CloseConsent,
      };
      try {
        const finalized = await callCircuit('closeGame', ...orderedArguments);
        return { txHash: extractTxHash(finalized), blockHeight: extractBlockHeight(finalized) };
      } finally {
        stagedWitnesses = null;
      }
    }),

    /** Removes a game nobody closed within the 7-day window. Anyone may call. */
    pruneExpired: serializeMutation(async ({ gameId, currentTime = internals.now() }) => {
      const finalized = await callCircuit('pruneExpired', toBytes32(gameId, 'gameId'), BigInt(currentTime));
      return { txHash: extractTxHash(finalized), blockHeight: extractBlockHeight(finalized) };
    }),

    /** Ledger GameRecord for gameId, or null if the map has no such key. */
    async readGame(gameId) {
      requireAttached('readGame');
      const key = toBytes32(gameId, 'gameId');
      const games = (await readLedger()).games;
      if (!games.member(key)) return null;
      return games.lookup(key);
    },

    /** Public counters, as plain bigints. */
    async stats() {
      requireAttached('stats');
      const decoded = await readLedger();
      return {
        totalGamesOpened: decoded.totalGamesOpened,
        totalGamesClosed: decoded.totalGamesClosed,
        totalGamesPruned: decoded.totalGamesPruned,
        openGames: decoded.games.size(),
      };
    },

    /** Test/diagnostic seam: is a closeGame witness bundle currently staged? */
    _hasStagedWitnesses() { return stagedWitnesses !== null; },
  };
}
