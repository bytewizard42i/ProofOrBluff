import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  createV4Referee, packRanks, rankWeight, unpackHand, KIND, MAX_ROUNDS, MAX_ROUND_MOVES, initialBoundary, roundFinished, startingRank,
} from './rollup-v4-referee.js';
import {
  consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness, gameIdFromContractAddress, JUBJUB_ORDER, TWO_248,
} from '../cli/src/rollup-consent.js';

const { Contract, pureCircuits, ledger } = await import('./managed/proof-or-bluff-rollup-v4/contract/index.js');

// v4 = v3p + SHARED 52-card deck + empty-hand win ("go out"; caught bluffing on
// the door only ends the round). Same rollup protocol; this file re-runs the
// v3p attack suite against the new circuits and adds tests for the new rules.
// A failed assertion here is exactly the assertion that would fail on-chain.

const SPONSOR = '33'.repeat(32);
const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x51));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x52));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(3);
const E2 = new Uint8Array(32).fill(9);
const STANDARD = 1n;
const secretsFor = (seat) => Array.from({ length: MAX_ROUNDS }, (_, i) => new Uint8Array(32).fill(0x10 * (seat + 1) + i + 1));
const SECRETS = [secretsFor(0), secretsFor(1)];
const seed = pureCircuits.combineEntropy(E1, E2);

