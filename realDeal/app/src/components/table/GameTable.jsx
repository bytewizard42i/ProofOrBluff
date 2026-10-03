import React, { useEffect, useMemo, useState } from 'react';
import { formatClaim, rankName } from '../../game/rules.js';
import { getChallengeReaction } from '../../game/ai/scripted.js';
import {
  playSubmitClick,
  playPickClick,
  playUnpickClick,
  playYouMisCalled,
  playYouCaughtAi,
} from '../../sounds.js';
import { PlayingCard, CardBack, detectPairs } from './cards.jsx';
import { Scoreboard, BluffOddsBadge, estimateAiBluffProbability } from './Scoreboard.jsx';

/**
 * The game table. Engine-agnostic: every state change goes through the
 * `actions` prop, so the same component renders the local demo engine and
 * the Midnight-backed match.
 *
 * actions = {
 *   play({ cards })  -> Promise<void> | void
 *   accept()         -> Promise<void> | void
 *   challenge()      -> Promise<{ claimWasTrue: boolean } | void> | { claimWasTrue } | void
 *   pass?()          -> optional; the Pass button is hidden when absent
 *                        (the Midnight contract has no pass circuit).
 * }
 *
 * The table triggers the toss animation and the immediate challenge
 * reaction itself; the engine owns the resulting state and log lines.
 */
