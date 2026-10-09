import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  createFiveUpReferee, resolveClaim, resolvePass, matchesFor, KIND, MAX_ROUNDS, MOVES_PER_ROUND, initialBoundary, targetScore,
  dealThirteenIndices as dealIdx, dealThirteenRanks as dealRanks, floydNine, shuffleNine, skipDealt, showdownCards,
} from './five-up-referee.js';
import {
  consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness, gameIdFromContractAddress,
} from '../cli/src/rollup-consent.js';

const { Contract, pureCircuits, ledger } = await import('./managed/five-up-two-down/contract/index.js');

// 5 Up 2 Down: 2 private hole cards each + 5 public board cards + 2 showdown
// pairs (drawn when a claim step is a PASS) from one shared deck; claim your
// matches, opponent accepts or challenges. Every test runs the referee's moves
// through the REAL compiled circuit — a failure here is exactly the assertion
// that would fail on-chain.

const SPONSOR = '33'.repeat(32);
const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x61));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x62));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(5);
const E2 = new Uint8Array(32).fill(11);
const STANDARD = 1n;
const CASUAL = 0n;
const secretsFor = (seat) => Array.from({ length: MAX_ROUNDS }, (_, i) => new Uint8Array(32).fill(0x20 * (seat + 1) + i + 1));
const SECRETS = [secretsFor(0), secretsFor(1)];

