// prove-rollup-close.mjs — the real-proof gate for the rollup contract.
//
// WHAT: plays a complete scripted game through the REAL compiled circuit
// (same sim-context execution as proof-or-bluff-rollup.sim.test.js), stages
// the referee's witnesses plus both players' signed CloseConsents, builds an
// UNPROVEN closeGame call transaction via midnight-js, and sends it to a real
// proof server. A simulator run is not a proof — this script is the first
// point at which the actual PLONK pipeline must accept our circuit.
//
// USAGE:
//   node scripts/prove-rollup-close.mjs [proof-server-url]
// Default proof server: https://proof.prooforbluff.app (the VPS).
//
// It never submits anything to a chain — proveTx only asks the server for a
// proof. A successful return means the circuit + witnesses + keys produce a
// valid ZK proof; on-chain acceptance is then rehearsed on Preview/Preprod.

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { Contract, pureCircuits } from '../realDeal/contracts/managed/proof-or-bluff-rollup/contract/index.js';
import { createReferee, KIND, MAX_MOVES } from '../realDeal/contracts/rollup-referee.js';
import {
  consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness,
} from '../realDeal/cli/src/rollup-consent.js';

const PROOF_SERVER = process.argv[2] ?? process.env.POB_PROOF_SERVER ?? 'https://proof.prooforbluff.app';
const MANAGED_DIR = new URL('../realDeal/contracts/managed/proof-or-bluff-rollup', import.meta.url).pathname;
const SPONSOR = '33'.repeat(32);
const NOW = 1_800_000_000n;

// --- one deterministic complete game (same fixtures as the sim test) ------
const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x51));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x52));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(3);
const E2 = new Uint8Array(32).fill(7);
const SALT1 = new Uint8Array(32).fill(0xa1);
const SALT2 = new Uint8Array(32).fill(0xb2);
const MODE = 1n; // STANDARD — 7 cards, threshold 15

function takeCards(hand, rank, count, { lie = false } = {}) {
  const cards = [];
  const h = [...hand];
  const order = lie
    ? [...Array(13).keys()].filter((r) => BigInt(r) !== rank).concat([Number(rank)])
    : [Number(rank)].concat([...Array(13).keys()].filter((r) => BigInt(r) !== rank));
  for (const r of order) while (cards.length < count && h[r] > 0n) { cards.push(BigInt(r)); h[r] -= 1n; }
  if (cards.length < count) throw new Error('not enough cards to play');
  return cards;
}

function playScriptedGame(ref, { challengeEvery = 3 } = {}) {
  let salt = 1000n;
  let truths = 0;
  while (!ref.state.ended && ref.moves.length < MAX_MOVES) {
    const s = ref.state;
    if (s.pending) {
      const bluff = !ref.truthfulPending;
      if (bluff || (++truths % challengeEvery === 0)) ref.challenge(); else ref.accept();
      continue;
    }
    const hand = s.turn === 0n ? s.hand0 : s.hand1;
    const holds = hand[Number(s.currentRank)] > 0n;
    const cards = takeCards(hand, s.currentRank, 1, { lie: !holds });
    ref.play(s.currentRank, 1n, cards, salt++);
  }
  ref.pad();
  return ref.result();
}

// --- witnesses ------------------------------------------------------------
const witness = {
  entropy: [E1, E2], salts: [SALT1, SALT2], transcript: [], snapshots: [],
  p1CloseConsent: null, p2CloseConsent: null,
};
const witnesses = {
  entropyPair: (ctx) => [ctx.privateState, witness.entropy],
  saltPair: (ctx) => [ctx.privateState, witness.salts],
  transcript: (ctx) => [ctx.privateState, witness.transcript],
  snapshots: (ctx) => [ctx.privateState, witness.snapshots],
  p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
  p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
  get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
};

// --- sim execution: deploy + openGame, exactly like the sim test ----------
console.log('[1/4] running a full scripted game through the real compiled circuit…');
const contract = new Contract(witnesses);
const initial = contract.initialState(runtime.createConstructorContext({}, SPONSOR));
let context = runtime.createCircuitContext(
  runtime.dummyContractAddress(), SPONSOR,
  initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, Number(NOW),
);
const call = (name, ...args) => {
  const r = contract.circuits[name](context, ...args);
  context = r.context;
  return r.result;
};

const gameId = call('openGame', P1, P2, MODE,
  pureCircuits.commitEntropy(E1), pureCircuits.commitHandSalt(SALT1),
  pureCircuits.commitEntropy(E2), pureCircuits.commitHandSalt(SALT2), NOW);
