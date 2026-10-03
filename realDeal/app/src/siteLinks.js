/**
 * siteLinks.js — the one place that knows where the explainer site lives.
 *
 * Domain plan (John, Oct 2026):
 *   prooforbluff.app  → the playable game (this Vite app)
 *   prooforbluff.com  → rules, explainer, privacy model, Pro information
 *
 * The game UI links OUT to .com for anything that would otherwise clutter
 * the table (rules, privacy, Pro). The .com site links back IN with a
 * prominent "Play" button. Keeping the URLs here means a hosting change is
 * a one-line edit instead of a hunt through components.
 *
 * `VITE_SITE_BASE_URL` lets a local or staging build point at a local copy
 * of the site (for example http://localhost:8080) without touching code.
 */

const env = import.meta.env || {};

export const SITE_BASE_URL = (env.VITE_SITE_BASE_URL || 'https://prooforbluff.com')
  .replace(/\/$/, '');

export const SITE_URLS = Object.freeze({
  home: `${SITE_BASE_URL}/`,
  rules: `${SITE_BASE_URL}/rules.html`,
  privacy: `${SITE_BASE_URL}/privacy.html`,
  pro: `${SITE_BASE_URL}/pro.html`,
});
