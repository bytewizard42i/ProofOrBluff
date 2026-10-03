// Server-side game session for the "one proof per game" rollup
// (docs/ZK_GAME_ROLLUP.md §2). One session = one game between a HUMAN (the
// browser, player ONE / hand0) and the BOT (this process, player TWO / hand1).
//
// WHAT this module does
//   * holds the bot's private material (entropy, hand salt, dealt hand, the
//     real cards behind every bot PLAY) and never lets it into the public view;
//   * drives the scripted AI (demoLand/src/game/ai/scripted.js) for the bot's
//     plays and challenge decisions, validating every AI answer against the
//     bot's real hand so the bot can never "forge" a card;
//   * maintains the PUBLIC table state — turn, current rank, pending claim and
//     its play commitment, scores, round, hand SIZES, the transcript hash chain
//     head — with a small state machine that mirrors `applyMove` in
//     proof-or-bluff-rollup.compact for the public fields only;
//   * at game end, `finish()` rebuilds the FULL referee (rollup-referee.js —
//     the JS mirror of the circuit) from both salts and every play's real cards
//     and produces exactly the witnesses + public inputs `closeGame` needs.
//
// WHY the public machine cannot simply run the referee during play
//   The referee needs BOTH hands (it checks card membership on every PLAY).
//   During play the bot does not know the human's salt or cards — it only sees
//   the human's claims and a blinded `playCommit` — so it tracks the human's
//   hand as a public COUNT. The circuit's round rollover is triggered by hand
//   EMPTINESS, and a count of 0 is exactly emptiness, so counts are enough to
//   keep turn / rank / round / scores in lockstep with the circuit. Anything
//   that needs real cards (membership, "was the claim truthful") is either
//   known to the bot (its own plays) or revealed by the human on challenge.
//
// WHAT this module does NOT do: no network, no chain, no signatures. A later
// module wires HTTP + the openGame / closeGame transactions around it.
//
// NOTE on turn order: the compiled circuit currently toggles `turn` on every
// move, which makes player 0 (the human) the claimant on every turn and the
// bot a pure responder. The session does not hardcode either reading — it
// probes the referee (see probeTurnRule) and follows the circuit, so a circuit
// fix needs no change here. Every public API below works in both regimes.

import { randomBytes as nodeRandomBytes } from 'node:crypto';
import {
  createReferee, KIND, MAX_MOVES, MAX_ROUNDS, handSize, startingRank, winThreshold,
} from '../../contracts/rollup-referee.js';
import { RANKS } from '../../shared/dealing.js';
import * as scriptedAi from '../../../demoLand/src/game/ai/scripted.js';

export { KIND, MAX_MOVES, MAX_ROUNDS };

/** Seat indexes exactly as the circuit numbers them (turn / claimer / hand0 / hand1). */
export const SEAT = Object.freeze({ HUMAN: 0n, BOT: 1n });

/** Session life-cycle. Moves are only accepted while `playing`. */
export const SESSION_STATUS = Object.freeze({
  AWAITING_ENTROPY: 'awaiting-entropy', // openGame material exchanged, seed unknown
  PLAYING: 'playing',
  ENDED: 'ended',                       // threshold reached or MAX_MOVES filled (draw)
  FINISHED: 'finished',                 // finish() produced the closeGame witnesses
  ABORTED: 'aborted',                   // a move made the game unprovable (round limit)
});

/** Only the three score-based modes exist in the rollup contract. */
const SCORE_BASED_MODES = Object.freeze([0n, 1n, 4n]);
const CARDS_PER_PLAY_VECTOR = 4;
const LOWEST_RANK_INDEX = 0n;
const HIGHEST_RANK_INDEX = 12n;
// A Compact `Field` is < 2^254-ish; 31 random bytes (248 bits) always fit.
const PLAY_SALT_BYTES = 31;

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function defaultRandomBytes(length) {
  return new Uint8Array(nodeRandomBytes(length));
}

function bytesEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) if (left[index] !== right[index]) return false;
  return true;
}

function requireBytes32(value, name) {
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new TypeError(`${name} must be a 32-byte Uint8Array`);
  }
  return value;
}

function toBigInt(value, name) {
  if (typeof value === 'bigint') return value;
  if (Number.isInteger(value)) return BigInt(value);
  throw new TypeError(`${name} must be an integer or bigint`);
}

