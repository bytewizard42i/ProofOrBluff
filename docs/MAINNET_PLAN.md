# Mainnet Plan — FINAL — Proof or Bluff, State-Only Edition

**Status**: ON PREVIEW / NOT READY FOR MAINNET — updated Oct 3, 2026.
This is the design record and gate history. **The step-by-step execution
plan now lives in `MAINNET_LAUNCH_RUNBOOK.md`** — read that first. Paths
relative to `/home/js/DIDzMonolith/ProofOrBluff_MLH_Midnight/`.

### Gate status on Oct 3 (supersedes the Oct 2 table below it)

| Gate | Status | Evidence |
|---|---|---|
| G0 deploy-confirmation stall | **FIXED** | Root cause: wallet packages a major behind + local stack 5 months stale. Fixed by the public-network SDK matrix + re-pinned `midnight-local-dev`. Launch log issues #1–#3. |
| G1 state-only local e2e | **PASSED** | Full lifecycle on local chain, contract `587b0f91…`, all asserts green. |
| G2 public-network SDK matrix | **DONE** | midnight-js 4.1.1, wallet-sdk 1.2.0, ledger-v8 8.1.2 (root override), indexer api/v4. |
| G2b **Preview deploy** | **DONE** | `cc75d39e2d11096d160be2524dc2bbc9c6a569f2906d0adade33d6227f06a159`, createMatch block 1129259. e2e steps 1–2 passed; 3–5 running at time of writing. |
| G2c Preview browser (Lace) match | **NOT STARTED** | Runbook gate P2. |
| G2d Hosted bot + proof server + `.app`/`.com` live | **NOT STARTED** | Runbook gate P3. Domains are GoDaddy-parked. |
| G3 Preprod | **NOT STARTED** | Runbook gate M2 (recommended, not mandatory). |
| G4 Mainnet | **LOCKED** | Runbook M1 (accounts/DUST, John), M3 (security + Foundation authorisation — still listed in the official checklist as of Oct 3), M4 (one approved command). |

### Oct 2 gate table (historical — kept for the record)

| Gate | Status | Evidence / next action |
|---|---|---|
| G0 original wagered local e2e | **BLOCKED BY DEPLOY CONFIRMATION** | Docker 29.8.1 and the pinned node/indexer/proof-server are healthy. On Oct 2 a fresh-namespace e2e synced P1 and the proof server returned `proof ok`, but `deployContract` never returned: a transaction remained in the node mempool. We stopped only the CLI after confirming the stall; no successful deploy receipt exists. Diagnose the pending tx and SDK/local-stack mismatch without wiping chain data. |
| G1 state-only local e2e | **BLOCKED** | A separate 0.31.1 Compact contract compiles with all 13 circuits; 46 offline tests and three app builds pass. Built preview renders; live browser wallet match is unverified. Run `POB_STATE_NAMESPACE=<fresh> npm run cli -- e2e --contract state-only` after fixing G0, then test Lace→bot. |
| G2 public-network SDK matrix | **NOT STARTED** | Repo still uses midnight-js 4.0.x and split wallet SDK; official public-network matrix requires midnight-js 4.1.1 and wallet-sdk 1.2.0. Do not upgrade without G0/G1; test after upgrade. |
| G3 Preprod | **NOT STARTED** | Needs fresh wallet seeds, tNIGHT/DUST, and a successful full match. |
| G4 Mainnet | **LOCKED BY PROJECT GATES** | Human deployment approval, Blockfrost token kept server-side, DUST, security review, working hosted game/bot, and verified Preprod match required. Confirm whether Foundation deployment credentials are still required; the official checklist lags the Oct 2 announcement. |

The browser mainnet path is intentionally disabled: putting the Blockfrost
project token in Vite environment variables would publish it. Build a
server-side proxy or use trusted wallet-provided endpoints before enabling it.

**Browser dev-server caveat:** the built state-only app rendered in a headless
browser; the `vite dev` state-only mode served the page and proof keys but
left the React root empty in that browser without an actionable console error.
Investigate this in a regular browser before claiming the UI works; do not
use the production build alone as proof of an interactive match.

### Oct 2 launch announcement: what was actually verified

