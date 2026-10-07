import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unlockAudio, startBackgroundMusic } from './sounds.js';
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

  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);
  useEffect(() => provider.subscribe((s) => { setState(s); setChain(provider.chain); setAiDialogue(provider.aiDialogue); }), [provider]);

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
      setScreen('game');
    });
  }, [provider, resetForNewGame, run]);

  const handleRematch = useCallback(() => {
    run(async () => {
      const fresh = await provider.startGame({ mode: MENU_MODE_TO_CONTRACT[settings.mode] ?? 1, difficulty: settings.difficulty });
      resetForNewGame(fresh);
    });
  }, [provider, settings, resetForNewGame, run]);

  const handleMenu = useCallback(() => {
    setScreen('menu');
    provider.resetGame();
    setState(null); setChain(null); setAiDialogue('');
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
  useEffect(() => {
    const lastEvents = provider.getView()?.lastEvents ?? [];
    if (lastEvents.some((e) => e.type === 'bot-challenge')) speak('The Ai is challenging your claim.');
  }, [state, provider]);

  const actions = {
    play: ({ cards }) => { run(() => provider.makePlay({ cards })); },
    accept: () => { run(() => provider.accept()); },
    challenge: () => run(() => provider.challenge()),
  };

  const explorer = chain ? explorerHref(chain.network, chain.contractAddress) : null;

  return (
    <>
      {showTutorial && <Tutorial onClose={dismissTutorial} />}
      {screen === 'menu' && (
        <>
          <Menu onStart={handleStart} onShowHelp={() => setShowTutorial(true)} />
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