function bytesToField(bytes) {
  let field = 0n;
  for (const byte of bytes) field = (field << 8n) | BigInt(byte);
  return field;
}

/**
 * Normalise a played-cards array into the circuit's fixed Vector<4, Uint<8>>:
 * exactly `CARDS_PER_PLAY_VECTOR` rank indexes, 0 padded. Only the first
 * `count` entries are rules-relevant, but ALL four are hashed into the play
 * commitment, so the padded vector is the one that must be committed to.
 */
function normalizeCardVector(cards, count) {
  if (!Array.isArray(cards)) throw new TypeError('cards must be an array of rank indexes');
  if (cards.length < Number(count) || cards.length > CARDS_PER_PLAY_VECTOR) {
    throw new RangeError(`cards must hold between ${count} and ${CARDS_PER_PLAY_VECTOR} entries`);
  }
  const vector = cards.map((card, index) => {
    const rankIndex = toBigInt(card, `cards[${index}]`);
    if (rankIndex < LOWEST_RANK_INDEX || rankIndex > HIGHEST_RANK_INDEX) {
      throw new RangeError(`cards[${index}] must be a rank index 0..12`);
    }
    return rankIndex;
  });
  while (vector.length < CARDS_PER_PLAY_VECTOR) vector.push(0n);
  return vector;
}

/**
 * Truthfulness exactly as the circuit's `played(...) == claimCount`: every one
 * of the first `count` cards must be the claimed rank.
 */
function claimIsTruthful(cards, count, claimedRank) {
  for (let index = 0; index < Number(count); index += 1) if (cards[index] !== claimedRank) return false;
  return true;
}

const nextRankOf = (rank) => (rank >= HIGHEST_RANK_INDEX ? 0n : rank + 1n);
const minusOneFloor = (score) => (score === 0n ? 0n : score - 1n);

/**
 * Discover, from the referee itself, who is on turn after a claim is resolved.
 *
 * WHY probe instead of hardcoding: as compiled today the rollup circuit
 * toggles `turn` on EVERY move (`nextTurn = s.turn == 0 ? 1 : 0`), so after
 * "P0 PLAY, P1 ACCEPT" the turn is back with P0 — player 0 makes every claim
 * and player 1 only ever responds. The per-move Preview contract instead
 * hands the turn to the responder (`activePlayerIdx: callerIdx` in
 * acceptClaim), i.e. players alternate claims. The two will be reconciled in
 * the circuit; this session must match whatever the circuit does, so it asks
 * the referee (the circuit's JS mirror, kept in lockstep by the sim test)
 * rather than guessing. Result: `{ responderPlaysNext }`.
 */
export function probeTurnRule(pureCircuits) {
  const probe = createReferee(pureCircuits, { seed: 0n, salts: [new Uint8Array(32), new Uint8Array(32)], mode: 1n });
  const heldRank = probe.opening.hand0.findIndex((count) => count > 0n);
  probe.play(probe.opening.currentRank, 1n, [BigInt(heldRank)], 1n);
  if (probe.state.turn !== 1n) throw new Error('unsupported circuit semantics: a PLAY must pass the turn to the responder');
  probe.accept();
  return { responderPlaysNext: probe.state.turn === 1n };
}

/**
 * The scripted AI thinks in card OBJECTS ({ id, rank, rankIndex }) like the
 * demoLand engine. The circuit thinks in per-rank COUNTS. Expand counts into
 * one object per physical card so decidePlay / decideChallenge work unchanged.
 */
function handCountsToCardObjects(handCounts) {
  const cards = [];
  handCounts.forEach((held, rankIndex) => {
    for (let copy = 0; copy < Number(held); copy += 1) {
      cards.push({ id: `bot:${RANKS[rankIndex]}:${copy}`, rank: RANKS[rankIndex], rankIndex });
    }
  });
  return cards;
}

// ---------------------------------------------------------------------------
// Public state machine — the public projection of the circuit's applyMove.
// Fields the circuit keeps that need real cards (hand contents, claimCards)
// are replaced by hand SIZES and the claim's playCommit.
// ---------------------------------------------------------------------------

