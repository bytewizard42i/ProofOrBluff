import { RANKS } from '../../../shared/dealing.js';
import { rankName } from '../game/rules.js';
import { LOG } from '../components/table/GameLog.jsx';

/**
 * Maps the public on-chain match (as normalised by publicMatch/TestWired)
 * plus the player's private hand into the state shape the shared GameTable
 * renders. Pure functions, no React, no wallet — so the mapping is testable
 * against the real Preview match data.
 *
 * Honest differences from the local demo engine, by design:
 *   - The Ai's cards are never known; only its hand size (aiHandCount).
 *   - Pile and discard contents are private; only pileCount is known.
 *   - Scoring is the contract's +3 / −1 to a threshold, not hand-emptying.
 *   - There is no Pass action.
 */

export const PHASE = Object.freeze({
  WAITING_FOR_P2: 0,
  WAITING_FOR_SEEDS: 1,
  PLAYING: 2,
  AWAITING_RESPONSE: 3,
  GAMEOVER: 4,
});

// Contract: CASUAL → 10, STANDARD → 15, else 20.
export function winThreshold(mode) {
  if (mode === 0) return 10;
  if (mode === 1) return 15;
  return 20;
}

export const EMPTY_STATS = Object.freeze({
  rounds: 0,
  aiPlays: 0,
  aiBluffsCaught: 0,
  playerBluffsCaught: 0,
  playerFailedChallenges: 0,
  aiFailedChallenges: 0,
});

/**
 * Which side owns the next action, in the table's vocabulary.
 *   'player'  — the human must play / respond
 *   'ai'      — the bot must play / respond / resolve
 *   'prove'   — the human must resolve the bot's challenge (automatic)
 *   null      — nothing to do (waiting / game over)
 */
export function nextActor(match) {
  if (!match) return null;
  if (match.phase === PHASE.PLAYING) return match.activePlayerIdx === 0 ? 'player' : 'ai';
  if (match.phase === PHASE.AWAITING_RESPONSE && match.hasPendingPlay) {
    if (match.isChallenged) return match.lastPlayerIdx === 0 ? 'prove' : 'ai';
    return match.lastPlayerIdx === 1 ? 'player' : 'ai';
  }
  return null;
}

export function matchWinner(match) {
  if (!match || match.phase !== PHASE.GAMEOVER) return null;
  if (match.winner === 1) return 'player';
  if (match.winner === 2) return 'ai';
  return null;
}

/**
 * Build the table state for one moment in the match.
 *
 * @param match      normalised public match
 * @param hand       player's private cards [{ id, rank, rankIndex, suit }]
 * @param context    { log: string[], stats, lastPlayCards: Card[]|null }
 *                   — the running presentation context owned by the caller
 */
export function toTableState(match, hand, context = {}) {
  const log = context.log ?? [];
  const stats = context.stats ?? EMPTY_STATS;
  const actor = nextActor(match);
  const winner = matchWinner(match);

  const pending = match?.phase === PHASE.AWAITING_RESPONSE && match.hasPendingPlay;
  const lastPlay = pending
    ? {
      player: match.lastPlayerIdx === 0 ? 'player' : 'ai',
      claimedRank: RANKS[match.lastClaimRank],
      claimedCount: match.lastClaimCount,
      // We know our own played cards (for the "bluff succeeded" banner);
      // the bot's are private until a challenge proves them.
      cards: match.lastPlayerIdx === 0 && Array.isArray(context.lastPlayCards) ? context.lastPlayCards : [],
    }
    : null;

  let status = 'waiting';
  if (match?.phase === PHASE.PLAYING || match?.phase === PHASE.AWAITING_RESPONSE) status = 'playing';
  if (match?.phase === PHASE.GAMEOVER) status = 'gameover';

  return {
    mode: match?.mode === 4 ? 'casino' : 'home',
    playerHand: hand ?? [],
    aiHand: [],
    aiHandCount: match?.p2HandSize ?? 0,
    deck: [],
    pile: [],
    pileCount: match?.pileSize ?? 0,
    discardPile: [],
    currentRank: RANKS[match?.currentRank ?? 0],
    turn: actor === 'ai' ? 'ai' : 'player',
    proving: actor === 'prove',
    status,
    winner,
    log,
    lastPlay,
    scores: { player: match?.p1Score ?? 0, ai: match?.p2Score ?? 0 },
    winThreshold: winThreshold(match?.mode ?? 1),
    stats,
  };
}

/**
 * Compare two consecutive public snapshots and produce the log lines + stat
 * deltas the presentation layer expects. The vocabulary (LOG.*) is shared
 * with the demo engine so sounds, banners and badges fire identically.
 *
 * `previous` may be null on first load (no lines are emitted for history
 * we did not witness, apart from a one-line summary).
 */