function newGame({ mode = STANDARD, secrets = SECRETS, entropy = [E1, E2] } = {}) {
  const [e1, e2] = entropy;
  const seed = pureCircuits.combineEntropy(e1, e2);
  const witness = {
    entropy: [e1, e2], roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
    moves: [], cards: [], ranks: [], digests: [], boundary: initialBoundary(), p1CloseConsent: null, p2CloseConsent: null,
  };
  const contract = new Contract({
    entropyPair: (ctx) => [ctx.privateState, witness.entropy],
    roundSecrets: (ctx) => [ctx.privateState, witness.roundSecrets],
    roundMoves: (ctx) => [ctx.privateState, witness.moves],
    roundDigests: (ctx) => [ctx.privateState, witness.digests],
    dealtCards: (ctx) => [ctx.privateState, witness.cards],
    dealtRanks: (ctx) => [ctx.privateState, witness.ranks],
    startBoundary: (ctx) => [ctx.privateState, witness.boundary],
    p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
    p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
    get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
  });
  const commits = (seat) => secrets[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
  const initial = contract.initialState(
    runtime.createConstructorContext({}, SPONSOR),
    P1, P2, mode, pureCircuits.commitEntropy(e1), pureCircuits.commitEntropy(e2), commits(0), commits(1),
  );
  let context = runtime.createCircuitContext(
    runtime.dummyContractAddress(), SPONSOR,
    initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, 1_800_000_000,
  );
  const call = (name, ...args) => {
    const r = contract.circuits[name](context, ...args);
    context = r.context;
    return r.result;
  };
  const state = () => ledger(context.currentQueryContext.state);
  const referee = createFiveUpReferee(pureCircuits, { seed, roundSecrets: secrets, mode });

  const proveRound = (finished, { tamper } = {}) => {
    witness.roundSecrets = [secrets[0][Number(finished.round) - 1], secrets[1][Number(finished.round) - 1]];
    witness.moves = finished.moves.map((m) => ({ ...m }));
    witness.cards = [...finished.cards];
    witness.digests = finished.digests;
    witness.ranks = [...finished.ranks];
    witness.boundary = { ...finished.boundaryIn };
    if (tamper) tamper(witness);
    return call('proveRound', finished.round);
  };
  const closeGame = (over = {}, { kp1 = KP1, kp2 = KP2 } = {}) => {
    const r = referee.result();
    witness.boundary = { ...r.boundary };
    const consent = buildCloseConsent(pureCircuits, {
      gameId: gameIdFromContractAddress(runtime.dummyContractAddress()), transcriptRoot: r.transcriptChain,
      p1Score: over.p1Score ?? r.p1Score, p2Score: over.p2Score ?? r.p2Score, winner: over.winner ?? r.winner,
    });
    witness.p1CloseConsent = signCloseConsent(pureCircuits, consent, kp1);
    witness.p2CloseConsent = signCloseConsent(pureCircuits, consent, kp2);
    return call('closeGame', over.p1Score ?? r.p1Score, over.p2Score ?? r.p2Score, over.winner ?? r.winner);
  };
  return { call, state, witness, referee, proveRound, closeGame, seed };
}

/** Honest claim for a seat: name every real match (up to 2). */
function honestClaim(ref, seat) {
  const m = matchesFor(ref.hole(seat), ref.round.board);
  return { count: BigInt(m.length), rankA: m[0] ?? 0n, rankB: m[1] ?? 0n };
}
/** A deliberate lie: claim 2 using board ranks the seat does NOT hold (or 1 if impossible). */
function lyingClaim(ref, seat) {
  const hole = ref.hole(seat);
  const fake = ref.round.board.filter((r) => !hole.includes(r));
  if (fake.length >= 2) return { count: 2n, rankA: fake[0], rankB: fake[1] };
  if (fake.length === 1) return { count: 1n, rankA: fake[0], rankB: 0n };
  return null; // every board rank is held — cannot lie
}
/** Play one round with a policy per seat: 'honest' | 'lie' | 'pass'; responder: 'accept' | 'challenge'. */
function playRound(ref, { p1 = 'honest', p2 = 'honest', respond = 'accept' } = {}) {
  ref.startRound();
  while (!ref.state.done) {
    const st = ref.state;
    if (st.step !== 'claim') throw new Error('expected a claim step');
    const policy = st.actor === 0n ? p1 : p2;
    if (policy === 'pass') { ref.pass(); continue; }
    const c = (policy === 'lie' && lyingClaim(ref, st.actor)) || honestClaim(ref, st.actor);
    ref.claim(c.count, c.rankA, c.rankB);
    const r = typeof respond === 'function' ? respond(ref) : respond;
    if (r === 'challenge' && c.count > 0n) ref.challenge(); else ref.accept();
  }
  return ref.finishRound();
}
function playToEnd(g, opts) {
  const rounds = [];
  while (!g.referee.boundary.ended) {
    const fin = playRound(g.referee, opts);
    g.proveRound(fin);
    rounds.push(fin);
  }
  return rounds;
}

describe('5 Up 2 Down: the deal', () => {
  it('thirteen card indices are pairwise distinct across many digests', () => {
    for (let i = 0; i < 300; i += 1) {
      const s0 = new Uint8Array(32).fill(i & 0xff); s0[1] = i >> 8;
      const s1 = new Uint8Array(32).fill((i * 7) & 0xff); s1[2] = 0x99;
      const idx = dealIdx(pureCircuits, s0, s1, BigInt(i) * 7919n, 1).map(Number);
      expect(new Set(idx).size).toBe(13);
      for (const c of idx) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(52); }
    }
  });
  it('ranks are 0..12 and consistent with indices (rank = idx / 4)', () => {
    const idx = dealIdx(pureCircuits, SECRETS[0][0], SECRETS[1][0], 123n, 1);
    const ranks = dealRanks(pureCircuits, SECRETS[0][0], SECRETS[1][0], 123n, 1);
    expect(ranks).toEqual(idx.map((c) => Math.floor(c / 4)));
  });
  it('no rank appears more than four times across hole cards + board', () => {
    for (let i = 0; i < 200; i += 1) {
      const ranks = dealRanks(pureCircuits, SECRETS[0][i % 10], SECRETS[1][(i * 3) % 10], BigInt(i), (i % 10) + 1);
      const counts = {};
      for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(4);
    }
  });
  it('every SLOT is uniform: hole, board and showdown slots all see Aces (card >= 48) — the review-2026-10-08 H-1 regression', () => {
    // Floyd alone draws slot i from 0..39+i, so slots 0-8 (holes + board)
    // could never hold rank 12 — and slots 9-12 (the showdown pairs) would
    // hog them. The post-Floyd sorting-network shuffle must undo that.
    const N = 3000;
    const aces = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let maxSlot0 = 0;
    for (let i = 0; i < N; i += 1) {
      const s0 = new Uint8Array(32); s0[0] = i & 0xff; s0[1] = i >> 8; s0[5] = 0x5a;
      const s1 = new Uint8Array(32); s1[0] = (i * 13) & 0xff; s1[1] = (i * 13) >> 8; s1[7] = 0xa5;
      const idx = dealIdx(pureCircuits, s0, s1, BigInt(i) * 104729n, 1);
      for (let k = 0; k < 13; k += 1) if (idx[k] >= 48) aces[k] += 1;
      maxSlot0 = Math.max(maxSlot0, idx[0]);
    }
    expect(maxSlot0).toBeGreaterThanOrEqual(48);
    for (const a of aces) {
      const rate = a / N;                         // expected 4/52 ≈ 0.077; allow ±0.04
      expect(rate).toBeGreaterThan(0.035); expect(rate).toBeLessThan(0.12);
    }
  });
  it('the sorting network really sorts (so the carried permutation is uniform over distinct keys)', () => {
    for (let t = 0; t < 2000; t += 1) {
      const s = Array.from({ length: 18 }, () => Math.floor(Math.random() * 256));
      const keys = Array.from({ length: 9 }, (_, i) => s[2 * i] * 256 + s[2 * i + 1]);
      const out = shuffleNine(keys, s);               // carry the keys themselves
      for (let i = 1; i < 9; i += 1) expect(out[i - 1]).toBeLessThanOrEqual(out[i]);
    }
    expect(floydNine(new Array(32).fill(0))).toEqual([0, 44, 45, 46, 47, 48, 49, 50, 51]);  // all-collide path
  });
  it('showdown draws come from the 43 remaining cards: never a dealt card, never each other, and k → card is a bijection', () => {
    const dealt = [3, 7, 12, 20, 21, 33, 40, 50, 51];
    const seen = new Set();
    for (let k = 0; k < 43; k += 1) {
      const c = skipDealt(k, dealt);
      expect(dealt).not.toContain(c); expect(c).toBeLessThan(52); seen.add(c);
    }
    expect(seen.size).toBe(43);                       // every remaining card reachable exactly once
    for (let t = 0; t < 3000; t += 1) {
      const b = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      const sd = showdownCards(dealt, b);
      expect(new Set([...dealt, ...sd]).size).toBe(13);
    }
  });
  it('a prover holding only one secret gets a different deal (both secrets key the hash)', () => {
    const a = dealRanks(pureCircuits, SECRETS[0][0], SECRETS[1][0], 1n, 1);
    const b = dealRanks(pureCircuits, SECRETS[0][0], new Uint8Array(32).fill(0xee), 1n, 1);
    expect(a).not.toEqual(b);
  });
});

