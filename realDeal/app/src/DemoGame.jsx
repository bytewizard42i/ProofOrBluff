import React, { useCallback, useEffect, useState } from 'react';
import { unlockAudio, startBackgroundMusic } from './sounds.js';
import { speak } from './speech.js';
import {
  initGame,
  playCards,
  acceptClaim,
  challenge,
  passTurn,
} from './game/engine.js';
import {
  decidePlay,
  decideChallenge,
  getChallengeReaction,
} from './game/ai/scripted.js';
import {
  GameTable,
  GameLogPanel,
  Menu,
  Tutorial,
  ResultOverlay,
  usePresentation,
} from './components/table/index.js';

// localStorage key used to remember whether the player has dismissed the
// tutorial at least once, so we don't pop it up every visit.
const TUTORIAL_KEY = 'pob.tutorialSeen.v1';

/**
 * Pick a delay (ms) for an Ai play. Confident truthful plays come back
 * fast; bluffs more often pause to "think." Either branch sometimes picks
 * the opposite range so the timing itself can be a misdirection.
 */
function pickAiPlayDelay(isBluff) {
  // 30% chance the Ai chooses a deceptive timing (fast-when-bluffing or
  // slow-when-honest) to keep the player guessing.
  const flip = Math.random() < 0.3;
  const slow = (isBluff && !flip) || (!isBluff && flip);
  if (slow) return 1500 + Math.random() * 1400; // 1.5 – 2.9s
  return 300 + Math.random() * 600;             // 0.3 – 0.9s
}

/**
 * Pick a delay (ms) for an Ai accept/challenge decision. We don't get the
 * decision until we call decideChallenge, so we use a generic spread:
 * sometimes snappy (instinct), sometimes deliberate.
 */
function pickAiDecisionDelay() {
  const r = Math.random();
  if (r < 0.35) return 250 + Math.random() * 500;   // snap reaction
  if (r < 0.75) return 900 + Math.random() * 700;   // moderate
  return 1800 + Math.random() * 1200;               // up to ~3s, "deliberation"
}

/**
 * The local-state game (demoLand): the scripted Ai and the in-browser
 * engine drive the shared GameTable. No wallet, no chain. This is the
 * instant "Play now" surface and the visual reference for the Midnight
 * table, which renders the same components from on-chain state.
 */
