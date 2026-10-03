# Deployment — Proof or Bluff (Season 1, one-proof-per-game)

**Written:** 2026-10-03. Replaces the April 2026 guide (wagered contract,
WebSocket relay, Railway) which no longer describes anything we run.
**Scope:** what is deployed today, how each piece is built and pushed, and
what is deliberately not built yet. Design lives in `docs/ZK_GAME_ROLLUP.md`;
the mainnet gating procedure lives in `docs/MAINNET_LAUNCH_RUNBOOK.md`.
This file does not override either.

**Hard rule, repeated here on purpose:** no public-network edition of Proof
or Bluff holds, moves, or escrows money. Any future monetary mode settles
**only after a verified closing proof** (`ZK_GAME_ROLLUP.md` §3).

---

## 1. Overview

Three surfaces. Two are static hosting on Vercel; one is a VPS we operate.

```
 prooforbluff.com                prooforbluff.app                 VPS 69.62.70.163 (Hostinger KVM 2)
 Vercel · static · site/         Vercel · Vite · realDeal/app     docker compose @ /opt/prooforbluff
 ┌──────────────────────┐        ┌──────────────────────┐         ┌──────────────────────────────────┐
 │ marketing, rules,    │ links  │ game UI              │  HTTPS  │ caddy  :443  TLS + CORS lock     │
 │ privacy, status      │ ─────► │ (today: demo build)  │ ──────► │   ├─ proof.prooforbluff.app      │
 └──────────────────────┘        └──────────┬───────────┘         │   │    → proof-server :6300 (8.1.0)│
                                            │                     │   └─ api.prooforbluff.app  (503) │
                                            │ Lace wallet         │        → pob-bot / pob-proxy      │
                                            ▼                     │          (not yet built)         │
                                   Midnight public network        └──────────────────────────────────┘
```

Game flow once the rollup is wired end-to-end (spec §2):

```
 openGame tx ──► play off-chain (instant, signed transcript) ──► closeGame tx
 4 commitments    bot reveals salt at the end                     ONE proof over the
 (entropy, salt   browser holds every witness                      whole game; chain
  × 2 players)    witnesses → proof.prooforbluff.app               records scores + root
```

The chain sees who played, the mode, the final score, the winner, and a hash
of the move list. Never a card.

---

## 2. Surfaces & URLs

| Surface | URL | Hosting | Source | Status (Oct 3 2026) |
|---|---|---|---|---|
| Marketing site | https://prooforbluff.com (+ `www`) | Vercel project `prooforbluff-site`, team EnterpriseZK Labs | `site/` | **Live**, HTTPS, apex + www 200 |
| Game app | https://prooforbluff.app | Vercel project `prooforbluff-app` | `realDeal/app` (`npm run build:demo`) | **Live** — demo / instant-play build, no chain |
| Hosted proof server | https://proof.prooforbluff.app | VPS, Caddy → `midnightntwrk/proof-server:8.1.0` | `ops/vps/` | **Live, verified** (`/health`, `/version`, `/ready`) |
| API (bot + Blockfrost proxy) | https://api.prooforbluff.app | VPS, Caddy | `ops/vps/Caddyfile` | **Placeholder** — returns 503 until `pob-bot` / `pob-proxy` exist |
| Contract on Preview | `cc75d39e2d11096d160be2524dc2bbc9c6a569f2906d0adade33d6227f06a159` | Midnight Preview | `proof-or-bluff-mainnet.compact` | Deployed (per-move predecessor, **not** the rollup) |
| Contract on mainnet | — | — | `proof-or-bluff-rollup.compact` | **Not yet** |

---

## 3. Contracts

All in `realDeal/contracts/`. Immutable once deployed: there is no upgrade
circuit; a change means a new address (runbook M3).

