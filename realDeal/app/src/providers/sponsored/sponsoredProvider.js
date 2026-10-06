/**
 * sponsoredProvider.js — adapts the wallet-free sponsored service's GameView
 * into the state + actions the shared GameTable renders.
 *
 * The bot lives on the server, so every human action returns a view that
 * already contains the bot's response (lastEvents). This module turns those
 * events into the table's log vocabulary (LOG.*), the running stats, the
 * latest bot dialogue, challenge reveals and the chain receipts widget.
 */

import { RANKS } from '../../../../shared/dealing.js';
import { formatClaim, rankName } from '../../game/rules.js';
import { LOG } from '../../components/table/GameLog.jsx';
import { createSponsoredClient, SponsoredApiError } from './client.js';

export const ACTIVE_GAME_KEY = 'pob:sponsored:active-game';
export const MAX_ROUNDS = 6;

export const EMPTY_STATS = Object.freeze({
  rounds: 0,
  aiPlays: 0,
  aiBluffsCaught: 0,
  playerBluffsCaught: 0,
  playerFailedChallenges: 0,
  aiFailedChallenges: 0,
});

/** Contract thresholds: mode 0 → 10, mode 1 → 15, mode 2 → 20. */
export function winThreshold(mode) {
  if (mode === 0) return 10;
  if (mode === 1) return 15;
  return 20;
}

/** Sorted rank indices → stable UI card objects (`human:<rankIndex>:<copy>`). */
export function handToCards(ranks, prefix = 'human') {
  const copies = new Map();
  return (ranks ?? []).map((rankIndex) => {
    const copy = copies.get(rankIndex) ?? 0;
    copies.set(rankIndex, copy + 1);
    return { id: `${prefix}:${rankIndex}:${copy}`, rank: RANKS[rankIndex], rankIndex, suit: 'hidden' };
  });
}

/** UI card objects (or rank strings / indices) → rank indices for the API. */
export function cardsToRanks(cards) {
  return (cards ?? []).map((card) => {
    if (Number.isInteger(card)) return card;
    if (Number.isInteger(card?.rankIndex)) return card.rankIndex;
    const index = RANKS.indexOf(typeof card === 'string' ? card : card?.rank);
    if (index === -1) throw new Error(`Unknown card rank: ${JSON.stringify(card)}`);
    return index;
  });
}

const seatToTable = (seat) => (seat === 'bot' ? 'ai' : 'player');
const describeRanks = (ranks) => (ranks ?? []).map((r) => rankName(RANKS[r])).join(', ');

/** Receipts summary for the "round 2/3 proven" widget. */
export function summariseChain(view) {
  const chain = view?.chain ?? {};
  const receipts = chain.receipts ?? [];
  const roundsProven = receipts.filter((r) => r.step === 'proveRound').length;
  const roundsPlayed = (view?.round ?? 1) - (view?.status === 'playing' ? 1 : 0);
  return {
    network: chain.network ?? null,
    contractAddress: chain.contractAddress ?? null,
    receipts,
    pending: chain.pending ?? [],
    deployed: receipts.some((r) => r.step === 'deploy'),
    closed: receipts.some((r) => r.step === 'closeGame'),
    roundsProven,
    roundsPlayed,
    label: `round ${roundsProven}/${Math.max(roundsPlayed, roundsProven)} proven`,
  };
}

/**
 * Turn the events since the human's last action into log lines, stat deltas,
 * the newest dialogue and any reveal. `humanAction` is the line for what the
 * human just did (already resolved by the server), prepended to the log.
 */
