import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ProTeaser from './ProTeaser.jsx';

describe('future Pro features teaser', () => {
  it('labels the offer as not yet available without offering checkout', () => {
    const markup = renderToStaticMarkup(<ProTeaser />);
    expect(markup).toContain('Go ad free, and other Pro features');
    expect(markup).toContain('Coming Soon!');
    expect(markup).toContain('Ad-free play');
    expect(markup).toContain('Peer-to-peer matches');
    expect(markup).toContain('Optional play for money');
    expect(markup).not.toMatch(/checkout|subscribe now|buy now/i);
  });
});
