/**
 * cli/src/five-up-contract.js — chain binding for 5 Up 2 Down
 * (realDeal/contracts/five-up-two-down.compact). Same protocol shape as the
 * v4 rollup binding (one contract per game, proveRound per round, signed
 * close); only the witness bundle differs: four moves + the dealt ranks, no
 * snapshots/remaining.
 *
 * WHAT: deploy ONE contract per game (the constructor is openGame), stage one
 * round's private witnesses for exactly one `proveRound(r)` call, close with
 * both players' signed consents, and read the game's ledger back. Mirrors
 * rollup-contract.js (v2) for the provider stack, DUST retry and network
 * guards — those are imported, not re-implemented, so the bindings cannot
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
import { access } from 'node:fs/promises';
import { initialBoundary, MAX_ROUNDS, MOVES_PER_ROUND } from '../../contracts/five-up-referee.js';

export const FIVE_UP_CONTRACT_NAME = 'five-up-two-down';
export const FIVE_UP_PRIVATE_STATE_ID = 'pob:five-up:private';
const cliSourceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FIVE_UP_MANAGED_DIR = path.resolve(cliSourceDirectory, '..', '..', 'contracts', 'managed', FIVE_UP_CONTRACT_NAME);

/** True when the proving keys are on disk — the service enables the table only then. */
export async function hasKeys(managedDir = DEFAULT_FIVE_UP_MANAGED_DIR) {
  try { await access(path.join(managedDir, 'keys', 'proveRound.prover')); return true; } catch { return false; }
}

// ---------------------------------------------------------------------------
// Zero-shaped witnesses: the runtime may call every witness on every circuit
// (closeGame does not read roundMoves, but the Contract still constructs them).
// A wrong-shaped value fails deep inside the prover with a cryptic error.
const zeroMove = () => ({ kind: 0n, count: 0n, rankA: 0n, rankB: 0n });
const zeroConsent = () => ({
  credential: { sep: new Uint8Array(32), gameId: new Uint8Array(32), transcriptRoot: 0n, p1Score: 0n, p2Score: 0n, winner: 0n },
  signature: { r: { x: 0n, y: 0n }, s: 0n }, pk: { x: 0n, y: 0n },
});
export function zeroWitnessBundle() {
  return {
    entropyPair: [new Uint8Array(32), new Uint8Array(32)],
    roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
    roundMoves: Array.from({ length: MOVES_PER_ROUND }, zeroMove),
    roundDigests: [Array(32).fill(0n), Array(32).fill(0n), Array(32).fill(0n)],
    dealtCards: Array(13).fill(0n),
    dealtRanks: Array(13).fill(0n),
    startBoundary: initialBoundary(),
    p1CloseConsent: zeroConsent(), p2CloseConsent: zeroConsent(),
  };
}