| File | What it is | May be deployed to | Status |
|---|---|---|---|
| `proof-or-bluff-rollup.compact` | **Season 1 launch contract.** `openGame` / `closeGame` / prune; one proof per game; no funds, never receives a coin | Preview → (Preprod) → mainnet | Compiles (`managed/proof-or-bluff-rollup/` has `contract/` + `compiler/`, no keys yet); sim tests in `proof-or-bluff-rollup.sim.test.js`; **not deployed anywhere** |
| `proof-or-bluff-mainnet.compact` | Per-move predecessor ("state-only"). Same fairness model, 13 circuits, proves every move | Preview only | Deployed on Preview at `cc75d39e…06a159`; retired when Season 1 opens |
| `proof-or-bluff.compact` | Original wagered contract (Zswap escrow, payouts) | **Local `undeployed` only** | Never on a public network; `config.js` throws if selected with any public `VITE_NETWORK_ID` |
| `player-stats.compact` | Season / rank bookkeeping from the hackathon era | — | Not part of Season 1 |

**Money:** none of the three public-network candidates has a payment circuit.
The wagered file exists for local experimentation only. A future wagered
edition is a separate contract and a separate state-channel design
(`ZK_GAME_ROLLUP.md` §3.1–3.2), gated on verified closing proofs.

---

## 4. Build & compile

### Toolchain (confirmed via Midnight Expert / Kapa, Oct 2026)

| Component | Version |
|---|---|
| Compact CLI (`compact`) | 0.5.1 |
| Compact compiler | **0.31.1** (language 0.23) |
| `@midnight-ntwrk/compact-runtime` | 0.16.0 |
| ledger | 8.0.2 |
| midnight.js | 4.1.1 |
| proof-server image | `midnightntwrk/proof-server:8.1.0` |

**Version policy:** stay on `compact update 0.31`. A bare `compact update`
installs 0.35.x, which targets ledger 9 and is **not** on preview / preprod /
mainnet. Bump the proof-server tag only together with ledger / compact /
midnight.js, after re-checking the support matrix.

### Compiling

```bash
scripts/compile-contract.sh            # proof-or-bluff.compact (local wagered)
scripts/compile-contract.sh --mainnet  # proof-or-bluff-mainnet.compact (Preview per-move)
```

The script refuses any compiler that is not 0.31.x and does a **full**
compile (no skip flags) because deployment needs `keys/` and `zkir/`, not
just JS. It has no flag for the rollup yet; compile that by hand with the
same pattern until the script grows one:

```bash
compact compile [--skip-zk] realDeal/contracts/proof-or-bluff-rollup.compact \
                             realDeal/contracts/managed/proof-or-bluff-rollup
```

- `--skip-zk` → `contract/` (JS + `.d.ts` bindings) and `compiler/` only.
  Fast; enough for unit / simulator tests and for the browser build to
  typecheck.
- Full compile → additionally `keys/` (prover + verifier key per circuit)
  and `zkir/`. Required before any deploy or any real proof. The per-move
  `playCards` prover key alone is 76 MB; expect the rollup `closeGame` key to
  be large and slow.

### Artifacts and git

`realDeal/contracts/managed/<contract>/`:

| Dir | Committed? | Why |
|---|---|---|
| `contract/` | yes | small JS bindings; lets tests run on a fresh checkout |
| `compiler/` | no (`.gitignore`) | compiler metadata |
| `keys/` | no | large generated key material |
| `zkir/` | no | large generated circuit IR |

The app reaches the managed dir via the `realDeal/app/src/contract` symlink
and serves `zkir/` + `keys/` at runtime, so a compile updates every surface
without copying. Every machine that builds or deploys must compile locally
first.

---

## 5. Deploying each surface

### 5.1 `prooforbluff.com` — Vercel, static

`site/vercel.json`: `framework: null`, no build command, output `.`,
`cleanUrls`, strict CSP (`connect-src 'none'`, `frame-ancestors 'none'`).

```bash
cd site && vercel --prod          # project: prooforbluff-site
```

No env vars. No runtime code.

### 5.2 `prooforbluff.app` — Vercel, Vite

`realDeal/app/vercel.json`: `framework: vite`, `buildCommand: npm run
build:demo`, output `dist/`, SPA rewrite (everything except `/assets/` and
`/managed/` → `index.html`).

```bash
cd realDeal/app && vercel --prod  # project: prooforbluff-app
```

Env vars (Vercel → Project → Settings → Environment Variables, **Production**):

