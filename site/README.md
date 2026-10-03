# Proof or Bluff — marketing / explainer site (prooforbluff.com)

A self-contained **static site with no build step**: plain HTML, one CSS file,
and a tiny script for the mobile navigation toggle. No frameworks, no CDNs,
no analytics, no forms that submit anywhere.

```
site/
├── index.html      Home: hero, "How privacy works", round walkthrough, sponsors, CTA
├── rules.html      Launch-edition rules (score modes; pile discarded after a challenge)
├── privacy.html    Privacy & trust model: public vs private, who sees what, proof-server choice
├── pro.html        "Pro — Coming Soon" (non-functional interest placeholder)
├── styles.css      Shared stylesheet (dark palette matching the game)
├── site.js         Mobile nav toggle only
├── netlify.toml    Netlify publish config + security headers
└── assets/
    ├── favicon.svg          copied from realDeal/app/public/favicon.svg
    ├── pob-logo.webp        optimized from media/proof or bluff pfp.png (512 px)
    └── pob-banner.webp      optimized from media/POB-banner.png (1536 px)
```

The site is **not** part of the npm workspaces and has no `package.json` on
purpose; there is nothing to install.

## Preview locally

From the repository root, either:

```bash
npx serve site
# or
python3 -m http.server --directory site 8080
```

then open the printed URL (for example `http://localhost:8080/`).

Opening `site/index.html` directly from the filesystem also works, because
all links and asset paths are relative.

## Deploy (Netlify)

The site is meant to be deployed as its own Netlify site:

| Netlify setting   | Value  |
|-------------------|--------|
| Base directory    | `site` |
| Build command     | *(none)* |
| Publish directory | `site` |

`site/netlify.toml` declares `publish = "."` relative to the base directory,
adds conservative security headers (including a CSP that only allows
same-origin assets, which is why the pages contain no inline styles or
scripts), and caches `assets/` for a week.

Deploying from another host is equally simple: upload the contents of `site/`
as-is to any static file server.

## Domain plan

| Domain               | Serves                                   | Source |
|----------------------|------------------------------------------|--------|
| `prooforbluff.com`   | **this site** (marketing / explainer)    | `site/` |
| `prooforbluff.app`   | **the playable game**                    | `realDeal/app` build (separate deploy) |

Every "Play" button on this site links to `https://prooforbluff.app`.

> **Status:** DNS and hosting for both domains have **not** been configured
> yet. Nothing on this site should be treated as live until the game deploy
> at `prooforbluff.app` exists and both domains resolve.

## Editing notes

- Content facts come from `README.md`, `docs/RULES.md`, `docs/MAINNET_PLAN.md`
  and the launch contract `realDeal/contracts/proof-or-bluff-mainnet.compact`.
  If the rules or scoring in the contract change, update `rules.html`.
- The proof-server wording on `privacy.html` mirrors
  `realDeal/app/src/ProofServerChoice.jsx`; the Pro copy mirrors
  `realDeal/app/src/ProTeaser.jsx`. Keep them in sync.
- Keep the status banner ("Now in public testing on the Midnight Preview
  testnet. No real money. No wagers.") accurate; it appears on every page.
- Images added to `assets/` should stay under 600 KB; prefer `.webp`.
