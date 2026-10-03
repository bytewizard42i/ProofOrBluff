// John's custom soundtrack. The files live once, in media/Audio at the repo
// root; Vite treats these imports as assets, serving them in dev and copying
// hashed copies into dist on build, so nothing is duplicated in Git.
import threeAces from '../../../media/Audio/Three Aces smokey-echoey.mp3';
import bluffPrivately from '../../../media/Audio/Bluff Privatelypowerful-heavy EDM.mp3';
import pobShortSexier from '../../../media/Audio/Proof or Bluff-2-short-sexier.mp3';
import pobLong5 from '../../../media/Audio/Proof or Bluff-long-5.mp3';
import pob6 from '../../../media/Audio/Proof or Bluff-6.mp3';
import pobShortGreat from '../../../media/Audio/Proof or Bluff-1-short-great.mp3';
import smokeyLong from '../../../media/Audio/smokey-great-long.mp3';
import midnightChains from '../../../media/Audio/Midnight Chains-epic.mp3';
import midnightProof7 from '../../../media/Audio/Midnight Proof-7.mp3';

// `url: null` means "synthesize in Web Audio" (the original lounge loop).
export const SYNTH_TRACK_ID = 'lounge-synth';

export const MUSIC_TRACKS = Object.freeze([
  { id: SYNTH_TRACK_ID, title: 'Lounge Piano (synth)', url: null },
  { id: 'three-aces', title: 'Three Aces — Smokey Echo', url: threeAces },
  { id: 'smokey-long', title: 'Smokey Lounge (long)', url: smokeyLong },
  { id: 'pob-short-great', title: 'Proof or Bluff — Short I', url: pobShortGreat },
  { id: 'pob-short-sexier', title: 'Proof or Bluff — Short II', url: pobShortSexier },
  { id: 'pob-long-5', title: 'Proof or Bluff — Long', url: pobLong5 },
  { id: 'pob-6', title: 'Proof or Bluff — VI', url: pob6 },
  { id: 'midnight-proof-7', title: 'Midnight Proof', url: midnightProof7 },
  { id: 'midnight-chains', title: 'Midnight Chains — Epic', url: midnightChains },
  { id: 'bluff-privately', title: 'Bluff Privately — Heavy EDM', url: bluffPrivately },
]);

export function findMusicTrack(id) {
  return MUSIC_TRACKS.find((track) => track.id === id) || MUSIC_TRACKS[0];
}