export function applyEvents(view, events, { stats = EMPTY_STATS, pileCount = 0, humanAction = null } = {}) {
  const lines = [];
  const nextStats = { ...stats };
  let nextPile = pileCount;
  let dialogue = null;
  let reveal = null;
  const rankNow = () => rankName(RANKS[view.currentRank ?? 0]);
  const claimText = (count, rank) => `${count} card(s) and claimed: "${formatClaim(count, RANKS[rank])}".`;

  if (humanAction?.type === 'play') {
    lines.push(`${LOG.YOU_PLAYED} ${claimText(humanAction.count, humanAction.rank)}`);
  }

  for (const event of events ?? []) {
    if (event.dialogue) dialogue = event.dialogue;
    switch (event.type) {
      case 'bot-play':
        nextStats.aiPlays += 1;
        lines.push(`${LOG.AI_PLAYED} ${claimText(event.count, event.rank)}`);
        break;
      case 'bot-accept':
        nextStats.rounds += 1;
        nextPile += humanAction?.count ?? 0;
        lines.push(`${LOG.AI_ACCEPTED} the claim. Pile now has ${nextPile} card(s). Next rank: ${rankNow()}.`);
        break;
      case 'bot-challenge':
        nextStats.rounds += 1;
        nextPile = 0;
        reveal = { challenger: 'ai', truthful: event.truthful, revealed: handToCards(event.revealed, 'reveal') };
        if (event.truthful) {
          nextStats.aiFailedChallenges += 1;
          lines.push(`${LOG.CHALLENGE_FAILED}! Your claim was true. ${LOG.AI_LOSES_MARKER} the penalty: Ai −1. Pile discarded.`);
        } else {
          nextStats.playerBluffsCaught += 1;
          lines.push(`${LOG.CAUGHT_BLUFFING}! Your claim was false. ${LOG.PLAYER_LOSES_MARKER} the penalty: Ai +3. Pile discarded.`);
        }
        break;
      case 'human-challenge':
        nextStats.rounds += 1;
        nextPile = 0;
        reveal = { challenger: 'player', truthful: event.truthful, revealed: handToCards(event.revealed, 'reveal') };
        if (event.truthful) {
          nextStats.playerFailedChallenges += 1;
          lines.push(`${LOG.CHALLENGE_FAILED}! The Ai's claim was true (revealed: ${describeRanks(event.revealed)}). ${LOG.PLAYER_LOSES_MARKER} the penalty: you −1. Pile discarded.`);
        } else {
          nextStats.aiBluffsCaught += 1;
          lines.push(`${LOG.CAUGHT_BLUFFING}! The Ai's claim was false (revealed: ${describeRanks(event.revealed)}). ${LOG.AI_LOSES_MARKER} the penalty: you +3. Pile discarded.`);
        }
        break;
      case 'round-end':
        nextPile = 0;
        lines.push(`Round ${event.round} over — score ${event.scores.human}–${event.scores.bot}. Midnight proves it in the background.`);
        if (view.status === 'playing' && view.round > event.round) {
          lines.push(`Round ${view.round}: fresh hands dealt. Rank to declare: ${rankNow()}.`);
        }
        break;
      case 'game-end':
        if (event.winner === 'human') lines.push(`${LOG.YOU_WIN}! Final score ${view.scores.human}–${view.scores.bot}.`);
        else if (event.winner === 'bot') lines.push(`${LOG.AI_WINS}! Final score ${view.scores.human}–${view.scores.bot}.`);
        else lines.push(`Draw. Final score ${view.scores.human}–${view.scores.bot}.`);
        break;
      default:
        break;
    }
  }

  if (humanAction?.type === 'accept') {
    nextStats.rounds += 1;
    nextPile += humanAction.count ?? 0;
    lines.unshift(`${LOG.YOU_ACCEPTED} the claim. Pile now has ${nextPile} card(s). Next rank: ${rankNow()}.`);
  }

  return { lines, stats: nextStats, pileCount: nextPile, dialogue, reveal };
}

/**
 * Pure mapping GameView → table state. `context` carries the presentation
 * state the provider accumulates across calls (log, stats, pile, reveal).
 */