export function diffMatch(previous, next, stats = EMPTY_STATS) {
  const lines = [];
  const nextStats = { ...stats };
  if (!next) return { lines, stats: nextStats };

  if (!previous) {
    if (next.phase >= PHASE.PLAYING) {
      lines.push(`Match resumed. Score ${next.p1Score}–${next.p2Score}, first to ${winThreshold(next.mode)}. Rank to declare: ${rankName(RANKS[next.currentRank])}.`);
    }
    return { lines, stats: nextStats };
  }

  // Deal finalised.
  if (previous.phase < PHASE.PLAYING && next.phase >= PHASE.PLAYING) {
    lines.push(`Deal sealed on Midnight. ${next.p1HandSize} cards each, first to ${winThreshold(next.mode)}. First rank to declare: ${rankName(RANKS[next.currentRank])}.`);
  }

  // A new pending play appeared.
  const newPending = next.hasPendingPlay && (!previous.hasPendingPlay || previous.lastPlayerIdx !== next.lastPlayerIdx || previous.round !== next.round);
  if (newPending && next.phase === PHASE.AWAITING_RESPONSE) {
    const who = next.lastPlayerIdx === 0 ? LOG.YOU_PLAYED : LOG.AI_PLAYED;
    const claim = `${next.lastClaimCount} ${rankName(RANKS[next.lastClaimRank], next.lastClaimCount !== 1)}`;
    lines.push(`${who} ${next.lastClaimCount} card(s) and claimed: "${claim}".`);
    if (next.lastPlayerIdx === 1) nextStats.aiPlays += 1;
  }

  // Challenge raised (resolution still pending).
  if (!previous.isChallenged && next.isChallenged) {
    lines.push(next.lastPlayerIdx === 0
      ? 'The Ai is challenging your claim. Proving your play privately…'
      : 'You challenged the Ai. Midnight is checking the proof…');
  }

  // Pending play cleared: either accepted or resolved.
  if (previous.hasPendingPlay && !next.hasPendingPlay) {
    const p1Delta = next.p1Score - previous.p1Score;
    const p2Delta = next.p2Score - previous.p2Score;
    const resolved = previous.isChallenged || p1Delta !== 0 || p2Delta !== 0;
    if (!resolved) {
      const accepter = previous.lastPlayerIdx === 0 ? LOG.AI_ACCEPTED : LOG.YOU_ACCEPTED;
      lines.push(`${accepter} the claim. Pile now has ${next.pileSize} card(s). Next rank: ${rankName(RANKS[next.currentRank])}.`);
      nextStats.rounds += 1;
    } else {
      const bluffer = previous.lastPlayerIdx; // whoever made the claim
      const challengerWon = bluffer === 0 ? p2Delta > 0 : p1Delta > 0;
      nextStats.rounds += 1;
      if (challengerWon) {
        // Claim was false: bluffer caught.
        if (bluffer === 0) {
          nextStats.playerBluffsCaught += 1;
          lines.push(`${LOG.CAUGHT_BLUFFING}! The proof showed your claim was false. ${LOG.PLAYER_LOSES_MARKER} the penalty: −1, Ai +3. Pile discarded.`);
        } else {
          nextStats.aiBluffsCaught += 1;
          lines.push(`${LOG.CAUGHT_BLUFFING}! The proof showed the Ai's claim was false. ${LOG.AI_LOSES_MARKER} the penalty: −1, you +3. Pile discarded.`);
        }
      } else {
        // Claim was true: challenger pays.
        if (bluffer === 0) {
          nextStats.aiFailedChallenges += 1;
          lines.push(`${LOG.CHALLENGE_FAILED}! The proof confirmed your claim. ${LOG.AI_LOSES_MARKER} the penalty: −1, you +3. Pile discarded.`);
        } else {
          nextStats.playerFailedChallenges += 1;
          lines.push(`${LOG.CHALLENGE_FAILED}! The proof confirmed the Ai's claim. ${LOG.PLAYER_LOSES_MARKER} the penalty: −1, Ai +3. Pile discarded.`);
        }
      }
      if (next.round !== previous.round) {
        lines.push(`A hand emptied — Midnight reshuffled and dealt round ${next.round + 1} privately.`);
      }
    }
  }

  // Game over.
  if (previous.phase !== PHASE.GAMEOVER && next.phase === PHASE.GAMEOVER) {
    if (next.winner === 1) lines.push(`${LOG.YOU_WIN}! Final score ${next.p1Score}–${next.p2Score}.`);
    else if (next.winner === 2) lines.push(`${LOG.AI_WINS}! Final score ${next.p1Score}–${next.p2Score}.`);
  }

  return { lines, stats: nextStats };
}

/**
 * Given the snapshots around a challenge the *player* raised, say whether
 * the Ai's claim turned out true. Used for the immediate reaction + SFX.
 */
export function playerChallengeOutcome(previous, next) {
  if (!previous || !next) return null;
  if (next.p1Score > previous.p1Score) return { claimWasTrue: false };
  if (next.p2Score > previous.p2Score || next.p1Score < previous.p1Score) return { claimWasTrue: true };
  return null;
}
