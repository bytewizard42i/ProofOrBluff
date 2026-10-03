import React from 'react';

// ────────────────────────────────────────────────────────────
// Scoreboard + Bluff probability
// ────────────────────────────────────────────────────────────

/**
 * How many copies of each rank exist in the active deck.
 * Home mode = 1 standard deck = 4 of each rank.
 * Casino mode = 5 decks = 20 of each rank.
 */
export function copiesPerRank(mode) {
  return mode === 'casino' ? 20 : 4;
}

/**
 * Estimate the probability that the Ai's most recent claim is a bluff.
 * Combines three signals:
 *   1. Hard impossibility — if the player holds enough of the claimed rank
 *      that the Ai literally can't have what they claim, P = 1.
 *   2. Pressure — the closer the claim is to the maximum the Ai could
 *      truthfully have, the more suspicious it is.
 *   3. Observed bluff rate — historical fraction of Ai plays revealed as
 *      bluffs via challenges, blended toward a mode-specific prior.
 *
 * On the Midnight table the pile and discard contents are private, so
 * those arrays are empty and only the player's own hand constrains the
 * estimate. That makes the on-chain odds a little more generous to the Ai,
 * which is the honest direction to err.
 *
 * Returns null if there is no Ai claim to evaluate, otherwise:
 *   { p: 0..1, reason: string, stats: {...} }
 */
export function estimateAiBluffProbability(state, settings) {
  if (!state.lastPlay || state.lastPlay.player !== 'ai') return null;
  const { claimedRank, claimedCount } = state.lastPlay;
  const copies = copiesPerRank(state.mode);
  const playerHasOfRank = state.playerHand.filter((c) => c.rank === claimedRank).length;
  const pileHasOfRank = (state.pile || []).filter((c) => c.rank === claimedRank).length;
  // Discarded cards are permanently out of play (post-May-2026 rule change:
  // pile is discarded on challenge resolution rather than scooped). They
  // still reduce the maximum the Ai could be holding.
  const discardHasOfRank = (state.discardPile || []).filter((c) => c.rank === claimedRank).length;
  const aiCanHaveAtMost = Math.max(0, copies - playerHasOfRank - pileHasOfRank - discardHasOfRank);

  if (claimedCount > aiCanHaveAtMost) {
    return {
      p: 1.0,
      reason: `Impossible: only ${aiCanHaveAtMost} ${claimedRank}${aiCanHaveAtMost === 1 ? '' : 's'} could exist in the Ai's hand. They claim ${claimedCount}.`,
      stats: { playerHasOfRank, aiCanHaveAtMost, copies },
    };
  }

  // Difficulty prior — matches the bluffChance in the scripted Ai.
  const PRIOR = { easy: 0.2, medium: 0.35, hard: 0.5 };
  const prior = PRIOR[settings.difficulty] ?? 0.35;

  // Observed bluff rate (Laplace-smoothed so a single observation doesn't dominate).
  const observedNum = state.stats.aiBluffsCaught + 1;
  const observedDen = state.stats.aiPlays + 2;
  const observed = observedNum / observedDen;

  // Blend prior and observed (more weight to observed as plays accumulate).
  const weight = Math.min(1, state.stats.aiPlays / 6);
  const baseRate = (1 - weight) * prior + weight * observed;

  // Pressure: claimedCount / aiCanHaveAtMost in [0, 1]. Adds up to +0.45.
  const pressure = aiCanHaveAtMost > 0 ? Math.min(1, claimedCount / aiCanHaveAtMost) : 1;
  const pressureBonus = 0.45 * pressure;

  let p = Math.min(0.97, baseRate + pressureBonus * 0.6);
  if (claimedCount === aiCanHaveAtMost) p = Math.min(0.95, p + 0.1);

  const reason =
    `Ai bluff rate so far: ${state.stats.aiBluffsCaught}/${state.stats.aiPlays} caught` +
    ` (${settings.difficulty} prior ${(prior * 100).toFixed(0)}%).` +
    ` You hold ${playerHasOfRank} ${claimedRank}${playerHasOfRank === 1 ? '' : 's'};` +
    ` they claim ${claimedCount} of a possible ${aiCanHaveAtMost}.`;

  return { p, reason, stats: { playerHasOfRank, aiCanHaveAtMost, copies } };
}

export function Scoreboard({ state }) {
  const aiCount = state.aiHandCount ?? state.aiHand.length;
  const youCount = state.playerHand.length;
  const { rounds, aiBluffsCaught, playerBluffsCaught, playerFailedChallenges } = state.stats;
  const hasScores = typeof state.scores?.player === 'number';
  return (
    <aside className="scoreboard">
      <div className="score-cell ai">
        <div className="score-label">{hasScores ? 'Ai score' : 'Ai cards'}</div>
        <div className="score-number">{hasScores ? state.scores.ai : aiCount}</div>
        {hasScores && <div className="score-sub">{aiCount} cards</div>}
      </div>
      <div className="score-stats">
        <div className="stat">
          <span className="stat-label">Rounds</span>
          <span className="stat-value">{rounds}</span>
        </div>
        <div className="stat good">
          <span className="stat-label">🟢 Bluffs caught</span>
          <span className="stat-value">{aiBluffsCaught}</span>
        </div>
        <div className="stat bad">
          <span className="stat-label">🔴 You got caught</span>
          <span className="stat-value">{playerBluffsCaught}</span>
        </div>
        <div className="stat bad">
          <span className="stat-label">❌ Wrong calls</span>
          <span className="stat-value">{playerFailedChallenges}</span>
        </div>
      </div>
      <div className="score-cell you">
        <div className="score-label">{hasScores ? 'Your score' : 'Your cards'}</div>
        <div className="score-number">{hasScores ? state.scores.player : youCount}</div>
        {hasScores && <div className="score-sub">{youCount} cards</div>}
      </div>
    </aside>
  );
}

export function BluffOddsBadge({ estimate }) {
  if (!estimate) return null;
  const pct = Math.round(estimate.p * 100);
  const cls = pct >= 70 ? 'high' : pct >= 40 ? 'med' : 'low';
  return (
    <div className={`bluff-odds ${cls}`}>
      <div className="odds-headline">
        <span className="odds-label">Bluff odds</span>
        <span className="odds-value">{pct}%</span>
      </div>
      <div className="odds-reason">{estimate.reason}</div>
    </div>
  );
}
