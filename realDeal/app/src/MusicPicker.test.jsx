import { describe, expect, it } from 'vitest';
import { MUSIC_TRACKS, SYNTH_TRACK_ID, findMusicTrack } from './musicTracks.js';

describe('custom soundtrack catalogue', () => {
  it('offers the synth loop first plus every custom MP3 with a unique id and title', () => {
    expect(MUSIC_TRACKS[0].id).toBe(SYNTH_TRACK_ID);
    expect(MUSIC_TRACKS[0].url).toBeNull();
    expect(MUSIC_TRACKS.length).toBe(10);
    const ids = new Set(MUSIC_TRACKS.map((track) => track.id));
    const titles = new Set(MUSIC_TRACKS.map((track) => track.title));
    expect(ids.size).toBe(MUSIC_TRACKS.length);
    expect(titles.size).toBe(MUSIC_TRACKS.length);
    for (const track of MUSIC_TRACKS.slice(1)) {
      expect(typeof track.url).toBe('string');
      expect(track.url).toMatch(/\.mp3$/);
    }
  });

  it('falls back to the synth loop for unknown or stale ids', () => {
    expect(findMusicTrack('does-not-exist').id).toBe(SYNTH_TRACK_ID);
    expect(findMusicTrack('three-aces').title).toMatch(/Three Aces/);
  });
});
