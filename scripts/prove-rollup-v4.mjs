// prove-rollup-v3p.mjs — real-proof gate for the v4 (shared-deck, empty-hand-wins) rollup.
//
// Constructs one game (constructor == openGame), plays round 1 through the
// referee, builds an UNPROVEN proveRound(1) tx via midnight-js and proves it on
// a real proof server; if round 1 ended the game, proves closeGame too.
// Nothing is submitted to any chain.
//
//   node scripts/prove-rollup-v3p.mjs [proof-server-url]   (default http://127.0.0.1:16300)
//   POB_V3P_TRUSTING=1  → accept every claim so round 1 rolls over (no close)

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { Contract, pureCircuits, ledger as decodeLedger } from '../realDeal/contracts/managed/proof-or-bluff-rollup-v4/contract/index.js';
import { createV4Referee, KIND, MAX_ROUNDS, initialBoundary, roundFinished } from '../realDeal/contracts/rollup-v4-referee.js';
import { consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness, gameIdFromContractAddress } from '../realDeal/cli/src/rollup-consent.js';

const PROOF_SERVER = process.argv[2] ?? process.env.POB_PROOF_SERVER ?? 'http://127.0.0.1:16300';
const MANAGED_DIR = new URL('../realDeal/contracts/managed/proof-or-bluff-rollup-v4', import.meta.url).pathname;
const SPONSOR = '33'.repeat(32);
const TRUSTING = process.env.POB_V3P_TRUSTING === '1';

const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x51));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x52));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(3);
const E2 = new Uint8Array(32).fill(7);
const MODE = 1n;
const secretsFor = (seat) => Array.from({ length: MAX_ROUNDS }, (_, i) => new Uint8Array(32).fill(0x10 * (seat + 1) + i + 1));
const SECRETS = [secretsFor(0), secretsFor(1)];
const seed = pureCircuits.combineEntropy(E1, E2);

const witness = {
  entropy: [E1, E2], roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
  moves: [], snapshots: [], boundary: initialBoundary(), remaining: [Array(7).fill(0n), Array(7).fill(0n)],
  p1CloseConsent: null, p2CloseConsent: null,
};
const witnesses = {
  entropyPair: (ctx) => [ctx.privateState, witness.entropy],
  roundSecrets: (ctx) => [ctx.privateState, witness.roundSecrets],
  roundMoves: (ctx) => [ctx.privateState, witness.moves],
  roundSnapshots: (ctx) => [ctx.privateState, witness.snapshots],
  startBoundary: (ctx) => [ctx.privateState, witness.boundary],
  remainingRanks: (ctx) => [ctx.privateState, witness.remaining],
  p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
  p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
  get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
};

function takeCards(hand, rank, count, { lie = false } = {}) {
  const cards = []; const h = [...hand];
  const order = lie
    ? [...Array(13).keys()].filter((r) => BigInt(r) !== rank).concat([Number(rank)])
    : [Number(rank)].concat([...Array(13).keys()].filter((r) => BigInt(r) !== rank));
  for (const r of order) while (cards.length < count && h[r] > 0n) { cards.push(BigInt(r)); h[r] -= 1n; }
  if (cards.length < count) throw new Error('not enough cards to play');
  return cards;
}
function playRound(ref) {
  let salt = 1000n; let truths = 0;
  ref.startRound();
  while (!roundFinished(ref.state, ref.size)) {
    const s = ref.state;
    if (s.pending) {
      const bluff = !ref.truthfulPending;
      if (!TRUSTING && (bluff || (++truths % 3 === 0))) ref.challenge(); else ref.accept();
      continue;
    }
    const hand = ref.hands[Number(s.turn)];
    const holds = hand[Number(s.currentRank)] > 0n;
    ref.play(s.currentRank, 1n, takeCards(hand, s.currentRank, 1, { lie: !holds }), salt++);
  }
  return ref.finishRound();
}
const stageRound = (r) => {
  witness.roundSecrets = [SECRETS[0][Number(r.round) - 1], SECRETS[1][Number(r.round) - 1]];
  witness.moves = r.moves; witness.snapshots = r.snapshots; witness.boundary = r.boundaryIn; witness.remaining = r.remaining;
};