export function viewToTableState(view, context = {}) {
  const log = context.log ?? [];
  const stats = context.stats ?? EMPTY_STATS;
  const live = view?.status === 'playing';
  const pending = view?.pending ?? null;
  const lastPlay = pending
    ? {
      player: seatToTable(pending.claimer),
      claimedRank: RANKS[pending.rank],
      claimedCount: pending.count,
      cards: pending.claimer === 'human' && Array.isArray(context.lastPlayCards) ? context.lastPlayCards : [],
    }
    : null;

  let winner = null;
  if (view?.winner === 'human') winner = 'player';
  else if (view?.winner === 'bot') winner = 'ai';
  else if (view?.winner === 'draw') winner = 'draw';

  return {
    mode: 'home',
    gameMode: view?.mode ?? 1,
    difficulty: view?.difficulty ?? 'medium',
    gameId: view?.gameId ?? null,
    privateDecks: true,
    playerHand: handToCards(view?.hand),
    aiHand: [],
    aiHandCount: view?.cardsLeft?.bot ?? 0,
    deck: [],
    pile: [],
    pileCount: (context.pileCount ?? 0) + (pending?.count ?? 0),
    discardPile: [],
    currentRank: RANKS[view?.currentRank ?? 0],
    turn: view?.turn === 'bot' ? 'ai' : 'player',
    status: live ? 'playing' : view ? 'gameover' : 'waiting',
    winner,
    log,
    lastPlay,
    scores: { player: view?.scores?.human ?? 0, ai: view?.scores?.bot ?? 0 },
    winThreshold: winThreshold(view?.mode ?? 1),
    round: view?.round ?? 1,
    maxRounds: MAX_ROUNDS,
    stats,
    aiDialogue: context.dialogue ?? '',
    lastReveal: context.reveal ?? null,
    chain: summariseChain(view),
    chainStatus: view?.status ?? null,
  };
}

function defaultStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Game provider for the sponsored backend. Mirrors RealDealGameProvider's
 * surface (startGame / makePlay / accept / challenge / getGameState /
 * resetGame) and additionally exposes `actions` for GameTable, `subscribe`
 * for React, and `chain` for the receipts widget.
 */
export class SponsoredGameProvider {
  constructor({ client, baseUrl, fetchImpl, storage = defaultStorage() } = {}) {
    this.client = client ?? createSponsoredClient({ ...(baseUrl ? { baseUrl } : {}), ...(fetchImpl ? { fetchImpl } : {}) });
    this.storage = storage;
    this.view = null;
    this.context = { log: [], stats: { ...EMPTY_STATS }, pileCount: 0, dialogue: '', reveal: null, lastPlayCards: null };
    this.listeners = new Set();
    this.activeGameId = this._readStoredGameId();
    this.actions = {
      play: ({ cards }) => this.makePlay({ cards }),
      accept: () => this.accept(),
      challenge: () => this.challenge(),
    };
  }

  _readStoredGameId() {
    try { return this.storage?.getItem(ACTIVE_GAME_KEY) ?? null; } catch { return null; }
  }

  _storeGameId(gameId) {
    this.activeGameId = gameId;
    try {
      if (gameId) this.storage?.setItem(ACTIVE_GAME_KEY, gameId);
      else this.storage?.removeItem(ACTIVE_GAME_KEY);
    } catch { /* storage unavailable */ }
  }

  _notify() {
    const state = this.getGameState();
    for (const listener of this.listeners) listener(state);
  }

  _requireGame() {
    if (!this.activeGameId) throw new Error('No active sponsored game — call startGame first.');
    return this.activeGameId;
  }

  _absorb(view, humanAction = null) {
    const applied = applyEvents(view, view.lastEvents, {
      stats: this.context.stats, pileCount: this.context.pileCount, humanAction,
    });
    this.view = view;
    this.context = {
      ...this.context,
      log: [...this.context.log, ...applied.lines],
      stats: applied.stats,
      pileCount: applied.pileCount,
      dialogue: applied.dialogue ?? (humanAction ? '' : this.context.dialogue),
      reveal: applied.reveal ?? (humanAction?.type === 'play' ? null : this.context.reveal),
    };
    this._notify();
    return this.getGameState();
  }

