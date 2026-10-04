import { describe, expect, it, beforeAll } from 'vitest';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { createReferee, KIND, MAX_MOVES, startingRank, winThreshold } from './rollup-referee.js';
import {
  consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, challengeReductionWitness, TWO_248,
} from '../cli/src/rollup-consent.js';

const { Contract, pureCircuits, ledger } = await import(
  process.env.POB_ROLLUP_BINDINGS_URL ?? './managed/proof-or-bluff-rollup/contract/index.js'
);

// These tests execute the REAL compiled closeGame circuit in memory. A circuit
// assertion that fails here is exactly the assertion that would make the
// zero-knowledge proof impossible on-chain. Every cheat below is therefore a
// cheat the chain can never accept.

const SPONSOR = '33'.repeat(32);
// Player identities are playerIdFromPk(pk) so closeGame can bind each
// CloseConsent signature to a registered seat.
const KP1 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x51));
const KP2 = consentKeyPairFromSecret(new Uint8Array(32).fill(0x52));
const P1 = pureCircuits.playerIdFromPk(KP1.pk);
const P2 = pureCircuits.playerIdFromPk(KP2.pk);
const NOW = 1_800_000_000;
const STANDARD = 1n;
const E1 = new Uint8Array(32).fill(3);
const E2 = new Uint8Array(32).fill(7);
const SALT1 = new Uint8Array(32).fill(0xa1);
const SALT2 = new Uint8Array(32).fill(0xb2);

/** Sign whatever result args the close submits (over = cheat overrides). */
function stageConsents(t, id, result, over = {}, { kp1 = KP1, kp2 = KP2 } = {}) {
  const consent = buildCloseConsent(pureCircuits, {
    gameId: id,
    transcriptRoot: over.transcriptRoot ?? result.transcriptRoot,
    p1Score: over.p1Score ?? result.p1Score,
    p2Score: over.p2Score ?? result.p2Score,
    winner: over.winner ?? result.winner,
  });
  t.witness.p1CloseConsent = signCloseConsent(pureCircuits, consent, kp1);
  t.witness.p2CloseConsent = signCloseConsent(pureCircuits, consent, kp2);
}

function newTable() {
  const witness = {
    entropy: [E1, E2], salts: [SALT1, SALT2], transcript: [], snapshots: [],
    p1CloseConsent: null, p2CloseConsent: null,
  };
  const contract = new Contract({
    entropyPair: (ctx) => [ctx.privateState, witness.entropy],
    saltPair: (ctx) => [ctx.privateState, witness.salts],
    transcript: (ctx) => [ctx.privateState, witness.transcript],
    snapshots: (ctx) => [ctx.privateState, witness.snapshots],
    p1CloseConsent: (ctx) => [ctx.privateState, witness.p1CloseConsent],
    p2CloseConsent: (ctx) => [ctx.privateState, witness.p2CloseConsent],
    get_challenge_reduction: (ctx, full) => challengeReductionWitness(ctx, full),
  });
  const initial = contract.initialState(runtime.createConstructorContext({}, SPONSOR));
  let context = runtime.createCircuitContext(
    runtime.dummyContractAddress(), SPONSOR,
    initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, NOW,
  );
  const at = (blockTime) => {
    context = runtime.createCircuitContext(
      runtime.dummyContractAddress(), SPONSOR,
      context.currentQueryContext.state, context.currentPrivateState, undefined, undefined, blockTime,
    );
  };
  const call = (name, ...args) => {
    const r = contract.circuits[name](context, ...args);
    context = r.context;
    return r.result;
  };
  const state = () => ledger(context.currentQueryContext.state);
  return { call, at, state, witness };
}

function openStandardGame(table, mode = STANDARD) {
  return table.call('openGame', P1, P2, mode,
    pureCircuits.commitEntropy(E1), pureCircuits.commitHandSalt(SALT1),
    pureCircuits.commitEntropy(E2), pureCircuits.commitHandSalt(SALT2), BigInt(NOW));
}

const seed = pureCircuits.combineEntropy(E1, E2);
const referee = (mode = STANDARD) => createReferee(pureCircuits, { seed, salts: [SALT1, SALT2], mode });

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
 * A scripted full game: the player on turn always plays 1 card; it tells the
 * truth when it holds the rank, otherwise bluffs. The opponent challenges
 * every bluff and every third truthful claim (a tell-reading opponent). Runs
 * until someone reaches the threshold or the transcript fills.
 */
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

