import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BoardCoach } from './FiveUpGame.jsx';

describe('BoardCoach', () => {
  it('points first-time claimers at the house cards', () => {
    const markup = renderToStaticMarkup(<BoardCoach />);
    expect(markup).toContain('board-coach');
    expect(markup).toContain('house cards');
    expect(markup).toContain('board-coach-arrow');
  });
});