describe('5 Up 2 Down: scoring (referee mirror of resolveClaim)', () => {
  const board = [0n, 3n, 5n, 9n, 12n];
  const C = (count, rankA = 0n, rankB = 0n) => ({ kind: KIND.CLAIM, count, rankA, rankB });
  const ACCEPT = { kind: KIND.ACCEPT, count: 0n, rankA: 0n, rankB: 0n };
  const CHALLENGE = { kind: KIND.CHALLENGE, count: 0n, rankA: 0n, rankB: 0n };
  it('accepted: 1 card +1, 2 cards +3, 0 cards 0 — truth irrelevant, nothing disclosed', () => {
    expect(resolveClaim([3n, 7n], board, C(1n, 3n), ACCEPT)).toMatchObject({ claimantGain: 1n, responderGain: 0n, lies: 0n });
    expect(resolveClaim([7n, 8n], board, C(1n, 3n), ACCEPT)).toMatchObject({ claimantGain: 1n, lies: 0n });   // a bluff, accepted
    expect(resolveClaim([3n, 9n], board, C(2n, 3n, 9n), ACCEPT)).toMatchObject({ claimantGain: 3n, lies: 0n });
    expect(resolveClaim([3n, 9n], board, C(0n), ACCEPT)).toMatchObject({ claimantGain: 0n, lies: 0n });
  });
  it('challenged and true: 1 card +2, 2 cards +4', () => {
    expect(resolveClaim([3n, 7n], board, C(1n, 3n), CHALLENGE)).toMatchObject({ claimantGain: 2n, claimantLoss: 0n, responderGain: 0n, lies: 0n });
    expect(resolveClaim([3n, 9n], board, C(2n, 3n, 9n), CHALLENGE)).toMatchObject({ claimantGain: 4n, lies: 0n });
    // two of a kind in hand vs one on the board = two matches
    expect(resolveClaim([3n, 3n], board, C(2n, 3n, 3n), CHALLENGE)).toMatchObject({ claimantGain: 4n, lies: 0n });
  });
  it('challenged with lies: liar -lies, challenger +lies, the true card earns nothing', () => {
    expect(resolveClaim([7n, 8n], board, C(1n, 3n), CHALLENGE)).toMatchObject({ claimantGain: 0n, claimantLoss: 1n, responderGain: 1n, lies: 1n });
    expect(resolveClaim([3n, 8n], board, C(2n, 3n, 9n), CHALLENGE)).toMatchObject({ claimantGain: 0n, claimantLoss: 1n, responderGain: 1n, lies: 1n });
    expect(resolveClaim([7n, 8n], board, C(2n, 3n, 9n), CHALLENGE)).toMatchObject({ claimantGain: 0n, claimantLoss: 2n, responderGain: 2n, lies: 2n });
    // claiming two 3s with only one 3 in hand is one lie, not zero
    expect(resolveClaim([3n, 7n], board, C(2n, 3n, 3n), CHALLENGE)).toMatchObject({ lies: 1n });
  });
  it('illegal claims are rejected: rank not on board, bad count, non-zero unused slots, challenging a 0-claim', () => {
    expect(() => resolveClaim([3n, 7n], board, C(1n, 7n), ACCEPT)).toThrow(/not on board/);
    expect(() => resolveClaim([3n, 7n], board, C(3n, 3n, 9n), ACCEPT)).toThrow(/count out of range/);
    expect(() => resolveClaim([3n, 7n], board, C(1n, 3n, 9n), ACCEPT)).toThrow(/unused claim slot/);
    expect(() => resolveClaim([3n, 7n], board, C(0n), CHALLENGE)).toThrow(/nothing to challenge/);
  });
});

