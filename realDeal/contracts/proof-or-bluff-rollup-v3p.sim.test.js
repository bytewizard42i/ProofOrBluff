import { describe, expect, it } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import {
  createV3pReferee as createV3Referee, packRanks, rankWeight, unpackHand, KIND, MAX_ROUNDS, MAX_ROUND_MOVES, initialBoundary, roundFinished, startingRank,
} from './rollup-v3p-referee.js';
import {
  consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness,
} from '../cli/src/rollup-consent.js';

const { Contract, pureCircuits, ledger } = await import('./managed/proof-or-bluff-rollup-v3p/contract/index.js');

// v3p = v3 with HEX-PACKED hands. Same protocol; this file re-runs every v3
// test against the packed circuits and adds the attacks that target the
// packing itself (overplay, double-play, lying about `remaining`). A failed assertion here is
// exactly the assertion that would make the ZK proof impossible on-chain.

const SPONSOR = '33'.repeat(32);
const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x51));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x52));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const E1 = new Uint8Array(32).fill(3);
const E2 = new Uint8Array(32).fill(9);
const STANDARD = 1n;
// Six independent secrets per player: round r's is revealed only after round r.
const secretsFor = (seat) => Array.from({ length: MAX_ROUNDS }, (_, i) => new Uint8Array(32).fill(0x10 * (seat + 1) + i + 1));
const SECRETS = [secretsFor(0), secretsFor(1)];
const seed = pureCircuits.combineEntropy(E1, E2);

function newGame({ mode = STANDARD, secrets = SECRETS, entropy = [E1, E2] } = {}) {
  const [e1, e2] = entropy;
  const gameSeed = pureCircuits.combineEntropy(e1, e2);
  // What the prover stages for the CURRENT proof. Each proveRound/closeGame
  // call sets exactly the material that call may see.
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
  const referee = createV3Referee(pureCircuits, { seed: gameSeed, roundSecrets: secrets, mode });

  /** Stage round r's witnesses from a finished referee round and prove it. */
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
    const root = pureCircuits.commitTranscript(r.transcriptChain);
    const consent = buildCloseConsent(pureCircuits, {
      gameId: root, transcriptRoot: r.transcriptChain,
      p1Score: over.p1Score ?? r.p1Score, p2Score: over.p2Score ?? r.p2Score, winner: over.winner ?? r.winner,
    });
    witness.p1CloseConsent = signCloseConsent(pureCircuits, consent, kp1);
    witness.p2CloseConsent = signCloseConsent(pureCircuits, consent, kp2);
    return call('closeGame', over.p1Score ?? r.p1Score, over.p2Score ?? r.p2Score, over.winner ?? r.winner);
  };
  return { call, state, witness, referee, proveRound, closeGame };
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

/**
 * Play ONE round to completion with the scripted policy from the v2 tests:
 * play 1 card, truthfully when possible; the opponent challenges every bluff
 * and every `challengeEvery`-th truthful claim.
 */
function playRound(ref, counters, { challengeEvery = 3, trusting = false } = {}) {
  ref.startRound();
  while (!roundFinished(ref.state, ref.size)) {
    const s = ref.state;
    if (s.pending) {
      // `trusting`: accept everything, so hands empty and the round rolls over
      // instead of someone reaching the score threshold.
      const bluff = !ref.truthfulPending;
      if (!trusting && (bluff || (++counters.truths % challengeEvery === 0))) ref.challenge(); else ref.accept();
      continue;
    }
    const hand = ref.hands[Number(s.turn)];
    const holds = hand[Number(s.currentRank)] > 0n;
    ref.play(s.currentRank, 1n, takeCards(hand, s.currentRank, 1, { lie: !holds }), counters.salt++);
  }
  return ref.finishRound();
}

/** Play rounds until the game ends; returns the list of finished rounds. */
function playGame(ref, opts) {
  const counters = { salt: 1000n, truths: 0 };
  const rounds = [];
  while (!ref.boundary.ended) rounds.push(playRound(ref, counters, opts));
  return rounds;
}

