// Tests for the server-side rollup game session (rollup-session.js).
//
// The headline tests play a COMPLETE human-vs-bot game through the session —
// the "human" is a scripted browser that only ever sees getPublicState() plus
// its own cards — then call finish() and hand the returned witnesses to the
// REAL compiled closeGame circuit (in-memory, no chain). If the circuit
// accepts, the session produced exactly what a provable game needs.
//
// Run from repo root:  npx vitest run realDeal/cli/src/rollup-session.test.js

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as runtime from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../../contracts/managed/proof-or-bluff-rollup/contract/index.js';
import { KIND, MAX_MOVES, handSize, startingRank } from '../../contracts/rollup-referee.js';
import { createRollupSession, probeTurnRule, SEAT, SESSION_STATUS } from './rollup-session.js';

// Who claims after a response is decided by the circuit (see probeTurnRule in
// rollup-session.js). As compiled today the human claims on every turn and the
// bot only responds; the per-move Preview contract alternates claimants. The
// game-level tests below are written to pass under either rule; the unit tests
// that need the bot to CLAIM force the alternating rule explicitly.
const CIRCUIT_TURN_RULE = probeTurnRule(pureCircuits);
const ALTERNATING_TURN_RULE = { responderPlaysNext: true };

// ---------------------------------------------------------------------------
// Determinism helpers
// ---------------------------------------------------------------------------

/** Counter-based "random" bytes: same tag → same stream, every run. */
function createDeterministicRandomBytes(tag) {
  let counter = 0;
  return (length) => {
    const out = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += 32) {
      counter += 1;
      const block = createHash('sha256').update(`${tag}:${counter}`).digest();
      out.set(block.subarray(0, Math.min(32, length - offset)), offset);
    }
    return out;
  };
}

/** mulberry32 — a tiny seeded PRNG so the scripted AI (Math.random) is stable. */
function createSeededRandom(seedNumber) {
  let state = seedNumber >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every object key reachable in a plain value (for "nothing private leaks" checks). */
function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, keys));
  else if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
    for (const [key, child] of Object.entries(value)) { keys.add(key); collectKeys(child, keys); }
  }
  return [...keys];
}

const STANDARD = 1n;
const CASUAL = 0n;
const NOW_SECONDS = 1_800_000_000;
const SPONSOR = '33'.repeat(32);

const HUMAN_SESSION_KEY = new Uint8Array(32).fill(0x11);
const HUMAN_ENTROPY = new Uint8Array(32).fill(0x03);
const HUMAN_SALT = new Uint8Array(32).fill(0xa1);
const WRONG_ENTROPY = new Uint8Array(32).fill(0x04);
const WRONG_SALT = new Uint8Array(32).fill(0xa2);