/** Validate a round's witness bundle before it costs a proof attempt. */
export function assertRoundWitnessShape(w) {
  if (!w || typeof w !== 'object') throw new Error('proveRound needs witnesses from five-up-referee finishRound(): { moves, ranks, boundaryIn } plus entropyPair and this round\'s two secrets.');
  if (!Array.isArray(w.moves) || w.moves.length !== MOVES_PER_ROUND) throw new Error(`witnesses.moves must have exactly ${MOVES_PER_ROUND} slots (got ${w.moves?.length}).`);
  if (!Array.isArray(w.digests) || w.digests.length !== 3) throw new Error('witnesses.digests must be the three round digests.');
  if (!Array.isArray(w.cards) || w.cards.length !== 13) throw new Error('witnesses.cards must be the thirteen dealt card indices.');
  if (!Array.isArray(w.ranks) || w.ranks.length !== 13) throw new Error('witnesses.ranks must be the thirteen dealt ranks.');
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
    storeName: 'pob-five-up', storeDirName: 'private-state-five-up',
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
export async function getFiveUpContractApi({
  networkId, walletHandle, endpoints, seedHex, managedDir = DEFAULT_FIVE_UP_MANAGED_DIR, proofServerUrl, _internals = {},
}) {
  assertSupportedNetwork(networkId);
  if (seedHex !== undefined) assertFreshPublicSeed(seedHex, networkId);
  const internals = {
    loadContractModule: loadModule, buildProviders: buildDefaultProviders,
    deployContract: midnightDeployContract, findDeployedContract: midnightFindDeployedContract, ..._internals,
  };
  const { Contract, ledger: decodeLedger, pureCircuits } = await internals.loadContractModule(managedDir);
  if (typeof Contract !== 'function' || typeof decodeLedger !== 'function') {
    throw new Error(`5U2D bindings at ${managedDir} are incomplete. Compile: compact compile +0.31.1 realDeal/contracts/five-up-two-down.compact ${managedDir}`);
  }

  // Witness slot: null = nothing staged → zero-shaped bundle. proveRound/closeGame
  // set it right before the call and clear it in finally.
  let staged = null;
  const w = (name) => (staged ?? zeroWitnessBundle())[name];
  const witnesses = {
    entropyPair(ctx) { return [ctx.privateState, w('entropyPair')]; },
    roundSecrets(ctx) { return [ctx.privateState, w('roundSecrets')]; },
    roundMoves(ctx) { return [ctx.privateState, w('roundMoves')]; },
    roundDigests(ctx) { return [ctx.privateState, w('roundDigests')]; },
    dealtCards(ctx) { return [ctx.privateState, w('dealtCards')]; },
    dealtRanks(ctx) { return [ctx.privateState, w('dealtRanks')]; },
    startBoundary(ctx) { return [ctx.privateState, w('startBoundary')]; },
    p1CloseConsent(ctx) { return [ctx.privateState, w('p1CloseConsent')]; },
    p2CloseConsent(ctx) { return [ctx.privateState, w('p2CloseConsent')]; },
    get_challenge_reduction: challengeReductionWitness,
  };
  const compiledContract = CompiledContract.make(FIVE_UP_CONTRACT_NAME, Contract).pipe(
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
    if (typeof circuit !== 'function') throw new Error(`Circuit "${name}" is not callable on the attached 5U2D contract.`);
    return withDustRetry(name, () => circuit(...args));
  };
  const readLedger = async () => {
    const read = await providers.publicDataProvider.queryContractState(contractAddress);
    if (!read) throw new Error(`The indexer has no state for 5U2D game ${contractAddress} yet. Wait for the deploy tx to be indexed and retry.`);
    // 5.0 returns SerializedContractState (bytes + era); decode with our own
    // compact-runtime copy, the one the contract was compiled against.
    return decodeLedger(read.contractState.deserialize({ v9: ContractState }).data);
  };

  return {
    get address() { return contractAddress; },
    pureCircuits,

    /**
     * Deploy ONE game. This is openGame. Mainnet requires
     * POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT.
     * @param {object} g  { playerOne, playerTwo, mode, p1EntropyCommit, p2EntropyCommit, p1RoundCommits[10], p2RoundCommits[10] }
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
      deployed = await withDustRetry('deploy-five-up-game', () => internals.deployContract(providers, {
        compiledContract, privateStateId: FIVE_UP_PRIVATE_STATE_ID, initialPrivateState: {}, args,
      }));
      contractAddress = deployed.deployTxData?.public?.contractAddress ?? null;
      if (!contractAddress) throw new Error('deployContract returned no contractAddress.');
      return { contractAddress, txHash: txHash(deployed.deployTxData), blockHeight: blockHeight(deployed.deployTxData) };
    }),

    joinAt: serialize(async (address) => {
      if (typeof address !== 'string' || !/^(0x)?[0-9a-fA-F]{64,}$/.test(address)) throw new Error('joinAt needs the hex contract address printed by deployGame().');
      deployed = await internals.findDeployedContract(providers, {
        contractAddress: address, compiledContract, privateStateId: FIVE_UP_PRIVATE_STATE_ID, initialPrivateState: {},
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
        roundMoves: rw.moves, roundDigests: rw.digests, dealtCards: rw.cards.map(BigInt), dealtRanks: rw.ranks.map(BigInt), startBoundary: rw.boundaryIn,
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
