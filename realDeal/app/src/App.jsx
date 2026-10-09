import React, { useState } from 'react';
import { unlockAudio, isMobileDevice } from './sounds.js';
import RealDealHeader from './RealDealHeader.jsx';
import ProofServerLog from './ProofServerLog.jsx';
import SponsorRail, { SponsorInvite } from './SponsorRail.jsx';
import MusicPicker from './MusicPicker.jsx';
import TestWiredPanel from './TestWiredPanel.jsx';
import ProTeaser from './ProTeaser.jsx';
import DemoGame from './DemoGame.jsx';
import SponsoredGame from './SponsoredGame.jsx';
import FiveUpGame from './FiveUpGame.jsx';
import { useAudioSettings } from './components/table/useAudioSettings.js';
import { NETWORK_ID, SPONSORED_MODE } from './midnight/config.js';

const APP_MODE = import.meta.env.VITE_POB_MODE || 'testwired';
// Two sponsored tables share one build: `/` is Original (the Cheat-style
// rollup), `/fiveup` is 5 Up 2 Down. Vercel rewrites every path to index.html.
const FIVE_UP_ROUTE = typeof window !== 'undefined' && /^\/fiveup\/?$/.test(window.location.pathname);

/**
 * Top-right music controls shared by both surfaces.
 */
function MusicControls({ audio, extra }) {
  // Phones get no music player at all (see sounds.js isMobileDevice).
  const mobile = isMobileDevice();
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <ProTeaser />
      {!mobile && <MusicPicker compact />}
      {!mobile && <button
        onClick={() => { unlockAudio(); audio.setMuted((m) => !m); }}
        title={audio.muted ? 'Unmute lounge music' : 'Mute lounge music'}
        aria-label={audio.muted ? 'Unmute lounge music' : 'Mute lounge music'}
      >
        {audio.muted ? '🔇' : '🎵'}
      </button>}
      {!mobile && <input
        type="range"
        className="volume-slider"
        min="0"
        max="1"
        step="0.05"
        value={audio.musicVolume}
        onChange={(e) => audio.setMusicVolume(parseFloat(e.target.value))}
        style={{ '--val': audio.musicVolume }}
        aria-label="Music volume"
        title={`Music volume: ${Math.round(audio.musicVolume * 100)}%`}
        disabled={audio.muted}
      />}
      {extra}
    </div>
  );
}

export default function App() {
  const audio = useAudioSettings();
  const [demoScreen, setDemoScreen] = useState('menu');
  const [menuRequest, setMenuRequest] = useState(0);

  // TestWired is the default realDeal development surface. The original local
  // AI game remains intact and can still be launched with VITE_POB_MODE=demo.
  if (APP_MODE === 'testwired') {
    return (
      <div className="app">
        <SponsorRail />
        <ProofServerLog />
        <header className="header">
          <div>
            <h1>Proof or Bluff <span className="badge">{NETWORK_ID === 'undeployed' ? 'Local test' : NETWORK_ID}</span></h1>
            <div className="tagline">Bluff in public. Prove in private. Play against the computer.</div>
          </div>
          <MusicControls audio={audio} />
        </header>
        <TestWiredPanel audio={audio} />
        <SponsorInvite />
        <footer className="footer">
          Midnight {NETWORK_ID === 'undeployed' ? 'local test' : NETWORK_ID} · no real-money play
        </footer>
      </div>
    );
  }

  // Demo mode is the public instant-play build: no wallet, no chain, no
  // diagnostics. The wallet header and the proof-server log are developer
  // surfaces for the chain-wired modes only. Sponsored mode is the same
  // player-facing surface, but every move goes to api.prooforbluff.app and
  // rounds are proven on Midnight by the house — still no wallet.
  const DEMO_MODE = APP_MODE === 'demo' || APP_MODE === 'sponsored';
  const SPONSORED = APP_MODE === 'sponsored' && SPONSORED_MODE;
  const Table = SPONSORED ? (FIVE_UP_ROUTE ? FiveUpGame : SponsoredGame) : DemoGame;
  return (
    <div className="app">
      {!DEMO_MODE && <RealDealHeader />}
      <SponsorRail />
      {/* Floating, fixed-position panel in the right margin. Out of
          flow, so it never reflows the gameboard. */}
      {!DEMO_MODE && <ProofServerLog />}
      <header className="header">
        <div>
          <h1>
            Proof or Bluff <span className="badge">{SPONSORED ? `${FIVE_UP_ROUTE ? '5 Up 2 Down · ' : ''}on Midnight ${NETWORK_ID}` : 'on Midnight'}</span>
          </h1>
          <div className="tagline">Bluff in public. Prove in private.</div>
        </div>
        <MusicControls
          audio={audio}
          extra={demoScreen === 'game' && (
            <button onClick={() => setMenuRequest((n) => n + 1)}>← Menu</button>
          )}
        />
      </header>

      <Table audio={audio} onScreenChange={setDemoScreen} menuRequest={menuRequest} />

      <SponsorInvite />
      <footer className="footer">
        Free to play · no real-money play ·{' '}
        <a href="https://prooforbluff.com" target="_blank" rel="noreferrer">
          prooforbluff.com
        </a>
        {' · '}
        <a href="https://midnight.network" target="_blank" rel="noreferrer">
          Midnight Network
        </a>
      </footer>
    </div>
  );
}
