import { useEffect, useState } from 'react';
import {
  unlockAudio,
  setMuted as setAudioMuted,
  setMusicVolume as setMusicVolumeApi,
  startBackgroundMusic,
} from '../../sounds.js';
import { setSpeechMuted, setSpeechVolume } from '../../speech.js';

function readBool(key, fallback = false) {
  try { return window.localStorage.getItem(key) === '1'; } catch { return fallback; }
}
function readNumber(key, fallback) {
  try {
    const v = parseFloat(window.localStorage.getItem(key));
    return Number.isFinite(v) ? v : fallback;
  } catch { return fallback; }
}
function write(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* noop */ }
}

/**
 * Music + narration preferences, persisted across visits. Also installs the
 * first-gesture audio unlock: browsers require a user interaction before
 * AudioContext can play, so we listen for the first click/key anywhere on
 * the page and use it to prime the context + start the lounge music.
 */
export function useAudioSettings() {
  const [muted, setMuted] = useState(() => readBool('pob.muted'));
  useEffect(() => {
    setAudioMuted(muted);
    write('pob.muted', muted ? '1' : '0');
  }, [muted]);

  // Music volume — independent of the music mute. 0..1.
  const [musicVolume, setMusicVolume] = useState(() => readNumber('pob.musicVolume', 1));
  useEffect(() => {
    setMusicVolumeApi(musicVolume);
    write('pob.musicVolume', String(musicVolume));
  }, [musicVolume]);

  // Narration controls — independent of the global SFX mute so the
  // player can hush the dealer while keeping the bells and lounge music.
  const [narrationMuted, setNarrationMuted] = useState(() => readBool('pob.narrationMuted'));
  const [narrationVolume, setNarrationVolume] = useState(() => readNumber('pob.narrationVolume', 0.95));
  useEffect(() => {
    // Narration is governed ONLY by the in-log narration toggle —
    // the top-right speaker icon controls music only.
    setSpeechMuted(narrationMuted);
    write('pob.narrationMuted', narrationMuted ? '1' : '0');
  }, [narrationMuted]);
  useEffect(() => {
    setSpeechVolume(narrationVolume);
    write('pob.narrationVolume', String(narrationVolume));
  }, [narrationVolume]);

  useEffect(() => {
    const start = () => {
      unlockAudio();
      startBackgroundMusic();
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    window.addEventListener('pointerdown', start, { once: false });
    window.addEventListener('keydown', start, { once: false });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, []);

  return {
    muted, setMuted,
    musicVolume, setMusicVolume,
    narrationMuted, setNarrationMuted,
    narrationVolume, setNarrationVolume,
  };
}
