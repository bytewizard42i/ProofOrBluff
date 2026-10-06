# Proof or Bluff — pob-api image (the wallet-free sponsored game backend)
#
# What runs here: `realDeal/cli/src/sponsored-service.js` — the Season 1 HTTP
# service described in docs/SPONSORED_GAME_API.md. It deals the cards, runs the
# v3p referee, plays the bot seat, holds the operator wallet and submits every
# proof (deploy → proveRound → closeGame) in the background, paying DUST.
#
# How to build it (compose does this for you — see compose.yaml `pob-api`):
#   docker compose -f ops/vps/compose.yaml build pob-api
#
# BUILD CONTEXT = A COPY OF THE REPO WORKING TREE, NOT A GIT EXPORT. The
# proving keys and ZKIR under
# realDeal/contracts/managed/proof-or-bluff-rollup-v3p/{keys,zkir} are
# gitignored (49 MB of generated artifacts, rebuilt on Terry) but they are
# REQUIRED at runtime: midnight.js reads the prover key and inlines it in every
# /prove request to the proof server. A `git archive`/`git clone` on the box
# would silently leave them out and the service would start fine, then fail on
# the first proof.
#
# So the VPS never has a git checkout. deploy.sh rsyncs EXACTLY the subtrees
# the COPY lines below need (same relative paths as the repo) from the dev
# machine into /opt/prooforbluff/src, and compose.yaml points the build
# context there. Every COPY path in this file is therefore a repo-relative
# path and must stay in lockstep with the rsync list in deploy.sh. Add a
# source directory → add it in both places.
#
# Why node:22-bookworm-slim: Debian glibc (the Midnight WASM/N-API packages and
# leveldown's native binding are built for glibc, not Alpine's musl), but
# without compilers/docs → ~200 MB instead of ~1 GB.

# ── Stage 1: install production dependencies ───────────────────────────────
# Done in its own stage so the final image never carries the npm cache or any
# build-time leftovers. We copy ONLY the package manifests first: Docker caches
# this layer, so editing service code does not re-download node_modules.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# The repo is an npm WORKSPACE (root package.json → realDeal/app + realDeal/cli).
# `npm ci` refuses to run unless every workspace's package.json is present —
# even realDeal/app, which we never execute here. The root package.json also
# carries the `overrides` pin for @midnight-ntwrk/ledger-v8 8.1.2; npm honours
# overrides ONLY at the workspace root, which is why we install from the root
# and not from inside realDeal/cli (see the _versionNotes in its package.json).
COPY package.json package-lock.json ./
COPY realDeal/app/package.json realDeal/app/
COPY realDeal/cli/package.json realDeal/cli/

# --omit=dev drops vite/vitest/etc. The lockfile is honoured exactly (ci, not
# install), so the box runs the same dependency tree we tested locally.
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 # npm only creates realDeal/cli/node_modules when some dependency could NOT be
 # hoisted to the root (version conflicts). Whether that happens depends on the
 # lockfile of the day; make sure the directory exists so the COPY --from below
 # never fails the build over an empty folder.
 && mkdir -p realDeal/cli/node_modules

# ── Stage 2: the runtime image ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Hints for libraries that check it (fewer debug code paths, smaller logs).
ENV NODE_ENV=production

WORKDIR /app

# node_modules from the deps stage. Workspace packages are hoisted to the root
# node_modules, with a handful of per-workspace leftovers in realDeal/cli —
# copy both so Node's resolution walk finds everything.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/realDeal/cli/node_modules ./realDeal/cli/node_modules
COPY package.json ./
COPY realDeal/cli/package.json realDeal/cli/

# The service itself and everything it imports by relative path. Paths are kept
# IDENTICAL to the repo layout because the source uses `../../contracts/...`
# and `../../../demoLand/...` style imports (see rollup-session.js /
# rollup-v3p-contract.js) and DEFAULT_V3P_MANAGED_DIR is resolved relative to
# the cli source directory.
COPY realDeal/cli/src ./realDeal/cli/src
COPY realDeal/shared ./realDeal/shared
# Referee (off-chain rule engine that mirrors the circuit).
COPY realDeal/contracts/rollup-*-referee.js ./realDeal/contracts/
# Compiled v3p contract: generated JS bindings (committed) + keys/ + zkir/
# (gitignored, see the big note at the top). compiler/contract-info.json is
# tiny and useful for `docker exec` debugging of which compiler built the keys.
COPY realDeal/contracts/managed/proof-or-bluff-rollup-v3p ./realDeal/contracts/managed/proof-or-bluff-rollup-v3p
# rollup-v3p-contract.js reuses guards/bridges from rollup-contract.js (v2),
# which statically imports the v2 generated bindings. Only the committed JS is
# needed — v2 is never proven here, so its keys/zkir are not copied.
COPY realDeal/contracts/managed/proof-or-bluff-rollup/contract ./realDeal/contracts/managed/proof-or-bluff-rollup/contract
# The scripted bot AI lives in the demo app. scripted.js imports ../deck.js, so
# the whole (tiny, dependency-free) demoLand/src/game folder comes along.
COPY demoLand/src/game ./demoLand/src/game

# ── Non-root ───────────────────────────────────────────────────────────────
# The node image ships a `node` user (uid 1000). The service holds the operator
# wallet seed in memory and talks to the public internet (Blockfrost); running
# it as root inside the container would hand any RCE bug root-in-container.
#
# /state is where EVERYTHING mutable goes: compose mounts the pob-api-state
# volume there. state.js writes to `<cwd>/.pob-state`, the level private-state
# db is created relative to cwd too, and POB_SPONSORED_STATE_DIR=/state holds
# the persisted chain queue. So cwd MUST be /state (hence WORKDIR below) and
# /state must be owned by `node`. /app stays read-only-by-convention.
RUN mkdir -p /state && chown -R node:node /state
USER node
WORKDIR /state

# Listening port inside the container. Caddy proxies to pob-api:3020; nothing
# publishes it on the host. The service also honours POB_API_PORT.
ENV POB_API_PORT=3020
EXPOSE 3020

# The slim image has no curl/wget, so the probe is Node's own fetch(). It only
# checks the HTTP layer answers 2xx; `/v1/health` itself reports wallet/DUST
# readiness in its body (`ok`, `wallet.dustReady`) — read that with curl via
# Caddy, not from here. start-period is generous because the wallet needs to
# sync from the indexer before the service considers itself up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3020/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Absolute path because WORKDIR is /state (see above), not /app.
CMD ["node", "/app/realDeal/cli/src/sponsored-service.js"]