| Var | Value / state | Notes |
|---|---|---|
| `VITE_HOSTED_PROOF_SERVER_URL` | `https://proof.prooforbluff.app` — **set** | Default proof-server choice; player can switch to `localhost:6300` in the UI, remembered in localStorage |
| `VITE_NETWORK_ID` | unset today (demo build ignores it) | `preview` / `preprod` accepted; `mainnet` **throws** in `config.js` |
| `VITE_CONTRACT_VARIANT` | unset today | Must be `state-only` on any public network |
| `VITE_CONTRACT_ADDRESS` | unset today | 64-hex; alternative to the localStorage address |
| `VITE_MAINNET_PROXY_URL` | **planned, not read by code yet** | The switch that will lift the mainnet refusal once `pob-proxy` exists (runbook M3) |

Switching the public build from demo to the chain-wired app = change
`buildCommand` (or add a script) and set the three network vars. Not done.

### 5.3 DNS — GoDaddy, TTL 600

| Host | Type | Value | Serves |
|---|---|---|---|
| `@` (prooforbluff.com) | A | `76.76.21.21` | Vercel |
| `www` | CNAME | `cname.vercel-dns.com` | Vercel |
| `@` (prooforbluff.app) | A | `76.76.21.21` | Vercel |
| `proof` | A | `69.62.70.163` | VPS / Caddy |
| `api` | A | `69.62.70.163` | VPS / Caddy |

Caddy obtains Let's Encrypt certificates itself for every hostname in the
Caddyfile; it needs 80 + 443 open and the A record already pointing at it.
Uncomment the staging `acme_ca` line while testing DNS to avoid rate limits.

### 5.4 VPS — `ops/vps/`

