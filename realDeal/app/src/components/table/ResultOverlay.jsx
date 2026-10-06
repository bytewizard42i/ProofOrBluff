import React, { useMemo } from 'react';
import { getGameOverDialogue } from '../../game/ai/scripted.js';

export default function ResultOverlay({ winner, onRematch, onMenu, rematchLabel = 'Rematch', menuLabel = 'Menu', footnote = null }) {
  const isPlayerWin = winner === 'player';
  const isDraw = winner === 'draw';
  const aiLine = useMemo(
    () => getGameOverDialogue(!isPlayerWin && !isDraw),
    [isPlayerWin, isDraw]
  );
  return (
    <div className="result-overlay">
      <div className={`result-card ${isPlayerWin ? 'win' : isDraw ? 'draw' : 'lose'}`}>
        <h2>{isPlayerWin ? 'You Win' : isDraw ? 'A Draw' : 'The Ai Wins'}</h2>
        <p className="display" style={{ color: 'var(--text-dim)' }}>
          {isPlayerWin
            ? 'Truth, lies, and zero-knowledge — and you read them all.'
            : isDraw
              ? 'Six rounds, nobody reached the line. The proof says: honours even.'
              : 'The hand stays hidden. The proof says you lost this round.'}
        </p>
        <p className="dialogue">"{aiLine}"</p>
        {footnote && <p className="result-footnote">{footnote}</p>}
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
