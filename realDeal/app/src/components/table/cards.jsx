import React from 'react';

/**
 * Card primitives shared by every game surface (local demo engine and the
 * Midnight-backed table). Pure presentation: no engine or wallet imports.
 */

export const SUIT_GLYPH = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  // The Midnight contract deals ranks only; suits do not exist on-chain.
  // Rendering a neutral mark is more honest than inventing one.
  hidden: '✦',
};

export const SUIT_COLOR = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
  hidden: 'midnight',
};

// Neon palette for pair-group highlights. Each rank present 2+ times in the
// hand is assigned the next available color from this list.
export const PAIR_COLORS = [
  { color: '#ff3df0', glow: 'rgba(255, 61, 240, 0.6)' }, // magenta
  { color: '#3dffd5', glow: 'rgba(61, 255, 213, 0.6)' }, // cyan-mint
  { color: '#ff8c3d', glow: 'rgba(255, 140, 61, 0.6)' }, // orange
  { color: '#a3ff3d', glow: 'rgba(163, 255, 61, 0.6)' }, // lime
  { color: '#3d8cff', glow: 'rgba(61, 140, 255, 0.6)' }, // electric blue
  { color: '#ff3d6e', glow: 'rgba(255, 61, 110, 0.6)' }, // hot pink
  { color: '#b03dff', glow: 'rgba(176, 61, 255, 0.6)' }, // purple
];

/**
 * Build a map of rank → { color, glow } for ranks appearing 2+ times in hand.
 */
export function detectPairs(hand) {
  const counts = {};
  for (const card of hand) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  const map = {};
  let i = 0;
  for (const rank of Object.keys(counts)) {
    if (counts[rank] >= 2) {
      map[rank] = PAIR_COLORS[i % PAIR_COLORS.length];
      i += 1;
    }
  }
  return map;
}

export function PlayingCard({ card, selected, onClick, disabled, pairColor, tossing }) {
  const color = SUIT_COLOR[card.suit];
  const glyph = SUIT_GLYPH[card.suit];
  const classes = [
    'card',
    color,
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
    pairColor ? 'pair' : '',
    tossing ? 'tossing' : '',
  ].filter(Boolean).join(' ');
  const style = pairColor
    ? { '--pair-color': pairColor.color, '--pair-glow': pairColor.glow }
    : undefined;
  return (
    <div
      className={classes}
      style={style}
      onClick={disabled ? undefined : onClick}
      role="button"
      aria-pressed={selected}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <div className="corner top">
        <span>{card.rank}</span>
        <span>{glyph}</span>
      </div>
      <div className="suit-large">{glyph}</div>
    </div>
  );
}

export function CardBack({ label = 'POB' }) {
  return <div className="card-back">{label}</div>;
}

/**
 * Big animated green arrow that flips between pointing UP (Ai's turn) and
 * DOWN (your turn). Sits to the left of the "How many" rank so it's the
 * first thing you see at a glance.
 */
export function TurnArrow({ direction }) {
  return (
    <div className={`turn-arrow ${direction}`} aria-label={direction === 'down' ? 'Your turn' : "Ai's turn"}>
      <svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
        {/* Shaft + arrowhead. The shape is drawn pointing DOWN; we rotate
            via CSS for the UP variant so both share one path. */}
        <path
          d="M24 4 H40 V44 H56 L32 76 L8 44 H24 Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="turn-label">{direction === 'down' ? 'Your turn' : "Ai's turn"}</span>
    </div>
  );
}
