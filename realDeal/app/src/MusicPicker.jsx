import { useEffect, useState } from 'react';
import { MUSIC_TRACKS, SYNTH_TRACK_ID, findMusicTrack } from './musicTracks.js';
import { setMusicTrack, startBackgroundMusic, unlockAudio } from './sounds.js';

const STORAGE_KEY = 'pob.musicTrack';

function readStoredTrackId() {
  try {
    return findMusicTrack(window.localStorage.getItem(STORAGE_KEY) || SYNTH_TRACK_ID).id;
  } catch {
    return SYNTH_TRACK_ID;
  }
}

/**
 * Lets the player choose between the synthesized lounge loop and John's
 * custom tracks. The selection is remembered across visits. Picking a track
 * counts as a user gesture, so it also unlocks audio and starts playback.
 */
export default function MusicPicker({ compact = false }) {
  const [trackId, setTrackId] = useState(readStoredTrackId);

  // Apply the remembered choice on mount so the first gesture plays it.
  useEffect(() => {
    setMusicTrack(findMusicTrack(trackId));
  }, [trackId]);

  const onChange = (event) => {
    const next = findMusicTrack(event.target.value);
    setTrackId(next.id);
    try { window.localStorage.setItem(STORAGE_KEY, next.id); } catch { /* private mode */ }
    unlockAudio();
    startBackgroundMusic();
  };

  return (
    <label className={`music-picker${compact ? ' music-picker--compact' : ''}`}>
      <span className="music-picker__label">{compact ? '♪' : 'Soundtrack'}</span>
      <select
        className="music-picker__select"
        value={trackId}
        onChange={onChange}
        aria-label="Choose background music"
        title="Choose background music"
      >
        {MUSIC_TRACKS.map((track) => (
          <option key={track.id} value={track.id}>{track.title}</option>
        ))}
      </select>
    </label>
  );
}
