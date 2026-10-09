import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unlockAudio, startBackgroundMusic } from './sounds.js';
import { speak } from './speech.js';
import { GameLogPanel, ResultOverlay, PlayingCard, LOG } from './components/table/index.js';
import { createSponsoredClient } from './providers/sponsored/client.js';
import { SPONSORED_API_URL } from './midnight/config.js';
import { RANKS } from '../../shared/dealing.js';
import { rankName } from './game/rules.js';
import { chainStatusLine } from './SponsoredGame.jsx';

// 5 Up 2 Down — the second table (docs/FIVE_UP_TWO_DOWN.md). Two private
// cards for you, five face-up on the board; claim your matches, the house
// accepts or calls "Proof or Bluff". Same sponsored service, same wallet-free
// flow; only the table is different, so this screen is self-contained.

const ACTIVE_KEY = 'pob:fiveup:active-game';
const TUTORIAL_KEY = 'pob:fiveup:tutorial-seen';
const RECEIPT_POLL_MS = 6000;
const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];

const card = (rankIndex, i, prefix) => ({ id: `${prefix}:${rankIndex}:${i}`, rank: RANKS[rankIndex], rankIndex, suit: SUITS[(rankIndex + i) % 4] });
const name = (r) => rankName(RANKS[r]);
const names = (ranks) => ranks.map(name).join(' and ');

function summariseChain(view) {
  const c = view?.chain ?? {};
  const receipts = c.receipts ?? [];
  const roundsProven = receipts.filter((r) => r.step === 'proveRound').length;
  // While a finished round is held (awaitingNext) it counts as played.
  const roundsPlayed = (view?.round ?? 1) - (view?.status === 'playing' && !view?.awaitingNext ? 1 : 0);
  return {
    network: c.network ?? null, contractAddress: c.contractAddress ?? null, receipts, pending: c.pending ?? [],
    deployed: receipts.some((r) => r.step === 'deploy'), closed: receipts.some((r) => r.step === 'closeGame'),
    roundsProven, roundsPlayed, label: `round ${roundsProven}/${Math.max(roundsPlayed, roundsProven)} proven`,
  };
}

/** Turn the server's lastEvents into log lines + the newest bot line. */
export function describeEvents(view, events, humanLine) {
  const lines = humanLine ? [humanLine] : [];
  let dialogue = null;
  for (const e of events ?? []) {
    if (e.dialogue) dialogue = e.dialogue;
    switch (e.type) {
      case 'bot-claim':
        lines.push(e.count === 0 ? `${LOG.AI_CLAIMED} no matches.` : `${LOG.AI_CLAIMED} ${e.count} match${e.count > 1 ? 'es' : ''}: ${names(e.ranks)}.`);
        break;
      case 'bot-accept': lines.push(`${LOG.AI_ACCEPTED} your claim.`); break;
      case 'human-pass':
        lines.push('You pass — showdown: the Ai draws two cards against your hand.');
        break;
      case 'bot-pass':
        lines.push('The Ai passes — showdown: you draw two cards against its hand.');
        break;
      case 'showdown': {
        const drawer = e.passer === 'human' ? 'Ai' : 'You';
        lines.push(e.wins === 0
          ? `Showdown — ${drawer} drew ${names(e.draws)}: no wins.`
          : `Showdown — ${drawer} drew ${names(e.draws)}: ${e.wins} win${e.wins > 1 ? 's' : ''}, +${e.wins}.`);
        break;
      }
      case 'bot-challenge':
        lines.push(e.lies === 0
          ? `${LOG.CHALLENGE_FAILED}! Your claim was true — it pays double. ${LOG.AI_LOSES_MARKER_5U2D} for doubting you.`
          : `${LOG.CAUGHT_BLUFFING}! ${e.lies} of your claimed cards ${e.lies > 1 ? 'were lies' : 'was a lie'} — ${LOG.PLAYER_LOSES_MARKER_5U2D} ${e.lies}, Ai +${e.lies}.`);
        break;
      case 'human-challenge':
        lines.push(e.lies === 0
          ? `${LOG.CHALLENGE_FAILED}! The Ai held ${names(e.revealed)} — its claim was true and ${LOG.PLAYER_LOSES_MARKER_5U2D} for it: it scores double.`
          : `${LOG.CAUGHT_BLUFFING}! The Ai held ${names(e.revealed)} — ${e.lies} lie${e.lies > 1 ? 's' : ''}. ${LOG.AI_LOSES_MARKER_5U2D} ${e.lies}, you +${e.lies}.`);
        break;
      case 'round-end':
        lines.push(`Round ${e.round} over — score ${e.scores.human}–${e.scores.bot}. Midnight proves it in the background.`);
        if (view.status === 'playing' && view.round > e.round) lines.push(`Round ${view.round}: new board, new cards.`);
        break;
      case 'game-end':
        lines.push(e.winner === 'human' ? `${LOG.YOU_WIN}! Final score ${view.scores.human}–${view.scores.bot}.`
          : e.winner === 'bot' ? `${LOG.AI_WINS}! Final score ${view.scores.human}–${view.scores.bot}.`
            : `Draw. Final score ${view.scores.human}–${view.scores.bot}.`);
        break;
      default: break;
    }
  }
  return { lines, dialogue };
}

