import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SponsorInvite } from './SponsorRail.jsx';

describe('future sponsor banner', () => {
  it('invites sponsors without suggesting an active ad or checkout', () => {
    const markup = renderToStaticMarkup(<SponsorInvite />);
    expect(markup).toContain('Advertize your Blockchain service here!');
    expect(markup).toContain('Coming soon!');
    expect(markup).not.toMatch(/<a\b|<button\b|checkout|subscribe/i);
  });
});
