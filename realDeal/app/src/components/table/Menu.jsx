import React, { useState } from 'react';

// localStorage key for the player's chosen handle so we can pre-fill it
// on subsequent visits.
export const HANDLE_KEY = 'pob.handle';

export function loadHandle() {
  try { return window.localStorage.getItem(HANDLE_KEY) || ''; }
  catch { return ''; }
}

export function saveHandle(handle) {
  try { window.localStorage.setItem(HANDLE_KEY, handle); } catch { /* noop */ }
}

export default function Menu({ onStart, onShowHelp, switchGame = null }) {
  const [mode, setMode] = useState('home');
  const [difficulty, setDifficulty] = useState('medium');
  const [handle, setHandle] = useState(loadHandle);

  const trimmedHandle = handle.trim();
  const canStart = trimmedHandle.length > 0;
  const submit = () => {
    if (!canStart) return;
    saveHandle(trimmedHandle);
    onStart({ mode, difficulty, handle: trimmedHandle });
  };

  return (
    <div className="menu">
      <div>
        <h2>Proof or Bluff</h2>
        <p className="subtitle">
          Bluff in public. Prove in private. A privacy-native bluffing card
          game on the Midnight Network — where every challenge is a felt
          moment of cryptographic truth.
        </p>
      </div>

      <div className="menu-options">
        <div className="option-group">
          <h3>Your handle</h3>
          <input
            className={`handle-input${handle.trim().length === 0 ? ' handle-input--empty' : ''}`}
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.slice(0, 24))}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="e.g. johnny5i"
            maxLength={24}
            autoFocus
            aria-label="Player handle"
          />
        </div>

        <div className="option-group">
          <h3>Mode</h3>
          <div className="option-buttons">
            <button
              className={mode === 'home' ? 'active' : ''}
              onClick={() => setMode('home')}
            >
              Home (race to 15)
            </button>
            <button
              className={mode === 'casino' ? 'active' : ''}
              onClick={() => setMode('casino')}
            >
              Casino (race to 20)
            </button>
          </div>
        </div>

        <div className="option-group">
          <h3>Difficulty</h3>
          <div className="option-buttons">
            <button
              className={difficulty === 'easy' ? 'active' : ''}
              onClick={() => setDifficulty('easy')}
            >
              Easy
            </button>
            <button
              className={difficulty === 'medium' ? 'active' : ''}
              onClick={() => setDifficulty('medium')}
            >
              Medium
            </button>
            <button
              className={difficulty === 'hard' ? 'active' : ''}
              onClick={() => setDifficulty('hard')}
            >
              Hard
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="primary"
          onClick={submit}
          disabled={!canStart}
          title={canStart ? '' : 'Enter a handle to begin'}
        >
          Deal me in
        </button>
        <button onClick={onShowHelp}>How to Play</button>
        {switchGame && <a className="fiveup-switch" href={switchGame.href}>{switchGame.label}</a>}
      </div>

      <p className="subtitle" style={{ fontSize: '0.85rem', maxWidth: 540 }}>
        <strong>The short version:</strong> claim the required rank, play
        cards face down (they don't have to match), and either bluff your
        way through or call out the Ai. Empty your hand to win.
      </p>
    </div>
  );
}