describe('5 Up 2 Down: the pass showdown (referee mirror of resolvePass)', () => {
  const PASS = { kind: KIND.PASS, count: 0n, rankA: 0n, rankB: 0n };
  const NOOP = { kind: KIND.NOOP, count: 0n, rankA: 0n, rankB: 0n };
  it('each drawn card strictly outranking the matching hole card scores +1; ties lose', () => {
    expect(resolvePass([5n, 7n], [6n, 8n], PASS, NOOP).responderGain).toBe(2n);
    expect(resolvePass([5n, 7n], [6n, 2n], PASS, NOOP).responderGain).toBe(1n);
    expect(resolvePass([5n, 7n], [4n, 2n], PASS, NOOP).responderGain).toBe(0n);
    expect(resolvePass([5n, 7n], [5n, 12n], PASS, NOOP).responderGain).toBe(1n);   // tie on card 1 = no win
    expect(resolvePass([5n, 7n], [6n, 8n], PASS, NOOP)).toMatchObject({ claimantGain: 0n, claimantLoss: 0n, lies: 0n });
  });
  it('a non-zero pass or a real response to a pass is rejected', () => {
    expect(() => resolvePass([5n, 7n], [6n, 8n], { ...PASS, count: 1n }, NOOP)).toThrow(/pass fields/);
    expect(() => resolvePass([5n, 7n], [6n, 8n], PASS, { kind: KIND.ACCEPT, count: 0n, rankA: 0n, rankB: 0n })).toThrow(/NOOP/);
  });
});

