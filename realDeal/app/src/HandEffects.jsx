import React, { useMemo } from 'react';

// Hand-level celebration + deal transition for 5 Up 2 Down. Purely visual —
// FiveUpGame mounts/unmounts these; all motion lives in styles.css under the
// hand-celebration / hand-transition prefixes. The celebration (z 55) sits
// above .result-overlay (50) so a game-winning burst shows over the result
// card; the transition (z 48) sits below it. Both stay under the tutorial (60).

/**
 * Which side gained more between two score snapshots. `before`/`after` are
 * `{human, bot}`; gains may be negative (a challenged bluff costs points).
 * A tie — including 0–0 — returns null so nothing celebrates.
 */
export function handWinner(before, after) {
  const gainHuman = after.human - before.human;
  const gainBot = after.bot - before.bot;
  if (gainHuman > gainBot) return 'human';
  if (gainBot > gainHuman) return 'bot';
  return null;
}

const CONFETTI_HUES = ['#ffd700', '#39ff14', '#9d4edd', '#ff4fa3', '#4fd8ff', '#ffffff'];
const CONFETTI_COUNT = 140;

function Confetti() {
  // Generated once per mount: the parent keys the celebration per hand, so a
  // fresh burst falls for every finished hand and never re-plays on the 6 s
  // receipt poll.
  const pieces = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: Math.random() * 100,
    size: 10 + Math.random() * 12,
    color: CONFETTI_HUES[i % CONFETTI_HUES.length],
    delay: Math.random() * 0.6,
    duration: 2.4 + Math.random() * 1.4,
    drift: (Math.random() * 2 - 1) * 140,
    spin: Math.random() * 720 - 360,
    round: Math.random() < 0.4,
  })), []);
  return (
    <div className="hand-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} className={`hand-confetti-piece${p.round ? ' hand-confetti-piece--round' : ''}`}
          style={{
            '--x': `${p.left}%`, '--size': `${p.size}px`, '--color': p.color,
            '--delay': `${p.delay}s`, '--dur': `${p.duration}s`,
            '--drift': `${p.drift}px`, '--spin': `${p.spin}deg`,
          }} />
      ))}
    </div>
  );
}

/** kind 'human' → confetti + gold headline; kind 'bot' → red alarm + headline. */
export function HandCelebration({ kind }) {
  return (
    <div className={`hand-celebration hand-celebration--${kind}`} role="status">
      {kind === 'human' ? <Confetti /> : (
        <div className="hand-alarm" aria-hidden="true">
          <div className="hand-alarm-beacon hand-alarm-beacon--tl" />
          <div className="hand-alarm-beacon hand-alarm-beacon--tr" />
        </div>
      )}
      <div className="hand-celebration-headline">
        {kind === 'human' ? 'You take the hand!' : 'The Ai takes the hand'}
      </div>
    </div>
  );
}

/**
 * Curtain transition while the next hand is dealt. `phase` 'in' slides the
 * two felt curtains closed (~0.35 s, on mount), 'out' slides them open again
 * (~0.4 s). pointer-events stay ON for the whole overlay so no card can be
 * tapped mid-deal.
 */
export function HandTransition({ round, phase }) {
  return (
    <div className={`hand-transition hand-transition--${phase}`} role="presentation">
      <div className="hand-curtain hand-curtain--left" />
      <div className="hand-curtain hand-curtain--right" />
      <div className="hand-transition-center">
        <div className="hand-card-backs" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="hand-card-back" />)}
        </div>
        <div className="hand-transition-round">Round {round}</div>
        <div className="hand-transition-sub">New board. New cards.</div>
      </div>
    </div>
  );
}
