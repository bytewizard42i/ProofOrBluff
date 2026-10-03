import React, { useMemo } from 'react';
import { getGameOverDialogue } from '../../game/ai/scripted.js';

export default function ResultOverlay({ winner, onRematch, onMenu, rematchLabel = 'Rematch', menuLabel = 'Menu' }) {
  const isPlayerWin = winner === 'player';
  const aiLine = useMemo(
    () => getGameOverDialogue(!isPlayerWin),
    [isPlayerWin]
  );
  return (
    <div className="result-overlay">
      <div className={`result-card ${isPlayerWin ? 'win' : 'lose'}`}>
        <h2>{isPlayerWin ? 'You Win' : 'The Ai Wins'}</h2>
        <p className="display" style={{ color: 'var(--text-dim)' }}>
          {isPlayerWin
            ? 'Truth, lies, and zero-knowledge — and you read them all.'
            : 'The hand stays hidden. The proof says you lost this round.'}
        </p>
        <p className="dialogue">"{aiLine}"</p>
        <div className="result-actions">
          {onRematch && (
            <button className="primary" onClick={onRematch}>
              {rematchLabel}
            </button>
          )}
          {onMenu && <button onClick={onMenu}>{menuLabel}</button>}
        </div>
      </div>
    </div>
  );
}
