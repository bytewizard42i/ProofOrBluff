# MidnightVitals Audit — 2026-10-02

**Scope**: read-only review of `/home/js/DIDzMonolith/MidnightVitals` (sibling
repo in the monolith, last commit `d2ac364` 2026-09-06) against the current
public-network matrix, to decide how Proof or Bluff (POB) should consume it.
Nothing in MidnightVitals was edited.

**Staleness reference used** (verified Oct 2 2026): midnight-js 4.1.1,
`@midnight-ntwrk/wallet-sdk` 1.2.0 (single barrel), ledger-v8 8.1.2,
compact-runtime 0.16.0, Compact compiler 0.31.x; indexer API path
`/api/v4/graphql` (v3 legacy); Mainnet RPC/indexer are Blockfrost-only
(`rpc.midnight-mainnet.blockfrost.io`, `midnight-mainnet.blockfrost.io/api/v0`
with `?project_id=…`); `*.mainnet.midnight.network` hosts retired; Preview =
`rpc/indexer.preview.midnight.network`; Preprod = `.preprod.midnight.network`;
proof server default `localhost:6300`; faucets
`https://midnight-tmnight-preview.nethermind.dev/` and
`https://midnight-tmnight-preprod.nethermind.dev/`.

---

## 1. What MidnightVitals is

Two things live under one name, and the README says so itself
(`README.md:21-30`, `README.md:52-66`):

| Layer | Location | Status |
|---|---|---|
| **Headless probe core** `@midnight-vitals/core` v0.1.0 | `packages/core/src/` (6 probe files + `types.ts` + `index.ts`, ~400 lines TS) | Real, compiled (`packages/core/dist/` exists). README claims "verified live against localnet and preprod" on Aug 2 2026 — **unverified by this audit** (no live run performed). |
| **CLI** `@midnight-vitals/cli` v0.1.0 | `packages/cli/src/main.ts` (66 lines) | Real; `vitals check [--target localnet\|preprod\|preview] [--address …] [--network-only] [--json]`. |
| **React diagnostic panel** (time wheels, console log, dock/float) | NOT in this repo. README says source remains in `DiscoveryManagement/MidnightVitals` and the ZKSplunk fork, "pending audited extraction" (`README.md:24-28`, `README.md:60-66`). | Documentation only here. `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, `docs/DESIGN_SPEC.md`, `docs/INTEGRATION_GUIDE.md` (all "Version 0.4.0") describe that absent panel. |

Other contents: `docs/BUSINESS_PLAN.md`, `docs/ROADMAP.md`,
`docs/BLOCKFROST_INTEGRATION_GUIDE.md` (dated Apr 21 2026),
`docs/SPLUNK_DEVREL_INTEGRATION.md`, `docs/ZKTimes-ideation.md`,
`docs/reviews/2026-09-05/` (link punch list), `SIGN_IN_SELECTIONS.md`
(pointer only), `archive/` (pre-July README). Protocol authority is external:
`DIDzMonolith-docs/standards/MIDNIGHTVITALS_PROTOCOL.md` (exists on disk; not
audited here).

**No tests exist** anywhere in the repo (`find . -name "*.test.*"` → empty),
although `vitest ^4.1.10` is a devDependency (`package.json:16`).

## 2. What it currently diagnoses (core probes, facts from source)

| Probe | File | What it does | Timing captured? | SDK version capture? |
|---|---|---|---|---|
| `probeNode` | `packages/core/src/probes/node.ts` | JSON-RPC `system_health` + `system_version` over HTTP POST; flags syncing / 0-peers-when-should-have-peers as `degraded`. 10 s timeout. | Yes — every probe is wrapped by `reading()` (`types.ts:67-87`) which records `elapsedMs` and `at`. | Node binary version only (`system_version`). |
| `probeIndexer` | `probes/indexer.ts` | GraphQL `{ block { height hash timestamp } }`; `degraded` if latest block > 60 s old. | Yes | No |
| `probeProofServer` | `probes/proof-server.ts` | GET `/health` then `/version` on the proof-server URL; `down` if neither answers. 5 s timeout. | Yes | Proof-server version string (first 200 chars of body). |
| `probeToolchain` | `probes/toolchain.ts` | `node --version`, `compact --version`, `compact compile --version`, `docker --version` via `child_process`. Deliberately does NOT pin "correct" versions (`toolchain.ts:5-8`). | Yes | Local toolchain only. **Node-only** (child_process). |
| `probeDockerStack` | `probes/docker-stack.ts` | `docker ps` filtered on `/midnight/i`. | Yes | No. **Node-only.** |
| `probeAddress` | `probes/address.ts` | graphql-ws subscription `unshieldedTransactions(address)` replay → tx count + unshielded balance. | Yes | No. Uses the `ws` npm package (**Node-only**). |

**Not captured anywhere in core**: midnight-js / wallet-sdk / ledger /
compact-runtime package versions, wallet state, contract deployment health,
per-operation (circuit call) timing, UI interaction log. Those exist only as
README feature prose for the un-extracted React panel (`README.md:107-135`).

**Service health pings**: yes (node / indexer / proof server), single-shot;
no timer loop in core — the CLI runs once and exits. The "20 s / 30 s interval"
table (`README.md:111-116`) describes the absent panel.

## 3. Midnight versions / endpoints assumed

### Core (`packages/core/src/types.ts:41-64`) — mostly current
- `localnet`: node `http://127.0.0.1:9944`, indexer `http://127.0.0.1:8088/api/v4/graphql`, ws `…/api/v4/graphql/ws`, proof `http://127.0.0.1:6300` — **current**.
- `preprod`: `https://rpc.preprod.midnight.network`, `https://indexer.preprod.midnight.network/api/v4/graphql` — **current**.
- `preview`: `https://rpc.preview.midnight.network`, `https://indexer.preview.midnight.network/api/v4/graphql` — **current**.
- **No `mainnet` target** at all. Not stale per se (nothing wrong is asserted), but a gap: Blockfrost-only mainnet (`?project_id=`) is unsupported by `VitalsTarget` (no auth field).
- Core has **zero `@midnight-ntwrk/*` dependencies** (`packages/core/package.json:19-21` — only `ws`). So it cannot be version-mismatched with the SDK; it also cannot report SDK versions.
- Blocks assumed to land "every ~6s" (`indexer.ts:30`) — **unverified** against current chain parameters.