  async _act(action) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof SponsoredApiError && error.status === 404) this._storeGameId(null);
      this.context = { ...this.context, log: [...this.context.log, `${LOG.WARN} ${error.message}`] };
      this._notify();
      throw error;
    }
  }

  /** Create a fresh game; `mode` 0 | 1 | 2, `difficulty` easy | medium | hard. */
  async startGame({ mode = 1, difficulty = 'medium' } = {}) {
    const view = await this.client.createGame({ mode, difficulty });
    this._storeGameId(view.gameId);
    this.context = {
      log: [
        `Game started: first to ${winThreshold(view.mode)}, ${view.hand.length} cards each, up to ${MAX_ROUNDS} rounds.`,
        `First rank to declare: ${rankName(RANKS[view.currentRank])}. Midnight is deploying the game contract in the background.`,
      ],
      stats: { ...EMPTY_STATS }, pileCount: 0, dialogue: '', reveal: null, lastPlayCards: null,
    };
    return this._absorb(view);
  }

  /** Pick up the game remembered in storage (or `gameId`); null when none / unknown. */
  async resumeGame(gameId = this.activeGameId) {
    if (!gameId) return null;
    try {
      const view = await this.client.getGame(gameId);
      this._storeGameId(view.gameId);
      this.context = {
        log: [`Match resumed. Score ${view.scores.human}–${view.scores.bot}, round ${view.round}.`],
        stats: { ...EMPTY_STATS }, pileCount: 0, dialogue: '', reveal: null, lastPlayCards: null,
      };
      this.view = view;
      this._notify();
      return this.getGameState();
    } catch (error) {
      if (error instanceof SponsoredApiError && error.status === 404) { this._storeGameId(null); return null; }
      throw error;
    }
  }

  /** Re-read the view (receipts land asynchronously); never re-logs events. */
  async refresh() {
    const gameId = this._requireGame();
    const view = await this._act(() => this.client.getGame(gameId));
    this.view = view;
    this._notify();
    return this.getGameState();
  }

  /** `cards` are UI card objects from the hand; the claim is always the current rank. */
  async makePlay({ cards } = {}) {
    const gameId = this._requireGame();
    const ranks = cardsToRanks(cards);
    const rank = this.view?.currentRank ?? 0;
    this.context = { ...this.context, lastPlayCards: cards ?? null };
    const view = await this._act(() => this.client.play(gameId, { rank, count: ranks.length, cards: ranks }));
    return this._absorb(view, { type: 'play', rank, count: ranks.length });
  }

  async accept() {
    const gameId = this._requireGame();
    const count = this.view?.pending?.count ?? 0;
    const view = await this._act(() => this.client.accept(gameId));
    return this._absorb(view, { type: 'accept', count });
  }

  /** Resolves to `{ claimWasTrue, revealed, logLength, state }` for GameTable's reaction + SFX. */
  async challenge() {
    const gameId = this._requireGame();
    const view = await this._act(() => this.client.challenge(gameId));
    const state = this._absorb(view, { type: 'challenge' });
    const outcome = (view.lastEvents ?? []).find((e) => e.type === 'human-challenge');
    return {
      claimWasTrue: outcome ? outcome.truthful : null,
      revealed: handToCards(outcome?.revealed, 'reveal'),
      logLength: state.log.length,
      state,
    };
  }

  /** Current table state (null before startGame / resumeGame). */
  getGameState() {
    return this.view ? viewToTableState(this.view, this.context) : null;
  }

  /** Raw GameView as the server returned it. */
  getView() { return this.view; }

  get chain() { return summariseChain(this.view); }

  get aiDialogue() { return this.context.dialogue ?? ''; }

  /** Register a listener called with the table state after every change. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  resetGame() {
    this._storeGameId(null);
    this.view = null;
    this.context = { log: [], stats: { ...EMPTY_STATS }, pileCount: 0, dialogue: '', reveal: null, lastPlayCards: null };
    this._notify();
  }
}

/**
 * IAiProvider surface for the sponsored table. The bot's decisions are made
 * on the server, so decidePlay / decideChallenge must never be called; the
 * reaction + game-over text come from the provider's last events.
 */
export class SponsoredAiProvider {
  constructor(gameProvider) { this.gameProvider = gameProvider; }

  init() { /* no-op */ }

  decidePlay() {
    throw new Error('Sponsored games are server-driven — the bot already answered inside the last GameView.');
  }

  decideChallenge() {
    throw new Error('Sponsored games are server-driven — the bot already answered inside the last GameView.');
  }

  getReaction() {
    return { dialogue: this.gameProvider?.aiDialogue ?? '', mediaHint: null, emotionTag: null };
  }

  getGameOverMessage(aiWon) {
    const view = this.gameProvider?.getView();
    const score = view ? ` Final score ${view.scores.human}–${view.scores.bot}.` : '';
    return { dialogue: aiWon ? `The house keeps this one.${score}` : `Well played.${score}`, mediaHint: null };
  }
}

export default SponsoredGameProvider;
