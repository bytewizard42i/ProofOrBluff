import { useCallback, useEffect, useRef, useState } from 'react';
import {
  playYouCaughtAi,
  playYouGotCaught,
  playYouSurvivedChallenge,
  playYouMisCalled,
  playGameWon,
  playGameLost,
} from '../../sounds.js';
import { speak, cancelSpeech, isSpeaking } from '../../speech.js';
import { LOG, logSaysPlayerLost } from './GameLog.jsx';

// How long each new log line stays as "the latest" before the next one
// is revealed. Gives the reader a beat to absorb each event.
export const LOG_REVEAL_INTERVAL_MS = 1300;

/**
 * Everything that makes the table *feel* alive, independent of which engine
 * is producing state: staggered log reveal, the lagging displayed rank,
 * narration, outcome sounds, and the result banner. Both the local demo
 * engine and the Midnight-backed match drive this hook with their own
 * `state` (same shape, see tableAdapter) and get identical presentation.
 *
 * Returns the bits the table and the turn driver need:
 *   { banner, displayedRank, visibleLogCount, totalLogCount, speechBusy,
 *     outputComplete, skipFutureOutcomeSounds, resetForNewGame }
 */
export function usePresentation(state) {
  // Rank shown to the player. Lags state.currentRank until the log has
  // finished revealing every queued entry, so the player can read what
  // happened before the rank updates.
  const [displayedRank, setDisplayedRank] = useState(null);

  // Poll the TTS engine 5x/sec so we can gate the Ai turn until the
  // narrator finishes reading the previous outcome aloud.
  const [speechBusy, setSpeechBusy] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setSpeechBusy(isSpeaking()), 200);
    return () => clearInterval(id);
  }, []);

  // Tracks the last log index we played a sound for, so each newly
  // revealed entry triggers its outcome cue exactly once.
  const lastSoundedRef = useRef(0);

  // Remembers the most recent state.lastPlay even after the engine clears
  // it, so we can tell whether an "AI accepted" event came after a bluff
  // or an honest play (the cards aren't preserved anywhere else once the
  // pile absorbs them).
  const lastPlayRef = useRef(null);
  useEffect(() => {
    if (state?.lastPlay) lastPlayRef.current = state.lastPlay;
  }, [state?.lastPlay]);

  // Big result banner shown below the pile after a play resolves.
  // Auto-clears after a few seconds so it doesn't linger into the next play.
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  // ── Staggered log reveal ──
  // The engine pushes new entries onto state.log synchronously, but we want
  // the player to see them appear one at a time so each event has a beat
  // to be read. We track how many entries are currently "visible" and
  // advance one per LOG_REVEAL_INTERVAL_MS until caught up.
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const totalLogCount = state?.log?.length ?? 0;

  useEffect(() => {
    if (visibleLogCount >= totalLogCount) return;
    const t = setTimeout(() => {
      setVisibleLogCount((n) => Math.min(n + 1, totalLogCount));
    }, LOG_REVEAL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [visibleLogCount, totalLogCount]);

  // Reset visible count whenever a brand-new game starts.
  useEffect(() => {
    if (totalLogCount === 0) setVisibleLogCount(0);
  }, [totalLogCount]);

  // Sync the displayed rank to the live rank, but only once the log has
  // finished revealing all queued entries. This way the rank doesn't visibly
  // change until the player has had a chance to read what happened.
  useEffect(() => {
    if (!state) return;
    if (visibleLogCount >= totalLogCount && state.currentRank !== displayedRank) {
      setDisplayedRank(state.currentRank);
    }
  }, [state, visibleLogCount, totalLogCount, displayedRank]);

  // Narrate each newly revealed log entry in the British female voice.
  // Uses its own cursor so it never races the sound watcher below.
  const lastSpokenRef = useRef(0);
  useEffect(() => {
    if (!state) return;
    while (lastSpokenRef.current < visibleLogCount) {
      const entry = state.log[lastSpokenRef.current];
      lastSpokenRef.current += 1;
      if (entry && !entry.startsWith(LOG.WARN)) speak(entry);
    }
  }, [visibleLogCount, state]);

  // Reset narration cursor on new game.
  useEffect(() => {
    if (totalLogCount === 0) {
      lastSpokenRef.current = 0;
      cancelSpeech();
    }
  }, [totalLogCount]);

  // Play casino sound effects + set the result banner as outcome log
  // entries reveal. We diff against the previous reveal count so each
  // line fires at most once.
  useEffect(() => {
    if (!state) return;
    while (lastSoundedRef.current < visibleLogCount) {
      const entry = state.log[lastSoundedRef.current];
      lastSoundedRef.current += 1;
      if (!entry) continue;

      // Bluffer caught: bluffer pays the penalty.
      if (entry.startsWith(LOG.CAUGHT_BLUFFING)) {
        if (logSaysPlayerLost(entry)) {
          playYouGotCaught();
          setBanner({ kind: 'bad', title: 'Your bluff was called!' });
        } else {
          playYouCaughtAi();
          setBanner({ kind: 'good', title: 'The Ai was bluffing!' });
        }
      } else if (entry.startsWith(LOG.CHALLENGE_FAILED)) {
        // Challenger was wrong (the claim was true).
        if (logSaysPlayerLost(entry)) {
          // You challenged a true Ai claim.
          playYouMisCalled();
          setBanner({ kind: 'bad', title: 'The Ai was telling the truth!' });
        } else {
          // AI challenged your honest claim and lost.
          playYouSurvivedChallenge();
          setBanner({ kind: 'good', title: 'Your honesty paid off!' });
        }
      } else if (entry.startsWith(LOG.YOU_WIN)) {
        playGameWon();
        setBanner({ kind: 'win', title: 'Game won!' });
      } else if (entry.startsWith(LOG.AI_WINS)) {
        playGameLost();
        setBanner({ kind: 'loss', title: 'The Ai cleaned house.' });
      } else if (entry.startsWith(LOG.AI_ACCEPTED)) {
        // No challenge — judge whether the player's last play was a bluff.
        const last = lastPlayRef.current;
        if (last && last.player === 'player' && Array.isArray(last.cards) && last.cards.length > 0) {
          const wasBluff = last.cards.some((c) => c.rank !== last.claimedRank);
          if (wasBluff) {
            setBanner({ kind: 'good', title: 'Your bluff succeeded!' });
          } else {
            setBanner({ kind: 'good', title: 'Honest play — accepted.' });
          }
        }
      }
    }
  }, [visibleLogCount, state]);

  // Reset the sound cursor when a new game begins.
  useEffect(() => {
    if (totalLogCount === 0) lastSoundedRef.current = 0;
  }, [totalLogCount]);

  // Fast-forward the outcome-sound cursor past the entries that the
  // GameTable just played manually (after a player challenge). Without
  // this the staggered log-reveal would re-trigger the same SFX a few
  // seconds later.
  const skipFutureOutcomeSounds = useCallback((upToIndex) => {
    if (typeof upToIndex === 'number') {
      lastSoundedRef.current = Math.max(lastSoundedRef.current, upToIndex);
    }
  }, []);

  // Call when a fresh game/match state is installed so cursors and the
  // displayed rank start from the new game's opening rank.
  const resetForNewGame = useCallback((freshState) => {
    lastSoundedRef.current = 0;
    lastSpokenRef.current = 0;
    setVisibleLogCount(0);
    setBanner(null);
    setDisplayedRank(freshState?.currentRank ?? null);
  }, []);

  const outputComplete = visibleLogCount >= totalLogCount && !speechBusy && !banner;

  return {
    banner,
    displayedRank,
    visibleLogCount,
    totalLogCount,
    speechBusy,
    outputComplete,
    skipFutureOutcomeSounds,
    resetForNewGame,
  };
}
