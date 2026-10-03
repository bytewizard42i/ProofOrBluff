import React, { useState } from 'react';
import { unlockAudio } from './sounds.js';
import RealDealHeader from './RealDealHeader.jsx';
import ProofServerLog from './ProofServerLog.jsx';
import SponsorRail, { SponsorInvite } from './SponsorRail.jsx';
import MusicPicker from './MusicPicker.jsx';
import TestWiredPanel from './TestWiredPanel.jsx';
import ProTeaser from './ProTeaser.jsx';
import DemoGame from './DemoGame.jsx';
import { useAudioSettings } from './components/table/useAudioSettings.js';
import { NETWORK_ID } from './midnight/config.js';

const APP_MODE = import.meta.env.VITE_POB_MODE || 'testwired';

/**
 * Top-right music controls shared by both surfaces.
 */
function MusicControls({ audio, extra }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <ProTeaser />
      <MusicPicker compact />
      <button
        onClick={() => { unlockAudio(); audio.setMuted((m) => !m); }}
        title={audio.muted ? 'Unmute lounge music' : 'Mute lounge music'}
        aria-label={audio.muted ? 'Unmute lounge music' : 'Mute lounge music'}
      >
        {audio.muted ? '🔇' : '🎵'}
      </button>
      <input
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
      />
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

  return (
    <div className="app">
      <RealDealHeader />
      <SponsorRail />
      {/* Floating, fixed-position panel in the right margin. Out of
          flow, so it never reflows the gameboard. */}
      <ProofServerLog />
      <header className="header">
        <div>
          <h1>
            Proof or Bluff <span className="badge">MLH × Midnight</span>
          </h1>
          <div className="tagline">Bluff publicly. Prove privately.</div>
        </div>
        <MusicControls
          audio={audio}
          extra={demoScreen === 'game' && (
            <button onClick={() => setMenuRequest((n) => n + 1)}>← Menu</button>
          )}
        />
      </header>

      <DemoGame audio={audio} onScreenChange={setDemoScreen} menuRequest={menuRequest} />

      <SponsorInvite />
      <footer className="footer">
        realDeal build · MLH × Midnight Hackathon · May 15-17 2026 ·{' '}
        <a href="https://github.com/bytewizard42i/ProofOrBluff_MLH_Midnight" target="_blank" rel="noreferrer">
          GitHub
        </a>
        {' · '}
        <a href="https://midnight.network" target="_blank" rel="noreferrer">
          Midnight Network
        </a>
      </footer>
    </div>
  );
}
