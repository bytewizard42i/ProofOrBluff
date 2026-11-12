import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unlockAudio, startBackgroundMusic, playWinBells, playEvilLaugh, playShuffle } from './sounds.js';
import { HandCelebration, HandTransition, handWinner } from './HandEffects.jsx';
import { speak } from './speech.js';
import {
  GameTable,
  GameLogPanel,
  Menu,
  Tutorial,
  ResultOverlay,
  usePresentation,
} from './components/table/index.js';
import { SponsoredGameProvider } from './providers/sponsored/sponsoredProvider.js';
import { SPONSORED_API_URL } from './midnight/config.js';
import { TUTORIAL_KEY } from './DemoGame.jsx';

// Menu modes → contract modes (0 Casual, 1 Standard, 4 Casino). The Menu
// offers home/casino; "home" is the 7-card race to 15.
const MENU_MODE_TO_CONTRACT = { home: 1, casino: 4 };
const RECEIPT_POLL_MS = 6000;

/**
 * Short, honest status for the chain strip: what has actually landed on
 * Midnight for this game, and what is still being proven in the background.
 */
export function chainStatusLine(chain) {
  if (!chain) return '';
  if (!chain.deployed) return 'Deploying your game contract on Midnight…';
  if (chain.closed) return `Game sealed on Midnight — ${chain.roundsProven} round proof${chain.roundsProven === 1 ? '' : 's'} + final result.`;
  const pendingRounds = chain.pending.filter((p) => p.startsWith('proveRound')).length;
  if (pendingRounds > 0) return `Proving ${chain.label} (${pendingRounds} in the queue)…`;
  return `Contract live · ${chain.label}.`;
}

function explorerHref(network, contractAddress) {
  if (!contractAddress) return null;
  return network === 'mainnet'
    ? `https://explorer.midnight.network/contracts/${contractAddress}`
    : `https://explorer.${network}.midnight.network/contracts/${contractAddress}`;
}

/**
 * The sponsored table: same GameTable as the demo, but every action goes to
 * api.prooforbluff.app, which plays the bot and proves rounds on Midnight in
 * the background from the operator wallet. The player needs no wallet.
 */
