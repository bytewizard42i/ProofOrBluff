import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The table plays sounds on interaction; keep the static render silent.
vi.mock('../../sounds.js', () => ({
  playSubmitClick: () => {}, playPickClick: () => {}, playUnpickClick: () => {},
  playYouMisCalled: () => {}, playYouCaughtAi: () => {},
}));

import GameTable from './GameTable.jsx';
import { toTableState, EMPTY_STATS, PHASE } from '../../midnight/tableAdapter.js';

const previewMatch = {
  matchId: 'c05498a3bd1dac79020c0961207b1367a5fccba34493a52252f86b01a542fcbd',
  phase: PHASE.PLAYING, currentRank: 3, activePlayerIdx: 0,
  p1Score: 0, p2Score: 3, p1HandSize: 2, p2HandSize: 7, pileSize: 0, winner: 0,
  seedFinalized: true, mode: 1, round: 0, hasPendingPlay: false, isChallenged: false,
  lastPlayerIdx: 0, lastClaimRank: 0, lastClaimCount: 0,
};
const hand = [
  { id: 'p1:r0:0:5', rank: '5', rankIndex: 3, suit: 'hidden' },
  { id: 'p1:r0:1:5', rank: '5', rankIndex: 3, suit: 'hidden' },
];
const actions = { play: () => {}, accept: () => {}, challenge: () => ({ claimWasTrue: false }) };

function render(match, extra = {}) {
  const state = toTableState(match, hand, { log: ['Match resumed.'], stats: EMPTY_STATS });
  return renderToStaticMarkup(
    <GameTable
      state={state}
      settings={{ difficulty: 'medium', mode: 'home', handle: 'John' }}
      actions={actions}
      aiDialogue=""
      setAiDialogue={() => {}}
      displayedRank={state.currentRank}
      banner={null}
      skipFutureOutcomeSounds={() => {}}
      outputComplete
      {...extra}
    />,
  );
}

describe('GameTable on Midnight state', () => {
  it('renders the demo felt (ai area, pile, hand, scoreboard) from on-chain state', () => {
    const markup = render(previewMatch);
    expect(markup).toContain('class="table"');
    expect(markup).toContain('ai-avatar');
    expect(markup).toContain('Your hand (2)');
    expect(markup).toContain('scoreboard');
    expect(markup).toContain('Ai score');
    expect(markup).toContain('Play &amp; Claim');
  });

  it('has no Pass button because the contract has no pass circuit', () => {
    expect(render(previewMatch)).not.toContain('Pass');
  });

  it('shows pair glow on the two on-chain fives and a neutral mark instead of a fake suit', () => {
    const markup = render(previewMatch);
    expect((markup.match(/card midnight[^"]*pair/g) || []).length).toBe(2);
    expect(markup).toContain('✦');
    expect(markup).not.toMatch(/[♥♦♣♠]/);
  });

  it('offers Accept and Prove it! when the bot has a pending claim', () => {
    const markup = render({ ...previewMatch, phase: PHASE.AWAITING_RESPONSE, hasPendingPlay: true, lastPlayerIdx: 1, lastClaimRank: 3, lastClaimCount: 2 });
    expect(markup).toContain('Accept');
    expect(markup).toContain('Prove it!');
    expect(markup).toContain('I have 2 cards');
  });

  it('locks the hand while a proof is in flight', () => {
    const markup = render(previewMatch, { busy: true });
    expect(markup).not.toContain('Play &amp; Claim');
    expect((markup.match(/card midnight[^"]*disabled/g) || []).length).toBe(2);
  });

  it('pulls nothing from the local engine or wallet', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync(new URL('./GameTable.jsx', import.meta.url), 'utf8'));
    expect(source).not.toMatch(/game\/engine\.js/);
    expect(source).not.toMatch(/midnight\/wallet/);
  });
});
