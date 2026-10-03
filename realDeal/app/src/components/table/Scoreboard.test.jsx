import { describe, expect, it } from 'vitest';
import { estimateAiBluffProbability } from './Scoreboard.jsx';

// The estimator has two worlds: the local demo (one shared deck, so the
// player's cards bound what the Ai can hold) and the Midnight table (each
// side dealt from its own private deck, so they bound nothing).
const settings = { difficulty: 'medium' };
const king = (suit) => ({ rank: 'K', suit });

function state(overrides = {}) {
  return {
    mode: 'home',
    playerHand: [king('hearts'), king('spades'), king('clubs')],
    pile: [],
    discardPile: [],
    lastPlay: { player: 'ai', claimedRank: 'K', claimedCount: 2 },
    stats: { aiPlays: 0, aiBluffsCaught: 0 },
    ...overrides,
  };
}

describe('estimateAiBluffProbability', () => {
  it('returns null when the last play is not the Ai\'s', () => {
    expect(estimateAiBluffProbability(state({ lastPlay: null }), settings)).toBeNull();
    expect(estimateAiBluffProbability(
      state({ lastPlay: { player: 'player', claimedRank: 'K', claimedCount: 1 } }), settings,
    )).toBeNull();
  });

  it('shared deck: three Kings in hand make a claim of two Kings impossible', () => {
    const estimate = estimateAiBluffProbability(state(), settings);
    expect(estimate.p).toBe(1);
    expect(estimate.reason).toMatch(/^Impossible/);
    expect(estimate.stats.aiCanHaveAtMost).toBe(1);
  });

  it('private decks: the same hand constrains nothing, so the claim is possible', () => {
    const estimate = estimateAiBluffProbability(state({ privateDecks: true }), settings);
    expect(estimate.p).toBeLessThan(1);
    expect(estimate.stats.aiCanHaveAtMost).toBe(4);
    expect(estimate.reason).toMatch(/Separate private decks/);
    expect(estimate.reason).toMatch(/2 of a possible 4/);
  });

  it('private decks: even four Kings in hand never flag a four-King claim as impossible', () => {
    const estimate = estimateAiBluffProbability(state({
      privateDecks: true,
      playerHand: [king('hearts'), king('spades'), king('clubs'), king('diamonds')],
      lastPlay: { player: 'ai', claimedRank: 'K', claimedCount: 4 },
    }), settings);
    expect(estimate.p).toBeLessThan(1);
    expect(estimate.stats.aiCanHaveAtMost).toBe(4);
  });

  it('private decks: on-chain casino mode still has only 4 of a rank', () => {
    const estimate = estimateAiBluffProbability(
      state({ privateDecks: true, mode: 'casino' }), settings,
    );
    expect(estimate.stats.copies).toBe(4);
  });

  it('shared deck casino mode counts 20 of a rank', () => {
    const estimate = estimateAiBluffProbability(state({ mode: 'casino' }), settings);
    expect(estimate.stats.copies).toBe(20);
    expect(estimate.p).toBeLessThan(1);
  });
});