console.log('[1/5] constructing one game (constructor == openGame) on the sim ledger…');
const contract = new Contract(witnesses);
const commits = (seat) => SECRETS[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
const initial = contract.initialState(
  runtime.createConstructorContext({}, SPONSOR),
  P1, P2, MODE, pureCircuits.commitEntropy(E1), pureCircuits.commitEntropy(E2), commits(0), commits(1),
);
const context = runtime.createCircuitContext(
  runtime.dummyContractAddress(), SPONSOR, initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, 1_800_000_000,
);
const ref = createV4Referee(pureCircuits, { seed, roundSecrets: SECRETS, mode: MODE });
const round1 = playRound(ref);
console.log(`      round 1: ${round1.moves.filter((m) => m.kind !== KIND.NOOP).length} moves, ended=${round1.boundaryOut.ended}, scores ${round1.boundaryOut.score0}-${round1.boundaryOut.score1}`);

console.log('[2/5] proveRound(1) against the sim ledger (constraint smoke test)…');
stageRound(round1);
const r1 = contract.circuits.proveRound(context, 1n);
const after = decodeLedger(r1.context.currentQueryContext.state);
if (after.roundsProven !== 1n) throw new Error('sim proveRound did not advance roundsProven');
console.log(`      sim ledger: roundsProven=${after.roundsProven} ended=${after.ended}`);

console.log('[3/5] building the unproven proveRound(1) transaction…');
setNetworkId('undeployed');
const zkConfigProvider = new NodeZkConfigProvider(MANAGED_DIR);
const compiledContract = CompiledContract.make('proof-or-bluff-rollup-v4', Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(MANAGED_DIR),
);
stageRound(round1);
const contractAddress = ledger.sampleContractAddress();
const common = {
  compiledContract, contractAddress, coinPublicKey: ledger.sampleCoinPublicKey(),
  initialZswapChainState: new ledger.ZswapChainState(), ledgerParameters: ledger.LedgerParameters.initialParameters(),
};
const unprovenRound = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  ...common, circuitId: 'proveRound', args: [1n],
  initialContractState: initial.currentContractState, initialPrivateState: initial.currentPrivateState,
}, ledger.sampleEncryptionPublicKey());
console.log(`      unproven tx built (${(unprovenRound.private.unprovenTx.serialize().length / 1024).toFixed(0)} KB)`);

console.log(`[4/5] proving proveRound(1) at ${PROOF_SERVER} (prover key ≈ 39 MB inlined)…`);
const proofProvider = httpClientProofProvider(PROOF_SERVER, zkConfigProvider, { timeout: 3_600_000 });
let started = Date.now();
const provenRound = await proofProvider.proveTx(unprovenRound.private.unprovenTx);
console.log(`      PROOF ACCEPTED: proveRound(1) in ${((Date.now() - started) / 1000).toFixed(1)}s — proven tx ${(provenRound.serialize().length / 1024).toFixed(0)} KB`);

if (!round1.boundaryOut.ended) {
  console.log('[5/5] round 1 rolled over (game not ended) — closeGame not applicable this run.');
  console.log('\nREAL PROOF GENERATED. v4 proveRound proves end to end.');
} else {
  console.log('[5/5] game ended in round 1 — proving closeGame against the post-round state…');
  const result = ref.result();
  const root = pureCircuits.commitTranscript(result.transcriptChain);
  const consent = buildCloseConsent(pureCircuits, {
    gameId: gameIdFromContractAddress(contractAddress), transcriptRoot: result.transcriptChain, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
  });
  witness.boundary = result.boundary;
  witness.p1CloseConsent = signCloseConsent(pureCircuits, consent, KP1);
  witness.p2CloseConsent = signCloseConsent(pureCircuits, consent, KP2);
  const postRoundState = initial.currentContractState;
  postRoundState.data = r1.context.currentQueryContext.state;
  const unprovenClose = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
    ...common, circuitId: 'closeGame', args: [result.p1Score, result.p2Score, result.winner],
    initialContractState: postRoundState, initialPrivateState: r1.context.currentPrivateState,
  }, ledger.sampleEncryptionPublicKey());
  started = Date.now();
  const provenClose = await proofProvider.proveTx(unprovenClose.private.unprovenTx);
  console.log(`      PROOF ACCEPTED: closeGame in ${((Date.now() - started) / 1000).toFixed(1)}s — proven tx ${(provenClose.serialize().length / 1024).toFixed(0)} KB`);
  console.log(`\nREAL PROOFS GENERATED. v4 proveRound + closeGame prove end to end (winner=${result.winner}, ${result.p1Score}-${result.p2Score}).`);
}