function newGame({ mode = STANDARD, secrets = SECRETS, entropy = [E1, E2] } = {}) {
  const [e1, e2] = entropy;
  const gameSeed = pureCircuits.combineEntropy(e1, e2);
  const witness = {
    entropy: [e1, e2], roundSecrets: [new Uint8Array(32), new Uint8Array(32)],
    moves: [], snapshots: [], boundary: initialBoundary(), remaining: [Array(7).fill(0n), Array(7).fill(0n)],
    p1CloseConsent: null, p2CloseConsent: null,
  };
  const contract = new Contract({
    entropyPair: (ctx) => [ctx.privateState, witness.entropy],
    roundSecrets: (ctx) => [ctx.privateState, witness.roundSecrets],
    roundMoves: (ctx) => [ctx.privateState, witness.moves],
    roundSnapshots: (ctx) => [ctx.privateState, witness.snapshots],
    startBoundary: (ctx) => [ctx.privateState, witness.boundary],
    remainingRanks: (ctx) => [ctx.privateState, witness.remaining],
    p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
    p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
    get_challenge_reduction: (ctx, full) => (witness.reduction ?? challengeReductionWitness)(ctx, full),
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
  const referee = createV4Referee(pureCircuits, { seed: gameSeed, roundSecrets: secrets, mode });

  const proveRound = (finished, { secretsOverride, tamper } = {}) => {
    witness.roundSecrets = secretsOverride ?? [secrets[0][Number(finished.round) - 1], secrets[1][Number(finished.round) - 1]];
    witness.moves = finished.moves.map((m) => ({ ...m, cards: [...m.cards] }));
    witness.snapshots = finished.snapshots.map((s) => ({ ...s }));
    witness.remaining = finished.remaining.map((r) => [...r]);
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
    witness.p2CloseConsent = over.p2Signed ?? signCloseConsent(pureCircuits, consent, kp2);
    return call('closeGame', over.p1Score ?? r.p1Score, over.p2Score ?? r.p2Score, over.winner ?? r.winner);
  };
  return { call, state, witness, referee, proveRound, closeGame, consentFor: (r) => buildCloseConsent(pureCircuits, {
    gameId: gameIdFromContractAddress(runtime.dummyContractAddress()), transcriptRoot: r.transcriptChain,
    p1Score: r.p1Score, p2Score: r.p2Score, winner: r.winner,
  }) };
}

/** Take `count` real cards of `rank` from `hand` (or any held cards if lying). */
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

const heldTotal = (hand) => hand.reduce((a, b) => a + b, 0n);

/**
 * v4-aware scripted round. A round ends when a seat empties — and under v4 an
 * emptied hand that survives resolution WINS THE GAME. To keep games going for
 * multi-round coverage, `doorPolicy` decides how the responder treats the
 * claim that would empty the hand:
 *   'always'  — challenge every would-be-emptying claim (honest go-out still
 *               wins; a lying one is caught at the door → redeal)
 *   'honest'  — challenge only lying claims (empty-bluffs get caught, honest
 *               go-outs are accepted → win)
 *   otherwise — the v2 policy: challenge bluffs and every `challengeEvery`-th
 *               truthful claim.
 */
function playRound(ref, counters, { challengeEvery = 3, trusting = false, doorPolicy } = {}) {
  ref.startRound();
  while (!roundFinished(ref.state, ref.size)) {
    const s = ref.state;
    if (s.pending) {
      const bluff = !ref.truthfulPending;
      const empties = (s.claimer === 0n ? ref.state.plays0 : ref.state.plays1) === ref.size;
      if (doorPolicy === 'always' && empties) { ref.challenge(); continue; }
      if (doorPolicy === 'honest' && empties) { bluff ? ref.challenge() : ref.accept(); continue; }
      if (!trusting && (bluff || (++counters.truths % challengeEvery === 0))) ref.challenge(); else ref.accept();
      continue;
    }
    const seat = Number(s.turn);
    const hand = ref.hands[seat];
    const holds = hand[Number(s.currentRank)] > 0n;
    // A seat whose last card isn't the required rank must bluff to go out —
    // exactly the caught-at-the-door scenario the door policies exercise.
    ref.play(s.currentRank, 1n, takeCards(hand, s.currentRank, 1, { lie: !holds }), counters.salt++);
  }
  return ref.finishRound();
}

function playGame(ref, opts) {
  const counters = { salt: 1000n, truths: 0 };
  const rounds = [];
  while (!ref.boundary.ended) rounds.push(playRound(ref, counters, opts));
  return rounds;
}

/** Find an entropy pair whose game runs at least `minRounds` rounds under `opts`. */
function gameWithRounds(minRounds, opts, { mode = STANDARD } = {}) {
  for (let v = 1; v < 200; v += 1) {
    const g = newGame({ mode, entropy: [new Uint8Array(32).fill(v), new Uint8Array(32).fill(255 - v)] });
    const rounds = playGame(g.referee, opts);
    if (rounds.length >= minRounds) return { g, rounds };
  }
  throw new Error(`no entropy variant produced ${minRounds} rounds`);
}

describe('v4 rollup: construction', () => {
  it('stores identities, mode and 14 commitments — never an opening', () => {
    const g = newGame();
    const s = g.state();
    expect(Buffer.from(s.playerOne)).toEqual(Buffer.from(P1));
    expect(s.mode).toBe(STANDARD);
    expect(s.p1RoundCommits).toHaveLength(6);
    expect(Buffer.from(s.p2RoundCommits[5])).toEqual(Buffer.from(pureCircuits.commitRoundSecret(SECRETS[1][5], 6n)));
    expect(s.roundsProven).toBe(0n);
    expect(s.ended).toBe(false);
    expect(Buffer.from(s.stateRoot)).toEqual(Buffer.from(pureCircuits.commitBoundary(initialBoundary())));
  });
});

describe('v4 rollup: the shared deck', () => {
  it('deals 2*size DISTINCT cards — combined per-rank counts never exceed 4', () => {
    for (let v = 1; v <= 20; v += 1) {
      const e1 = new Uint8Array(32).fill(v);
      const e2 = new Uint8Array(32).fill(200 - v);
      const s = pureCircuits.combineEntropy(e1, e2);
      const s0 = new Uint8Array(32).fill(0x40 + v);
      const s1 = new Uint8Array(32).fill(0x80 + v);
      const [d0, d1] = pureCircuits.dealPairPacked(s0, s1, s, 1n, 7n);
      const h0 = unpackHand(d0); const h1 = unpackHand(d1);
      expect(heldTotal(h0)).toBe(7n);
      expect(heldTotal(h1)).toBe(7n);
      for (let r = 0; r < 13; r += 1) expect(h0[r] + h1[r] <= 4n).toBe(true);
    }
  });

  it('each hand needs BOTH secrets — swapping one secret changes both hands', () => {
    const s0 = new Uint8Array(32).fill(0x41);
    const s1 = new Uint8Array(32).fill(0x81);
    const other = new Uint8Array(32).fill(0x77);
    const [a0, a1] = pureCircuits.dealPairPacked(s0, s1, seed, 1n, 7n);
    const [b0] = pureCircuits.dealPairPacked(other, s1, seed, 1n, 7n);
    expect(a0).not.toBe(b0);
    expect(a0).not.toBe(a1); // seat 0 and seat 1 hold different hands
  });

  it('5-card mode deals 10 distinct cards (no cross-hand overlap)', () => {
    const s0 = new Uint8Array(32).fill(0x42);
    const s1 = new Uint8Array(32).fill(0x82);
    const [d0, d1] = pureCircuits.dealPairPacked(s0, s1, seed, 1n, 5n);
    const h0 = unpackHand(d0); const h1 = unpackHand(d1);
    expect(heldTotal(h0)).toBe(5n);
    expect(heldTotal(h1)).toBe(5n);
    for (let r = 0; r < 13; r += 1) expect(h0[r] + h1[r] <= 4n).toBe(true);
  });

  // Security review 2026-10-08 (H-1): the collision fallback must be the TOP of
  // each draw's range (m_i - 1) — the one value no earlier draw can hold.
  // Rank packing can hide a repeated index, so these tests look at CARD LEVEL.
  it('circuit-level: every dealt card index is pairwise distinct (7- and 5-card modes)', () => {
    for (let v = 1; v <= 60; v += 1) {
      const s0 = new Uint8Array(32).fill(v);
      const s1 = new Uint8Array(32).fill(200 - v);
      const seedV = pureCircuits.combineEntropy(new Uint8Array(32).fill(v), new Uint8Array(32).fill(255 - v));
      for (const [size, slots] of [[7n, 14], [5n, 10]]) {
        const idx = pureCircuits.dealPairIndices(s0, s1, seedV, 1n, size).map(Number);
        const live = idx.slice(0, slots);
        expect(new Set(live).size).toBe(slots);
        expect(live.every((c) => c >= 0 && c <= 51)).toBe(true);
        if (size === 5n) expect(idx.slice(10).every((c) => c === 255)).toBe(true);
        // Index-level ranks must match what dealPairPacked committed to.
        const [d0, d1] = pureCircuits.dealPairPacked(s0, s1, seedV, 1n, size);
        const ranksOf = (list) => list.map((c) => BigInt(Math.floor(c / 4)));
        expect(packRanks(ranksOf(live.slice(0, Number(size)))).toString()).toBe(d0.toString());
        expect(packRanks(ranksOf(live.slice(Number(size), slots))).toString()).toBe(d1.toString());
      }
    }
  });

  // JS mirror of the corrected Floyd draw — same math as dealFourteenIdx /
  // dealTenIdx, swept over enough digests to make a residual collision path
  // statistically impossible (a ~4%/deal bug shows thousands of hits here).
  const jsBoundedDraw = (hi, lo, m) => Math.floor(((hi * 256 + lo) * m) / 65536);
  const jsDealIdx = (b, k, m0) => {
    const pool = [];
    for (let i = 0; i < k; i += 1) {
      const m = m0 + i;
      let t = jsBoundedDraw(b[2 * i], b[2 * i + 1], m);
      if (pool.includes(t)) t = m - 1;   // fallback: top of THIS draw's range
      pool.push(t);
    }
    return pool;
  };
  // mulberry32 — uniform bytes; a structured counter biases adjacent byte
  // PAIRS (boundedDraw consumes hi/lo pairs), which fakes a deal bias.
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  it('sweep: 200k digests produce zero duplicate cards and a uniform top card', () => {
    const freq = new Array(52).fill(0);
    const N = 200_000;
    let dupes = 0;
    for (let d = 0; d < N; d += 1) {
      const rnd = mulberry32(d);
      const b = new Uint8Array(32);
      for (let i = 0; i < 32; i += 1) b[i] = Math.floor(rnd() * 256);
      const cards = jsDealIdx(b, 14, 39);
      if (new Set(cards).size !== 14) dupes += 1;
      for (const c of cards) freq[c] += 1;
    }
    expect(dupes).toBe(0);
    // True Floyd subsets are uniform: each card appears in 14/52 ≈ 26.9% of
    // deals. A starved card 51 (the H-1 symptom) sat near 1/52 ≈ 2%.
    expect(freq[51] / N).toBeGreaterThan(0.24);
    expect(freq[0] / N).toBeGreaterThan(0.24);
    expect(Math.max(...freq) / N).toBeLessThan(0.30);
    const fiveN = 100_000; let dupes5 = 0;
    for (let d = 0; d < fiveN; d += 1) {
      const rnd = mulberry32(d + 0x9e3779b9);
      const b = new Uint8Array(32);
      for (let i = 0; i < 32; i += 1) b[i] = Math.floor(rnd() * 256);
      const cards = jsDealIdx(b, 10, 43);
      if (new Set(cards).size !== 10) dupes5 += 1;
    }
    expect(dupes5).toBe(0);
  });
});

describe('v4 rollup: emptying your hand wins the game', () => {
  it('a truthful go-out accepted by the opponent wins immediately', () => {
    // 'honest' policy: bluffs get challenged, truthful claims accepted — the
    // first seat to empty wins. Under STANDARD the game now ends in round 1.
    const g = newGame();
    const rounds = playGame(g.referee, { doorPolicy: 'honest' });
    expect(rounds.length).toBe(1);
    expect(rounds[0].boundaryOut.ended).toBe(true);
    const result = g.referee.result();
    expect(result.winner === 1n || result.winner === 2n).toBe(true);
    for (const r of rounds) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
    expect(g.state().winner).toBe(result.winner);
  });

  it('an honest go-out still wins when wrongly challenged (challenger -1)', () => {
    // 'always' challenges the door: honest emptying still wins on the spot.
    const g = newGame();
    const rounds = playGame(g.referee, { doorPolicy: 'always' });
    // Game may span rounds (lies get caught at the door), but every end is
    // decisive — never a mid-round end without a winner unless rounds ran out.
    const fin = rounds.at(-1).boundaryOut;
    expect(fin.ended).toBe(true);
    const result = g.referee.result();
    if (rounds.length < MAX_ROUNDS) expect(result.winner).not.toBe(0n);
    for (const r of rounds) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });

  it('caught bluffing on the door: no win — the round ends and the game re-deals', () => {
    // 'always' door challenges + forced last-card lies: whenever a seat goes
    // out on a bluff it is caught, so play continues into later rounds.
    const { g, rounds } = gameWithRounds(2, { doorPolicy: 'always' });
    expect(rounds.length).toBeGreaterThan(1);
    // The intermediate round ended WITHOUT ending the game — caught at the door.
    const first = rounds[0];
    expect(first.boundaryOut.ended).toBe(false);
    expect(first.boundaryOut.winner).toBe(0n);
    // Someone lost 3 points at the door in round 1 (challenge scoring lives).
    expect(first.boundaryOut.score0 > 0n || first.boundaryOut.score1 > 0n).toBe(true);
    for (const r of rounds) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });

  it('going out beats any score below the threshold', () => {
    const g = newGame();
    const rounds = playGame(g.referee, { doorPolicy: 'honest' });
    const result = g.referee.result();
    const winScore = result.winner === 1n ? result.p1Score : result.p2Score;
    // An emptied-hand winner need not have reached the points threshold.
    expect(result.winner).not.toBe(0n);
    expect(Number(winScore)).toBeLessThan(15);
    for (const r of rounds) g.proveRound(r);
    g.closeGame();
    expect(g.state().winner).toBe(result.winner);
  });
});

describe('v4 rollup: a complete honest game, one proof per round', () => {
  it('proves every round in order, then closes with both consents', () => {
    const g = newGame();
    const rounds = playGame(g.referee);
    expect(rounds.length).toBeGreaterThanOrEqual(1);
    expect(rounds.length).toBeLessThanOrEqual(MAX_ROUNDS);
    for (const r of rounds) {
      expect(r.moves).toHaveLength(MAX_ROUND_MOVES);
      expect(r.snapshots).toHaveLength(MAX_ROUND_MOVES + 1);
      g.proveRound(r);
      const s = g.state();
      expect(s.roundsProven).toBe(r.round);
      expect(Buffer.from(s.stateRoot)).toEqual(Buffer.from(pureCircuits.commitBoundary(r.boundaryOut)));
    }
    expect(g.state().ended).toBe(true);
    const result = g.referee.result();
    g.closeGame();
    const s = g.state();
    expect(s.closed).toBe(true);
    expect(s.p1Score).toBe(result.p1Score);
    expect(s.p2Score).toBe(result.p2Score);
    expect(s.winner).toBe(result.winner);
    expect(Buffer.from(s.transcriptRoot)).toEqual(Buffer.from(pureCircuits.commitTranscript(result.transcriptChain)));
  });

  it('a multi-round game rolls over: round 2 opens from round 1\'s boundary, not from the seed', () => {
    const { g, rounds } = gameWithRounds(2, { doorPolicy: 'always' });
    expect(rounds.length).toBeGreaterThan(1);
    expect(rounds[0].boundaryOut.ended).toBe(false);
    expect(rounds[1].snapshots[0].currentRank).toBe(rounds[0].boundaryOut.currentRank);
    expect(rounds[1].snapshots[0].chain).toBe(rounds[0].boundaryOut.chain);
    for (const r of rounds) g.proveRound(r);
    expect(g.state().ended).toBe(true);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });

  it('cannot be closed twice', () => {
    const g = newGame();
    for (const r of playGame(g.referee)) g.proveRound(r);
    g.closeGame();
    expect(() => g.closeGame()).toThrow(/already closed/);
  });
});

describe('v4 rollup: phase guard (the monotonic chain IS the replay protection)', () => {
  it('rounds must be proven in order; a proven round cannot be replayed', () => {
    const { g, rounds } = gameWithRounds(2, { doorPolicy: 'always' });
    expect(() => g.proveRound(rounds[1])).toThrow(/rounds must be proven in order/);
    g.proveRound(rounds[0]);
    expect(() => g.proveRound(rounds[0])).toThrow(/rounds must be proven in order/);
    g.proveRound(rounds[1]);
  });

  it('closeGame refuses until the proven history reaches game end', () => {
    const g = newGame();
    const rounds = playGame(g.referee, { trusting: true });
    g.proveRound(rounds[0]);
    // v4: an accepted go-out ENDS the game, so this closes fine unless the
    // first round was caught at the door — either way the call must respect
    // `ended`, so only assert the guard when the game is still open.
    if (!g.referee.boundary.ended) {
      expect(() => g.closeGame()).toThrow(/has not reached game end/);
    }
  });

  it('a stale boundary (wrong predecessor) cannot open stateRoot', () => {
    const { g, rounds } = gameWithRounds(2, { doorPolicy: 'always' });
    g.proveRound(rounds[0]);
    const forged = { ...rounds[1], boundaryIn: initialBoundary() };
    expect(() => g.proveRound(forged)).toThrow(/does not open stateRoot|opening snapshot mismatch|boundary round mismatch/);
  });

  it('no round can be proven after the game is closed', () => {
    const g = newGame();
    const rounds = playGame(g.referee);
    for (const r of rounds) g.proveRound(r);
    g.closeGame();
    expect(() => g.proveRound(rounds[0])).toThrow(/already closed/);
  });
});

describe('v4 rollup: every cheat is a failed proof', () => {
  const closedSetup = (opts) => {
    const g = newGame();
    const rounds = playGame(g.referee, opts);
    return { g, rounds };
  };

  it('wrong round secret (hand not derived from the committed secret)', () => {
    const { g, rounds } = closedSetup();
    expect(() => g.proveRound(rounds[0], { secretsOverride: [SECRETS[0][1], SECRETS[1][0]] })).toThrow(/round secret mismatch/);
  });
  it('wrong entropy (seed does not open the commitment)', () => {
    const { g, rounds } = closedSetup();
    g.witness.entropy = [E2, E1];
    expect(() => g.proveRound(rounds[0])).toThrow(/entropy mismatch/);
  });
  it('a forged card in a PLAY (card the player did not hold)', () => {
    const { g, rounds } = closedSetup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const i = w.moves.findIndex((m) => m.kind === KIND.PLAY);
      const seat = Number(w.snapshots[i].turn);
      const dealtHand = unpackHand(rounds[0].dealt[seat]);
      const missing = BigInt(dealtHand.findIndex((c) => c === 0n));
      const real = w.moves[i].cards[0];
      w.moves[i].cards[0] = missing;
      const delta = rankWeight(missing) - rankWeight(real);
      for (let j = i + 1; j < w.snapshots.length; j += 1) {
        if (seat === 0) w.snapshots[j].played0 += delta; else w.snapshots[j].played1 += delta;
        if (w.snapshots[j].claimer === BigInt(seat) && j === i + 1) w.snapshots[j].claimSum += delta;
      }
    } })).toThrow(/do not reconcile with the deal|invalid transition/);
  });
  it('a phantom card (rank index > 12)', () => {
    const { g, rounds } = closedSetup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const i = w.moves.findIndex((m) => m.kind === KIND.PLAY);
      w.moves[i].cards[0] = 200n;
    } })).toThrow(/played card out of range|invalid transition/);
  });
  it('a tampered snapshot (score bumped mid-round)', () => {
    const { g, rounds } = closedSetup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => { w.snapshots[5].score0 += 1n; } })).toThrow(/invalid transition/);
  });
  it('stopping a round early (padding before the round ended)', () => {
    const { g, rounds } = closedSetup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      for (let i = 2; i < MAX_ROUND_MOVES; i += 1) {
        w.moves[i] = { kind: 0n, rank: 0n, count: 0n, cards: [0n, 0n, 0n, 0n], playSalt: 0n };
        w.snapshots[i + 1] = { ...w.snapshots[2] };
      }
    } })).toThrow(/padding before round end|invalid transition|round did not finish/);
  });
  it('wrong winner / inflated score at close', () => {
    const { g, rounds } = closedSetup();
    for (const r of rounds) g.proveRound(r);
    const res = g.referee.result();
    expect(() => g.closeGame({ winner: res.winner === 1n ? 2n : 1n })).toThrow(/winner mismatch/);
    expect(() => g.closeGame({ p1Score: res.p1Score + 1n })).toThrow(/final score mismatch/);
  });
  it('a consent signed by someone who is not the registered player', () => {
    const { g, rounds } = closedSetup();
    for (const r of rounds) g.proveRound(r);
    const stranger = consentKeyPairFromSecret(new Uint8Array(32).fill(0x99));
    expect(() => g.closeGame({}, { kp2: stranger })).toThrow(/signer is not player two/);
  });

  // Security review 2026-10-06 (Critical): with an unbounded reduction quotient
  // a prover can pick ANY challenge c < 2^248 and solve for q — forging a
  // signature for a public key whose secret it never had. The quotient is now
  // Uint<7>; this test performs the exact forgery and expects rejection.
  it('REGRESSION: a forged Schnorr consent (chosen challenge, solved quotient) is rejected', () => {
    const { g, rounds } = closedSetup();
    for (const r of rounds) g.proveRound(r);
    const result = g.referee.result();
    const consent = g.consentFor(result);
    const P = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
    const modInv = (a, m) => { let [o, r0, s0, s1] = [a % m, m, 1n, 0n]; while (o) { const q = r0 / o; [o, r0] = [r0 - q * o, o]; [s0, s1] = [s1 - q * s0, s0]; } return ((s1 % m) + m) % m; };
    const pk = KP2.pk;
    const s = 12345n, c = 6789n;
    const R = runtime.ecAdd(runtime.ecMulGenerator(s), runtime.ecMul(pk, JUBJUB_ORDER - c));
    const full = BigInt(pureCircuits.closeConsentChallenge(R, pk, consent));
    const forgedQ = (((full - c) % P) + P) % P * modInv(TWO_248, P) % P;
    expect((forgedQ * TWO_248 + c) % P).toBe(full % P);
    expect(forgedQ > 127n).toBe(true);
    g.witness.reduction = (ctx, f) => (BigInt(f) === full ? [ctx.privateState, [forgedQ, c]] : challengeReductionWitness(ctx, f));
    const forged = { credential: consent, signature: { r: R, s }, pk };
    expect(() => g.closeGame({ p2Signed: forged })).toThrow();
    expect(g.state().closed).toBe(false);
    g.witness.reduction = null;
    expect(() => g.closeGame({ p2Signed: forged })).toThrow(/signature/i);
    expect(g.state().closed).toBe(false);
  });

  it('REGRESSION: a consent for the same result on a DIFFERENT contract address is rejected (no clone replay)', () => {
    const { g, rounds } = closedSetup();
    for (const r of rounds) g.proveRound(r);
    const result = g.referee.result();
    const other = buildCloseConsent(pureCircuits, {
      gameId: gameIdFromContractAddress('ab'.repeat(32)), transcriptRoot: result.transcriptChain,
      p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
    });
    expect(() => g.closeGame({ p2Signed: signCloseConsent(pureCircuits, other, KP2) })).toThrow(/signed a different result/);
  });
});

