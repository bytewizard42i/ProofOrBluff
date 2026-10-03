import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import SiteLinks from './SiteLinks.jsx';
import ProTeaser from './ProTeaser.jsx';
import { SITE_URLS } from './siteLinks.js';

describe('links from the game (.app) to the explainer site (.com)', () => {
  it('points Rules and Privacy at prooforbluff.com and opens them in a new tab', () => {
    const markup = renderToStaticMarkup(<SiteLinks />);
    expect(markup).toContain('href="https://prooforbluff.com/rules.html"');
    expect(markup).toContain('href="https://prooforbluff.com/privacy.html"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it('sends the Pro teaser to the .com Pro page without adding checkout', () => {
    const markup = renderToStaticMarkup(<ProTeaser />);
    expect(markup).toContain(`href="${SITE_URLS.pro}"`);
    expect(SITE_URLS.pro).toBe('https://prooforbluff.com/pro.html');
    expect(markup).not.toMatch(/checkout|subscribe now|buy now/i);
  });
});