function openingPublicState({ seed, cardsPerHand }) {
  return {
    turn: SEAT.HUMAN,                 // the circuit's opening turn is 0 = human
    currentRank: startingRank(seed),
    pending: false,
    claimRank: 0n,
    claimCount: 0n,
    claimer: 0n,
    claimPlayCommit: 0n,
    claimMoveIndex: -1,
    score0: 0n,
    score1: 0n,
    round: 1n,
    ended: false,
    chain: 0n,
    handSize0: cardsPerHand,
    handSize1: cardsPerHand,
  };
}

/**
 * Apply one public move. `truthful` is only consulted for CHALLENGE moves and
 * is computed by the session from real cards (bot's own, or human-revealed).
 * Returns { state, rollover } — `rollover` tells the session to re-deal the
 * bot's private hand for the new round.
 */
function applyPublicMove(state, { kind, rank, count, playCommit, truthful, moveIndex }, { threshold, cardsPerHand, chainMove, turnRule }) {
  const isPlay = kind === KIND.PLAY;
  const isAccept = kind === KIND.ACCEPT;
  const isChallenge = kind === KIND.CHALLENGE;
  if (!(isPlay || isAccept || isChallenge)) throw new Error('unknown move kind');
  if (state.ended) throw new Error('move after game end');
  if (isPlay && state.pending) throw new Error('play while claim pending');
  if ((isAccept || isChallenge) && !state.pending) throw new Error('response without claim');
  if (isPlay && !(rank === state.currentRank && count >= 1n && count <= 4n)) throw new Error('bad claim');

  // PLAY removes `count` cards from the mover's hand — true or bluff alike.
  const moverIsHuman = state.turn === SEAT.HUMAN;
  const playCount = isPlay ? count : 0n;
  const handSize0 = moverIsHuman ? state.handSize0 - playCount : state.handSize0;
  const handSize1 = moverIsHuman ? state.handSize1 : state.handSize1 - playCount;
  if (handSize0 < 0n || handSize1 < 0n) throw new Error('card not held');

  // CHALLENGE scoring: truthful claim → challenger −1 (floor 0); bluff → challenger +3.
  const challengerIsHuman = state.turn === SEAT.HUMAN;
  const score0 = !isChallenge ? state.score0
    : challengerIsHuman ? (truthful ? minusOneFloor(state.score0) : state.score0 + 3n) : state.score0;
  const score1 = !isChallenge ? state.score1
    : challengerIsHuman ? state.score1 : (truthful ? minusOneFloor(state.score1) : state.score1 + 3n);
  const scored = state.ended || score0 >= threshold || score1 >= threshold;

  // Rollover: a resolved claim that leaves a hand empty re-deals both hands.
  const resolved = isAccept || isChallenge;
  const wantsRollover = resolved && (handSize0 === 0n || handSize1 === 0n) && !scored;
  const outOfRounds = wantsRollover && state.round >= BigInt(MAX_ROUNDS);
  const ended = scored || outOfRounds;
  const rollover = wantsRollover && !outOfRounds;
  const nextRound = rollover ? state.round + 1n : state.round;

  // A PLAY always passes the turn to the responder. Who plays after the
  // response is the circuit's call — see probeTurnRule().
  const otherSeat = moverIsHuman ? SEAT.BOT : SEAT.HUMAN;
  const nextTurn = isPlay || !turnRule.responderPlaysNext ? otherSeat : state.turn;

  return {
    rollover,
    state: {
      turn: nextTurn,
      currentRank: resolved ? nextRankOf(state.currentRank) : state.currentRank,
      pending: isPlay,
      claimRank: isPlay ? rank : state.claimRank,
      claimCount: isPlay ? count : state.claimCount,
      claimer: isPlay ? state.turn : state.claimer,
      claimPlayCommit: isPlay ? playCommit : state.claimPlayCommit,
      claimMoveIndex: isPlay ? moveIndex : state.claimMoveIndex,
      score0, score1,
      round: nextRound,
      ended,
      chain: chainMove(state.chain, kind, rank, count, playCommit),
      handSize0: rollover ? cardsPerHand : handSize0,
      handSize1: rollover ? cardsPerHand : handSize1,
    },
  };
}

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