describe('5 Up 2 Down: the circuit accepts honest referee transcripts', () => {
  it('plays a full Standard game to 20 and closes it with the proven winner', () => {
    const g = newGame();
    const rounds = playToEnd(g, { respond: (ref) => (ref.state.pending?.count === 2n ? 'challenge' : 'accept') });
    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds.length).toBeLessThanOrEqual(MAX_ROUNDS);
    const res = g.referee.result();
    expect(res.p1Score >= 20n || res.p2Score >= 20n || rounds.length === MAX_ROUNDS).toBe(true);
    expect(g.state().ended).toBe(true);
    g.closeGame();
    const s = g.state();
    expect(s.closed).toBe(true);
    expect(s.p1Score).toBe(res.p1Score); expect(s.p2Score).toBe(res.p2Score); expect(s.winner).toBe(res.winner);
    expect(Buffer.from(s.transcriptRoot)).toEqual(Buffer.from(pureCircuits.commitTranscript(res.transcriptChain)));
  });
  it('Casual races to 10', () => {
    const g = newGame({ mode: CASUAL });
    expect(g.referee.target).toBe(10n);
    playToEnd(g);
    const res = g.referee.result();
    expect(res.p1Score >= 10n || res.p2Score >= 10n || res.boundary.round === BigInt(MAX_ROUNDS)).toBe(true);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });
  it('a liar who is always challenged loses points and the challenger gains them', () => {
    const g = newGame();
    const fin = playRound(g.referee, { p1: 'lie', p2: 'honest', respond: 'challenge' });
    g.proveRound(fin);
    const liarOut = fin.outcomes.find((o) => o.claimant === 0n);
    if (liarOut.lies > 0n) {
      expect(liarOut.claimantGain).toBe(0n);
      expect(liarOut.responderGain).toBe(liarOut.lies);
    }
    expect(g.state().roundsProven).toBe(1n);
  });
  it('an accepted bluff pays out and discloses nothing (lies in the chain are 0)', () => {
    const g = newGame();
    const fin = playRound(g.referee, { p1: 'lie', respond: 'accept' });
    g.proveRound(fin);
    for (const o of fin.outcomes) expect(o.lies).toBe(0n);
    expect(g.state().roundsProven).toBe(1n);
  });
  it('first claimant alternates each round', () => {
    const g = newGame();
    const a = playRound(g.referee); g.proveRound(a);
    const b = playRound(g.referee); g.proveRound(b);
    expect(a.boundaryIn.turn).toBe(0n);
    expect(a.boundaryOut.turn).toBe(1n);
    expect(b.boundaryOut.turn).toBe(0n);
  });
  it('round cap: the game ends after round 10 with the higher score winning (or a draw)', () => {
    const g = newGame();
    // everyone claims 0 → no points ever → runs to the cap
    const zero = (ref) => { ref.startRound(); ref.claim(0n); ref.accept(); ref.claim(0n); ref.accept(); return ref.finishRound(); };
    for (let i = 0; i < MAX_ROUNDS; i += 1) g.proveRound(zero(g.referee));
    expect(g.state().ended).toBe(true);
    const res = g.referee.result();
    expect(res.winner).toBe(0n);
    expect(res.p1Score).toBe(0n);
    g.closeGame();
    expect(g.state().winner).toBe(0n);
  });
});