export default function GameTable({
  state,
  settings,
  actions,
  aiDialogue,
  setAiDialogue,
  displayedRank,
  banner,
  skipFutureOutcomeSounds,
  outputComplete,
  busy = false,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [claimedCount, setClaimedCount] = useState(1);
  // IDs of cards currently mid-toss-animation. Held in local state so the
  // visual flourish completes before the new game state replaces them.
  const [tossingIds, setTossingIds] = useState(new Set());
  // Toggleable bluff-odds analyzer that appears when the Ai is awaiting
  // your decision. Persists across rounds so the player can leave it on.
  const [showOdds, setShowOdds] = useState(false);

  // Reset selection when it becomes a new turn / round
  useEffect(() => {
    setSelectedIds(new Set());
    setClaimedCount(1);
  }, [state.currentRank, state.turn, state.lastPlay?.player]);

  // Detect pairs (same-rank groups of 2+) in the current player hand.
  const pairMap = useMemo(() => detectPairs(state.playerHand), [state.playerHand]);

  // Compute bluff odds whenever the Ai is the one waiting on you.
  const bluffEstimate = useMemo(
    () => estimateAiBluffProbability(state, settings),
    [state, settings]
  );

  // outputComplete gates the player's controls: we don't unlock the
  // next claim until the previous turn's log entries have fully
  // revealed, the narrator has finished speaking, and the result
  // banner has cleared. Same fairness rule we already apply to the Ai.
  // `busy` additionally locks the table while a proof or signature is
  // in flight on the Midnight-backed surface.
  const playerCanPlay =
    state.status === 'playing' &&
    state.turn === 'player' &&
    state.lastPlay === null &&
    outputComplete &&
    !busy;

  const playerMustRespond =
    state.status === 'playing' &&
    state.turn === 'player' &&
    state.lastPlay !== null &&
    state.lastPlay.player === 'ai' &&
    outputComplete &&
    !busy;

  // Toggle card selection
  function toggleCard(card) {
    if (!playerCanPlay) return;
    const next = new Set(selectedIds);
    if (next.has(card.id)) {
      next.delete(card.id);
      playUnpickClick();
    } else if (next.size < 4) {
      next.add(card.id);
      playPickClick();
    }
    setSelectedIds(next);
    // Auto-adjust claimed count to match selected (player can still override)
    if (next.size > 0 && claimedCount > next.size) {
      setClaimedCount(next.size);
    }
  }

  function handlePlay() {
    const cardsPlayed = state.playerHand.filter((c) => selectedIds.has(c.id));
    if (cardsPlayed.length === 0) return;
    playSubmitClick();
    // Trigger the 3D toss animation first; commit state when it finishes
    // so the cards visibly fly off the hand into the pile.
    const ids = new Set(cardsPlayed.map((c) => c.id));
    setTossingIds(ids);
    setAiDialogue('');
    setTimeout(() => {
      setTossingIds(new Set());
      Promise.resolve(actions.play({ cards: cardsPlayed })).catch(() => undefined);
    }, 1100);
  }

  function handleAccept() {
    playSubmitClick();
    setAiDialogue('');
    Promise.resolve(actions.accept()).catch(() => undefined);
  }

  function handlePass() {
    if (!actions.pass) return;
    playSubmitClick();
    setSelectedIds(new Set());
    setAiDialogue('');
    Promise.resolve(actions.pass()).catch(() => undefined);
  }

  async function handleChallenge() {
    playSubmitClick();
    let result;
    try {
      result = await actions.challenge();
    } catch {
      return;
    }
    if (!result || typeof result.claimWasTrue !== 'boolean') return;
    const { claimWasTrue, logLength } = result;
    setAiDialogue(getChallengeReaction({ aiWasChallenger: false, claimWasTrue }));
    // The outcome is known as soon as the engine resolves. Play the matching
    // outcome SFX 250ms later so the player gets immediate feedback instead
    // of waiting for the staggered log to reach the CAUGHT BLUFFING /
    // CHALLENGE FAILED line. Tell the presentation layer to skip the
    // log-reveal duplicate.
    setTimeout(() => {
      if (claimWasTrue) playYouMisCalled();   // you called a true claim
      else              playYouCaughtAi();    // you caught a bluff
    }, 250);
    if (skipFutureOutcomeSounds && typeof logLength === 'number') skipFutureOutcomeSounds(logLength);
  }

  const pileSize = state.pileCount ?? (state.pile.length + (state.lastPlay ? state.lastPlay.cards.length : 0));
  const deckLeft = state.deck?.length ?? 0;

  const aiHandCount = state.aiHandCount ?? state.aiHand.length;
  const claimOwner = state.lastPlay ? state.lastPlay.player : state.turn;
  const ownerName = claimOwner === 'ai' ? 'Ai' : (settings.handle || 'You');
  const claimLabel = state.lastPlay
    ? `${ownerName}: I have ${state.lastPlay.claimedCount} of:`
    : `${ownerName}, how many do you have of:`;

  return (
    <div className="table">
      <div className="table-main">
      {/* Ai area */}
      <div className="ai-area">
        <div className="ai-avatar">🎭</div>
        <div className="ai-dialogue">
          {aiDialogue || (state.turn === 'ai' ? 'Studying the table…' : 'Your move.')}
        </div>
        <div className="ai-meta">
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {settings.difficulty} · {settings.mode}
          </span>
        </div>
        {/* The Ai's hand, face down. Count only — the cards themselves are
          * private (on Midnight, cryptographically so). */}
        <div className="ai-hand" aria-label={`Ai holds ${aiHandCount} card${aiHandCount === 1 ? '' : 's'}`}>
          <div className="ai-hand-cards" style={{ '--count': aiHandCount }}>
            {Array.from({ length: Math.min(aiHandCount, 26) }).map((_, i) => (
              <div key={i} className="ai-hand-card" style={{ '--i': i }} aria-hidden="true" />
            ))}
          </div>
          <span className="ai-hand-count">{aiHandCount} in hand</span>
        </div>
      </div>

      {/* Center pile. The key on .required-rank ensures the element
        * re-mounts each time the rank advances, triggering the
        * hand-transition CSS animation defined in styles.css. */}
      <div className="center">
        <div
          className="required-rank"
          key={`hand-${displayedRank ?? state.currentRank}-${state.turn}-${state.lastPlay?.player ?? 'none'}`}
        >
          <span className="required-label">
            {/* One sentence for whoever owns the moment, completed by the
              * big rank below it:
              *   no claim yet  -> "<who>, how many do you have of:"  <rank>
              *   claim pending -> "<who>: I have <n> of:"           <rank>
              * (state.turn flips after a play to mean "must respond",
              *  so the owner comes from lastPlay when one exists.) */}
            {claimLabel}
          </span>
          <span className="rank-display">
            <span className="rank-glow" aria-hidden="true" />
            <span className="rank">{rankName(displayedRank ?? state.currentRank)}</span>
          </span>
        </div>

        {state.status === 'playing' && state.lastPlay?.player === 'ai' && (
          // Ai has an active CLAIM on the table — show the number of cards
          // they JUST PLAYED (their representation), independent of total
          // hand size. Capped by engine's MAX_CLAIM, so always ≤ 4.
          <div className="ai-thinking">
            <div className="ai-thinking-text">
              {state.lastPlay.claimedCount} card{state.lastPlay.claimedCount === 1 ? '' : 's'} face down
            </div>
            <div
              className="ai-thinking-cards"
              style={{ '--count': state.lastPlay.claimedCount }}
            >
              {Array.from({ length: state.lastPlay.claimedCount }).map((_, i) => (
                <div
                  key={i}
                  className="ai-thinking-card"
                  style={{ '--i': i }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        )}
        {state.status === 'playing' && state.turn === 'ai' && !state.lastPlay && (
          <div className="ai-thinking">
            <div className="ai-thinking-text">Thinking…</div>
          </div>
        )}

        <div className="pile-display">
          <div className="pile-stack">
            {pileSize > 0 ? (
              <CardBack label={`PILE × ${pileSize}`} />
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Empty pile</div>
            )}
          </div>
        </div>

        {banner && (
          <div className={`play-banner ${banner.kind}`}>
            <span className="play-banner-text">{banner.title}</span>
          </div>
        )}

        {playerMustRespond && (
          <>
            <div className="center-actions">
              <button className="primary" onClick={handleAccept}>
                ✅ Accept
              </button>
              <button className="danger" onClick={handleChallenge}>
                🎲 Prove it!
              </button>
              <button
                className={showOdds ? 'active' : ''}
                onClick={() => setShowOdds((v) => !v)}
                title="Toggle the Ai bluff probability analyzer"
              >
                {showOdds ? '🔍 Hide odds' : '🔍 Bluff odds'}
              </button>
            </div>
            {showOdds && <BluffOddsBadge estimate={bluffEstimate} />}
          </>
        )}
      </div>

      {/* Player area */}
      <div className="player-area">
        <h3>Your hand ({state.playerHand.length})</h3>
        <div className="hand">
          {state.playerHand.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              onClick={() => toggleCard(card)}
              disabled={!playerCanPlay || tossingIds.size > 0}
              pairColor={pairMap[card.rank]}
              tossing={tossingIds.has(card.id)}
            />
          ))}
        </div>

        {playerCanPlay && (
          <div className="claim-panel">
            <span className="claim-summary">
              {selectedIds.size > 0
                ? `Claim: ${formatClaim(selectedIds.size, state.currentRank)}`
                : `Select 1-4 cards. You'll claim them as ${rankName(state.currentRank, true)}.`}
            </span>
            <button
              className="primary"
              disabled={selectedIds.size === 0}
              onClick={handlePlay}
            >
              Play & Claim
            </button>
            {actions.pass && (
              <button
                className="secondary"
                onClick={handlePass}
                title={
                  deckLeft > 0
                    ? `Skip your turn — draw 1 card from the deck (${deckLeft} left).`
                    : 'Skip your turn — the deck is empty so you draw nothing.'
                }
              >
                ⏭️ Pass
              </button>
            )}
          </div>
        )}
      </div>
      </div> {/* /table-main */}

      <Scoreboard state={state} />
    </div>
  );
}