/**
 * Create one human-vs-bot rollup game session.
 *
 * @param pureCircuits        compiled contract's `pureCircuits`
 * @param mode                0 CASUAL · 1 STANDARD · 4 CASINO (number or bigint)
 * @param difficulty          scripted-AI difficulty ('easy' | 'medium' | 'hard')
 * @param humanSessionKey     Uint8Array(32) — playerOne identity for openGame
 * @param humanEntropyCommit  Uint8Array(32) — the human's commitEntropy output
 * @param humanSaltCommit     Uint8Array(32) — the human's commitHandSalt output
 * @param randomBytes         (length) => Uint8Array; injectable for tests
 * @param now                 () => ms timestamp; injectable for tests
 * @param ai                  { decidePlay, decideChallenge, getChallengeReaction }; defaults to scripted.js
 * @param botSessionKey       Uint8Array(32) — playerTwo identity; random if omitted
 * @param turnRule            { responderPlaysNext } — who claims after a response.
 *                            Defaults to what the circuit does (probeTurnRule);
 *                            override ONLY in unit tests that never reach the circuit.
 */
export function createRollupSession({
  pureCircuits,
  mode,
  difficulty = 'medium',
  humanSessionKey,
  humanEntropyCommit,
  humanSaltCommit,
  randomBytes = defaultRandomBytes,
  now = () => Date.now(),
  ai = scriptedAi,
  botSessionKey,
  turnRule = probeTurnRule(pureCircuits),
}) {
  if (!pureCircuits || typeof pureCircuits.commitEntropy !== 'function') {
    throw new TypeError('pureCircuits must be the compiled contract\'s pureCircuits export');
  }
  const modeValue = toBigInt(mode, 'mode');
  if (!SCORE_BASED_MODES.includes(modeValue)) {
    throw new RangeError('mode must be a score-based mode: 0 (CASUAL), 1 (STANDARD) or 4 (CASINO)');
  }
  requireBytes32(humanSessionKey, 'humanSessionKey');
  requireBytes32(humanEntropyCommit, 'humanEntropyCommit');
  requireBytes32(humanSaltCommit, 'humanSaltCommit');

  const cardsPerHand = handSize(modeValue);
  const threshold = winThreshold(modeValue);
  const chainMove = (...args) => pureCircuits.chainMove(...args);
  if (typeof turnRule?.responderPlaysNext !== 'boolean') throw new TypeError('turnRule must be { responderPlaysNext: boolean }');

  // ---- bot private material. NEVER returned by getPublicState(). ----------
  const botPrivate = {
    entropy: randomBytes(32),
    salt: randomBytes(32),
    sessionKey: botSessionKey ?? randomBytes(32),
    handCounts: null,            // Array(13) of bigint for the current round
    playRecords: new Map(),      // moveIndex -> { cards: bigint[4], playSalt: bigint }
  };
  requireBytes32(botPrivate.entropy, 'randomBytes(32)');
  requireBytes32(botPrivate.salt, 'randomBytes(32)');
  const botEntropyCommit = pureCircuits.commitEntropy(botPrivate.entropy);
  const botSaltCommit = pureCircuits.commitHandSalt(botPrivate.salt);

  // ---- what the bot learns about the human during play --------------------
  let humanEntropy = null;
  let seed = null;
  const humanRevealedPlays = new Map(); // moveIndex -> { cards, playSalt } (only challenged plays)

  // ---- public table ---------------------------------------------------------
  let status = SESSION_STATUS.AWAITING_ENTROPY;
  let publicState = null;
  let awaitingHumanReveal = false;
  const transcript = []; // public parts only: { index, kind, by, rank, count, playCommit, at }
  const openedAt = now();
  let endedAt = null;

  function dealBotHandForRound(round) {
    const ranks = pureCircuits.dealHandRanks(botPrivate.salt, seed, BigInt(round), cardsPerHand);
    return Array.from(pureCircuits.handCountsFromRanks(ranks, cardsPerHand), (held) => BigInt(held));
  }

  function requireStatus(...allowed) {
    if (!allowed.includes(status)) {
      throw new Error(`session is '${status}'; this action requires ${allowed.map((s) => `'${s}'`).join(' or ')}`);
    }
  }

  function requirePlayable() {
    requireStatus(SESSION_STATUS.PLAYING);
    if (awaitingHumanReveal) {
      throw new Error('the bot challenged the human\'s claim; call humanRevealChallenged() before any other move');
    }
  }

  function winnerSeatNumber() {
    if (!publicState?.ended) return 0n;
    return publicState.score0 >= threshold ? 1n : publicState.score1 >= threshold ? 2n : 0n;
  }

  /** Append one move: advance the public machine + chain, handle rollover and game end. */
  function appendMove({ kind, by, rank = 0n, count = 0n, playCommit = 0n, truthful = false }) {
    if (transcript.length >= MAX_MOVES) throw new Error('transcript full');
    const moveIndex = transcript.length;
    let applied;
    try {
      applied = applyPublicMove(publicState, { kind, rank, count, playCommit, truthful, moveIndex },
        { threshold, cardsPerHand, chainMove, turnRule });
    } catch (error) {
      if (/round limit exceeded/.test(error.message)) {
        // The circuit asserts `round <= MAX_ROUNDS`; a game that needs a 7th
        // deal cannot be proven. Nothing on-chain exists yet, so per spec §3 it
        // is simply not a game. Freeze the session so nobody keeps playing.
        status = SESSION_STATUS.ABORTED;
        endedAt = now();
        throw new Error(`round limit exceeded: the game needed more than ${MAX_ROUNDS} deals and cannot be proven`);
      }
      throw error;
    }
    transcript.push({ index: moveIndex, kind, by, rank, count, playCommit, at: now() });
    publicState = applied.state;
    if (applied.rollover) botPrivate.handCounts = dealBotHandForRound(publicState.round);
    if (publicState.ended || transcript.length === MAX_MOVES) {
      status = SESSION_STATUS.ENDED;
      endedAt = now();
    }
    return moveIndex;
  }

  function botHandAsCardObjects() {
    return handCountsToCardObjects(botPrivate.handCounts);
  }

  /**
   * Validate the AI's chosen cards against the bot's REAL hand and convert to
   * the circuit's 4-vector. The AI may bluff about the RANK it claims; it may
   * never play a card it does not hold (that would make the game unprovable).
   */
  function cardVectorFromAiChoice(cardsToPlay) {
    if (!Array.isArray(cardsToPlay) || cardsToPlay.length < 1 || cardsToPlay.length > CARDS_PER_PLAY_VECTOR) {
      throw new Error('scripted AI returned an invalid play count; the bot did not play');
    }
    const remaining = [...botPrivate.handCounts];
    const vector = cardsToPlay.map((card) => {
      const rankIndex = Number.isInteger(card?.rankIndex) ? card.rankIndex : RANKS.indexOf(card?.rank);
      if (rankIndex < 0 || rankIndex > 12 || remaining[rankIndex] <= 0n) {
        throw new Error('scripted AI selected a card the bot does not hold; the bot did not play');
      }
      remaining[rankIndex] -= 1n;
      return BigInt(rankIndex);
    });
    while (vector.length < CARDS_PER_PLAY_VECTOR) vector.push(0n);
    return { vector, remaining };
  }

  const session = {
    /** Everything the browser needs to build openGame and verify the bot's commitments. */
    get botEntropyCommit() { return botEntropyCommit; },
    get botSaltCommit() { return botSaltCommit; },
    get botSessionKey() { return botPrivate.sessionKey; },
    get humanSessionKey() { return humanSessionKey; },
    get status() { return status; },

    /**
     * Step 1 of play (spec §2.2): the human reveals the entropy behind their
     * commitment; the bot checks it, reveals its own, and both derive the seed.
     * The bot deals ONLY its own hand here — it never learns the human's.
     */
    revealEntropy(candidateHumanEntropy) {
      requireStatus(SESSION_STATUS.AWAITING_ENTROPY);
      requireBytes32(candidateHumanEntropy, 'humanEntropy');
      if (!bytesEqual(pureCircuits.commitEntropy(candidateHumanEntropy), humanEntropyCommit)) {
        throw new Error('human entropy does not open the committed entropy; refusing to reveal the bot\'s entropy');
      }
      humanEntropy = new Uint8Array(candidateHumanEntropy);
      seed = pureCircuits.combineEntropy(humanEntropy, botPrivate.entropy);
      publicState = openingPublicState({ seed, cardsPerHand });
      botPrivate.handCounts = dealBotHandForRound(publicState.round);
      status = SESSION_STATUS.PLAYING;
      return { botEntropy: new Uint8Array(botPrivate.entropy), seed };   // seed is a Field (bigint)
    },

    /**
     * Human PLAY: a public claim (rank, count) plus the blinded commitment to
     * the real cards. The bot answers immediately — accept, or challenge (in
     * which case the human must reveal via humanRevealChallenged()).
     */
    humanPlay({ rank, count, playCommit }) {
      requirePlayable();
      if (publicState.turn !== SEAT.HUMAN) throw new Error('not the human\'s turn');
      if (publicState.pending) throw new Error('play while claim pending');
      const claimedRank = toBigInt(rank, 'rank');
      const claimedCount = toBigInt(count, 'count');
      if (claimedRank !== publicState.currentRank) {
        throw new Error(`bad claim: must claim the current rank ${publicState.currentRank}, got ${claimedRank}`);
      }
      if (claimedCount < 1n || claimedCount > 4n) throw new Error('bad claim: count must be 1..4');
      if (claimedCount > publicState.handSize0) throw new Error('bad claim: count exceeds the human\'s hand size');
      if (typeof playCommit !== 'bigint') throw new TypeError('playCommit must be the bigint from commitPlayCards');

      appendMove({ kind: KIND.PLAY, by: SEAT.HUMAN, rank: claimedRank, count: claimedCount, playCommit });
      if (status !== SESSION_STATUS.PLAYING) {
        // The 64th slot was this PLAY: the transcript is full, the game is a draw.
        return { botResponse: null, needsReveal: false, dialogue: null, state: session.getPublicState() };
      }

      const decision = ai.decideChallenge({
        playerClaimedRank: RANKS[Number(claimedRank)],
        playerClaimedCount: Number(claimedCount),
        aiHand: botHandAsCardObjects(),
        difficulty,
        mode: 'home',
      });
      if (!decision.shouldChallenge) {
        appendMove({ kind: KIND.ACCEPT, by: SEAT.BOT });
        return { botResponse: 'accept', needsReveal: false, dialogue: decision.dialogue, state: session.getPublicState() };
      }
      // The CHALLENGE move is recorded only once the human reveals, because
      // its scoring needs the real cards. Until then the table is frozen.
      awaitingHumanReveal = true;
      return { botResponse: 'challenge', needsReveal: true, dialogue: decision.dialogue, state: session.getPublicState() };
    },

    /**
     * The human opens their challenged play. The cards must open the committed
     * playCommit (so they cannot be changed after the challenge); then the
     * CHALLENGE resolves with the circuit's scoring.
     */
    humanRevealChallenged({ cards, playSalt }) {
      requireStatus(SESSION_STATUS.PLAYING);
      if (!awaitingHumanReveal) throw new Error('no challenged human claim awaits a reveal');
      const salt = toBigInt(playSalt, 'playSalt');
      const vector = normalizeCardVector(cards, publicState.claimCount);
      if (pureCircuits.commitPlayCards(vector, salt) !== publicState.claimPlayCommit) {
        throw new Error('revealed cards do not open the play commitment; the claim stays challenged');
      }
      const truthful = claimIsTruthful(vector, publicState.claimCount, publicState.claimRank);
      humanRevealedPlays.set(publicState.claimMoveIndex, { cards: vector, playSalt: salt });
      awaitingHumanReveal = false;
      appendMove({ kind: KIND.CHALLENGE, by: SEAT.BOT, truthful });
      return {
        truthful,
        dialogue: ai.getChallengeReaction({ aiWasChallenger: true, claimWasTrue: truthful }),
        state: session.getPublicState(),
      };
    },

    /**
     * Bot PLAY: ask the AI, validate against the real hand, commit the cards
     * with a fresh salt, publish only { rank, count, playCommit, dialogue }.
     */
    botPlay() {
      requirePlayable();
      if (publicState.turn !== SEAT.BOT) throw new Error('not the bot\'s turn');
      if (publicState.pending) throw new Error('play while claim pending');

      const decision = ai.decidePlay({
        aiHand: botHandAsCardObjects(),
        requiredRank: RANKS[Number(publicState.currentRank)],
        difficulty,
        mode: 'home',
      });
      const { vector, remaining } = cardVectorFromAiChoice(decision.cardsToPlay);
      const count = BigInt(decision.cardsToPlay.length);
      const playSalt = bytesToField(randomBytes(PLAY_SALT_BYTES));
      const playCommit = pureCircuits.commitPlayCards(vector, playSalt);
      const rank = publicState.currentRank;

      const moveIndex = appendMove({ kind: KIND.PLAY, by: SEAT.BOT, rank, count, playCommit });
      // Only commit private side effects once the public move was accepted.
      botPrivate.playRecords.set(moveIndex, { cards: vector, playSalt });
      // If the PLAY itself ended the transcript there was no rollover; otherwise
      // the hand shrinks (a rollover re-deal would only happen on a resolution).
      botPrivate.handCounts = remaining;
      return { rank, count, playCommit, dialogue: decision.dialogue, state: session.getPublicState() };
    },

    /** Human lets the bot's claim stand. */
    humanAccept() {
      requirePlayable();
      if (publicState.turn !== SEAT.HUMAN || !publicState.pending || publicState.claimer !== SEAT.BOT) {
        throw new Error('no bot claim for the human to accept');
      }
      appendMove({ kind: KIND.ACCEPT, by: SEAT.HUMAN });
      return { state: session.getPublicState() };
    },

    /**
     * Human challenges the bot's claim. As at a physical table the challenger
     * sees the cards: the bot's real cards + play salt are returned so the
     * browser can verify them against the published playCommit.
     */
    humanChallenge() {
      requirePlayable();
      if (publicState.turn !== SEAT.HUMAN || !publicState.pending || publicState.claimer !== SEAT.BOT) {
        throw new Error('no bot claim for the human to challenge');
      }
      const record = botPrivate.playRecords.get(publicState.claimMoveIndex);
      if (!record) throw new Error('internal error: bot play record missing for the pending claim');
      const truthful = claimIsTruthful(record.cards, publicState.claimCount, publicState.claimRank);
      const revealedCount = Number(publicState.claimCount);
      appendMove({ kind: KIND.CHALLENGE, by: SEAT.HUMAN, truthful });
      return {
        truthful,
        cards: record.cards.slice(0, revealedCount),
        cardVector: [...record.cards],
        playSalt: record.playSalt,
        dialogue: ai.getChallengeReaction({ aiWasChallenger: false, claimWasTrue: truthful }),
        state: session.getPublicState(),
      };
    },

    /**
     * Spec §2.3: once the game is over the bot reveals its hand salt so the
     * player can prove the whole game themselves if they want to.
     */
    revealBotSalt() {
      requireStatus(SESSION_STATUS.ENDED, SESSION_STATUS.FINISHED);
      return new Uint8Array(botPrivate.salt);
    },

    /**
     * Rebuild the full referee from both salts and every play's real cards and
     * return the closeGame witnesses + public inputs. Throws a clear error if
     * the human's material does not reproduce the public transcript — such a
     * game cannot be proven and must not be submitted.
     *
     * @param humanSalt   Uint8Array(32) opening humanSaltCommit
     * @param humanPlays  [{ moveIndex, cards, playSalt }] for every human PLAY
     *                    that was NOT already revealed through a challenge
     *                    (supplying revealed ones too is fine if they match).
     */
    finish({ humanSalt, humanPlays = [] }) {
      requireStatus(SESSION_STATUS.ENDED, SESSION_STATUS.FINISHED);
      requireBytes32(humanSalt, 'humanSalt');
      if (!bytesEqual(pureCircuits.commitHandSalt(humanSalt), humanSaltCommit)) {
        throw new Error('humanSalt does not open the committed hand salt; the game cannot be proven');
      }
      const suppliedHumanPlays = indexHumanPlays(humanPlays);
      const referee = createReferee(pureCircuits, { seed, salts: [humanSalt, botPrivate.salt], mode: modeValue });

      for (const move of transcript) {
        try {
          replayMoveIntoReferee(referee, move, { suppliedHumanPlays, humanRevealedPlays, botPlayRecords: botPrivate.playRecords, pureCircuits });
        } catch (error) {
          throw new Error(`unprovable game: move ${move.index} (${describeMove(move)}) failed replay — ${error.message}`);
        }
      }
      if (referee.state.chain !== publicState.chain) {
        throw new Error('unprovable game: referee transcript root differs from the public chain head');
      }
      if (referee.state.score0 !== publicState.score0 || referee.state.score1 !== publicState.score1) {
        throw new Error('unprovable game: referee scores differ from the public scores');
      }
      referee.pad();
      const result = referee.result();
      status = SESSION_STATUS.FINISHED;
      return {
        ...result,
        entropyPair: [new Uint8Array(humanEntropy), new Uint8Array(botPrivate.entropy)],
        saltPair: [new Uint8Array(humanSalt), new Uint8Array(botPrivate.salt)],
      };
    },

    /** Everything public, nothing private. Safe to send to the browser as-is. */
    getPublicState() {
      return {
        status,
        mode: modeValue,
        difficulty,
        cardsPerHand,
        winThreshold: threshold,
        maxMoves: MAX_MOVES,
        turnRule: { ...turnRule },
        openedAt,
        endedAt,
        players: {
          human: { seat: SEAT.HUMAN, sessionKey: new Uint8Array(humanSessionKey), entropyCommit: new Uint8Array(humanEntropyCommit), saltCommit: new Uint8Array(humanSaltCommit) },
          bot: { seat: SEAT.BOT, sessionKey: new Uint8Array(botPrivate.sessionKey), entropyCommit: new Uint8Array(botEntropyCommit), saltCommit: new Uint8Array(botSaltCommit) },
        },
        seed: seed ?? null,   // transient-domain Field (bigint), never on the ledger
        turn: publicState?.turn ?? null,
        currentRank: publicState?.currentRank ?? null,
        pendingClaim: publicState?.pending
          ? {
            moveIndex: publicState.claimMoveIndex,
            claimer: publicState.claimer,
            rank: publicState.claimRank,
            count: publicState.claimCount,
            playCommit: publicState.claimPlayCommit,
            awaitingHumanReveal,
          }
          : null,
        scores: publicState ? { human: publicState.score0, bot: publicState.score1 } : null,
        handSizes: publicState ? { human: publicState.handSize0, bot: publicState.handSize1 } : null,
        round: publicState?.round ?? null,
        ended: publicState?.ended ?? false,
        winner: winnerSeatNumber(),
        chainHead: publicState?.chain ?? 0n,
        moveCount: transcript.length,
        transcript: transcript.map((move) => ({ ...move })),
      };
    },
  };

  return session;
}