describe('5 Up 2 Down: pass showdown through the circuit', () => {
  it('a pass consumes both move slots, the showdown scores, and the round proves', () => {
    const g = newGame();
    const fin = playRound(g.referee, { p1: 'pass', p2: 'honest' });
    expect(fin.moves.map((m) => m.kind)).toEqual([KIND.PASS, KIND.NOOP, KIND.CLAIM, KIND.ACCEPT]);
    const out = fin.outcomes[0];
    expect(out.pass).toBe(true);
    const hole = fin.ranks.slice(0, 2);
    expect(out.responderGain).toBe(BigInt(Number(out.draws[0] > hole[0]) + Number(out.draws[1] > hole[1])));
    g.proveRound(fin);
    expect(g.state().roundsProven).toBe(1n);
  });
  it('both seats can pass; the game still ends and closes', () => {
    const g = newGame({ mode: CASUAL });
    const rounds = playToEnd(g, { p1: 'pass', p2: 'pass' });
    expect(rounds.length).toBeLessThanOrEqual(MAX_ROUNDS);
    for (const fin of rounds) expect(fin.moves.map((m) => m.kind)).toEqual([KIND.PASS, KIND.NOOP, KIND.PASS, KIND.NOOP]);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });
  it('a fake showdown result (forged wins) is refused by the circuit', () => {
    const g = newGame();
    const fin = playRound(g.referee, { p1: 'pass', p2: 'honest' });
    expect(() => g.proveRound(fin, { tamper: (w) => { w.cards[9] = (w.cards[9] + 1n) % 52n; } })).toThrow(/showdown mismatch/);
  });
});