describe('v4 rollup: no wall clock anywhere', () => {
  it('proves a round and closes with the simulated block time far in the future', () => {
    const g = newGame();
    for (const r of playGame(g.referee)) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });
});

describe('v4 rollup: attacks on the packing itself', () => {
  const setup = () => { const g = newGame(); return { g, rounds: playGame(g.referee, { trusting: true }) }; };

  it('lying about `remaining` (swapping a held card for one never dealt) is caught by dealt == played + remaining', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const fin = w.snapshots[26];
      const seat = fin.plays0 < 7n ? 0 : 1;
      const held = unpackHand(rounds[0].dealt[seat]);
      const never = BigInt(held.findIndex((c) => c === 0n));
      w.remaining[seat][0] = never;
    } })).toThrow(/do not reconcile with the deal|invalid transition/);
  });

  it('a remaining rank outside 0..12 is rejected before it can reach the sum', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const seat = Number(w.snapshots[26].plays0) < 7 ? 0 : 1;
      if ((seat === 0 ? w.snapshots[26].plays0 : w.snapshots[26].plays1) === 7n) return;
      w.remaining[seat][0] = 13n;
    } })).toThrow(/rank out of range|do not reconcile with the deal|invalid transition/);
  });

  it('playing more cards than were dealt (the carry guard) is rejected even if the snapshots agree', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const i = w.moves.findIndex((m) => m.kind === KIND.PLAY);
      const m = w.moves[i];
      const seat = Number(w.snapshots[i].turn);
      const extra = 4n - m.count;
      if (extra <= 0n) return;
      const rank = m.rank;
      m.cards = [rank, rank, rank, rank];
      const oldCount = m.count; m.count = 4n;
      const delta = rankWeight(rank) * extra;
      for (let j = i + 1; j < w.snapshots.length; j += 1) {
        const s = w.snapshots[j];
        if (seat === 0) { s.played0 += delta; s.plays0 += extra; } else { s.played1 += delta; s.plays1 += extra; }
        if (j === i + 1) { s.claimSum += delta; s.claimCount = 4n; }
      }
      void oldCount;
    } })).toThrow(/more cards than dealt|invalid transition|do not reconcile/);
  });

  it('the shared deal packs losslessly — dealt == the per-rank vector', () => {
    const [d0, d1] = pureCircuits.dealPairPacked(SECRETS[0][0], SECRETS[1][0], seed, 1n, 7n);
    expect(heldTotal(unpackHand(d0))).toBe(7n);
    expect(heldTotal(unpackHand(d1))).toBe(7n);
    expect(unpackHand(d0).every((c) => c <= 4n)).toBe(true);
    expect(unpackHand(d1).every((c) => c <= 4n)).toBe(true);
  });
});

describe('regression: starting rank must come from the seed, not the stored boundary', () => {
  it('the test fixture has a NONZERO starting rank, so a rank-0 coincidence cannot hide the bug again', () => {
    expect(startingRank(seed)).not.toBe(0n);
  });
  it.each([1, 2, 5, 11, 42])('a full game proves and closes with entropy variant %i', (v) => {
    const g = newGame({ entropy: [new Uint8Array(32).fill(v), new Uint8Array(32).fill(255 - v)] });
    for (const r of playGame(g.referee)) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });
});