describe('rollup contract: openGame', () => {
  it('stores commitments and nothing about cards', () => {
    const t = newTable();
    const id = openStandardGame(t);
    const g = t.state().games.lookup(id);
    expect(g.closed).toBe(false);
    expect(g.mode).toBe(STANDARD);
    expect(Buffer.from(g.p1EntropyCommit)).toEqual(Buffer.from(pureCircuits.commitEntropy(E1)));
    expect(Buffer.from(g.p2SaltCommit)).toEqual(Buffer.from(pureCircuits.commitHandSalt(SALT2)));
    expect(t.state().totalGamesOpened).toBe(1n);
  });
  it('rejects non score-based modes and identical players', () => {
    const t = newTable();
    expect(() => openStandardGame(t, 2n)).toThrow(/score-based/);
    expect(() => t.call('openGame', P1, P1, STANDARD,
      pureCircuits.commitEntropy(E1), pureCircuits.commitHandSalt(SALT1),
      pureCircuits.commitEntropy(E2), pureCircuits.commitHandSalt(SALT2), BigInt(NOW))).toThrow(/differ/);
  });
});

describe('rollup contract: a complete honest game closes with one proof', () => {
  let t, id, result, ref;
  beforeAll(() => {
    t = newTable();
    id = openStandardGame(t);
    ref = referee();
    result = playScriptedGame(ref);
    t.witness.transcript = result.witnesses.transcript;
    t.witness.snapshots = result.witnesses.snapshots;
  });

  it('the scripted game actually finishes (someone reaches 15)', () => {
    expect(ref.state.ended).toBe(true);
    expect(result.winner === 1n || result.winner === 2n).toBe(true);
    expect(result.witnesses.transcript.length).toBe(MAX_MOVES);
    expect(result.witnesses.snapshots.length).toBe(MAX_MOVES + 1);
  });

  it('closeGame accepts the referee\'s transcript and records the result', () => {
    stageConsents(t, id, result);
    t.call('closeGame', id, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, BigInt(NOW));
    const g = t.state().games.lookup(id);
    expect(g.closed).toBe(true);
    expect(g.transcriptRoot).toBe(result.transcriptRoot);
    expect(g.p1Score).toBe(result.p1Score);
    expect(g.p2Score).toBe(result.p2Score);
    expect(g.winner).toBe(result.winner);
    expect(t.state().totalGamesClosed).toBe(1n);
  });

  it('cannot be closed twice', () => {
    expect(() => t.call('closeGame', id, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, BigInt(NOW)))
      .toThrow(/already closed/);
  });

  it('the opening snapshot is derived from the seed (rank + both deals)', () => {
    const s0 = result.witnesses.snapshots[0];
    expect(s0.currentRank).toBe(startingRank(seed));
    expect(s0.hand0.reduce((a, v) => a + v, 0n)).toBe(7n);
    expect(s0.hand1.reduce((a, v) => a + v, 0n)).toBe(7n);
  });
});

describe('rollup contract: closeGame has no freshness window (proving takes minutes)', () => {
  // Proving closeGame measured 130–195 s; a 120 s window rejected every valid
  // proof. The close must accept any timestamp at or before block time.
  it.each([0, 120, 121, 3600, 7 * 24 * 3600])('closes a valid signed game %i seconds after its timestamp', (delaySeconds) => {
    const table = newTable();
    const gameId = openStandardGame(table);
    const result = playScriptedGame(referee());
    table.witness.transcript = result.witnesses.transcript;
    table.witness.snapshots = result.witnesses.snapshots;
    stageConsents(table, gameId, result);
    table.at(NOW + delaySeconds);
    table.call('closeGame', gameId, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, BigInt(NOW));
    const g = table.state().games.lookup(gameId);
    expect(g.closed).toBe(true);
    expect(g.closedAt).toBe(BigInt(NOW)); // a sound lower bound on block time
  });

  it('still refuses a timestamp from the future', () => {
    const table = newTable();
    const gameId = openStandardGame(table);
    const result = playScriptedGame(referee());
    table.witness.transcript = result.witnesses.transcript;
    table.witness.snapshots = result.witnesses.snapshots;
    stageConsents(table, gameId, result);
    expect(() => table.call('closeGame', gameId, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, BigInt(NOW + 1)))
      .toThrow(/Timestamp is in the future/);
  });

  it('openGame keeps the 120 s freshness window (it stamps openedAt for the prune TTL)', () => {
    const table = newTable();
    table.at(NOW + 121);
    expect(() => openStandardGame(table)).toThrow(/Timestamp is too old/);
  });
});

