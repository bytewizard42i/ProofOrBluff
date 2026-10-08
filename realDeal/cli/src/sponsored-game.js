// Sponsored (wallet-free) v3p game — the in-memory game object behind one
// `gameId` in the Season 1 service (docs/SPONSORED_GAME_API.md).
//
// WHAT lives here
//   * ALL game material: both consent key pairs, both entropies, both sets of
//     six round secrets. Season 1 is server-authoritative: the browser holds
//     nothing but the gameId. (Client-held secrets are a 1.x upgrade — the
//     referee needs both round secrets to deal, so that needs a public/private
//     referee split like rollup-session.js had for v2.)
//   * the v3p referee (JS mirror of the circuit) enforcing the real rules;
//   * the bot seat, driven by the scripted AI. The AI is FIREWALLED: it is
//     handed only the bot's own hand and the public claim — never the human's
//     cards (see botHandAsCardObjects and the decide* call sites).
//   * chain steps: deploy / proveRound(r) / closeGame witnesses are produced
//     here and drained by the service, which submits them in the background
//     and feeds receipts back so the player sees "round 2/3 proven".
//
// WHAT does NOT live here: HTTP, persistence, the wallet (sponsored-service.js).

import { randomBytes } from 'node:crypto';
import {
  createV3pReferee, KIND, MAX_ROUNDS, handSize, roundFinished, winThreshold,
} from '../../contracts/rollup-v3p-referee.js';
import { createV4Referee } from '../../contracts/rollup-v4-referee.js';
import { consentKeyPairFromSecret, buildCloseConsent, signCloseConsent, gameIdFromContractAddress } from './rollup-consent.js';
import { RANKS } from '../../shared/dealing.js';
import * as scriptedAi from '../../../demoLand/src/game/ai/scripted.js';

export const SEAT = Object.freeze({ HUMAN: 0, BOT: 1 });
export const GAME_STATUS = Object.freeze({ PLAYING: 'playing', ENDED: 'ended', CLOSED: 'closed', ABANDONED: 'abandoned' });
// Contract modes: 0 Casual (5 cards, to 10), 1 Standard (7, to 15), 4 Casino (7, to 20).
export const MODES = Object.freeze([0, 1, 4]);
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);

class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const seatName = (seat) => (Number(seat) === SEAT.HUMAN ? 'human' : 'bot');
const winnerName = (w) => (w === 1n ? 'human' : w === 2n ? 'bot' : 'draw');
const bytesToField = (bytes) => bytes.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n);

/** Expand per-rank counts into the card objects the scripted AI expects. */
function handCountsToCardObjects(handCounts, prefix) {
  const cards = [];
  handCounts.forEach((held, rankIndex) => {
    for (let copy = 0; copy < Number(held); copy += 1) {
      cards.push({ id: `${prefix}:${RANKS[rankIndex]}:${copy}`, rank: RANKS[rankIndex], rankIndex });
    }
  });
  return cards;
}

/** Per-rank counts → sorted rank list for the player's view. */
export function handCountsToRanks(handCounts) {
  const ranks = [];
  handCounts.forEach((held, rank) => { for (let i = 0n; i < held; i += 1n) ranks.push(rank); });
  return ranks;
}

const REFEREE_FOR_VERSION = { v3p: createV3pReferee, v4: createV4Referee };

/**
 * Create one sponsored game. `pureCircuits` comes from the compiled contract
 * bindings matching `contractVersion` ('v3p' live contract, 'v4' shared-deck +
 * empty-hand-win); `ai` and `random` are injectable for tests.
 */