### Docs — stale items (file:line)
| Location | Says | Current reality |
|---|---|---|
| `README.md:465` | Indexer health endpoint `{INDEXER_URL}/api/v1/status (GraphQL)` | Indexer API is `/api/v4/graphql`; there is no `/api/v1/status`. |
| `docs/ARCHITECTURE.md:342` | Network probe `POST {INDEXER_URL}/api/v1/graphql (introspection)` | `/api/v4/graphql`. |
| `README.md:113`, `README.md:456`, `docs/ARCHITECTURE.md:277`, `docs/ARCHITECTURE.md:341`, `docs/ROADMAP.md:148` | Proof server checked via `/version` only | Core now tries `/health` first then `/version` (`proof-server.ts:13`) — docs lag the code (minor). |
| `README.md:388` | Live provider for "Midnight preprod/mainnet" | Mainnet is Blockfrost-only; no Blockfrost support in core. |
| `docs/BUSINESS_PLAN.md:29`, `:88`, `:98`, `:218-234` | "Midnight is a pre-mainnet ZK blockchain", "Stage: Pre-mainnet (preprod testnet)", mainnet "2026-2027" | Mainnet exists (Blockfrost RPC/indexer are live). Business framing is stale. |
| `docs/BUSINESS_PLAN.md:78` | "Visit the faucet" (no URL) | Current faucets are the Nethermind-hosted `midnight-tmnight-preview/preprod.nethermind.dev`. Not wrong, just non-specific. |
| `docs/INTEGRATION_GUIDE.md:25-31`, `README.md:443-448` | Requires React 18, Tailwind 4, Lucide, react-router-dom | Describes the un-extracted panel. POB uses plain CSS and no router (`realDeal/docs/PHASE_3_MIDNIGHTVITALS.md:118-129`). |
| `README.md:5` badge | "License MIT" | `LICENSE` file and `package.json:7` say Apache-2.0. Inconsistent. |
| `docs/BLOCKFROST_INTEGRATION_GUIDE.md:42-51` | `https://midnight-${network}.blockfrost.io/api/v0`, `rpc.midnight-${network}.blockfrost.io`, `?project_id=` | **Current** — matches the Oct 2 2026 reference. Still only a doc; never wired into core. |

### Things that are current / fine
- All v4 indexer paths in core (`types.ts:46-61`).
- Proof server local default `6300` (`types.ts:48,55,62`).
- Preview / Preprod hostnames (`types.ts:52-61`).
- Toolchain probe's stance of not hardcoding compiler versions (`toolchain.ts:5-8`) matches house rules.

## 4. Relationship to the prior POB plan (`realDeal/docs/PHASE_3_MIDNIGHTVITALS.md`)

