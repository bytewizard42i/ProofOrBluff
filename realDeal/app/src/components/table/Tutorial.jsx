import React from 'react';

/**
 * How-to-play overlay. `variant` switches the penalty wording: the local
 * demo engine makes the loser draw cards; the Midnight state-only contract
 * scores +3 / −1 instead and discards the pile either way.
 */
export default function Tutorial({ onClose, variant = 'demo', contractVersion = 'v3p' }) {
  const onChain = variant === 'midnight';
  const v4Rules = contractVersion === 'v4';
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <h2>How to Play</h2>
        <p className="subtitle">Bluff in public. Prove in private.</p>
        <ol>
          <li>
            Each round demands a specific <strong>rank</strong> (e.g.
            <em> Queens</em>). The required rank advances one step every round.
          </li>
          <li>
            On your turn, play <strong>1–4 cards face down</strong> and claim
            you played that many of the required rank. The cards don't have
            to actually match — that's where the bluffing lives.
          </li>
          <li>
            The Ai then chooses to <strong>Accept</strong> your claim or call{' '}
            <strong>Proof or Bluff!</strong>
          </li>
          {onChain ? (
            <li>
              If challenged: a <strong>zero-knowledge proof</strong> settles
              it on Midnight — revealing only whether the claim was true,
              never the cards. The winner of the challenge scores{' '}
              <strong>+3</strong>, the loser <strong>−1</strong>, and the pile
              is discarded.
            </li>
          ) : (
            <li>
              If challenged: cards reveal. The loser <strong>draws penalty
              cards from the deck</strong> (equal to the pile size, minimum
              2 if caught bluffing on an empty pile). The pile is then
              discarded — it never goes back into anyone's hand.
            </li>
          )}
          <li>
            {onChain
              ? (v4Rules
                ? <><strong>Empty your hand to win the game.</strong> A caught last-card bluff doesn't count — the round redeals. Score the target first and you win on points; six rounds with no winner is a draw.</>
                : <><strong>First to the score target wins.</strong> When a hand empties, the deal reshuffles privately.</>)
              : <><strong>Empty your hand to win.</strong> Each player starts with 10 cards.</>}
          </li>
        </ol>
        <div className="hint">
          💡 <strong>Pair hint:</strong> Cards of the same rank in your hand
          glow with a matching neon ring — useful when you want to dump a
          pair and claim them as something else, or stack honest plays.
        </div>
        <div className="tutorial-actions">
          <button className="primary" onClick={onClose}>Got it — deal me in</button>
          <button onClick={onClose}>Skip</button>
        </div>
      </div>
    </div>
  );
}
