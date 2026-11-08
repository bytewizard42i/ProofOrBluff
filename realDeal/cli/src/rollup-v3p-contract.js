/**
 * cli/src/rollup-v3p-contract.js — chain binding for the v3p "one proof per
 * ROUND" rollup (realDeal/contracts/proof-or-bluff-rollup-v3p.compact).
 *
 * WHAT: deploy ONE contract per game (the constructor is openGame), stage one
 * round's private witnesses for exactly one `proveRound(r)` call, close with
 * both players' signed consents, and read the game's ledger back. Mirrors
 * rollup-contract.js (v2) for the provider stack, DUST retry and network
 * guards — those are imported, not re-implemented, so the two bindings cannot
 * drift on policy.
 *
 * WHY one contract per game: Midnight ZK proofs bind to the FULL contract
 * state. A shared Map would let concurrent games invalidate each other's
 * in-flight round proofs (midnight-expert, state-and-conflicts). Per-game
 * contracts make the only writers the two seats, sequentially.
 *
 * Nothing here holds funds. The contract never receives a coin.
 */

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

import {
  deployContract as midnightDeployContract,
  findDeployedContract as midnightFindDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/v9/compact-js';
import { ContractState } from '@midnight-ntwrk/compact-runtime';

import { withDustRetry, buildLedger9Providers } from './providers.js';
import { challengeReductionWitness } from './rollup-consent.js';
import {
  assertSupportedNetwork, assertMainnetDeployApproved, assertFreshPublicSeed, toBytes32, bytesToHex,
} from './rollup-contract.js';
import { initialBoundary, MAX_ROUNDS, MAX_ROUND_MOVES } from '../../contracts/rollup-v3p-referee.js';

export const V3P_CONTRACT_NAME = 'proof-or-bluff-rollup-v3p';
export const V3P_PRIVATE_STATE_ID = 'pob:rollup-v3p:private';
const cliSourceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_V3P_MANAGED_DIR = path.resolve(cliSourceDirectory, '..', '..', 'contracts', 'managed', V3P_CONTRACT_NAME);

// ---------------------------------------------------------------------------
// Zero-shaped witnesses: the runtime may call every witness on every circuit
// (closeGame does not read roundMoves, but the Contract still constructs them).
// A wrong-shaped value fails deep inside the prover with a cryptic error.
const zeroMove = () => ({ kind: 0n, rank: 0n, count: 0n, cards: [0n, 0n, 0n, 0n], playSalt: 0n });
const zeroState = () => ({
  played0: 0n, played1: 0n, plays0: 0n, plays1: 0n, turn: 0n, currentRank: 0n, pending: false,
  claimRank: 0n, claimCount: 0n, claimSum: 0n, claimer: 0n, score0: 0n, score1: 0n, round: 0n, ended: false, chain: 0n,
});
const zeroConsent = () => ({
  credential: { sep: new Uint8Array(32), gameId: new Uint8Array(32), transcriptRoot: 0n, p1Score: 0n, p2Score: 0n, winner: 0n },
  signature: { r: { x: 0n, y: 0n }, s: 0n }, pk: { x: 0n, y: 0n },
});
export function zeroWitnessBundle() {
  return {
    entropyPair: [new Uint8Array(32), new Uint8Array(32)],
    roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
    roundMoves: Array.from({ length: MAX_ROUND_MOVES }, zeroMove),
    roundSnapshots: Array.from({ length: MAX_ROUND_MOVES + 1 }, zeroState),
    startBoundary: initialBoundary(),
    remainingRanks: [Array(7).fill(0n), Array(7).fill(0n)],
    p1CloseConsent: zeroConsent(), p2CloseConsent: zeroConsent(),
  };
}

/** Validate a round's witness bundle before it costs a proof attempt. */
export function assertRoundWitnessShape(w) {
  if (!w || typeof w !== 'object') throw new Error('proveRound needs witnesses from rollup-v3p-referee finishRound(): { moves, snapshots, remaining, boundaryIn } plus entropyPair and this round\'s two secrets.');
  if (!Array.isArray(w.moves) || w.moves.length !== MAX_ROUND_MOVES) throw new Error(`witnesses.moves must have exactly ${MAX_ROUND_MOVES} slots (got ${w.moves?.length}).`);
  if (!Array.isArray(w.snapshots) || w.snapshots.length !== MAX_ROUND_MOVES + 1) throw new Error(`witnesses.snapshots must have exactly ${MAX_ROUND_MOVES + 1} states (got ${w.snapshots?.length}).`);
  if (!Array.isArray(w.remaining) || w.remaining.length !== 2 || w.remaining.some((r) => r.length !== 7)) throw new Error('witnesses.remaining must be two 7-slot rank vectors.');
  if (!Array.isArray(w.roundSecrets) || w.roundSecrets.length !== 2) throw new Error('witnesses.roundSecrets must be [p1Secret, p2Secret] for THIS round.');
  if (!Array.isArray(w.entropyPair) || w.entropyPair.length !== 2) throw new Error('witnesses.entropyPair must be [p1Entropy, p2Entropy].');
  if (!w.boundaryIn || typeof w.boundaryIn.round !== 'bigint') throw new Error('witnesses.boundaryIn must be the Boundary the previous proof wrote (initialBoundary() for round 1).');
}

// ---------------------------------------------------------------------------
// Bindings loader. The provider bridge itself lives in providers.js (shared
// by every adapter since the ledger-9 migration).
async function loadModule(managedDir) {
  return import(pathToFileURL(path.resolve(managedDir, 'contract', 'index.js')).href);
}
async function buildDefaultProviders({ walletHandle, endpoints, networkId, managedDir, proofServerUrl }) {
  return buildLedger9Providers({
    walletHandle, endpoints, networkId, managedDir, proofServerUrl,
    storeName: 'pob-rollup-v3p', storeDirName: 'private-state-rollup-v3p',
  });
}

const txHash = (f) => (f?.public ?? f)?.txHash ?? (f?.public ?? f)?.txId ?? null;
const blockHeight = (f) => { const h = (f?.public ?? f)?.blockHeight ?? (f?.public ?? f)?.tx?.blockHeight ?? null; return h == null ? null : Number(h); };

// ---------------------------------------------------------------------------
/**
 * @param {object} options
 * @param {string} options.networkId     undeployed | preview | preprod | mainnet
 * @param {object} [options.walletHandle]
 * @param {object} [options.endpoints]
 * @param {string} [options.seedHex]     only for the fresh-seed guard on public networks
 * @param {string} [options.managedDir]
 * @param {string} [options.proofServerUrl]
 * @param {object} [options._internals]  test seams
 */
export async function getV3pContractApi({
  networkId, walletHandle, endpoints, seedHex, managedDir = DEFAULT_V3P_MANAGED_DIR, proofServerUrl, _internals = {},
}) {
  assertSupportedNetwork(networkId);
  if (seedHex !== undefined) assertFreshPublicSeed(seedHex, networkId);
  const internals = {
    loadContractModule: loadModule, buildProviders: buildDefaultProviders,
    deployContract: midnightDeployContract, findDeployedContract: midnightFindDeployedContract, ..._internals,
  };
  const { Contract, ledger: decodeV3pLedger, pureCircuits } = await internals.loadContractModule(managedDir);
  if (typeof Contract !== 'function' || typeof decodeV3pLedger !== 'function') {
    throw new Error(`v3p bindings at ${managedDir} are incomplete. Compile: compact compile +0.31.1 realDeal/contracts/proof-or-bluff-rollup-v3p.compact ${managedDir}`);
  }

  // Witness slot: null = nothing staged → zero-shaped bundle. proveRound/closeGame
  // set it right before the call and clear it in finally.
  let staged = null;
  const w = (name) => (staged ?? zeroWitnessBundle())[name];
  const witnesses = {
    entropyPair(ctx) { return [ctx.privateState, w('entropyPair')]; },
    roundSecrets(ctx) { return [ctx.privateState, w('roundSecrets')]; },
    roundMoves(ctx) { return [ctx.privateState, w('roundMoves')]; },
    roundSnapshots(ctx) { return [ctx.privateState, w('roundSnapshots')]; },
    startBoundary(ctx) { return [ctx.privateState, w('startBoundary')]; },
    remainingRanks(ctx) { return [ctx.privateState, w('remainingRanks')]; },
    p1CloseConsent(ctx) { return [ctx.privateState, w('p1CloseConsent')]; },
    p2CloseConsent(ctx) { return [ctx.privateState, w('p2CloseConsent')]; },
    get_challenge_reduction: challengeReductionWitness,
  };
  const compiledContract = CompiledContract.make(V3P_CONTRACT_NAME, Contract).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(managedDir),
  );
  const providers = await internals.buildProviders({ walletHandle, endpoints, networkId, managedDir, proofServerUrl });

  let deployed = null;
  let contractAddress = null;
  let queue = Promise.resolve();
  const serialize = (op) => (...args) => { const p = queue.then(() => op(...args)); queue = p.catch(() => {}); return p; };
  const requireAttached = (op) => {
    if (!deployed) throw new Error(`${op} called before deployGame() or joinAt(address).`);
    return deployed;
  };
  const callCircuit = (name, ...args) => {
    const circuit = requireAttached(name).callTx?.[name];
    if (typeof circuit !== 'function') throw new Error(`Circuit "${name}" is not callable on the attached v3p contract.`);
    return withDustRetry(name, () => circuit(...args));
  };
  const readLedger = async () => {
    const read = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!read) throw new Error(`The indexer has no state for v3p game ${contractAddress} yet. Wait for the deploy tx to be indexed and retry.`);
    // 5.0 returns SerializedContractState (bytes + era); decode with our own
    // compact-runtime copy, the one the contract was compiled against.
    return decodeV3pLedger(read.contractState.deserialize({ v9: ContractState }).data);
  };

  return {
    get address() { return contractAddress; },
    pureCircuits,

    /**
     * Deploy ONE game. This is openGame. Mainnet requires
     * POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT.
     * @param {object} g  { playerOne, playerTwo, mode, p1EntropyCommit, p2EntropyCommit, p1RoundCommits[6], p2RoundCommits[6] }
     */
    deployGame: serialize(async (g) => {
      assertMainnetDeployApproved(networkId);
      if (deployed) throw new Error(`Already attached to ${contractAddress}. Create a new api instance per game.`);
      const commits = (list, label) => {
        if (!Array.isArray(list) || list.length !== MAX_ROUNDS) throw new Error(`${label} must be ${MAX_ROUNDS} round-secret commitments.`);
        return list.map((c, i) => toBytes32(c, `${label}[${i}]`));
      };
      const args = [
        toBytes32(g.playerOne, 'playerOne'), toBytes32(g.playerTwo, 'playerTwo'), BigInt(g.mode),
        toBytes32(g.p1EntropyCommit, 'p1EntropyCommit'), toBytes32(g.p2EntropyCommit, 'p2EntropyCommit'),
        commits(g.p1RoundCommits, 'p1RoundCommits'), commits(g.p2RoundCommits, 'p2RoundCommits'),
      ];
      deployed = await withDustRetry('deploy-v3p-game', () => internals.deployContract(providers, {
        compiledContract, privateStateId: V3P_PRIVATE_STATE_ID, initialPrivateState: {}, args,
      }));
      contractAddress = deployed.deployTxData?.public?.contractAddress ?? null;
      if (!contractAddress) throw new Error('deployContract returned no contractAddress.');
      return { contractAddress, txHash: txHash(deployed.deployTxData), blockHeight: blockHeight(deployed.deployTxData) };
    }),

    joinAt: serialize(async (address) => {
      if (typeof address !== 'string' || !/^(0x)?[0-9a-fA-F]{64,}$/.test(address)) throw new Error('joinAt needs the hex contract address printed by deployGame().');
      deployed = await internals.findDeployedContract(providers, {
        contractAddress: address, compiledContract, privateStateId: V3P_PRIVATE_STATE_ID, initialPrivateState: {},
      });
      contractAddress = address;
      return { contractAddress };
    }),

    /**
     * Prove one completed round. `witnesses` = referee finishRound() output
     * plus { entropyPair, roundSecrets } for THIS round.
     */
    proveRound: serialize(async ({ round, witnesses: rw }) => {
      assertRoundWitnessShape(rw);
      staged = {
        entropyPair: rw.entropyPair.map((v, i) => toBytes32(v, `entropyPair[${i}]`)),
        roundSecrets: rw.roundSecrets.map((v, i) => toBytes32(v, `roundSecrets[${i}]`)),
        roundMoves: rw.moves, roundSnapshots: rw.snapshots, startBoundary: rw.boundaryIn, remainingRanks: rw.remaining,
        p1CloseConsent: zeroConsent(), p2CloseConsent: zeroConsent(),
      };
      try {
        const f = await callCircuit('proveRound', BigInt(round));
        return { round: BigInt(round), txHash: txHash(f), blockHeight: blockHeight(f) };
      } finally { staged = null; }
    }),

    /** Close with both signed consents. `boundary` = referee result().boundary. */
    closeGame: serialize(async ({ boundary, p1Score, p2Score, winner, p1CloseConsent, p2CloseConsent }) => {
      if (!boundary || !p1CloseConsent || !p2CloseConsent) throw new Error('closeGame needs { boundary, p1Score, p2Score, winner, p1CloseConsent, p2CloseConsent }.');
      staged = { ...zeroWitnessBundle(), startBoundary: boundary, p1CloseConsent, p2CloseConsent };
      try {
        const f = await callCircuit('closeGame', BigInt(p1Score), BigInt(p2Score), BigInt(winner));
        return { txHash: txHash(f), blockHeight: blockHeight(f) };
      } finally { staged = null; }
    }),

    async readGame() { requireAttached('readGame'); return readLedger(); },
    _hasStagedWitnesses() { return staged !== null; },
  };
}

export { bytesToHex };