- [Sébastien's announcement](https://x.com/SebastienGllmt/status/2105899291273478584):
  "Contracts are LIVE on Midnight mainnet." It contains a 39-second video;
  the audio transcription did not yield a reliable technical explanation, so
  do not infer prerequisites from the clip.
- [His follow-up](https://x.com/SebastienGllmt/status/2105899293282648408):
  v8 enables basic private contracts **now**; contract composability and
  events come in v9 later. POB's standalone match contract needs neither
  contract-to-contract calls nor events. Design a versioned redeploy path
  rather than promise today's contract will magically gain v9 capabilities.
- [His next post](https://x.com/SebastienGllmt/status/2105899295606276138):
  use AI for getting started and ask in the Midnight Discord. It contains
  no deployment instructions or waiver of the published readiness checklist.
- The published [mainnet readiness checklist](https://docs.midnight.network/guides/networks-and-environments)
  still says to obtain Foundation authorization; fresh independent coverage
  says deployments are now permissionless. Treat this as a **documentation
  transition**, not settled proof either way; confirm current access with
  the Foundation before preparing a mainnet transaction.

### Provably fair edition (Oct 2, John's directive: gameplay proofs only)

Scope locked: **no payment circuits at all**. Every move by the human AND by
our bot carries a zero-knowledge proof that it did not cheat.

| Guarantee | Mechanism in `proof-or-bluff-mainnet.compact` | Verified by |
|---|---|---|
| Nobody can bias the deal | Commit–reveal of two entropies → shared seed `N`; only `commitSeed(N)` is public | sim test 1 |
| Nobody (incl. the dealer) can see your hand | Per-player secret **hand salt** committed at create/join; hand = `dealHandRanks(salt, N, round)` derived **in-circuit** | sim test 1 |
| You can't play a card you weren't dealt | `playCards` takes the real cards as witness, checks commitment + membership in the committed 13-rank-count hand, stores the remainder commitment | sim tests 2, 3, 5 |
| Bluffing stays legal | Claim is public, cards are private; `resolveChallenge` discloses one bit | sim test 4 |
| Reshuffle is as fair as the first deal | Hand empties → `round += 1` → fresh deal from the same committed material | sim test 6 |
| No modulo bias worth arguing about | 3-byte rejection fallback; residual ≈ 0.004 % | documented in contract |

Rule change this required: **challenge losers do not pick up the pile** (its
contents are private and unprovable); the pile is discarded and points
settle it. Only CASUAL / STANDARD / CASINO (score modes) are enabled.

Cost: `playCards.prover` grew to ~19.5 MB (in-circuit deal + membership).
Measure proof latency live before judging UX; it is the price of "the
dealer provably can't cheat", which is the headline feature.

Client wiring done: CLI (`getHand`, `playCards({role})`), bot (hand comes
from the contract-derived deal, no draw-pile guessing), browser
(`getProvableHand`, salt + hand record in localStorage). Live state-only e2e
against the local stack is the gate; it was still blocked by the deploy
confirmation stall at the time of writing.

### Launch scope: game now, payments later

- The first release uses **only** `proof-or-bluff-mainnet.compact`: no
  wagers, escrow, payouts, payment buttons, or purchase endpoint. Players
  still need network DUST for transaction fees. The old wagered contract
  publishes the shuffle seed and is unsuitable for real-money play.
- `ProTeaser` in the app header says "Go ad free, and other Pro features";
  hover/focus shows "Coming Soon!" and click opens a dialog listing ad-free
  play, peer-to-peer games, and optional play for money **as future ideas**.
  Nothing in that UI accepts payment or grants access.
- Before a public game launch, host the web UI, bot service, and proof
  server; the current bot binds `127.0.0.1:3017` and is a local developer
  service, not a deployable public game API. Keep the Blockfrost token behind
  a server proxy (or use wallet-managed endpoints), enforce origin/session
  authentication and rate limits, persist match state safely, and never
  ship server-held operator seeds to the browser. A mainnet contract deploy
  without a working player-facing app is a **contract launch**, not a game
  launch.

**The mission** (Jay Albert's challenge): be among the first mainnet deploys
with a dApp that only updates state — private and public state, **no money**.

---

## 0. Verified starting state (do not re-derive)

- Full match lifecycle proven on the local chain (Aug 2026): deploy →
  createMatch (escrow) → joinMatch → revealSeed → committed bluff →
  challenge → ZK resolveChallenge disclosing ONLY a boolean → scoring.
- Hardening landed Oct 2, 2026 (in working tree — **commit it first**):
  - Deploy guard: only `create-match` / `startGame` / header-create may
    deploy; everything else fails loudly. (`realDeal/cli/src/contract.js`,
    `realDeal/app/src/midnight/contract.js`, provider, header.)
  - Real `e2e` CLI command: scripted two-wallet lifecycle with assertions
    (`realDeal/cli/src/cli.js`). **Syntax-checked but NOT yet run live** —
    Docker was down. Gate G0 below closes this.
  - `set-address` CLI command; `scripts/compile-contract.sh` created;
    README status banner.
- Offline verification this session: 46/46 tests including compiled-circuit
  simulator and CLI preflight guard tests; full `compact compile` 0.31.1 of
  the 13-circuit state-only sibling; wagered, demo, and state-only browser
  builds. The built state-only browser renders without a wallet. Generated
  state-only proof keys are ignored by Git; `npm run compile:state-only` is
  required on a fresh checkout before building the app.
- Privacy correction: the old wagered contract publishes `combinedSeed`,
  allowing anyone to reconstruct both hands. The state-only sibling stores
  only `seedCommitment`; browser and bot derive the seed locally from their
  exchanged entropy and check it against that commitment. **Do not use the
  wagered contract for privacy claims or real-money wagering.**
- Known-good toolchain TODAY (re-verify every session via Kapa/support
  matrix — it moved twice since August): compact **0.31.1** (lang 0.23),
  compact-runtime 0.16.0, compact-js 2.5.1, **midnight-js 4.1.1**,
  **wallet-sdk 1.2.0 single barrel (pin EXACT — npm `latest` resolves to
  1.1.0)**, dapp-connector 4.0.1, proof server 8.1.0, indexer 4.3.x
  (**API v4** on public networks; our pinned local stack still speaks v3).
- Mainnet endpoints are **Blockfrost-only** since Sept 30, 2026 (Midnight-
  hosted mainnet endpoints retired). Proof server is ALWAYS local.
- **Oct 2 news is ahead of the docs:** Sébastien Guillemot publicly states
  contracts are LIVE on mainnet and that anyone should start building, but
  the official readiness checklist (re-verified via Kapa Oct 2) still lists
  "Deployment authorisation is requested" via a rubric PR + deployment
  credentials. Independent news reports call the Oct 2 release permissionless.
  Confirm the live requirement in the Midnight Discord before preparing a
  mainnet transaction; keep a rubric self-review regardless.

### Verified network path (docs, Oct 2)

| Network | Official role | Funding | Token needed |
|---|---|---|---|
| `undeployed` | local iteration | genesis wallet pre-funded | no |
| `preview` | **early dev on shared public infra** — "maintained by core engineering" | free faucet tNIGHT | no |
| `preprod` | **final validation — tracks mainnet most closely** | free faucet tNIGHT | no |
| `mainnet` | production | real cNIGHT → DUST, **~12 h registration delay** | Blockfrost project_id |

- Preview is a legitimate first public step for a no-stakes game — the docs'
  selection table maps "testing against shared public infrastructure early in
  development" to preview. It is NOT a prereq gate.
- Preprod is **not** reserved for major companies — it's a public faucet
  testnet open to everyone; it's simply the network that most closely mirrors
  mainnet versions. Skipping it is allowed but weakens the "what works on
  preview works on mainnet" guarantee, since preview may run newer builds.
- Endpoints (api/v4 indexer): preview `rpc.preview.midnight.network` /
  `indexer.preview.midnight.network/api/v4/graphql` / faucet
  `midnight-tmnight-preview.nethermind.dev`; proof server stays
  `localhost:6300` on every network.
- Mainnet deploy needs the ~12 h DUST registration delay — start cNIGHT
  registration the moment the Blockfrost account exists, or mainnet slips a
  full day regardless of code readiness.

## 1. Decision record (made, do not reopen)

1. **Mainnet v1 = state-only contract.** New file, new deploy — NOT an
   upgrade of the wagered contract. Wagered contract stays untouched as the
   realDeal track.
2. Honor-system gap (playCards lacks hand-membership proof) is acceptable
   and disclosed for a no-stakes game; Merkle proof remains realDeal R2.
3. This state-only first release has no maintenance/upgrade circuit. Treat
   it as immutable: preserve the deploying key, and redeploy a new version
   with a new address if needed. Document custody and version history in the
   eventual deployment registry.
4. Target UX for mainnet v1: TestWired-style browser-vs-bot (we operate P2)
   with Lace players as P1. Consumer/invisible mode stays in
   `docs/PRODUCTIZATION_PLAN.md` — out of scope here.

---

## 2. Milestones, owners, and gates

### M0 — Commit + live-verify the hardening — owner SOL — ½ session
| # | Task |
|---|---|
| 0.1 | Commit the Oct 2 hardening work (guard, e2e, set-address, compile script, README) in logical commits |
| 0.2 | Start local stack (`docker compose -f standalone.yml up -d` in `/home/js/utils_Midnight/midnight-local-dev`); health-check node/indexer/proof-server |
| 0.3 | Run `POB_STATE_NAMESPACE=e2e-$(date +%s) npm run cli -- e2e` — **Gate G0: e2e PASSED live.** Record tx IDs in `realDeal/docs/ACCEPTANCE_RUN_<date>.md` |
| 0.4 | Update `docs/ROADMAP.md` (still says demoLand Phase 1) |

### M1 — State-only contract — owner SOL — 1 session
| # | Task |
|---|---|
| 1.1 | **Offline done**: wrote smaller sibling `realDeal/contracts/proof-or-bluff-mainnet.compact` preserving the no-stakes two-player claim/challenge flow, timeouts, scoring, and queries. It stores `seedCommitment` instead of leaking the seed. It is NOT byte-for-byte the wagered contract and has not had a live match. |
| 1.2 | **Offline done**: `scripts/compile-contract.sh --mainnet` requires compact 0.31.x and produces 13 full circuits; generated proof keys are ignored and must be compiled on a fresh checkout. |
| 1.3 | **Offline done**: source boundary tests assert no escrow/value code and no published deal seed. These do not replace runtime security tests. |
| 1.4 | **Offline done**: CLI uses `--contract state-only` (not `mainnet`, which is a network), isolated address/state paths, and no wager. Bot and browser have opt-in state-only paths; browser mainnet is disabled pending a token-safe proxy. |
| 1.5 | **Gate G1 BLOCKED**: `POB_STATE_NAMESPACE=<fresh> npm run cli -- e2e --contract state-only` against local stack, then browser Lace-vs-bot match. Fix every runtime issue before moving on. |

### M2 — SDK alignment to public networks — owner SOL — 1 session (riskiest)
| # | Task |
|---|---|
| 2.1 | Bump `@midnight-ntwrk/midnight-js-*` → 4.1.1 in app + cli |
| 2.2 | Replace split `wallet-sdk-facade/-hd/-shielded/-dust-wallet/-unshielded-wallet` with `@midnight-ntwrk/wallet-sdk` **exact 1.2.0** — rewrite `realDeal/cli/src/wallet-node.js` against the barrel (crib from the official example-counter / ZK Loan example; check whether the `signRecipe` 'pre-proof' workaround is still needed, delete it if upstream fixed it) |
| 2.3 | Indexer URLs v3 → v4 where config targets public networks; local stack entries keep matching the pinned local images. Re-pin local images to matrix versions (node 1.0.x / indexer-standalone 4.3.3 / proof-server 8.1.0) and update `.env`/config comments |
| 2.4 | **Gate G2**: full e2e green on the re-pinned local stack for BOTH contracts; app builds in all modes |

### M3 — Preprod dress rehearsal — owner SOL + John — 1 session + waits
| # | Task | Owner |
|---|---|---|
| 3.1 | Fresh seeds (NEVER the committed local test seeds), stored outside git | John generates, SOL wires via env |
| 3.2 | Faucet tNIGHT + DUST registration for both operator wallets | John (clicks), SOL (verify balances) |
| 3.3 | Create `realDeal/deployments.json` per-network registry (address, deploy tx, date, custody notes) | SOL |
| 3.4 | Deploy state-only contract to preprod (`rpc.preprod.midnight.network`, indexer `/api/v4/graphql`, LOCAL proof server) | SOL |
| 3.5 | **Gate G3**: full documented match on preprod — browser Lace P1 vs bot P2, ≥1 challenge each way — tx IDs + `preprod.midnightexplorer.com` links in `realDeal/docs/PREPROD_RUN_<date>.md` | SOL drives, John clicks Lace |

### M4 — Mainnet readiness + deploy — owner mostly John — ½ session + waits
| # | Task | Owner |
|---|---|---|
| 4.1 | Blockfrost account + **Midnight Mainnet** project token (server-side env only, never in browser bundle) | **John** |
| 4.2 | Acquire cNIGHT; register for DUST via cNgD dApp (`midnight-dust-mainnet.nethermind.io`); **~12 h delay — start at M2 time** | **John** |
| 4.3 | Score against the official deployment rubric regardless of permissioning. Ask the Foundation/Discord whether the Oct 2 open-mainnet release removed the authorization PR; submit the PR only if still required. | **John** (SOL drafts if needed) |
| 4.4 | Security pass: official checklist; review every `disclose()` and verify off-chain entropy exchange cannot leak either hand. The state-only contract proves the challenge matches a prior commitment, **not** that played cards came from the dealt hand. | SOL, John reviews |
| 4.5 | CLI mainnet config uses Blockfrost URLs + token from env without logging it. A real browser game still requires a token-safe backend proxy or trusted wallet-provided endpoints; do not put `BLOCKFROST_PROJECT_ID` in `VITE_*`. Connection test green before deployment. | SOL |
| 4.6 | **Gate G4 (human)**: John reviews diff + deployments.json custody entry, then deploys (or credential-gated deploy per rubric outcome) |
| 4.7 | Verified match #1 on mainnet; explorer screenshots; announcement kit (message to Jay: §5 of this doc's earlier draft still applies) | John + SOL |

---

## 3. SOL execution contract (the answer to "can SOL handle it?")

**Scope SOL owns end-to-end**: M0, M1, M2 entirely; M3/M4 code + docs.
**SOL must stop and hand to John**: anything requiring accounts, funds,
identity, or browser-extension clicks (faucet, Blockfrost, cNIGHT/cNgD,
MIP PR submission, Lace signing, the G4 deploy decision).

**Hard guardrails** (violations = stop and ask):
1. NEVER run bare `compact update` — pin 0.31 until the support matrix says
   public networks run ledger 9.
2. NEVER commit seeds, Blockfrost tokens, or any non-local credential. The
   committed seeds in `realDeal/cli/.env` are local-stack-only by design;
   preprod/mainnet secrets live in untracked env files.
3. NEVER modify the wagered `proof-or-bluff.compact` or its managed
   artifacts — the mainnet edition is a sibling, not an edit.
4. NEVER point any config at the retired `*.mainnet.midnight.network`
   endpoints.
5. Re-verify the support matrix (Kapa MCP / docs support-matrix page) at
   every session start; if it moved, update §0 and this plan before coding.
6. Offline preparation can run while Docker is unavailable, but NO public
   transaction and NO "ready" claim until G0-G3 pass with tx receipts. The
   state-only compile and unit tests are not substitutes for a live e2e.
7. Network-touching mistakes on preprod are cheap; on mainnet they are not.
   Mainnet transactions happen only at G4 with John present.

**Known traps** (documented so SOL doesn't rediscover them):
- `wallet-sdk` exact-pin 1.2.0 (npm `latest` → 1.1.0).
- Node ≥22 required (SDK uses Iterator helpers; Node 20 crashes at sync).
- Indexer API v3 (pinned local stack) vs v4 (public networks) — both exist
  in config simultaneously during M2.
- `POB_STATE_NAMESPACE` isolates per-chain CLI state; fresh namespace per
  fresh chain, and the deploy guard will refuse non-create commands in an
  empty namespace (that's correct behavior, not a bug).
- Proof latency ~15-45 s/tx; e2e runtime is minutes — set timeouts
  accordingly, don't kill healthy runs.

**Estimate**: SOL-autonomous portion ≈ 3-4 sessions. External waits (faucet,
DUST ~12 h, rubric review) dominate the calendar — John front-loads 4.1-4.3.

---

## 4. John-only checklist (start these before the code is done)

- [x] Start Docker Desktop and enable WSL integration (healthy Oct 2; G0 still stalled at deploy confirmation)
- [ ] Generate + safely store preprod and mainnet operator seeds
- [ ] Preprod faucet + DUST registration (M3)
- [ ] Blockfrost account + Midnight Mainnet project token (M4.1)
- [ ] Acquire cNIGHT; cNgD DUST registration — **12 h lead time** (M4.2)
- [ ] Confirm whether the Oct 2 mainnet opening removed the Foundation
      deployment-authorization PR; prepare the rubric self-score either way
- [ ] Lace wallet on preprod, then mainnet
- [ ] G4: review + press deploy; play match #1; tell Jay 🎉

---

*Version facts verified via Kapa MCP on Oct 2, 2026. The matrix moved twice
since August — treat §0's versions as "last verified", not eternal truth.
If reality disagrees with this doc, update the doc.*