describe('5 Up 2 Down: attacks the circuit must refuse', () => {
  it('a substituted (legal) move changes the proven chain, so the honest transcript can no longer open stateRoot', () => {
    // Moves are witnesses: the prover can feed any LEGAL round. What stops a
    // rewrite is binding — the boundary commits to the chain of moves, and the
    // players only sign the chain they actually played.
    const g = newGame();
    const a = playRound(g.referee);
    g.proveRound(a, { tamper: (w) => { w.moves[0] = { kind: KIND.CLAIM, count: 2n, rankA: a.board[0], rankB: a.board[1] }; } });
    expect(Buffer.from(g.state().stateRoot)).not.toEqual(Buffer.from(pureCircuits.commitBoundary(a.boundaryOut)));
    const b = playRound(g.referee);
    expect(() => g.proveRound(b)).toThrow(/does not open stateRoot/);
  });
  it('a forged deal (dealtRanks witness ≠ the in-circuit deal) is refused', () => {
    const g = newGame();
    const fin = playRound(g.referee);
    expect(() => g.proveRound(fin, { tamper: (w) => { w.cards[0] = (w.cards[0] + 1n) % 52n; } })).toThrow(/deal mismatch/);
    // ...and a forged rank over honest cards (a hole card "upgraded" to an Ace) is refused too
    expect(() => g.proveRound(fin, { tamper: (w) => { w.ranks[0] = (w.ranks[0] + 1n) % 13n; } })).toThrow(/rank mismatch/);
  });
  it('an illegal move (count 3) is refused outright', () => {
    const g = newGame();
    const fin = playRound(g.referee);
    expect(() => g.proveRound(fin, { tamper: (w) => { w.moves[0] = { kind: KIND.CLAIM, count: 3n, rankA: fin.board[0], rankB: fin.board[1] }; } })).toThrow(/count out of range/);
  });
  it('wrong round secret → mismatch', () => {
    const g = newGame();
    const fin = playRound(g.referee);
    expect(() => g.proveRound(fin, { tamper: (w) => { w.roundSecrets = [new Uint8Array(32).fill(1), w.roundSecrets[1]]; } })).toThrow(/round secret mismatch/);
  });
  it('wrong boundary (forged scores) → does not open stateRoot', () => {
    const g = newGame();
    const a = playRound(g.referee); g.proveRound(a);
    const b = playRound(g.referee);
    expect(() => g.proveRound(b, { tamper: (w) => { w.boundary = { ...w.boundary, score0: w.boundary.score0 + 5n }; } })).toThrow(/does not open stateRoot/);
  });
  it('rounds must be proven in order; skipping is rejected', () => {
    const g = newGame();
    const a = playRound(g.referee);
    const b = playRound(g.referee);
    expect(() => g.proveRound(b)).toThrow(/in order|boundary/);
    g.proveRound(a); g.proveRound(b);
    expect(g.state().roundsProven).toBe(2n);
  });
  it('a claim naming a rank not on the board is refused by the circuit', () => {
    const g = newGame();
    const fin = playRound(g.referee);
    const off = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n].find((r) => !fin.board.includes(r));
    expect(() => g.proveRound(fin, { tamper: (w) => { w.moves[0] = { kind: KIND.CLAIM, count: 1n, rankA: off, rankB: 0n }; } })).toThrow(/not on board/);
  });
  it('closeGame refuses before the proven history ends, and refuses forged results', () => {
    const g = newGame();
    const fin = playRound(g.referee); g.proveRound(fin);
    if (!g.referee.boundary.ended) {
      expect(() => g.call('closeGame', 0n, 0n, 0n)).toThrow(/has not reached game end/);
      playToEnd(g);
    }
    const res = g.referee.result();
    expect(() => g.closeGame({ p1Score: res.p1Score + 1n })).toThrow(/final score mismatch/);
    expect(() => g.closeGame({ winner: res.winner === 1n ? 2n : 1n })).toThrow(/winner mismatch/);
    const stranger = consentKeyPairFromSecret(new Uint8Array(32).fill(0x77));
    expect(() => g.closeGame({}, { kp2: stranger })).toThrow(/signer is not player two/);
    g.closeGame();
    expect(() => g.closeGame()).toThrow(/already closed/);
  });
  it('constructor rejects identical players, entropy or round commitments, and bad modes', () => {
    const mk = (over) => {
      const w = (ctx) => [ctx.privateState, null];
      const contract = new Contract({
        entropyPair: w, roundSecrets: w, roundMoves: w, roundDigests: w, dealtCards: w, dealtRanks: w, startBoundary: w, p1CloseConsent: w, p2CloseConsent: w,
        get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
      });
      const commits = (seat) => SECRETS[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
      const args = {
        p1: P1, p2: P2, mode: STANDARD, e1: pureCircuits.commitEntropy(E1), e2: pureCircuits.commitEntropy(E2), c1: commits(0), c2: commits(1), ...over,
      };
      return contract.initialState(runtime.createConstructorContext({}, SPONSOR), args.p1, args.p2, args.mode, args.e1, args.e2, args.c1, args.c2);
    };
    expect(() => mk({ p2: P1 })).toThrow(/Players must differ/);
    expect(() => mk({ e2: pureCircuits.commitEntropy(E1) })).toThrow(/Entropy commitments must differ/);
    expect(() => mk({ c2: SECRETS[0].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1))) })).toThrow(/Round-secret commitments must differ/);
    expect(() => mk({ mode: 4n })).toThrow(/mode must be/);
  });
});

describe('5 Up 2 Down: referee ↔ circuit agreement', () => {
  it('MOVES_PER_ROUND is 4 and the referee refuses a fifth move or an early finish', () => {
    expect(MOVES_PER_ROUND).toBe(4);
    const ref = createFiveUpReferee(pureCircuits, { seed: 1n, roundSecrets: SECRETS, mode: STANDARD });
    ref.startRound();
    expect(() => ref.finishRound()).toThrow(/did not finish/);
    ref.claim(0n); ref.accept(); ref.claim(0n); ref.accept();
    expect(() => ref.claim(0n)).toThrow(/complete/);
  });
  it('targetScore matches the circuit modes', () => {
    expect(targetScore(0n)).toBe(10n);
    expect(targetScore(1n)).toBe(20n);
  });
});