Host: Hostinger KVM 2, 2 vCPU / 8 GB, `69.62.70.163`, **shared with
TaskFence Ai**. Stack at `/opt/prooforbluff`. `ops/vps/compose.yaml` and
`ops/vps/Caddyfile` are the source of truth — never hand-edit on the box.
(The runbook's "VPS: Hetzner CPX31" line predates this; Hostinger is what runs.)

```bash
export POB_VPS_SSH_KEY=~/Hostinger-secrets-folder/<key>   # outside git
ops/vps/deploy.sh          # scp compose.yaml + Caddyfile, docker compose up -d
ops/vps/deploy.sh status   # compose ps + docker stats
ops/vps/deploy.sh logs     # follow
```

`POB_VPS_HOST` / `POB_VPS_USER` override the defaults (`69.62.70.163`, `root`).

**Resource policy** ("POB wins the fight, TaskFence stays alive"):

| Container | `cpu_shares` | `mem_limit` |
|---|---|---|
| `pob-proof-server` | 2048 | 4608 MiB |
| `pob-caddy` | 1024 | 256 MiB |
| TaskFence (all) | 256 (`docker update`) | 2.75 GiB total |

`cpu_shares` only bite under contention; idle POB = TaskFence has the box.
~0.5 GiB left for the OS.

**Proof server configuration** is via env vars, not CLI flags: the image's
ENTRYPOINT is `bash -c <string>`, so compose `command` arrays are silently
dropped (verified Oct 3: `/ready` reported `jobCapacity 0`).

| Env | Value | Why |
|---|---|---|
| `MIDNIGHT_PROOF_SERVER_PORT` | 6300 | |
| `MIDNIGHT_PROOF_SERVER_NUM_WORKERS` | 2 | one proving job pins one core |
| `MIDNIGHT_PROOF_SERVER_JOB_CAPACITY` | 10 | beyond that clients get 429, not OOM |
| `MIDNIGHT_PROOF_SERVER_JOB_TIMEOUT` | 600 | rollup `closeGame` may be large |

Port 6300 is `expose`d only; Caddy is the sole way in. Params/keys cache in
the `proof-params` volume; certs in `caddy-data`. First boot can take minutes
(300 s healthcheck start period).

**Why Caddy:** the proof server ships `Cors::permissive()`. Caddy pins
`Access-Control-Allow-Origin` to `https://prooforbluff.app`, answers
preflights itself, caps bodies at 64 MB, and waits 660 s for a response.
Add preview origins to the `pob_cors` snippet; never `*`.

**Verification:**

```bash
curl -s https://proof.prooforbluff.app/health
curl -s https://proof.prooforbluff.app/version      # expect 8.1.0
curl -s https://proof.prooforbluff.app/ready        # jobCapacity must be > 0
# CORS: allowed origin echoes back, preflight is a 204 from Caddy
curl -s -I -X OPTIONS -H 'Origin: https://prooforbluff.app' \
     -H 'Access-Control-Request-Method: POST' https://proof.prooforbluff.app/health
curl -s -I https://api.prooforbluff.app/            # 503 placeholder today
```

---

## 6. Secrets policy

| Secret | Lives | Never |
|---|---|---|
| Blockfrost `project_id` (mainnet) | VPS env only (`BLOCKFROST_PROJECT_ID` for the CLI/bot and the future proxy) | `VITE_*`, git, chat |
| Operator seed (`POB_PUBLIC_SEED_P2`), one per network | VPS env + password manager + paper backup | reused across networks; the laptop seed never goes to the server |
| Future email-receipt API key | VPS env | browser bundle |
| VPS SSH private key | `~/Hostinger-secrets-folder/` (pointed at by `POB_VPS_SSH_KEY`) | git |
| Proof witnesses in transit | proof server memory during a job | logged |

The browser **never** holds Blockfrost credentials: `config.js` throws on
`VITE_NETWORK_ID=mainnet` until a server-side proxy exists. Committed
`realDeal/cli/.env` contains only public local-dev test seeds; everything
else is `.env.local` (ignored). Full rules: runbook §2 and M1.

---

## 7. Mainnet procedure

Do not improvise. `docs/MAINNET_LAUNCH_RUNBOOK.md` M4 holds the **one
guarded command**, approved by John, run **once**, from the server:

```
POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT  POB_NETWORK_ID=mainnet ...
```

`create-match` is today the only deploy-capable CLI command; the rollup will
need its equivalent (`openGame` as the first house table) wired behind the
same guard before M4 can happen.

**Prerequisites (runbook M1–M3):**

- [ ] Blockfrost account + **Midnight Mainnet** project; `project_id` in server env only
- [ ] Fresh mainnet operator seed (offline-generated, backed up, custody paragraph in `realDeal/deployments.json`)
- [ ] cNIGHT acquired, DUST registered to the operator wallet via cNgD (~12 h), balance visible
- [ ] Dedicated mainnet Lace for John as Player One
- [ ] Midnight Discord answer recorded on whether the `deployments/` PR in the MIP repo is still required; PR opened if yes
- [ ] Security checklist walked; Preprod rehearsal done or waived in writing
- [ ] Rollup contract soaked on Preview (see §8 — not started)
- [ ] Blockfrost proxy live so `.app` can be pointed at mainnet

**Evidence rule:** a deployment is not real until the contract address
**and** the deploy tx hash (via Blockfrost indexer `contractAction`) are
recorded in `realDeal/deployments.json` and `../../midnight-launches-log/`
— before the bot or `.app` is repointed.

---

## 8. Not yet built (honest list)

| Item | Where it lands | State |
|---|---|---|
| Bot / game server for the rollup (off-chain opponent, salt reveal, sponsors `openGame` + `closeGame`) | VPS `pob-bot`, behind `api.prooforbluff.app` | Not started; Caddy returns 503 |
| Blockfrost proxy (origin-locked, injects `project_id` server-side) | VPS `pob-proxy`; `VITE_MAINNET_PROXY_URL` | Not started; browser mainnet stays refused |
| Rollup contract on Preview | New address, recorded in launch log | **Not deployed.** Only the per-move contract is on Preview |
| Full-key compile of the rollup + `closeGame` proving-time measurement on the VPS at `MAX_MOVES` ∈ {32, 48, 64} | sizes `MAX_MOVES`, `JOB_TIMEOUT`, capacity copy | Not measured; current numbers in the spec are estimates |
| Chain-wired `.app` build on Vercel (replacing `build:demo`) | `realDeal/app/vercel.json` + env | Not switched |
| Proof receipts: in-app "My Games", browser push, opt-in email | bot + `.app`; email key on VPS | Not started |
| `compile-contract.sh --rollup` | `scripts/` | Not added |
| Observability (contractAction poll, DUST alert, uptime on proof + bot) | runbook M5 | Not started |