// ---------------------------------------------------------------------------
// finish() helpers
// ---------------------------------------------------------------------------

function indexHumanPlays(humanPlays) {
  if (!Array.isArray(humanPlays)) throw new TypeError('humanPlays must be an array');
  const byIndex = new Map();
  for (const play of humanPlays) {
    if (!Number.isInteger(play?.moveIndex) || play.moveIndex < 0) {
      throw new TypeError('each humanPlays entry needs an integer moveIndex');
    }
    byIndex.set(play.moveIndex, { cards: play.cards, playSalt: toBigInt(play.playSalt, 'playSalt') });
  }
  return byIndex;
}

function describeMove(move) {
  const kindName = Object.keys(KIND).find((name) => KIND[name] === move.kind) ?? String(move.kind);
  return `${move.by === SEAT.HUMAN ? 'human' : 'bot'} ${kindName}`;
}

/**
 * Feed one public move into the full referee, attaching the real cards for
 * PLAY moves. A human PLAY revealed through a challenge is authoritative; any
 * cards the human supplies at finish() must open the recorded playCommit.
 */
function replayMoveIntoReferee(referee, move, { suppliedHumanPlays, humanRevealedPlays, botPlayRecords, pureCircuits }) {
  if (move.kind === KIND.ACCEPT) { referee.accept(); return; }
  if (move.kind === KIND.CHALLENGE) { referee.challenge(); return; }

  let witness;
  if (move.by === SEAT.BOT) {
    witness = botPlayRecords.get(move.index);
    if (!witness) throw new Error('internal error: bot play record missing');
  } else {
    const supplied = suppliedHumanPlays.get(move.index);
    witness = humanRevealedPlays.get(move.index)
      ?? (supplied && { cards: normalizeCardVector(supplied.cards, move.count), playSalt: supplied.playSalt });
    if (!witness) throw new Error('the human did not supply the cards for this play');
    if (pureCircuits.commitPlayCards(witness.cards, witness.playSalt) !== move.playCommit) {
      throw new Error('supplied cards do not open the recorded play commitment');
    }
  }
  referee.play(move.rank, move.count, witness.cards, witness.playSalt);
}
