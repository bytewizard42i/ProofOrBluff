import React from 'react';

import { SITE_URLS } from './siteLinks.js';

/**
 * SiteLinks — the quiet "Rules & About" / "Privacy" links that take a player
 * from the game (prooforbluff.app) to the explainer site (prooforbluff.com).
 *
 * Deliberately small: these open in a new tab so an in-progress match is
 * never navigated away from. The Pro link lives in ProTeaser, not here.
 */
export default function SiteLinks({ compact = false }) {
  return (
    <nav className={`site-links${compact ? ' site-links--compact' : ''}`} aria-label="About Proof or Bluff">
      <a href={SITE_URLS.rules} target="_blank" rel="noopener noreferrer">Rules &amp; About</a>
      <span aria-hidden="true" className="site-links__dot">·</span>
      <a href={SITE_URLS.privacy} target="_blank" rel="noopener noreferrer">Privacy</a>
    </nav>
  );
}