export function createSponsoredGame({ gameId, mode, difficulty = 'medium', pureCircuits, ai = scriptedAi, random = randomBytes, contractVersion = 'v3p' }) {
  const createReferee = REFEREE_FOR_VERSION[contractVersion];
  if (!createReferee) throw new GameError(400, `contractVersion must be one of ${Object.keys(REFEREE_FOR_VERSION).join(', ')}`);
  if (!MODES.includes(mode)) throw new GameError(400, 'mode must be 0, 1 or 4');
  if (!DIFFICULTIES.includes(difficulty)) throw new GameError(400, 'difficulty must be easy, medium or hard');

  // --- all secret material, generated once, never reused across games -----
  const keyPairs = [consentKeyPairFromSecret(random(32)), consentKeyPairFromSecret(random(32))];
  const playerIds = keyPairs.map((kp) => pureCircuits.playerIdFromPk(kp.pk));
  const entropy = [new Uint8Array(random(32)), new Uint8Array(random(32))];
  const roundSecrets = [0, 1].map(() => Array.from({ length: MAX_ROUNDS }, () => new Uint8Array(random(32))));
  const seed = pureCircuits.combineEntropy(entropy[0], entropy[1]);
  const modeBig = BigInt(mode);
  const freshSalt = () => bytesToField(random(31));

  const referee = createReferee(pureCircuits, { seed, roundSecrets, mode: modeBig });
  const size = handSize(modeBig);

  let status = GAME_STATUS.PLAYING;
  let events = [];                 // what happened since the human's last action
  let botPlays = [];               // the bot's real cards per PLAY, for reveals
  const chain = { contractAddress: null, receipts: [], pending: ['deploy'] };
  const pendingChainSteps = [];    // produced here, drained by the service
  const finishedRounds = [];       // every finishRound() output, for the post-close transcript

  const push = (event) => events.push(event);
  const botHandAsCardObjects = () => handCountsToCardObjects(referee.hands[SEAT.BOT], 'bot');
  const inRound = () => { try { referee.state; return true; } catch { return false; } };

  function constructorArgs() {
    const commits = (seat) => roundSecrets[seat].map((s, i) => pureCircuits.commitRoundSecret(s, BigInt(i + 1)));
    return {
      playerOne: playerIds[0], playerTwo: playerIds[1], mode: modeBig,
      p1EntropyCommit: pureCircuits.commitEntropy(entropy[0]), p2EntropyCommit: pureCircuits.commitEntropy(entropy[1]),
      p1RoundCommits: commits(0), p2RoundCommits: commits(1),
    };
  }

  /** Round over → proveRound witnesses; game over → closeGame as well. */
  function settleRoundIfFinished() {
    if (!inRound() || !roundFinished(referee.state, size)) return;
    const fin = referee.finishRound();
    const round = Number(fin.round);
    finishedRounds.push(fin);
    botPlays = [];
    push({ type: 'round-end', round, scores: { human: Number(fin.boundaryOut.score0), bot: Number(fin.boundaryOut.score1) } });
    pendingChainSteps.push({
      step: 'proveRound', round,
      witnesses: { ...fin, entropyPair: entropy, roundSecrets: [roundSecrets[0][round - 1], roundSecrets[1][round - 1]] },
    });
    chain.pending.push(`proveRound:${round}`);

    if (!referee.boundary.ended) { referee.startRound(); return; }

    status = GAME_STATUS.ENDED;
    const result = referee.result();
    // Consents bind to the deployed contract address, which may not be known
    // yet (fast games end before the deploy receipt lands), so the step builds
    // its arguments when the queue reaches it.
    pendingChainSteps.push({
      step: 'closeGame',
      build: (contractAddress) => {
        const consent = buildCloseConsent(pureCircuits, {
          gameId: gameIdFromContractAddress(contractAddress), transcriptRoot: result.transcriptChain,
          p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
        });
        return {
          boundary: result.boundary, p1Score: result.p1Score, p2Score: result.p2Score, winner: result.winner,
          p1CloseConsent: signCloseConsent(pureCircuits, consent, keyPairs[0]),
          p2CloseConsent: signCloseConsent(pureCircuits, consent, keyPairs[1]),
        };
      },
    });
    chain.pending.push('closeGame');
    push({ type: 'game-end', winner: winnerName(result.winner) });
  }

  /** Bot PLAYs when it is its turn with no pending claim; then waits for the human. */
  function botPlaysIfItsTurn() {
    if (status !== GAME_STATUS.PLAYING) return;
    const s = referee.state;
    if (Number(s.turn) !== SEAT.BOT || s.pending) return;
    const decision = ai.decidePlay({
      aiHand: botHandAsCardObjects(), requiredRank: RANKS[Number(s.currentRank)], difficulty, mode: 'home',
    });
    const chosen = decision.cardsToPlay.map((c) => (Number.isInteger(c?.rankIndex) ? c.rankIndex : RANKS.indexOf(c?.rank)));
    if (chosen.length < 1 || chosen.length > 4) throw new Error('scripted AI returned an invalid play count');
    // The referee rejects "card not held" — the AI only saw the bot's own
    // hand, so that can only mean an AI bug, never a human-visible cheat.
    referee.play(s.currentRank, BigInt(chosen.length), chosen.map(BigInt), freshSalt());
    botPlays.push(chosen);
    push({ type: 'bot-play', rank: Number(s.currentRank), count: chosen.length, dialogue: decision.dialogue });
    settleRoundIfFinished();
  }

  function requireHumanTurn() {
    if (status !== GAME_STATUS.PLAYING) throw new GameError(409, 'game is over');
    if (Number(referee.state.turn) !== SEAT.HUMAN) throw new GameError(409, 'not your turn');
  }

  function afterHumanAction() { settleRoundIfFinished(); botPlaysIfItsTurn(); return game.view(); }

  referee.startRound();

  const game = {
    gameId, mode, difficulty, playerIds,
    get status() { return status; },
    constructorArgs,

    /** Drain chain steps produced since the last call; the service owns them after. */
    takePendingChainSteps() { return pendingChainSteps.splice(0); },

    /** Called by the service when a chain step lands. */
    recordReceipt(receipt) {
      chain.receipts.push(receipt);
      const key = receipt.step === 'proveRound' ? `proveRound:${receipt.round}` : receipt.step;
      chain.pending = chain.pending.filter((p) => p !== key);
      if (receipt.step === 'deploy') chain.contractAddress = receipt.contractAddress;
      if (receipt.step === 'closeGame' && status === GAME_STATUS.ENDED) status = GAME_STATUS.CLOSED;
    },

    /** Human plays `cards` (ranks) claiming `count` of `rank`; the bot responds. */
    humanPlay({ rank, count, cards }) {
      requireHumanTurn();
      const s = referee.state;
      if (s.pending) throw new GameError(409, 'respond to the pending claim first');
      if (!Number.isInteger(rank) || rank !== Number(s.currentRank)) throw new GameError(400, `you must claim the current rank (${Number(s.currentRank)})`);
      if (!Number.isInteger(count) || count < 1 || count > 4) throw new GameError(400, 'count must be 1..4');
      if (!Array.isArray(cards) || cards.length !== count || cards.some((c) => !Number.isInteger(c) || c < 0 || c > 12)) {
        throw new GameError(400, 'cards must list exactly `count` ranks in 0..12');
      }
      const held = [...referee.hands[SEAT.HUMAN]];
      for (const c of cards) {
        if (held[c] <= 0n) throw new GameError(400, 'you do not hold that card');
        held[c] -= 1n;
      }
      events = [];
      referee.play(s.currentRank, BigInt(count), cards.map(BigInt), freshSalt());

      // A PLAY that empties the hand ends the round with no response needed.
      if (roundFinished(referee.state, size)) return afterHumanAction();

      const decision = ai.decideChallenge({
        playerClaimedRank: RANKS[rank], playerClaimedCount: count, aiHand: botHandAsCardObjects(), difficulty, mode: 'home',
      });
      if (decision.shouldChallenge) {
        const truthful = referee.truthfulPending;
        referee.challenge();
        push({ type: 'bot-challenge', truthful, revealed: cards, dialogue: ai.getChallengeReaction({ aiWasChallenger: true, claimWasTrue: truthful }) });
      } else {
        referee.accept();
        push({ type: 'bot-accept', dialogue: decision.dialogue });
      }
      return afterHumanAction();
    },

    /**
     * The player quit (button, tab closed, or went idle). Treated like a
     * failed transaction: nothing is saved, no result is recorded, and any
     * chain work not yet started is dropped by the service. A contract that
     * already deployed simply stays open on-chain — harmless, and provably
     * unfinished. Idempotent.
     */
    abandon() {
      if (status !== GAME_STATUS.PLAYING) return game.view();
      status = GAME_STATUS.ABANDONED;
      chain.pending = [];
      pendingChainSteps.length = 0;
      events = [{ type: 'game-abandoned' }];
      return game.view();
    },

    humanAccept() {
      requireHumanTurn();
      const s = referee.state;
      if (!s.pending || Number(s.claimer) !== SEAT.BOT) throw new GameError(409, 'no bot claim to accept');
      events = [];
      referee.accept();
      return afterHumanAction();
    },

    /** As at a real table the challenger sees the cards: the bot's real cards are revealed. */
    humanChallenge() {
      requireHumanTurn();
      const s = referee.state;
      if (!s.pending || Number(s.claimer) !== SEAT.BOT) throw new GameError(409, 'no bot claim to challenge');
      events = [];
      const truthful = referee.truthfulPending;
      const revealed = botPlays.at(-1) ?? [];
      referee.challenge();
      push({ type: 'human-challenge', truthful, revealed, dialogue: ai.getChallengeReaction({ aiWasChallenger: false, claimWasTrue: truthful }) });
      return afterHumanAction();
    },

    /**
     * Full disclosure AFTER the game is closed on-chain: every secret, every
     * move with its real cards and salt, both hands per round. Anyone can
     * re-run the referee mirror (rollup-v3p/v4-referee.js) on this and recompute the on-chain
     * transcriptRoot — the operator's honesty becomes checkable, not assumed.
     * Refused while the game is live (it would reveal hands) or merely ended
     * (receipts not final yet).
     */
    transcript() {
      if (status !== GAME_STATUS.CLOSED) throw new GameError(409, 'transcript is published once the game is closed on-chain');
      return {
        gameId, mode, difficulty, contractAddress: chain.contractAddress,
        playerIds: playerIds.map((p) => Buffer.from(p).toString('hex')),
        entropy: entropy.map((e) => Buffer.from(e).toString('hex')),
        roundSecrets: roundSecrets.map((seat) => seat.map((s) => Buffer.from(s).toString('hex'))),
        rounds: finishedRounds.map((fin) => ({
          round: Number(fin.round),
          dealt: fin.dealt.map((d) => d.toString()),
          moves: fin.moves.filter((m) => m.kind !== KIND.NOOP).map((m) => ({
            kind: Number(m.kind), rank: Number(m.rank), count: Number(m.count),
            cards: m.cards.slice(0, Number(m.count)).map(Number), playSalt: m.playSalt.toString(),
          })),
          remaining: fin.remaining.map((r) => r.map(Number)),
          boundaryOut: Object.fromEntries(Object.entries(fin.boundaryOut).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])),
        })),
        result: (() => { const r = referee.result(); return { p1Score: Number(r.p1Score), p2Score: Number(r.p2Score), winner: winnerName(r.winner), transcriptChain: r.transcriptChain.toString() }; })(),
        howToVerify: `Re-run realDeal/contracts/rollup-${contractVersion}-referee.js with seed = combineEntropy(entropy) and these roundSecrets/moves; commitTranscript(result.transcriptChain) must equal the contract's transcriptRoot.`,
      };
    },

    view() {
      const live = status === GAME_STATUS.PLAYING;
      const s = live ? referee.state : null;
      const b = referee.boundary;
      return {
        gameId, status, mode, difficulty, contractVersion,
        round: Number(s ? s.round : b.round),
        turn: s ? seatName(s.turn) : null,
        currentRank: s ? Number(s.currentRank) : null,
        pending: s?.pending ? { claimer: seatName(s.claimer), rank: Number(s.claimRank), count: Number(s.claimCount) } : null,
        scores: { human: Number(s ? s.score0 : b.score0), bot: Number(s ? s.score1 : b.score1) },
        hand: s ? handCountsToRanks(referee.hands[SEAT.HUMAN]) : [],
        cardsLeft: s ? { human: Number(size - s.plays0), bot: Number(size - s.plays1) } : { human: 0, bot: 0 },
        winner: live || status === GAME_STATUS.ABANDONED ? null : winnerName(referee.result().winner),
        lastEvents: [...events],
        chain: { contractAddress: chain.contractAddress, receipts: [...chain.receipts], pending: [...chain.pending] },
      };
    },
  };

  return game;
}

export { GameError, KIND, MAX_ROUNDS, winThreshold };