function FiveUpTutorial({ onClose }) {
  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <div className="tutorial-card">
        <h2>5 Up 2 Down — how to play</h2>
        <p className="subtitle">Two down. Five up. Prove it.</p>
        <ol>
          <li><strong>Two cards for you, five on the board.</strong> All nine come from one shared 52-card deck, dealt inside a zero-knowledge proof.</li>
          <li><strong>A match</strong> is one of your cards sharing a rank with a board card. Two Kings in hand against one on the board = two matches.</li>
          <li><strong>Claim your matches</strong> — tap the board cards you say you hold (0, 1 or 2). Lie if you dare.</li>
          <li><strong>Accepted:</strong> 1 match = +1 · 2 matches = +3.</li>
          <li><strong>Challenged and true:</strong> +2 · +4. <strong>Challenged with a lie:</strong> you lose 1 per lie, they gain it — and the true card earns nothing.</li>
          <li><strong>Nothing to claim?</strong> Press <strong>Pass</strong>: your opponent draws two cards, each that beats your same-position card scores them +1. You lose nothing.</li>
          <li><strong>Race to 20</strong> (Casual: 10). Scores never go below 0. The finished hand stays on the table until you press Next hand.</li>
          <li>Your cards never leave the proof. A challenge reveals only how many claims were lies.</li>
        </ol>
        <div className="tutorial-actions"><button className="primary" onClick={onClose}>Deal me in</button></div>
      </div>
    </div>
  );
}