describe('v3p rollup (hex-packed): construction', () => {
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

describe('v3p rollup (hex-packed): a complete honest game, one proof per round', () => {
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
    expect(result.winner === 1n || result.winner === 2n).toBe(true);
    g.closeGame();
    const s = g.state();
    expect(s.closed).toBe(true);
    expect(s.p1Score).toBe(result.p1Score);
    expect(s.p2Score).toBe(result.p2Score);
    expect(s.winner).toBe(result.winner);
    expect(Buffer.from(s.transcriptRoot)).toEqual(Buffer.from(pureCircuits.commitTranscript(result.transcriptChain)));
  });

  it('a multi-round game rolls over: round 2 opens from round 1\'s boundary, not from the seed', () => {
    // Challenge rarely so hands empty before anyone reaches 15.
    const g = newGame();
    const rounds = playGame(g.referee, { trusting: true });
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

describe('v3p rollup (hex-packed): phase guard (the monotonic chain IS the replay protection)', () => {
  it('rounds must be proven in order; a proven round cannot be replayed', () => {
    const g = newGame();
    const rounds = playGame(g.referee, { trusting: true });
    expect(rounds.length).toBeGreaterThan(1);
    expect(() => g.proveRound(rounds[1])).toThrow(/rounds must be proven in order/);
    g.proveRound(rounds[0]);
    expect(() => g.proveRound(rounds[0])).toThrow(/rounds must be proven in order/);
    g.proveRound(rounds[1]);
  });

  it('closeGame refuses until the proven history reaches game end', () => {
    const g = newGame();
    const rounds = playGame(g.referee, { trusting: true });
    g.proveRound(rounds[0]);
    expect(() => g.closeGame()).toThrow(/has not reached game end/);
  });

  it('a stale boundary (wrong predecessor) cannot open stateRoot', () => {
    const g = newGame();
    const rounds = playGame(g.referee, { trusting: true });
    g.proveRound(rounds[0]);
    // Try to prove round 2 as if round 1 had never happened.
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

describe('v3p rollup (hex-packed): every cheat is a failed proof', () => {
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
      // Swap the real card for one the player was never dealt, and keep the
      // snapshots consistent with the lie so only CONSERVATION can catch it.
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
      // Turn the 3rd real move into padding and truncate the rest.
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
});

describe('v3p rollup (hex-packed): no wall clock anywhere', () => {
  it('proves a round and closes with the simulated block time far in the future', () => {
    // Block time is fixed at construction above (1.8e9); the circuits never
    // read it, so proving latency can never invalidate a transaction.
    const g = newGame();
    for (const r of playGame(g.referee)) g.proveRound(r);
    g.closeGame();
    expect(g.state().closed).toBe(true);
  });
});

describe('v3p rollup (hex-packed): attacks on the packing itself', () => {
  const setup = () => { const g = newGame(); return { g, rounds: playGame(g.referee, { trusting: true }) }; };

  it('lying about `remaining` (swapping a held card for one never dealt) is caught by dealt == played + remaining', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      // Pick a seat that still holds cards and change one of its REAL
      // remaining entries (index < size - plays) to a rank it was never dealt.
      const fin = w.snapshots[26];
      const seat = fin.plays0 < 7n ? 0 : 1;
      const held = unpackHand(rounds[0].dealt[seat]);
      const never = BigInt(held.findIndex((c) => c === 0n));
      w.remaining[seat][0] = never; // slot 0 is always a real entry when plays < size
    } })).toThrow(/do not reconcile with the deal/);
  });

  it('a remaining rank outside 0..12 is rejected before it can reach the sum', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      const seat = Number(w.snapshots[26].plays0) < 7 ? 0 : 1;
      if ((seat === 0 ? w.snapshots[26].plays0 : w.snapshots[26].plays1) === 7n) return;
      w.remaining[seat][0] = 13n;
    } })).toThrow(/rank out of range|do not reconcile with the deal/);
  });

  it('playing more cards than were dealt (the carry guard) is rejected even if the snapshots agree', () => {
    const { g, rounds } = setup();
    expect(() => g.proveRound(rounds[0], { tamper: (w) => {
      // Inflate the first PLAY to 4 cards of the claimed rank and propagate.
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

  it('the packed deal equals the per-rank deal (packing is lossless)', () => {
    const dealt = pureCircuits.dealPacked(SECRETS[0][0], seed, 1n, 7n);
    const ranks = pureCircuits.dealHandRanks(SECRETS[0][0], seed, 1n, 7n);
    expect(dealt).toBe(packRanks(ranks));
    expect(unpackHand(dealt).reduce((a, b) => a + b, 0n)).toBe(7n);
    expect(unpackHand(dealt).every((c) => c <= 4n)).toBe(true); // exact 52-card deal: max 4 of a rank
  });
});

describe('regression: starting rank must come from the seed, not the stored boundary (Preview block 1158119)', () => {
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