console.log(`      gameId ${Buffer.from(gameId).toString('hex').slice(0, 16)}… opened on sim ledger`);

const seed = pureCircuits.combineEntropy(E1, E2);
const result = playScriptedGame(createReferee(pureCircuits, { seed, salts: [SALT1, SALT2], mode: MODE }));
console.log(`      game ended: winner=${result.winner} scores=${result.p1Score}-${result.p2Score} root=${result.transcriptRoot.toString(16).slice(0, 16)}…`);

witness.transcript = result.witnesses.transcript;
witness.snapshots = result.witnesses.snapshots;
const consent = buildCloseConsent(pureCircuits, {
  gameId, transcriptRoot: result.transcriptRoot,
  p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
});
witness.p1CloseConsent = signCloseConsent(pureCircuits, consent, KP1);
witness.p2CloseConsent = signCloseConsent(pureCircuits, consent, KP2);
console.log('      both players signed the CloseConsent');

// --- sanity: the sim circuit itself accepts everything before we prove ----
console.log('[2/4] checking closeGame against the sim ledger (constraint smoke test)…');
call('closeGame', gameId, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, NOW);
const record = (await import('../realDeal/contracts/managed/proof-or-bluff-rollup/contract/index.js'))
  .ledger(context.currentQueryContext.state).games.lookup(gameId);
if (!record.closed) throw new Error('sim closeGame did not record the close');
console.log('      sim ledger shows the game closed — constraints satisfied');

// --- build the UNPROVEN transaction ---------------------------------------
console.log('[3/4] building the unproven closeGame transaction…');
setNetworkId('undeployed');
const zkConfigProvider = new NodeZkConfigProvider(MANAGED_DIR);
const compiledContract = CompiledContract.make('proof-or-bluff-rollup', Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(MANAGED_DIR),
);

// The post-openGame sim ledger state is exactly what a chain call would see.
// Re-open the game on a fresh sim context for a clean pre-close state.
const contract2 = new Contract(witnesses);
const initial2 = contract2.initialState(runtime.createConstructorContext({}, SPONSOR));
let context2 = runtime.createCircuitContext(
  runtime.dummyContractAddress(), SPONSOR,
  initial2.currentContractState.data, initial2.currentPrivateState, undefined, undefined, Number(NOW),
);
const openResult = contract2.circuits.openGame(context2, P1, P2, MODE,
  pureCircuits.commitEntropy(E1), pureCircuits.commitHandSalt(SALT1),
  pureCircuits.commitEntropy(E2), pureCircuits.commitHandSalt(SALT2), NOW);

// The sim exposes the post-open state as a ChargedState; midnight-js wants a
// ledger ContractState. Reuse the deployment's own ContractState and swap its
// data — serialize/deserialize normalizes it across the two wasm bundles.
const postOpenContractState = initial2.currentContractState;
postOpenContractState.data = openResult.context.currentQueryContext.state;

const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
const unsubmitted = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  compiledContract,
  circuitId: 'closeGame',
  contractAddress: ledger.sampleContractAddress(),
  args: [gameId, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, nowSeconds],
  coinPublicKey: ledger.sampleCoinPublicKey(),
  initialContractState: postOpenContractState,
  initialZswapChainState: new ledger.ZswapChainState(),
  ledgerParameters: ledger.LedgerParameters.initialParameters(),
  initialPrivateState: openResult.context.currentPrivateState,
}, ledger.sampleEncryptionPublicKey());
const unprovenBytes = unsubmitted.private.unprovenTx.serialize();
console.log(`      unproven tx built (${(unprovenBytes.length / 1024 / 1024).toFixed(1)} MB serialized) — handing it to the proof server`);

// --- the real PLONK pipeline ----------------------------------------------
console.log(`[4/4] proving at ${PROOF_SERVER} — uploading ~340 MB key material, then the server proves…`);
// The proof-server protocol carries the prover key inside every /prove
// payload — there is no server-side keygen path. Browsers will never do this
// (hosted proving lives on our backend, where the key upload is a loopback
// hop); this harness runs it over the WAN once to prove the pipeline works.
const proofProvider = httpClientProofProvider(PROOF_SERVER, zkConfigProvider, { timeout: 3_600_000 });
const started = Date.now();
const provenTx = await proofProvider.proveTx(unsubmitted.private.unprovenTx);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const serialized = provenTx.serialize();
console.log(`      PROOF ACCEPTED by ${PROOF_SERVER} in ${seconds}s — proven tx is ${(serialized.length / 1024).toFixed(0)} KB`);
console.log('\nREAL PROOF GENERATED. The rollup closeGame circuit proves end to end.');