export default function SponsoredGame({ audio, onScreenChange, menuRequest = 0 }) {
  const provider = useMemo(() => new SponsoredGameProvider({ baseUrl: SPONSORED_API_URL }), []);
  const [screen, setScreen] = useState('menu');
  const [settings, setSettings] = useState({ mode: 'home', difficulty: 'medium' });
  const [state, setState] = useState(null);
  const [aiDialogue, setAiDialogue] = useState('');
  const [chain, setChain] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return typeof window !== 'undefined' && !window.localStorage.getItem(TUTORIAL_KEY); } catch { return true; }
  });
  const busyRef = useRef(false);
  // Hand celebration + curtain transition for the Original table. Same
  // keyed-once pattern as 5 Up 2 Down: receipt polling re-sets `state` every
  // 6 s, so each visual fires only once per game/round key.
  const [celebration, setCelebration] = useState(null);
  const [handTransition, setHandTransition] = useState(null);
  // Scores at the start of the current hand — handWinner diffs these against
  // roundSummary.scores to decide who took the hand (same pattern as 5U2D).
  const roundStartScoresRef = useRef({ human: 0, bot: 0 });
  const celebratedRef = useRef('');
  const transitionTimerRef = useRef(null);

  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);
  useEffect(() => provider.subscribe((s) => { setState(s); setChain(provider.chain); setAiDialogue(provider.aiDialogue); }), [provider]);

  // Hand celebration, fired ONCE per finished hand (keyed — receipt polling
  // re-sets `state` every 6 s and must not retrigger it). A held finished
  // round celebrates by score gain; roundStartScoresRef keeps the scores the
  // hand started with, so it must NOT be updated while awaitingNext.
  useEffect(() => {
    if (!state) return;
    if (state.awaitingNext && state.roundSummary) {
      const key = `${state.gameId}:r${state.roundSummary.round}`;
      if (key === celebratedRef.current) return;
      celebratedRef.current = key;
      const kind = handWinner(roundStartScoresRef.current, {
        human: state.roundSummary.scores.human, bot: state.roundSummary.scores.bot,
      });
      if (kind) {
        setCelebration({ kind, key });
        if (kind === 'human') playWinBells(); else playEvilLaugh();
      }
      return;
    }
    roundStartScoresRef.current = { human: state.scores.player, bot: state.scores.ai };
  }, [state]);

  // Game-end celebration, once per game. The player's win/lose sound already
  // fires through usePresentation on the YOU_WIN/AI_WINS log lines — here we
  // only add the Ai's evil laugh for a bot win.
  useEffect(() => {
    if (!state || state.status !== 'gameover') return;
    if (state.winner !== 'player' && state.winner !== 'ai') return;
    const key = `${state.gameId}:end`;
    if (celebratedRef.current === key) return;
    celebratedRef.current = key;
    setCelebration({ kind: state.winner === 'player' ? 'human' : 'bot', key });
    if (state.winner === 'ai') playEvilLaugh();
  }, [state]);

  // The celebration clears itself; handleMenu also clears it early.
  useEffect(() => {
    if (!celebration) return undefined;
    const t = setTimeout(() => setCelebration(null), 4000);
    return () => clearTimeout(t);
  }, [celebration]);

  // Unmount: don't leave the curtain timer running.
  useEffect(() => () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try { window.localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const presentation = usePresentation(state);
  const {
    banner, displayedRank, visibleLogCount, totalLogCount, speechBusy,
    outputComplete, skipFutureOutcomeSounds, resetForNewGame,
  } = presentation;

  // Wrap a provider call: one in flight at a time, surface service errors.
  const run = useCallback(async (fn) => {
    if (busyRef.current) return undefined;
    busyRef.current = true; setBusy(true); setServiceError(null);
    try { return await fn(); }
    catch (error) {
      setServiceError(error.status === 503 || error.status === 502 || error.status === 0 ? 'The Midnight table is paused right now (the house is topping up DUST). Try again in a minute, or play the instant demo.' : error.message);
      return undefined;
    } finally { busyRef.current = false; setBusy(false); }
  }, []);

  const handleStart = useCallback((cfg) => {
    unlockAudio();
    startBackgroundMusic();
    setSettings(cfg);
    run(async () => {
      const fresh = await provider.startGame({ mode: MENU_MODE_TO_CONTRACT[cfg.mode] ?? 1, difficulty: cfg.difficulty });
      resetForNewGame(fresh);
      roundStartScoresRef.current = { human: 0, bot: 0 };
      celebratedRef.current = '';
      setCelebration(null); setHandTransition(null);
      setScreen('game');
    });
  }, [provider, resetForNewGame, run]);

  const handleRematch = useCallback(() => {
    run(async () => {
      const fresh = await provider.startGame({ mode: MENU_MODE_TO_CONTRACT[settings.mode] ?? 1, difficulty: settings.difficulty });
      resetForNewGame(fresh);
      roundStartScoresRef.current = { human: 0, bot: 0 };
      celebratedRef.current = '';
      setCelebration(null); setHandTransition(null);
    });
  }, [provider, settings, resetForNewGame, run]);

  const handleMenu = useCallback(() => {
    setScreen('menu');
    provider.resetGame();
    setState(null); setChain(null); setAiDialogue('');
    // Drop any in-flight celebration/curtain and forget round/game keys so a
    // rematch doesn't inherit stale state (gameId differs anyway, but tidy).
    setCelebration(null); setHandTransition(null);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    celebratedRef.current = ''; roundStartScoresRef.current = { human: 0, bot: 0 };
  }, [provider]);

  useEffect(() => { if (menuRequest > 0) handleMenu(); }, [menuRequest, handleMenu]);

  // Quit: tell the service to drop the game (unstarted proofs are cancelled,
  // nothing is saved), then back to the menu. Resolves even if the service
  // is unreachable — the server's idle sweeper is the backstop.
  const handleQuit = useCallback(() => {
    run(async () => { await provider.abandonGame(); handleMenu(); });
  }, [provider, handleMenu, run]);

  // Tab closed / navigated away / refreshed mid-game: beacon the abandon so
  // the table is shut down like a failed transaction. pagehide fires on
  // every unload path (including bfcache) where beforeunload does not.
  useEffect(() => {
    if (screen !== 'game') return undefined;
    const onHide = () => { provider.beaconAbandon(); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [screen, provider]);

  // A game id left in storage from a previous visit is a dead game (no
  // saved games for now): abandon it server-side so it doesn't idle out.
  useEffect(() => {
    if (provider.activeGameId && !provider.getView()) provider.abandonGame().catch(() => {});
  }, [provider]);

  // Receipts land asynchronously; poll while anything is pending so the
  // chain strip ticks from "deploying" → "round 2/3 proven" → "sealed".
  useEffect(() => {
    if (screen !== 'game' || !chain || chain.pending.length === 0) return undefined;
    const t = setInterval(() => { provider.refresh().catch(() => {}); }, RECEIPT_POLL_MS);
    return () => clearInterval(t);
  }, [screen, chain, provider]);

  // The bot's challenge is announced by the dealer just like the demo does.
  // The server keeps lastEvents until the next human action, and receipt
  // polling re-returns them — so announce each distinct event set only once,
  // keyed on its content signature (prevents the same challenge re-speaking
  // on every poll).
  const announcedEventsRef = useRef('');
  useEffect(() => {
    const lastEvents = provider.getView()?.lastEvents ?? [];
    const signature = JSON.stringify(lastEvents.map((e) => [e.type, e.truthful, e.revealed, e.dialogue]));
    if (signature === announcedEventsRef.current) return;
    announcedEventsRef.current = signature;
    if (lastEvents.some((e) => e.type === 'bot-challenge')) speak('The Ai is challenging your claim.');
  }, [state, provider]);

  const actions = {
    play: ({ cards }) => { run(() => provider.makePlay({ cards })); },
    accept: () => { run(() => provider.accept()); },
    challenge: () => run(() => provider.challenge()),
  };

  // Next hand: the ONLY way a new round starts now that finished hands are
  // held. The deal is instant server-side, so we await it first — the
  // returned table state already knows whose turn opens the hand, which the
  // curtain labels — then hold the curtains ~1.1 s like 5U2D does.
  const nextHand = () => run(async () => {
    const round = (state?.round ?? 0) + 1;
    setCelebration(null); playShuffle();
    const result = await provider.nextHand();
    setHandTransition({ round, phase: 'in', turn: result?.turn ?? null, sub: 'Fresh hands.' });
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setHandTransition((t) => (t ? { ...t, phase: 'out' } : t));
      setTimeout(() => setHandTransition(null), 450);
    }, 1100);
  });

  const explorer = chain ? explorerHref(chain.network, chain.contractAddress) : null;

  return (
    <>
      {celebration && <HandCelebration key={celebration.key} kind={celebration.kind} />}
      {handTransition && <HandTransition {...handTransition} />}
      {showTutorial && <Tutorial variant="midnight" contractVersion={state?.contractVersion ?? 'v3p'} onClose={dismissTutorial} />}
      {screen === 'menu' && (
        <>
          <Menu onStart={handleStart} onShowHelp={() => setShowTutorial(true)} switchGame={{ href: '/fiveup', label: 'Try 5 Up 2 Down →' }} />
          {serviceError && <p className="service-error" role="alert">{serviceError}</p>}
          {busy && <p className="service-busy">Dealing you in on Midnight…</p>}
        </>
      )}
      {screen === 'game' && state && (
        <>
          <div className="chain-strip" aria-live="polite">
            <span className="chain-dot" data-state={chain?.closed ? 'closed' : chain?.deployed ? 'live' : 'pending'} />
            <span>{chainStatusLine(chain)}</span>
            {explorer && (
              <a href={explorer} target="_blank" rel="noreferrer" title="View this game's contract on the Midnight explorer">
                contract {chain.contractAddress.slice(0, 8)}…
              </a>
            )}
          </div>
          {serviceError && <p className="service-error" role="alert">{serviceError}</p>}
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
              busy={busy}
              onQuit={handleQuit}
              awaitingNext={!!state.awaitingNext}
              onNextHand={nextHand}
            />
          </div>
          {state.status === 'gameover' && (
            <ResultOverlay
              winner={state.winner}
              onRematch={handleRematch}
              onMenu={handleMenu}
              footnote={chain?.closed
                ? 'Every round of this game was proven on Midnight. Your cards were never on-chain.'
                : 'Your rounds are being proven on Midnight in the background — the receipt strip updates as they land.'}
            />
          )}
        </>
      )}
    </>
  );
}
