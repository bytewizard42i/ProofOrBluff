import React from 'react';

/**
 * Log vocabulary shared by every engine. The presentation layer (sounds,
 * banners, badges, narration) keys off these prefixes/markers, so any engine
 * that wants the full table experience emits lines using them. The local
 * demo engine already does; the Midnight adapter builds its lines from the
 * same constants so the two surfaces can never drift apart.
 */
export const LOG = Object.freeze({
  // Outcome prefixes
  CAUGHT_BLUFFING: 'CAUGHT BLUFFING',
  CHALLENGE_FAILED: 'CHALLENGE FAILED',
  YOU_WIN: 'YOU WIN',
  AI_WINS: 'AI WINS',
  // Who paid for the outcome. Both engines include one of these markers in
  // every CAUGHT/FAILED line so the UI knows which side it was bad for.
  AI_LOSES_MARKER: 'AI draws',
  PLAYER_LOSES_MARKER: 'You draw',
  // Turn prefixes
  YOU_PLAYED: 'You played',
  AI_PLAYED: 'AI played',
  YOU_ACCEPTED: 'You accepted',
  AI_ACCEPTED: 'AI accepted',
  WARN: '⚠️',
});

export function logSaysPlayerLost(text) {
  return text.includes(LOG.PLAYER_LOSES_MARKER);
}

/**
 * Classify a raw log string into a structured display entry:
 *   - actor:  'player' | 'ai' | 'system'
 *   - kind:   'info' | 'play' | 'accept' | 'win-good' | 'win-bad' | 'warn'
 *   - icon:   emoji glyph
 *   - text:   the original message
 *
 * "win-good" / "win-bad" are framed from the player's perspective so the
 * green/red coloring tracks "did the player benefit from this event."
 */
export function classifyLog(text) {
  // Helper to build a result, stripping the leading actor word from the
  // body (since we render the badge separately).
  const make = (actor, kind, icon, label, body) => ({
    actor, kind, icon, label, body, text,
  });

  if (text.startsWith(LOG.WARN)) return make('system', 'warn', '⚠️', null, text);

  // Win / lose
  if (text.startsWith(LOG.YOU_WIN)) {
    return make('player', 'win-good', '🏆', 'You', text.replace(/^YOU\s+/, ''));
  }
  if (text.startsWith(LOG.AI_WINS)) {
    return make('ai', 'win-bad', '💀', 'Ai', text.replace(/^AI\s+/, ''));
  }

  // Bluffer caught (CAUGHT BLUFFING) — bluffer pays the penalty.
  // Player-loses marker => player got caught (BAD). Otherwise AI (GOOD).
  if (text.startsWith(LOG.CAUGHT_BLUFFING)) {
    if (logSaysPlayerLost(text)) return make('player', 'win-bad', '🔴', 'You', text);
    return make('ai', 'win-good', '🟢', 'Ai', text);
  }

  // Challenge failed — claim was true, challenger pays the penalty.
  if (text.startsWith(LOG.CHALLENGE_FAILED)) {
    if (logSaysPlayerLost(text)) return make('player', 'win-bad', '🔴', 'You', text);
    return make('ai', 'win-good', '🟢', 'Ai', text);
  }

  // Plays and accepts — actor extracted from the leading word and stripped
  // from the body so the badge replaces the pronoun.
  if (text.startsWith(LOG.YOU_PLAYED)) {
    return make('player', 'play', '🎴', 'You', text.replace(/^You\s+/, ''));
  }
  if (text.startsWith(LOG.AI_PLAYED)) {
    return make('ai', 'play', '🃏', 'Ai', text.replace(/^AI\s+/, ''));
  }
  if (text.startsWith(LOG.YOU_ACCEPTED)) {
    return make('player', 'accept', '✅', 'You', text.replace(/^You\s+/, ''));
  }
  if (text.startsWith(LOG.AI_ACCEPTED)) {
    return make('ai', 'accept', '✅', 'Ai', text.replace(/^AI\s+/, ''));
  }

  return make('system', 'info', '·', null, text);
}

/**
 * Render a single classified log entry.
 */
export function LogEntry({ entry, isNewest }) {
  const { actor, kind, icon, label, body } = entry;
  const className = [
    'log-entry',
    `actor-${actor}`,
    `kind-${kind}`,
    isNewest ? 'newest' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <span className="log-icon" aria-hidden="true">{icon}</span>
      {label && <span className={`log-badge badge-${actor}`}>{label}</span>}
      <span className="log-text">{body}</span>
    </div>
  );
}

/**
 * The side log panel: narration controls + staggered entries, newest first.
 */
export function GameLogPanel({
  log,
  visibleCount,
  narrationMuted,
  narrationVolume,
  onToggleNarration,
  onNarrationVolume,
}) {
  return (
    <aside className="log-panel side">
      <div className="log-header">
        <h4>Game Log</h4>
        <div className="log-narration-controls" aria-label="Narration controls">
          <button
            type="button"
            className={`icon-btn ${narrationMuted ? 'active' : ''}`}
            onClick={onToggleNarration}
            title={narrationMuted ? 'Unmute narration' : 'Mute narration'}
            aria-label={narrationMuted ? 'Unmute narration' : 'Mute narration'}
          >
            {narrationMuted ? '🔇' : '🗣️'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={narrationVolume}
            onChange={(e) => onNarrationVolume(parseFloat(e.target.value))}
            style={{ '--val': narrationVolume }}
            aria-label="Narration volume"
            title={`Narration volume: ${Math.round(narrationVolume * 100)}%`}
            disabled={narrationMuted}
          />
        </div>
      </div>
      <div className="log-entries">
        {visibleCount === 0 ? (
          <div className="log-entry actor-system" style={{ fontStyle: 'italic' }}>
            <span className="log-icon">·</span>
            <span className="log-text">Events will appear here as the round unfolds.</span>
          </div>
        ) : (
          log
            .slice(0, visibleCount)
            .map((raw, idx, arr) => ({ raw, idx, isNewest: idx === arr.length - 1 }))
            .reverse()
            .map(({ raw, idx, isNewest }) => (
              <LogEntry key={idx} entry={classifyLog(raw)} isNewest={isNewest} />
            ))
        )}
      </div>
    </aside>
  );
}