That plan (May 16 2026) assumed a **React panel** npm package
`@bytewizard42i/midnight-vitals` with `<MidnightVitalsPanel endpoints=… walletHandle=…>`
(`PHASE_3_MIDNIGHTVITALS.md:59-86`). Stale points in the plan itself:
- Example endpoints use `/api/v3/graphql` (`:77-78`) — v3 is legacy; POB's own
  `realDeal/app/src/midnight/config.js:66-76` already uses v4.
- The package that actually exists is `@midnight-vitals/core` (headless, Node-leaning),
  not a React panel; the panel was never extracted (`README.md:60-66`).
- Path B (vite alias to `../../MidnightVitals/src`) points at a `src/` that does not exist; real source is `packages/core/src/`.
- The Tailwind concern (`:126-129`) remains valid for the panel but is moot for core.

## 5. Reusability for POB — what fits, what doesn't

**Reusable as-is from core (browser-safe, no deps)**:
- `VitalReading` / `reading()` shape (`types.ts:16-30`, `:67-87`) — a good uniform
  result record (id, label, status, summary, details, elapsedMs, at).
- `probeIndexer` logic (`indexer.ts:13-38`) — plain `fetch`, works in a browser
  (subject to CORS on public indexers — **unverified**).
- `probeProofServer` logic (`proof-server.ts:13-25`) — plain `fetch`, browser-safe.
- `probeNode` logic (`node.ts:11-22`) — plain `fetch`, browser-safe.

**Not usable in the POB browser app**:
- `probeToolchain`, `probeDockerStack` (`node:child_process`) and `probeAddress`
  (`ws` package) — Node-only. Since `index.ts:17-22` imports all six statically,
  importing `@midnight-vitals/core` into a Vite bundle would drag in `node:*`
  and `ws` and fail or need shims.
- Package is `private`-workspace-local, unpublished, `dist/` committed to disk
  but not to a registry; consuming it would require a `file:` link across
  sibling repos or a git submodule (monolith already has it as a sibling).

**Gaps relative to what POB needs now** (from the Oct 2 handoff: a sanitized,
copy-pasteable diagnostic report with operation timeline, SDK versions,
wallet summary, health snapshot, and secret redaction):
- No redaction / sanitization logic anywhere in MidnightVitals.
- No operation/activity timeline, no SDK version capture, no wallet summary.
- No Blockfrost / `project_id` handling (and therefore no risk of leaking one,
  but also no mainnet support).

## 6. Recommendation

**Build a thin adapter inside POB now; do not take a dependency on
`@midnight-vitals/core` yet.** Reasons:
1. Core's static barrel pulls Node-only modules into a browser bundle (`index.ts:17-22`); fixing that is a MidnightVitals change, not a POB one.
2. Core has no tests, is unpublished, and has not been touched since Aug 2 2026 (probe code) — too little guarantee to make POB's demo depend on it.
3. The pieces POB most needs (redaction, activity timeline, wallet summary, SDK versions) do not exist in MidnightVitals at all.

**Copy a small piece**: adopt the `VitalReading`-style record shape
(`id, label, status, summary, details, elapsedMs, at`) for POB's
`healthSnapshot` so a future swap to core is mechanical. Do not copy probe code
verbatim; POB's proof-server/indexer fetches are 10-line functions.

**Later (Phase 3 proper)**: once MidnightVitals (a) splits browser-safe probes
from Node-only ones (separate entry points), (b) adds a Blockfrost-aware target
with an auth field that is never logged, (c) gains tests, and (d) publishes,
POB can replace its adapter's health-probe layer with
`@midnight-vitals/core` and keep its own redaction + report layer.

**Housekeeping to raise in the MidnightVitals repo (not done here)**:
`README.md:465` and `docs/ARCHITECTURE.md:342` → `/api/v4/graphql`;
MIT badge vs Apache-2.0 license; add a `mainnet` (Blockfrost) target note;
`PHASE_3_MIDNIGHTVITALS.md:77-78` in POB → v4.

## 7. Unverified items (explicitly)
- "Verified live against localnet and preprod" (`README.md:59`) — not re-run.
- Browser CORS behaviour of `indexer.preview/preprod.midnight.network` and of `localhost:6300/health` — not tested.
- Whether `DIDzMonolith-docs/standards/MIDNIGHTVITALS_PROTOCOL.md` contradicts anything above — not read.
- Current block interval (~6 s assumption at `indexer.ts:30`).
- Contents of `DiscoveryManagement/MidnightVitals` (the panel source) — out of scope.