export default function DemoGame({ audio, onScreenChange, menuRequest = 0 }) {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'game'
  const [settings, setSettings] = useState({ mode: 'home', difficulty: 'medium' });
  const [state, setState] = useState(null);
  const [aiDialogue, setAiDialogue] = useState('');
  // Show the tutorial automatically the first time a visitor lands on the
  // menu. They can Skip; either way we set the flag and won't show it again.
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return typeof window !== 'undefined' && !window.localStorage.getItem(TUTORIAL_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      /* localStorage unavailable — just don't persist */
    }
  }, []);

  const presentation = usePresentation(state);
  const {
    banner, displayedRank, visibleLogCount, totalLogCount, speechBusy,
    outputComplete, skipFutureOutcomeSounds, resetForNewGame,
  } = presentation;

  const handleStart = useCallback((cfg) => {
    unlockAudio(); // user gesture — primes the AudioContext
    startBackgroundMusic();
    setSettings(cfg);
    const fresh = initGame(cfg.mode);
    setState(fresh);
    resetForNewGame(fresh);
    setScreen('game');
    setAiDialogue('');
  }, [resetForNewGame]);

  const handleRematch = useCallback(() => {
    const fresh = initGame(settings.mode);
    setState(fresh);
    resetForNewGame(fresh);
    setAiDialogue('');
  }, [settings.mode, resetForNewGame]);

  const handleMenu = useCallback(() => {
    setScreen('menu');
    setState(null);
    setAiDialogue('');
  }, []);

  // The header's "← Menu" button lives outside this component; the parent
  // bumps `menuRequest` to ask us to return to the menu.
  useEffect(() => { if (menuRequest > 0) handleMenu(); }, [menuRequest, handleMenu]);

  // ── Table actions (local engine) ──
  const actions = {
    play: ({ cards }) => {
      const result = playCards(state, {
        cardsPlayed: cards,
        claimedRank: state.currentRank,
        claimedCount: cards.length,
        player: 'player',
      });
      if (result.error) {
        setState({ ...state, log: [...state.log, `⚠️ ${result.error}`] });
        return;
      }
      setState(result.state);
    },
    accept: () => {
      const result = acceptClaim(state);
      if (!result.error) setState(result.state);
    },
    pass: () => {
      const result = passTurn(state, { player: 'player' });
      if (!result.error) setState(result.state);
    },
    challenge: () => {
      const result = challenge(state);
      if (result.error) return undefined;
      setState(result.state);
      return {
        claimWasTrue: result.challengeResult.claimWasTrue,
        logLength: result.state.log.length,
      };
    },
  };

  // ── Drive Ai turns ──
  useEffect(() => {
    if (!state || state.status !== 'playing') return;
    if (state.turn !== 'ai') return;
    // Hold off on Ai's next action until:
    //  (a) every queued log entry has finished revealing,
    //  (b) the narrator has finished reading them aloud,
    //  (c) the big result banner has cleared (auto-fades after 3.5s).
    // This way the entire previous turn's output finishes before the
    // next one begins.
    if (visibleLogCount < totalLogCount) return;
    if (speechBusy) return;
    if (banner) return;

    // Case A: Ai must decide accept/challenge of player's claim.
    // Variable delay 0.25–3.0s simulates instinct / deliberation.
    if (state.lastPlay && state.lastPlay.player === 'player') {
      const delay = pickAiDecisionDelay();
      const t = setTimeout(() => {
        const decision = decideChallenge({
          playerClaimedRank: state.lastPlay.claimedRank,
          playerClaimedCount: state.lastPlay.claimedCount,
          aiHand: state.aiHand,
          difficulty: settings.difficulty,
          mode: settings.mode,
        });
        setAiDialogue(decision.dialogue);
        if (decision.shouldChallenge) {
          // Announce the challenge BEFORE committing it, so the dealer
          // says "the Ai is challenging your claim" first and the
          // outcome lines stream in behind it.
          speak('The Ai is challenging your claim.');
          const result = challenge(state);
          // Give the Ai a follow-up reaction after the resolution
          setTimeout(() => {
            const reaction = getChallengeReaction({
              aiWasChallenger: true,
              claimWasTrue: result.challengeResult.claimWasTrue,
            });
            setAiDialogue(reaction);
          }, 900);
          setState(result.state);
        } else {
          const result = acceptClaim(state);
          setState(result.state);
        }
      }, delay);
      return () => clearTimeout(t);
    }

    // Case B: Ai's turn to play cards (no pending lastPlay).
    // Decide first so we can pick a delay that reflects (or sometimes
    // deliberately misleads about) whether the Ai is bluffing.
    if (!state.lastPlay) {
      const play = decidePlay({
        aiHand: state.aiHand,
        requiredRank: state.currentRank,
        difficulty: settings.difficulty,
        mode: settings.mode,
      });
      const cardsToPlay = play.cardsToPlay.length > 0 ? play.cardsToPlay : state.aiHand.slice(0, 1);
      if (cardsToPlay.length === 0) return; // Should never happen given win check
      const delay = pickAiPlayDelay(play.isBluff);
      const t = setTimeout(() => {
        setAiDialogue(play.dialogue);
        const result = playCards(state, {
          cardsPlayed: cardsToPlay,
          claimedRank: state.currentRank,
          claimedCount: cardsToPlay.length,
          player: 'ai',
        });
        if (result.state) setState(result.state);
      }, delay);
      return () => clearTimeout(t);
    }
  }, [state, settings.difficulty, settings.mode, visibleLogCount, totalLogCount, speechBusy, banner]);

  return (
    <>
      {showTutorial && <Tutorial onClose={dismissTutorial} />}
      {screen === 'menu' && (
        <Menu onStart={handleStart} onShowHelp={() => setShowTutorial(true)} />
      )}
      {screen === 'game' && state && (
        <>
          <div className="play-area">
            <GameLogPanel
              log={state.log}
              visibleCount={visibleLogCount}
              narrationMuted={audio.narrationMuted}
              narrationVolume={audio.narrationVolume}
              onToggleNarration={() => audio.setNarrationMuted((m) => !m)}
              onNarrationVolume={audio.setNarrationVolume}
            />
            <GameTable
              state={state}
              settings={settings}
              actions={actions}
              aiDialogue={aiDialogue}
              setAiDialogue={setAiDialogue}
              displayedRank={displayedRank}
              banner={banner}
              skipFutureOutcomeSounds={skipFutureOutcomeSounds}
              outputComplete={outputComplete}
              onQuit={handleMenu}
            />
          </div>
          {state.status === 'gameover' && (
            <ResultOverlay
              winner={state.winner}
              onRematch={handleRematch}
              onMenu={handleMenu}
            />
          )}
        </>
      )}
    </>
  );
}

export { TUTORIAL_KEY };
