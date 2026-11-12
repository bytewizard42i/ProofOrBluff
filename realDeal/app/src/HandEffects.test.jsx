import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { handWinner, HandCelebration, HandTransition } from './HandEffects.jsx';

describe('handWinner', () => {
  it('returns the side that gained more points', () => {
    expect(handWinner({ human: 2, bot: 5 }, { human: 5, bot: 5 })).toBe('human');
    expect(handWinner({ human: 2, bot: 5 }, { human: 2, bot: 9 })).toBe('bot');
  });

  it('returns null on a tie, including negative gains that cancel out', () => {
    expect(handWinner({ human: 4, bot: 7 }, { human: 6, bot: 9 })).toBe(null);
    expect(handWinner({ human: 3, bot: 3 }, { human: 3, bot: 3 })).toBe(null);
  });

  it('handles negative gains — losing points still counts as a gain comparison', () => {
    expect(handWinner({ human: 3, bot: 2 }, { human: 2, bot: 3 })).toBe('bot');
    expect(handWinner({ human: 3, bot: 2 }, { human: 1, bot: 0 })).toBe(null);
  });
});

describe('HandCelebration', () => {
  it('human win: gold headline plus a big confetti burst', () => {
    const markup = renderToStaticMarkup(<HandCelebration kind="human" />);
    expect(markup).toContain('You take the hand');
    expect(markup).toContain('hand-celebration--human');
    expect((markup.match(/hand-confetti-piece/g) || []).length).toBeGreaterThanOrEqual(100);
  });

  it('bot win: red alarm headline', () => {
    const markup = renderToStaticMarkup(<HandCelebration kind="bot" />);
    expect(markup).toContain('The Ai takes the hand');
    expect(markup).toContain('hand-celebration--bot');
    expect(markup).toContain('hand-alarm-beacon');
  });
});

describe('HandTransition', () => {
  it('shows the incoming round number inside the curtains', () => {
    const markup = renderToStaticMarkup(<HandTransition round={4} phase="in" />);
    expect(markup).toContain('Round 4');
    expect(markup).toContain('New board. New cards.');
    expect(markup).toContain('hand-transition--in');
  });
});