export default function FiveUpGame({ audio, onScreenChange, menuRequest = 0 }) {
  const client = useMemo(() => createSponsoredClient({ baseUrl: SPONSORED_API_URL }), []);
  const [screen, setScreen] = useState('menu');
  const [settings, setSettings] = useState({ mode: 1, difficulty: 'medium' });
  const [view, setView] = useState(null);
  const [log, setLog] = useState([]);
  const [dialogue, setDialogue] = useState('');
  const [picked, setPicked] = useState([]);          // board indices (0..4) the human is claiming
  const [busy, setBusy] = useState(false);
  const [quitArmed, setQuitArmed] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(() => { try { return !window.localStorage.getItem(TUTORIAL_KEY); } catch { return true; } });
  const busyRef = useRef(false);
  const gameIdRef = useRef(null);
  const announcedRef = useRef('');

  useEffect(() => { onScreenChange?.(screen); }, [screen, onScreenChange]);
  const dismissTutorial = useCallback(() => { setShowTutorial(false); try { window.localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ } }, []);

  const absorb = useCallback((v, humanLine = null) => {
    const { lines, dialogue: d } = describeEvents(v, v.lastEvents, humanLine);
    setView(v); setPicked([]);
    if (lines.length) setLog((l) => [...l, ...lines]);
    if (d) setDialogue(d); else if (humanLine) setDialogue('');
    return v;
  }, []);

  const run = useCallback(async (fn) => {
    if (busyRef.current) return undefined;
    busyRef.current = true; setBusy(true); setServiceError(null);
    try { return await fn(); } catch (error) {
      setServiceError(error.status === 503 || error.status === 502 || error.status === 0
        ? 'The Midnight table is paused right now (the house is topping up DUST). Try again in a minute.' : error.message);
      return undefined;
    } finally { busyRef.current = false; setBusy(false); }
  }, []);

  const start = useCallback((cfg) => {
    unlockAudio(); startBackgroundMusic();
    setSettings(cfg);
    run(async () => {
      const v = await client.createGame({ game: 'fiveup', mode: cfg.mode, difficulty: cfg.difficulty });
      gameIdRef.current = v.gameId;
      try { window.localStorage.setItem(ACTIVE_KEY, v.gameId); } catch { /* ignore */ }
      setLog([`Game started: race to ${v.target}. Two cards for you, five on the board. Midnight is deploying the game contract in the background.`]);
      setDialogue(''); setQuitArmed(false);
      absorb(v);
      setScreen('game');
    });
  }, [client, run, absorb]);

  const toMenu = useCallback(() => { setScreen('menu'); setView(null); setLog([]); setDialogue(''); gameIdRef.current = null; try { window.localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ } }, []);
  useEffect(() => { if (menuRequest > 0) toMenu(); }, [menuRequest, toMenu]);

  const quit = useCallback(() => {
    if (!quitArmed) { setQuitArmed(true); setTimeout(() => setQuitArmed(false), 4000); return; }
    run(async () => { try { await client.abandon(gameIdRef.current); } catch { /* sweeper is the backstop */ } toMenu(); });
  }, [quitArmed, client, run, toMenu]);

  // Tab closed mid-game → beacon the abandon (same as Original).
  useEffect(() => {
    if (screen !== 'game') return undefined;
    const onHide = () => {
      const id = gameIdRef.current; if (!id || view?.status !== 'playing') return;
      const url = client.abandonUrl(id);
      try { if (!navigator.sendBeacon?.(url, '')) fetch(url, { method: 'POST', keepalive: true }).catch(() => {}); } catch { /* best effort */ }
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [screen, client, view]);
  // A stale id from a previous visit is a dead game: abandon it quietly.
  useEffect(() => { try { const id = window.localStorage.getItem(ACTIVE_KEY); if (id) { client.abandon(id).catch(() => {}); window.localStorage.removeItem(ACTIVE_KEY); } } catch { /* ignore */ } }, [client]);

  const chain = useMemo(() => summariseChain(view), [view]);
  useEffect(() => {
    if (screen !== 'game' || !gameIdRef.current || chain.pending.length === 0) return undefined;
    const t = setInterval(() => { client.getGame(gameIdRef.current).then((v) => setView(v)).catch(() => {}); }, RECEIPT_POLL_MS);
    return () => clearInterval(t);
  }, [screen, chain.pending.length, client]);

  // Dealer voice for the bot's challenge — once per distinct event set.
  useEffect(() => {
    const ev = view?.lastEvents ?? [];
    const sig = JSON.stringify(ev.map((e) => [e.type, e.lies, e.count, e.ranks]));
    if (sig === announcedRef.current) return;
    announcedRef.current = sig;
    if (ev.some((e) => e.type === 'bot-challenge')) speak('The Ai is calling your bluff.');
  }, [view]);

  const live = view?.status === 'playing';
  const myTurn = live && view.turn === 'human';
  const claiming = myTurn && view.step === 'claim';
  const responding = myTurn && view.step === 'respond';
  const awaitingNext = live && view.awaitingNext;
  const board = view?.board ?? [];
  const hole = view?.hole ?? [];
  // myMatches is only populated while a round is live; during the round-end
  // hold the held cards are still shown, so compute it from what we display.
  const displayMatches = view?.myMatches?.length ? view.myMatches : hole.filter((r) => board.includes(r));
  const summary = view?.roundSummary;
  const pickedRanks = picked.map((i) => board[i]);

  const togglePick = (i) => {
    if (!claiming || busy) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < 2 ? [...p, i] : p));
  };
  const submitClaim = () => run(async () => {
    const v = await client.claim(gameIdRef.current, { count: pickedRanks.length, ranks: pickedRanks });
    absorb(v, `${LOG.YOU_CLAIMED} ${pickedRanks.length} match${pickedRanks.length > 1 ? 'es' : ''}: ${names(pickedRanks)}.`);
  });
  const pass = () => run(async () => absorb(await client.pass(gameIdRef.current), 'You pass.'));
  const nextHand = () => run(async () => absorb(await client.next(gameIdRef.current), `Round ${(view?.round ?? 0) + 1}: new board, new cards.`));
  const accept = () => run(async () => absorb(await client.accept(gameIdRef.current), `${LOG.YOU_ACCEPTED} the Ai's claim.`));
  const challenge = () => run(async () => absorb(await client.challenge(gameIdRef.current), 'Proof or Bluff! You challenge the Ai.'));

  const winner = view?.winner === 'human' ? 'player' : view?.winner === 'bot' ? 'ai' : view?.winner === 'draw' ? 'draw' : null;
  const pendingText = view?.pending && view.pending.claimer === 'bot'
    ? (view.pending.count === 0 ? 'The Ai claims no matches.' : `The Ai claims ${view.pending.count} match${view.pending.count > 1 ? 'es' : ''}: ${names(view.pending.ranks)}.`)
    : null;

  return (
    <>
      {showTutorial && <FiveUpTutorial onClose={dismissTutorial} />}
      {screen === 'menu' && (
        <div className="menu fiveup-menu">
          <div>
            <h2>5 Up 2 Down</h2>
            <p className="subtitle">Two down for you. Five up for everyone. Claim your matches — or bluff them. Every round proven on Midnight.</p>
          </div>
          <div className="menu-options">
            <div className="option-group">
              <h3>Table</h3>
              <div className="option-buttons">
                <button className={settings.mode === 0 ? 'active' : ''} onClick={() => setSettings((s) => ({ ...s, mode: 0 }))}>Casual · to 10</button>
                <button className={settings.mode === 1 ? 'active' : ''} onClick={() => setSettings((s) => ({ ...s, mode: 1 }))}>Standard · to 20</button>
              </div>
            </div>
            <div className="option-group">
              <h3>Ai</h3>
              <div className="option-buttons">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button key={d} className={settings.difficulty === d ? 'active' : ''} onClick={() => setSettings((s) => ({ ...s, difficulty: d }))}>{d}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="tutorial-actions">
            <button className="primary" onClick={() => start(settings)} disabled={busy}>Deal me in</button>
            <button onClick={() => setShowTutorial(true)}>How to play</button>
            <a className="fiveup-switch" href="/">Play Original instead →</a>
          </div>
          {serviceError && <p className="service-error" role="alert">{serviceError}</p>}
          {busy && <p className="service-busy">Dealing you in on Midnight…</p>}
        </div>
      )}
      {screen === 'game' && view && (
        <>
          <div className="chain-strip" aria-live="polite">
            <span className="chain-dot" data-state={chain.closed ? 'closed' : chain.deployed ? 'live' : 'pending'} />
            <span>{chainStatusLine(chain)}</span>
            {chain.contractAddress && (
              <a href={`https://explorer.midnight.network/contracts/${chain.contractAddress}`} target="_blank" rel="noreferrer">contract {chain.contractAddress.slice(0, 8)}…</a>
            )}
          </div>
          {serviceError && <p className="service-error" role="alert">{serviceError}</p>}
          <div className="play-area">
            <GameLogPanel log={log} visibleCount={log.length} narrationMuted={audio.narrationMuted} narrationVolume={audio.narrationVolume}
              onToggleNarration={() => audio.setNarrationMuted((m) => !m)} onNarrationVolume={audio.setNarrationVolume} />
            <div className="fiveup-table">
              {dialogue && <p className="ai-dialogue fiveup-dialogue">"{dialogue}"</p>}
              <div className="fiveup-board-row">
                <span className="fiveup-side">Ai <strong>{view.scores.bot}</strong></span>
                <div className="fiveup-board" aria-label="Board">
                  {board.map((r, i) => (
                    <PlayingCard key={`b${i}`} card={card(r, i, 'board')} selected={picked.includes(i)} disabled={!claiming || busy} onClick={() => togglePick(i)} />
                  ))}
                </div>
                <span className="fiveup-side">You <strong>{view.scores.human}</strong></span>
              </div>
              <div className="fiveup-round">Round {view.round} · race to {view.target}</div>
              {awaitingNext && summary?.showdowns?.map((sd, i) => (
                <div key={`sd${i}`} className="fiveup-showdown" aria-label="Showdown result">
                  <span>{sd.passer === 'human' ? 'You passed — Ai drew' : 'Ai passed — you drew'}</span>
                  <span className="fiveup-showdown-cards">
                    {sd.draws.map((r, j) => <PlayingCard key={`sd${i}-${j}`} card={card(r, j, `sd${i}`)} disabled />)}
                  </span>
                  <span>against {sd.passer === 'human' ? 'your' : "the Ai's"} {names(sd.passerHole)} — <strong>+{sd.wins}</strong> for {sd.passer === 'human' ? 'Ai' : 'you'}</span>
                </div>
              ))}
              {awaitingNext && summary && (
                <div className="fiveup-reveal">Showdown over — Ai held {names(summary.botHole)}, you held {names(summary.hole)}.</div>
              )}
              <div className="fiveup-prompt" aria-live="polite">
                {!live && 'Game over.'}
                {claiming && (picked.length === 0
                  ? 'Tap the board cards you claim to match (1–2), then Claim — or Pass for a showdown.'
                  : `Claiming ${names(pickedRanks)}.`)}
                {responding && pendingText}
                {awaitingNext && 'Round complete — press Next hand to deal.'}
                {live && !myTurn && !awaitingNext && 'The Ai is thinking…'}
              </div>
              <div className="fiveup-actions">
                <button type="button" className={`btn-quit${quitArmed ? ' btn-quit--armed' : ''}`} onClick={quit} disabled={busy || !live}>
                  {quitArmed ? <>Sure?<br />Quit</> : <>Safely<br />quit game</>}
                </button>
                <div className="fiveup-hole" aria-label="Your cards">
                  {hole.map((r, i) => <PlayingCard key={`h${i}`} card={card(r, i + 7, 'hole')} disabled pairColor={board.includes(r) ? { color: 'var(--gold)', glow: 'rgba(255,215,0,0.45)' } : null} />)}
                  <span className="fiveup-hint">{displayMatches.length === 0 ? 'No real matches — Claim a bluff or Pass.' : `${displayMatches.length} real match${displayMatches.length > 1 ? 'es' : ''} (gold).`}</span>
                </div>
                <div className="fiveup-buttons">
                  {claiming && <button className="primary" onClick={submitClaim} disabled={busy || picked.length === 0}>{picked.length === 0 ? 'Claim' : `Claim ${picked.length}`}</button>}
                  {claiming && <button className="secondary" onClick={pass} disabled={busy}>Pass</button>}
                  {responding && <button className="primary" onClick={accept} disabled={busy}>Accept</button>}
                  {responding && view.pending.count > 0 && <button className="danger" onClick={challenge} disabled={busy}>Proof or Bluff!</button>}
                  {awaitingNext && <button className="primary" onClick={nextHand} disabled={busy}>Next hand</button>}
                </div>
              </div>
            </div>
          </div>
          {view.status !== 'playing' && view.status !== 'abandoned' && (
            <ResultOverlay winner={winner} onRematch={() => start(settings)} onMenu={toMenu}
              footnote={chain.closed ? 'Every round of this game was proven on Midnight. Your cards were never on-chain.' : 'Your rounds are being proven on Midnight in the background — the strip updates as they land.'} />
          )}
        </>
      )}
    </>
  );
}
