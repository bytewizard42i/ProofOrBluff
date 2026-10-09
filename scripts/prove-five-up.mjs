// prove-five-up.mjs — real-proof gate for 5 Up 2 Down (five-up-two-down.compact).
//
// Plays rounds with the referee until the game ends (Casual, race to 10, so
// it ends fast), proves EVERY proveRound(r) on a real proof server, then
// proves closeGame. Never submits to a chain.
//
//   node scripts/prove-five-up.mjs [proof-server-url]   (default http://127.0.0.1:16300)

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { Contract, pureCircuits, ledger as decodeLedger } from '../realDeal/contracts/managed/five-up-two-down/contract/index.js';
import { createFiveUpReferee, MAX_ROUNDS, initialBoundary, matchesFor } from '../realDeal/contracts/five-up-referee.js';
import { consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness, gameIdFromContractAddress } from '../realDeal/cli/src/rollup-consent.js';

const PROOF_SERVER = process.argv[2] ?? process.env.POB_PROOF_SERVER ?? 'http://127.0.0.1:16300';
const MANAGED_DIR = new URL('../realDeal/contracts/managed/five-up-two-down', import.meta.url).pathname;
const SPONSOR = '33'.repeat(32);
const MODE = 0n;   // Casual: race to 10 → few rounds → few proofs

const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x61));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x62));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(5);
const E2 = new Uint8Array(32).fill(11);
const secretsFor = (seat) => Array.from({ length: MAX_ROUNDS }, (_, i) => new Uint8Array(32).fill(0x20 * (seat + 1) + i + 1));
const SECRETS = [secretsFor(0), secretsFor(1)];
const seed = pureCircuits.combineEntropy(E1, E2);

const witness = { entropy: [E1, E2], roundSecrets: [new Uint8Array(32), new Uint8Array(32)], moves: [], cards: [], ranks: [], digests: [], boundary: initialBoundary(), p1: null, p2: null };
const witnesses = {
  entropyPair: (c) => [c.privateState, witness.entropy],
  roundSecrets: (c) => [c.privateState, witness.roundSecrets],
  roundMoves: (c) => [c.privateState, witness.moves],
  roundDigests: (c) => [c.privateState, witness.digests],
  dealtCards: (c) => [c.privateState, witness.cards],
  dealtRanks: (c) => [c.privateState, witness.ranks],
  startBoundary: (c) => [c.privateState, witness.boundary],
  p1CloseConsent: (c) => [c.privateState, witness.p1],
  p2CloseConsent: (c) => [c.privateState, witness.p2],
  get_challenge_reduction: (c, f) => challengeReductionWitness(c, f),
};

/** Honest claims from both seats — a seat with no match PASSES (showdown);
 *  the responder challenges every 2-claim. */
let passes = 0;
function playRound(ref) {
  ref.startRound();
  while (!ref.state.done) {
    const st = ref.state;
    const m = matchesFor(ref.hole(st.actor), st.board);
    if (m.length === 0) { ref.pass(); passes += 1; continue; }
    ref.claim(BigInt(m.length), m[0] ?? 0n, m[1] ?? 0n);
    if (m.length === 2) ref.challenge(); else ref.accept();
  }
  return ref.finishRound();
}

console.log('[1] constructing one game on the sim ledger…');
const contract = new Contract(witnesses);
const commits = (seat) => SECRETS[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
const initial = contract.initialState(runtime.createConstructorContext({}, SPONSOR),
  P1, P2, MODE, pureCircuits.commitEntropy(E1), pureCircuits.commitEntropy(E2), commits(0), commits(1));
let context = runtime.createCircuitContext(runtime.dummyContractAddress(), SPONSOR, initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, 1_800_000_000);
const ref = createFiveUpReferee(pureCircuits, { seed, roundSecrets: SECRETS, mode: MODE });

setNetworkId('undeployed');
const zkConfigProvider = new NodeZkConfigProvider(MANAGED_DIR);
const compiledContract = CompiledContract.make('five-up-two-down', Contract).pipe(
  CompiledContract.withWitnesses(witnesses), CompiledContract.withCompiledFileAssets(MANAGED_DIR),
);
const contractAddress = ledger.sampleContractAddress();
const common = { compiledContract, contractAddress, coinPublicKey: ledger.sampleCoinPublicKey(), initialZswapChainState: new ledger.ZswapChainState(), ledgerParameters: ledger.LedgerParameters.initialParameters() };
const proofProvider = httpClientProofProvider(PROOF_SERVER, zkConfigProvider, { timeout: 3_600_000 });

let contractState = initial.currentContractState;
let privateState = initial.currentPrivateState;
const times = [];
while (!ref.boundary.ended) {
  const fin = playRound(ref);
  const r = Number(fin.round);
  witness.roundSecrets = [SECRETS[0][r - 1], SECRETS[1][r - 1]];
  witness.moves = fin.moves; witness.cards = fin.cards; witness.ranks = fin.ranks; witness.digests = fin.digests; witness.boundary = fin.boundaryIn;
  const sim = contract.circuits.proveRound(context, BigInt(r));
  context = sim.context;
  const unproven = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
    ...common, circuitId: 'proveRound', args: [BigInt(r)], initialContractState: contractState, initialPrivateState: privateState,
  }, ledger.sampleEncryptionPublicKey());
  const t0 = Date.now();
  const proven = await proofProvider.proveTx(unproven.private.unprovenTx);
  const secs = (Date.now() - t0) / 1000; times.push(secs);
  const sd = fin.outcomes.filter((o) => o.pass).map((o) => `pass by seat ${o.claimant}: drew ${o.draws.join(',')} → +${o.responderGain}`).join('; ');
  console.log(`[round ${r}] score ${fin.boundaryOut.score0}-${fin.boundaryOut.score1}${sd ? ` [${sd}]` : ''} — PROOF ACCEPTED in ${secs.toFixed(1)}s (${(proven.serialize().length / 1024).toFixed(0)} KB)`);
  contractState = initial.currentContractState; contractState.data = context.currentQueryContext.state;
  privateState = context.currentPrivateState;
}

const result = ref.result();
const consent = buildCloseConsent(pureCircuits, {
  gameId: gameIdFromContractAddress(contractAddress), transcriptRoot: result.transcriptChain, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
});
witness.boundary = result.boundary;
witness.p1 = signCloseConsent(pureCircuits, consent, KP1);
witness.p2 = signCloseConsent(pureCircuits, consent, KP2);
const unprovenClose = await createUnprovenCallTxFromInitialStates(zkConfigProvider, {
  ...common, circuitId: 'closeGame', args: [result.p1Score, result.p2Score, result.winner], initialContractState: contractState, initialPrivateState: privateState,
}, ledger.sampleEncryptionPublicKey());
const t0 = Date.now();
await proofProvider.proveTx(unprovenClose.private.unprovenTx);
console.log(`[close] PROOF ACCEPTED in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`\nREAL PROOFS GENERATED: ${times.length} rounds (avg ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)}s) + closeGame, ${passes} pass showdown(s). winner=${result.winner}, ${result.p1Score}-${result.p2Score}.`);