describe('rollup contract: every cheat is a failed proof', () => {
  const freshClosedSetup = () => {
    const t = newTable();
    const id = openStandardGame(t);
    const ref = referee();
    const result = playScriptedGame(ref);
    t.witness.transcript = result.witnesses.transcript.map((m) => ({ ...m, cards: [...m.cards] }));
    t.witness.snapshots = result.witnesses.snapshots.map((s) => ({ ...s, hand0: [...s.hand0], hand1: [...s.hand1] }));
    return { t, id, ref, result };
  };
  const close = (t, id, r, over = {}) => {
    // The cheater can sign whatever it submits — consents bind the SUBMITTED
    // args, so the game-logic asserts (not the signature check) must reject it.
    stageConsents(t, id, r, over);
    return t.call('closeGame', id,
      over.transcriptRoot ?? r.transcriptRoot, over.p1Score ?? r.p1Score, over.p2Score ?? r.p2Score,
      over.winner ?? r.winner, BigInt(NOW));
  };

  it('wrong winner', () => {
    const { t, id, result } = freshClosedSetup();
    expect(() => close(t, id, result, { winner: result.winner === 1n ? 2n : 1n })).toThrow(/winner mismatch/);
  });
  it('inflated score', () => {
    const { t, id, result } = freshClosedSetup();
    expect(() => close(t, id, result, { p1Score: result.p1Score + 1n })).toThrow(/final score mismatch/);
  });
  it('wrong transcript root', () => {
    const { t, id, result } = freshClosedSetup();
    expect(() => close(t, id, result, { transcriptRoot: result.transcriptRoot + 1n })).toThrow(/transcript root mismatch/);
  });
  it('wrong entropy (seed does not open the commitment)', () => {
    const { t, id, result } = freshClosedSetup();
    t.witness.entropy = [E2, E1];
    expect(() => close(t, id, result)).toThrow(/entropy mismatch/);
  });
  it('wrong salt', () => {
    const { t, id, result } = freshClosedSetup();
    t.witness.salts = [SALT2, SALT1];
    expect(() => close(t, id, result)).toThrow(/salt mismatch/);
  });
  it('a forged card in a PLAY (card the player did not hold)', () => {
    const { t, id, result } = freshClosedSetup();
    const i = t.witness.transcript.findIndex((m) => m.kind === KIND.PLAY);
    const s = t.witness.snapshots[i];
    const hand = s.turn === 0n ? s.hand0 : s.hand1;
    const missing = hand.findIndex((c) => c === 0n);
    t.witness.transcript[i].cards[0] = BigInt(missing);
    // The snapshot after it no longer matches either; whichever assert fires, the proof fails.
    expect(() => close(t, id, result)).toThrow(/card not held|invalid transition|transcript root/);
  });
  it('a tampered snapshot (score bumped mid-game)', () => {
    const { t, id, result } = freshClosedSetup();
    t.witness.snapshots[10].score0 += 1n;
    expect(() => close(t, id, result)).toThrow(/invalid transition/);
  });
  it('a phantom card (rank index > 12) cannot dodge the removal check', () => {
    const { t, id, result } = freshClosedSetup();
    const i = t.witness.transcript.findIndex((m) => m.kind === KIND.PLAY);
    t.witness.transcript[i].cards[0] = 200n;
    expect(() => close(t, id, result)).toThrow(/played card out of range|invalid transition/);
  });
  it('non-PLAY moves must carry canonical zero rank/count (transcript root is over them)', () => {
    const { t, id, result } = freshClosedSetup();
    const i = t.witness.transcript.findIndex((m) => m.kind === KIND.ACCEPT || m.kind === KIND.CHALLENGE);
    t.witness.transcript[i].rank = 7n;
    expect(() => close(t, id, result)).toThrow(/non-PLAY fields must be zero|invalid transition/);
  });
  it('a close signed by the wrong key (fabricated transcript, attacker holds both salts)', () => {
    const { t, id, result } = freshClosedSetup();
    // The whole point of CloseConsent: even a fully legal fabricated transcript
    // cannot be closed without BOTH registered players' signatures.
    const attacker = consentKeyPairFromSecret(new Uint8Array(32).fill(0x99));
    stageConsents(t, id, result, {}, { kp2: attacker });
    expect(() => t.call('closeGame', id, result.transcriptRoot, result.p1Score, result.p2Score, result.winner, BigInt(NOW)))
      .toThrow(/signer is not player two/);
  });
  it('a consent for a different result is rejected', () => {
    const { t, id, result } = freshClosedSetup();
    // Sign the REAL result but submit a different winner — the consent no
    // longer equals what is being written. (Fails on winner mismatch first
    // if the replay still catches it; either way the proof fails.)
    stageConsents(t, id, result);
    expect(() => t.call('closeGame', id, result.transcriptRoot, result.p1Score, result.p2Score,
      result.winner === 1n ? 2n : 1n, BigInt(NOW))).toThrow();
  });
  it('closing a game early as a draw (padding before the end)', () => {
    const t = newTable();
    const id = openStandardGame(t);
    const ref = referee();
    // Play a few moves, then stop and pad — the game is NOT over.
    const s = ref.state;
    const cards = takeCards(s.hand0, s.currentRank, 1, { lie: s.hand0[Number(s.currentRank)] === 0n });
    ref.play(s.currentRank, 1n, cards, 5n);
    ref.accept();
    expect(() => ref.pad()).toThrow(/padding before game end/);
    // Force the witnesses anyway (a dishonest client) and the circuit rejects.
    const states = [...ref.states];
    const moves = [...ref.moves];
    const noop = { kind: 0n, rank: 0n, count: 0n, cards: [0n, 0n, 0n, 0n], playSalt: 0n };
    while (moves.length < MAX_MOVES) { moves.push(noop); states.push(states[states.length - 1]); }
    t.witness.transcript = moves; t.witness.snapshots = states;
    const fin = states[MAX_MOVES];
    expect(() => t.call('closeGame', id, fin.chain, fin.score0, fin.score1, 0n, BigInt(NOW))).toThrow(/padding before game end/);
  });
  it('opening snapshot not derived from the seed', () => {
    const { t, id, result } = freshClosedSetup();
    t.witness.snapshots[0].currentRank = (t.witness.snapshots[0].currentRank + 1n) % 13n;
    expect(() => close(t, id, result)).toThrow(/opening snapshot mismatch/);
  });
});

