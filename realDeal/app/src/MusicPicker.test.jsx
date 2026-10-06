import { describe, expect, it } from 'vitest';
import { MUSIC_TRACKS, SYNTH_TRACK_ID, DEFAULT_TRACK_ID, findMusicTrack } from './musicTracks.js';

describe('custom soundtrack catalogue', () => {
  it('offers Three Aces first (the default), the synth loop, and every custom MP3 with a unique id and title', () => {
    expect(MUSIC_TRACKS[0].id).toBe(DEFAULT_TRACK_ID);
    expect(DEFAULT_TRACK_ID).toBe('three-aces');
    expect(MUSIC_TRACKS.some((t) => t.id === SYNTH_TRACK_ID)).toBe(true);
    expect(MUSIC_TRACKS[0].url).toMatch(/\.mp3$/);
    expect(MUSIC_TRACKS.find((t) => t.id === SYNTH_TRACK_ID).url).toBeNull();
    expect(MUSIC_TRACKS.length).toBe(10);
    const ids = new Set(MUSIC_TRACKS.map((track) => track.id));
    const titles = new Set(MUSIC_TRACKS.map((track) => track.title));
    expect(ids.size).toBe(MUSIC_TRACKS.length);
    expect(titles.size).toBe(MUSIC_TRACKS.length);
    for (const track of MUSIC_TRACKS.filter((t) => t.id !== SYNTH_TRACK_ID)) {
      expect(typeof track.url).toBe('string');
      expect(track.url).toMatch(/\.mp3$/);
    }
  });

  it('falls back to the default track for unknown or stale ids', () => {
    expect(findMusicTrack('does-not-exist').id).toBe(DEFAULT_TRACK_ID);
    expect(findMusicTrack('three-aces').title).toMatch(/Three Aces/);
  });
});