function newSession(overrides = {}) {
  return createRollupSession({
    pureCircuits,
    mode: STANDARD,
    difficulty: 'medium',
    humanSessionKey: HUMAN_SESSION_KEY,
    humanEntropyCommit: pureCircuits.commitEntropy(HUMAN_ENTROPY),
    humanSaltCommit: pureCircuits.commitHandSalt(HUMAN_SALT),
    randomBytes: createDeterministicRandomBytes('bot'),
    now: () => NOW_SECONDS * 1000,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Injectable AIs for edge-case tests
// ---------------------------------------------------------------------------

/** Plays one honest card if it can (else one bluff card); never challenges. */
const alwaysAcceptAi = {
  decidePlay: ({ aiHand, requiredRank }) => {
    const honest = aiHand.find((card) => card.rank === requiredRank);
    const chosen = honest ?? aiHand[0];
    return { cardsToPlay: [chosen], claimedRank: requiredRank, claimedCount: 1, isBluff: !honest, dialogue: 'ok' };
  },
  decideChallenge: () => ({ shouldChallenge: false, dialogue: 'fine' }),
  getChallengeReaction: () => 'hm',
};

/** Same plays, but challenges EVERY human claim. */
const alwaysChallengeAi = {
  ...alwaysAcceptAi,
  decideChallenge: () => ({ shouldChallenge: true, dialogue: 'Proof or Bluff!' }),
};

/** A broken AI that tries to play a card it does not hold. */
const forgingAi = {
  ...alwaysAcceptAi,
  decidePlay: ({ aiHand, requiredRank }) => {
    const heldRankIndexes = new Set(aiHand.map((card) => card.rankIndex));
    const missing = [...Array(13).keys()].find((rankIndex) => !heldRankIndexes.has(rankIndex));
    return { cardsToPlay: [{ id: 'forged', rank: 'X', rankIndex: missing }], claimedRank: requiredRank, claimedCount: 1, isBluff: true, dialogue: '' };
  },
};

// ---------------------------------------------------------------------------
// A scripted human (the browser side). It sees ONLY public state + its own hand.
// ---------------------------------------------------------------------------

function dealHumanHand(seed, round, cardsPerHand) {
  const ranks = pureCircuits.dealHandRanks(HUMAN_SALT, seed, BigInt(round), cardsPerHand);
  return Array.from(pureCircuits.handCountsFromRanks(ranks, cardsPerHand), (held) => BigInt(held));
}

/**
 * @param style          'honest' plays the real rank when held, otherwise bluffs
 *                       one card; 'bluffer' bluffs whenever it holds a non-matching card
 * @param challengeEvery challenge every Nth bot claim (1 = always)
 */
function createScriptedHuman(session, { style = 'honest', challengeEvery = 2, randomBytes, mode = STANDARD }) {
  const cardsPerHand = handSize(mode);
  let seed = null;
  let round = 0n;
  let hand = null;
  let botClaimsSeen = 0;
  const plays = [];                 // { moveIndex, cards, playSalt } — witnesses for finish()
  const revealedMoveIndexes = new Set();

  function syncHandWithRound() {
    const publicRound = session.getPublicState().round;
    if (publicRound === round) return;
    round = publicRound;
    hand = dealHumanHand(seed, round, cardsPerHand);
  }

  function pickCards(currentRank) {
    const rankIndex = Number(currentRank);
    const otherRanks = [...Array(13).keys()].filter((r) => r !== rankIndex && hand[r] > 0n);
    const bluffPossible = otherRanks.length > 0;
    const wantsBluff = style === 'bluffer' ? bluffPossible : hand[rankIndex] === 0n;
    if (wantsBluff) return [BigInt(otherRanks[0])];
    return [BigInt(rankIndex)];
  }

  return {
    get plays() { return plays; },
    get unrevealedPlays() { return plays.filter((play) => !revealedMoveIndexes.has(play.moveIndex)); },
    begin() {
      const { botEntropy } = session.revealEntropy(HUMAN_ENTROPY);
      seed = pureCircuits.combineEntropy(HUMAN_ENTROPY, botEntropy);
      syncHandWithRound();
      return seed;
    },
    play() {
      const state = session.getPublicState();
      const cards = pickCards(state.currentRank);
      const vector = [...cards]; while (vector.length < 4) vector.push(0n);
      const playSalt = BigInt(`0x${Buffer.from(randomBytes(31)).toString('hex')}`);
      const playCommit = pureCircuits.commitPlayCards(vector, playSalt);
      const moveIndex = state.moveCount;
      const response = session.humanPlay({ rank: state.currentRank, count: cards.length, playCommit });
      plays.push({ moveIndex, cards: vector, playSalt });
      for (const card of cards) hand[Number(card)] -= 1n;
      if (response.needsReveal) {
        session.humanRevealChallenged({ cards: vector, playSalt });
        revealedMoveIndexes.add(moveIndex);
      }
      syncHandWithRound();
      return response;
    },
    respond() {
      botClaimsSeen += 1;
      const result = botClaimsSeen % challengeEvery === 0 ? session.humanChallenge() : session.humanAccept();
      syncHandWithRound();
      return result;
    },
  };
}

/** Drive a whole game until the session ends. Returns stats for assertions. */
function playWholeGame(session, human) {
  const stats = { botChallenges: 0, humanChallenges: 0, botBluffsCaught: 0 };
  human.begin();
  while (session.status === SESSION_STATUS.PLAYING) {
    const state = session.getPublicState();
    if (state.pendingClaim && state.turn === SEAT.HUMAN) {
      const result = human.respond();
      if ('truthful' in result) { stats.humanChallenges += 1; if (!result.truthful) stats.botBluffsCaught += 1; }
    } else if (state.turn === SEAT.HUMAN) {
      const response = human.play();
      if (response.botResponse === 'challenge') stats.botChallenges += 1;
    } else {
      session.botPlay();
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// The real compiled contract, in memory (same pattern as the sim test).
// ---------------------------------------------------------------------------

function newTable() {
  const witness = { entropy: null, salts: null, transcript: [], snapshots: [] };
  const contract = new Contract({
    entropyPair: (ctx) => [ctx.privateState, witness.entropy],
    saltPair: (ctx) => [ctx.privateState, witness.salts],
    transcript: (ctx) => [ctx.privateState, witness.transcript],
    snapshots: (ctx) => [ctx.privateState, witness.snapshots],
  });
  const initial = contract.initialState(runtime.createConstructorContext({}, SPONSOR));
  let context = runtime.createCircuitContext(
    runtime.dummyContractAddress(), SPONSOR,
    initial.currentContractState.data, initial.currentPrivateState, undefined, undefined, NOW_SECONDS,
  );
  const call = (name, ...args) => {
    const r = contract.circuits[name](context, ...args);
    context = r.context;
    return r.result;
  };
  const state = () => ledger(context.currentQueryContext.state);
  return { call, state, witness };
}

/** openGame from the session's public commitments, then closeGame from finish()'s output. */
function openAndCloseOnChain(session, finished) {
  const pub = session.getPublicState();
  const table = newTable();
  const gameId = table.call('openGame',
    pub.players.human.sessionKey, pub.players.bot.sessionKey, pub.mode,
    pub.players.human.entropyCommit, pub.players.human.saltCommit,
    pub.players.bot.entropyCommit, pub.players.bot.saltCommit, BigInt(NOW_SECONDS));
  table.witness.entropy = finished.entropyPair;
  table.witness.salts = finished.saltPair;
  table.witness.transcript = finished.witnesses.transcript;
  table.witness.snapshots = finished.witnesses.snapshots;
  table.call('closeGame', gameId, finished.transcriptRoot, finished.p1Score, finished.p2Score, finished.winner, BigInt(NOW_SECONDS));
  return table.state().games.lookup(gameId);
}

// ---------------------------------------------------------------------------

beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(createSeededRandom(20261003)); });
afterEach(() => { vi.restoreAllMocks(); });

describe('rollup session: opening material', () => {
  it('exposes bot commitments that open with pureCircuits and keeps the openings private', () => {
    const session = newSession();
    expect(session.botEntropyCommit).toBeInstanceOf(Uint8Array);
    expect(session.botSaltCommit).toBeInstanceOf(Uint8Array);
    expect(session.status).toBe(SESSION_STATUS.AWAITING_ENTROPY);
    const pub = session.getPublicState();
    expect(Buffer.from(pub.players.bot.entropyCommit)).toEqual(Buffer.from(session.botEntropyCommit));
    expect(pub.seed).toBeNull();
    for (const privateKey of ['salt', 'entropy', 'playSalt', 'cards', 'handCounts', 'playRecords']) {
      expect(collectKeys(pub)).not.toContain(privateKey);
    }
  });

  it('rejects an entropy that does not open the human commitment', () => {
    const session = newSession();
    expect(() => session.revealEntropy(WRONG_ENTROPY)).toThrow(/does not open the committed entropy/);
    expect(session.status).toBe(SESSION_STATUS.AWAITING_ENTROPY);
  });

  it('revealEntropy returns the bot entropy, derives the shared seed and the opening rank', () => {
    const session = newSession();
    const { botEntropy, seed } = session.revealEntropy(HUMAN_ENTROPY);
    expect(Buffer.from(pureCircuits.commitEntropy(botEntropy))).toEqual(Buffer.from(session.botEntropyCommit));
    expect(seed).toBe(pureCircuits.combineEntropy(HUMAN_ENTROPY, botEntropy));   // seed is a transient Field (bigint)
    const pub = session.getPublicState();
    expect(pub.currentRank).toBe(startingRank(seed));
    expect(pub.turn).toBe(SEAT.HUMAN);
    expect(pub.handSizes).toEqual({ human: 7n, bot: 7n });
    expect(pub.round).toBe(1n);
  });

  it('rejects non score-based modes and malformed keys', () => {
    expect(() => newSession({ mode: 2n })).toThrow(/score-based/);
    expect(() => newSession({ humanSessionKey: new Uint8Array(31) })).toThrow(/32-byte/);
  });

  it('follows the circuit\'s turn rule after a response (probed from the referee, not hardcoded)', () => {
    const session = newSession({ ai: alwaysAcceptAi });
    session.revealEntropy(HUMAN_ENTROPY);
    const rank = session.getPublicState().currentRank;
    session.humanPlay({ rank, count: 1n, playCommit: pureCircuits.commitPlayCards([rank, 0n, 0n, 0n], 1n) });
    const expectedTurn = CIRCUIT_TURN_RULE.responderPlaysNext ? SEAT.BOT : SEAT.HUMAN;
    expect(session.getPublicState().turn).toBe(expectedTurn);
    expect(session.getPublicState().turnRule).toEqual(CIRCUIT_TURN_RULE);
  });
});

describe('rollup session: move validation', () => {
  /** Alternating claimants so the bot gets to PLAY and the human to respond. */
  function playingSession(ai = alwaysAcceptAi) {
    const session = newSession({ ai, turnRule: ALTERNATING_TURN_RULE });
    session.revealEntropy(HUMAN_ENTROPY);
    return session;
  }
  const anyCommit = pureCircuits.commitPlayCards([0n, 0n, 0n, 0n], 1n);

  it('rejects a human claim of the wrong rank, a bad count or a count above the hand size', () => {
    const session = playingSession();
    const rank = session.getPublicState().currentRank;
    expect(() => session.humanPlay({ rank: (rank + 1n) % 13n, count: 1n, playCommit: anyCommit })).toThrow(/bad claim: must claim the current rank/);
    expect(() => session.humanPlay({ rank, count: 0n, playCommit: anyCommit })).toThrow(/count must be 1..4/);
    expect(() => session.humanPlay({ rank, count: 5n, playCommit: anyCommit })).toThrow(/count must be 1..4/);
    expect(() => session.humanPlay({ rank, count: 1, playCommit: 'nope' })).toThrow(/playCommit must be/);
    expect(session.getPublicState().moveCount).toBe(0);
  });

  it('rejects the human playing or responding out of turn', () => {
    const session = playingSession();
    expect(() => session.humanAccept()).toThrow(/no bot claim/);
    expect(() => session.botPlay()).toThrow(/not the bot's turn/);
    const rank = session.getPublicState().currentRank;
    const response = session.humanPlay({ rank, count: 1n, playCommit: anyCommit });
    expect(response.botResponse).toBe('accept');
    // Now it is the bot's turn to PLAY: the human may neither play nor respond.
    expect(session.getPublicState().turn).toBe(SEAT.BOT);
    expect(() => session.humanPlay({ rank, count: 1n, playCommit: anyCommit })).toThrow(/not the human's turn/);
    expect(() => session.humanChallenge()).toThrow(/no bot claim/);
    session.botPlay();
    // The bot's claim is pending: the human must respond, not play.
    expect(() => session.botPlay()).toThrow(/not the bot's turn/);
    expect(() => session.humanPlay({ rank, count: 1n, playCommit: anyCommit })).toThrow(/play while claim pending/);
  });

  it('rejects a challenged reveal that does not open the play commitment, then accepts the right one', () => {
    const session = playingSession(alwaysChallengeAi);
    const rank = session.getPublicState().currentRank;
    const cards = [rank, 0n, 0n, 0n];
    const playSalt = 777n;
    const response = session.humanPlay({ rank, count: 1n, playCommit: pureCircuits.commitPlayCards(cards, playSalt) });
    expect(response.needsReveal).toBe(true);
    expect(session.getPublicState().pendingClaim.awaitingHumanReveal).toBe(true);
    // The table is frozen until the reveal.
    expect(() => session.botPlay()).toThrow(/humanRevealChallenged/);
    expect(() => session.humanRevealChallenged({ cards, playSalt: 778n })).toThrow(/do not open the play commitment/);
    expect(() => session.humanRevealChallenged({ cards: [(rank + 1n) % 13n], playSalt })).toThrow(/do not open the play commitment/);
    const resolved = session.humanRevealChallenged({ cards, playSalt });
    expect(resolved.truthful).toBe(true);
    // Truthful claim → the challenging bot loses 1, floored at 0.
    expect(session.getPublicState().scores).toEqual({ human: 0n, bot: 0n });
    expect(session.getPublicState().moveCount).toBe(2);
    expect(session.getPublicState().transcript[1].kind).toBe(KIND.CHALLENGE);
  });

  it('a caught human bluff gives the bot +3', () => {
    const session = playingSession(alwaysChallengeAi);
    const rank = session.getPublicState().currentRank;
    const bluffCards = [(rank + 1n) % 13n, 0n, 0n, 0n];
    session.humanPlay({ rank, count: 1n, playCommit: pureCircuits.commitPlayCards(bluffCards, 5n) });
    const resolved = session.humanRevealChallenged({ cards: bluffCards, playSalt: 5n });
    expect(resolved.truthful).toBe(false);
    expect(session.getPublicState().scores).toEqual({ human: 0n, bot: 3n });
  });

  it('the bot never plays a card it does not hold, and its challenged cards open its commitment', () => {
    const forging = playingSession(forgingAi);
    forging.humanPlay({ rank: forging.getPublicState().currentRank, count: 1n, playCommit: anyCommit });
    expect(() => forging.botPlay()).toThrow(/does not hold/);

    const honest = playingSession(alwaysAcceptAi);
    honest.humanPlay({ rank: honest.getPublicState().currentRank, count: 1n, playCommit: anyCommit });
    const botMove = honest.botPlay();
    expect(botMove.count).toBe(1n);
    expect(honest.getPublicState().handSizes.bot).toBe(6n);
    const reveal = honest.humanChallenge();
    expect(pureCircuits.commitPlayCards(reveal.cardVector, reveal.playSalt)).toBe(botMove.playCommit);
    expect(reveal.cards).toHaveLength(1);
  });

  it('finish() and revealBotSalt() are refused before the game has ended', () => {
    const session = playingSession();
    expect(() => session.finish({ humanSalt: HUMAN_SALT, humanPlays: [] })).toThrow(/requires 'ended'/);
    expect(() => session.revealBotSalt()).toThrow(/requires 'ended'/);
  });
});

describe('rollup session: complete games are accepted by the real closeGame circuit', () => {
  it('honest human vs scripted bot — finish() yields circuit-valid witnesses', () => {
    const session = newSession();
    const human = createScriptedHuman(session, { style: 'honest', challengeEvery: 1, randomBytes: createDeterministicRandomBytes('human') });
    const stats = playWholeGame(session, human);
    const pub = session.getPublicState();
    expect(session.status).toBe(SESSION_STATUS.ENDED);
    // The bot challenged an honest human at least once (and lost a point for it).
    expect(stats.botChallenges).toBeGreaterThan(0);
    expect(pub.transcript.some((move) => move.kind === KIND.CHALLENGE)).toBe(true);

    const finished = session.finish({ humanSalt: HUMAN_SALT, humanPlays: human.unrevealedPlays });
    expect(finished.transcriptRoot).toBe(pub.chainHead);
    expect(finished.p1Score).toBe(pub.scores.human);
    expect(finished.p2Score).toBe(pub.scores.bot);
    expect(finished.winner).toBe(pub.winner);
    expect(finished.witnesses.transcript).toHaveLength(MAX_MOVES);
    expect(finished.witnesses.snapshots).toHaveLength(MAX_MOVES + 1);
    expect(Buffer.from(finished.saltPair[1])).toEqual(Buffer.from(session.revealBotSalt()));

    const record = openAndCloseOnChain(session, finished);
    expect(record.closed).toBe(true);
    expect(record.winner).toBe(pub.winner);
    expect(record.p1Score).toBe(pub.scores.human);
    expect(session.status).toBe(SESSION_STATUS.FINISHED);
  });

  it('bluffing human vs scripted bot — bluffs get caught, someone wins, the game is provable', () => {
    const session = newSession({ randomBytes: createDeterministicRandomBytes('bot-2') });
    const human = createScriptedHuman(session, { style: 'bluffer', challengeEvery: 2, randomBytes: createDeterministicRandomBytes('human-2') });
    const stats = playWholeGame(session, human);
    expect(stats.botChallenges).toBeGreaterThan(0);
    const pub = session.getPublicState();
    expect(pub.ended).toBe(true);
    expect(pub.winner === 1n || pub.winner === 2n).toBe(true);
    expect(pub.scores.human >= 15n || pub.scores.bot >= 15n).toBe(true);
    // Supplying ALL plays (revealed ones included) is fine as long as they match.
    const finished = session.finish({ humanSalt: HUMAN_SALT, humanPlays: human.plays });
    expect(finished.transcriptRoot).toBe(pub.chainHead);
    const record = openAndCloseOnChain(session, finished);
    expect(record.closed).toBe(true);
    expect(record.transcriptRoot).toBe(pub.chainHead);
  });

  it('a game that fills MAX_MOVES without a winner is a draw the circuit accepts', () => {
    // Nobody ever challenges, so no score ever moves: 64 moves, no winner.
    const session = newSession({ ai: alwaysAcceptAi });
    const human = createScriptedHuman(session, { style: 'honest', challengeEvery: 1_000_000, randomBytes: createDeterministicRandomBytes('human-3') });
    playWholeGame(session, human);
    const pub = session.getPublicState();
    expect(pub.moveCount).toBe(MAX_MOVES);
    expect(pub.ended).toBe(false);
    expect(pub.winner).toBe(0n);
    expect(pub.round).toBeGreaterThan(1n);           // hands emptied and were re-dealt
    expect(session.status).toBe(SESSION_STATUS.ENDED);

    const finished = session.finish({ humanSalt: HUMAN_SALT, humanPlays: human.plays });
    expect(finished.winner).toBe(0n);
    expect(finished.witnesses.transcript.every((move) => move.kind !== KIND.NOOP)).toBe(true);
    const record = openAndCloseOnChain(session, finished);
    expect(record.closed).toBe(true);
    expect(record.winner).toBe(0n);
  });
});

describe('rollup session: finish() refuses anything the circuit would refuse', () => {
  function endedGame() {
    const session = newSession();
    const human = createScriptedHuman(session, { style: 'honest', challengeEvery: 1, randomBytes: createDeterministicRandomBytes('human') });
    playWholeGame(session, human);
    return { session, human };
  }

  it('wrong human salt', () => {
    const { session, human } = endedGame();
    expect(() => session.finish({ humanSalt: WRONG_SALT, humanPlays: human.plays })).toThrow(/does not open the committed hand salt/);
  });

  it('missing cards for a human play', () => {
    const { session, human } = endedGame();
    const incomplete = human.unrevealedPlays.slice(1);
    if (incomplete.length === human.unrevealedPlays.length) return; // nothing to drop
    expect(() => session.finish({ humanSalt: HUMAN_SALT, humanPlays: incomplete })).toThrow(/did not supply the cards/);
  });

  it('cards that do not open the recorded play commitment', () => {
    const { session, human } = endedGame();
    const tampered = human.plays.map((play, i) => (i === 0 ? { ...play, playSalt: play.playSalt + 1n } : play));
    expect(() => session.finish({ humanSalt: HUMAN_SALT, humanPlays: tampered })).toThrow(/do not open the recorded play commitment/);
  });

  it('a human whose committed salt deals a hand that cannot contain the played cards', () => {
    // The human commits to salt B but plays as if holding salt A's hand. The
    // commitments all open; the referee's membership check is what fails.
    const otherSalt = new Uint8Array(32).fill(0xc3);
    const session = newSession({ humanSaltCommit: pureCircuits.commitHandSalt(otherSalt) });
    const human = createScriptedHuman(session, { style: 'honest', challengeEvery: 1, randomBytes: createDeterministicRandomBytes('human') });
    playWholeGame(session, human);
    expect(() => session.finish({ humanSalt: otherSalt, humanPlays: human.plays })).toThrow(/unprovable game/);
  });
});