describe('rollup contract: pruneExpired', () => {
  it('removes an unclosed game only after 7 days', () => {
    const t = newTable();
    const id = openStandardGame(t);
    expect(() => t.call('pruneExpired', id, BigInt(NOW))).toThrow(/not yet expired/);
    const later = NOW + 7 * 24 * 3600 + 1;
    t.at(later);
    t.call('pruneExpired', id, BigInt(later));
    expect(t.state().games.member(id)).toBe(false);
    expect(t.state().totalGamesPruned).toBe(1n);
  });
});

describe('rollup deal: byte-width optimization preserves hands', () => {
  it.each([
    [5n, 1n, [5, 4, 10, 8, 2, 0, 0]],
    [5n, 3n, [7, 6, 3, 9, 5, 0, 0]],
    [5n, 6n, [4, 11, 1, 4, 4, 0, 0]],
    [7n, 1n, [5, 4, 10, 7, 2, 6, 8]],
    [7n, 3n, [7, 6, 3, 9, 5, 8, 1]],
    [7n, 6n, [4, 10, 0, 4, 4, 8, 12]],
  ])('preserves the pre-optimization size %s round %s fixture', (size, round, expected) => {
    const salt = Uint8Array.from({ length: 32 }, (_, index) => index);
    expect(pureCircuits.dealHandRanks(salt, seed, round, size)).toEqual(expected.map(BigInt));
  });
});

describe('rollup referee: engine parity sanity', () => {
  it('CASUAL deals five and plays to 10', () => {
    const ref = referee(0n);
    expect(ref.opening.hand0.reduce((a, v) => a + v, 0n)).toBe(5n);
    expect(winThreshold(0n)).toBe(10n);
  });
});
