# Mainnet Launch Runbook — Proof or Bluff, state-only edition

**Written:** 2026-10-03, the night the contract first deployed on Preview.
**Owner of the "go" decision:** John. Nothing here deploys to mainnet
without his explicit approval of one specific command.

This is the *execution* plan. `MAINNET_PLAN.md` holds the design decisions
and history; `../../midnight-launches-log/` holds the dated evidence.

**Rollup migration checkpoint (2026-10-04):** P1/P2 and the per-move bot
commands below are historical predecessor instructions, not the Season 1
launch procedure. `--contract state-only` selects `proof-or-bluff-mainnet`,
not `proof-or-bluff-rollup`. The rollup chain/session modules exist, but the
CLI and browser do not yet select them. Do not repoint the old app to a
rollup address or execute a predecessor deployment as the launch.

Current launch gates:

- Terry's private prover uses `ops/compose.terry.yaml`; it is not a public API.
- Resolve `assertRecentBlockTime`'s 120-second window against measured proof
  latency before a public-network `closeGame`. The client captures the time
  before proving; proof generation alone does not establish chain acceptance.
- Wire guarded rollup deployment, hosted sessions, browser interaction,
  durable receipts, and a server-side Blockfrost proxy.
- Complete rollup Preview and Preprod deploy/open/play/close rehearsals with
  indexed transaction evidence, then security review.
- Obtain John's operator-wallet/DUST and Blockfrost prerequisites and confirm
  deployment authorization. Kapa's official readiness checklist, checked
  2026-10-04, still requires Foundation review and deployment credentials.
- Present the exact rollup Mainnet command for John's approval only after
  those gates pass. No Mainnet deployment has been performed.

---

## 0. Where we are (verified, not hoped)

| Fact | Evidence |
|---|---|
| Provably-fair state-only contract compiles (Compact 0.31.1, 13 circuits) and passes 7 simulator cheat-path tests | `realDeal/contracts/proof-or-bluff-mainnet.*` |
| Full local e2e PASSED (deploy → deal → bluff → challenge → resolve) | launch log §Timings |
| SDK on the official public-network matrix (midnight-js 4.1.1, wallet-sdk 1.2.0, ledger-v8 8.1.2) | `package.json` `_versionNotes` |
| **Deployed on Midnight Preview**: `cc75d39e2d11096d160be2524dc2bbc9c6a569f2906d0adade33d6227f06a159`, createMatch in block 1129259 | indexer `contractAction` query, launch log |
| Preview e2e steps 1–2 passed (deploy, create, P2 join incl. DUST registration); steps 3–5 in progress | `/tmp/pob-preview-e2e-2.log` |
| UI: activity panel, diagnostics, network badge, .com links; 82 tests; 3 builds | commit `c3ec195` |
| **`prooforbluff.com` and `prooforbluff.app` LIVE over HTTPS** (Oct 3 2026): Vercel projects `prooforbluff-site` (`site/`) and `prooforbluff-app` (demo build), team EnterpriseZK Labs; GoDaddy `A @ 76.76.21.21` + `CNAME www cname.vercel-dns.com`, TTL 600; apex + www both 200 | `curl -I` both hosts; `vercel domains inspect` |
| Provably-fair Floyd deal merged to `main` (`39f526a`): 10/10 conformance, 262/262 total; compile 9 s / ~0.3 GB (was OOM at 13 GB) | `realDeal/cli/src/deal-conformance.test.js` |
| **Decision (John, Oct 3):** mainnet launches on the one-proof-per-game rollup contract, not the per-move Preview contract. VPS: Hostinger KVM 2 (`69.62.70.163`, shared with TaskFence Ai, paid through Jul 2027) — Hetzner not needed. | `docs/ZK_GAME_ROLLUP.md` |
| **Rollup contract is real-proof capable (Oct 3 2026):** `proof-or-bluff-rollup.compact` compiles to full proving keys (`closeGame` ≈ 641k rows, k=20, prover 339 MB); a complete scripted game — with both players' signed `CloseConsent`s — produced a **real ZK proof** via `scripts/prove-rollup-close.mjs` (190 s, 6 KB proven tx). All 351 repo tests pass. | commits `1ba117f`, `370ab51`, `472160f` |
| **VPS sizing requires re-evaluation (Oct 4):** the 8 GiB VPS failed at 4.5/6.5 GiB limits, and Terry also OOM-killed a real proof at 12 GiB. Earlier 9–10 GiB observations were not peak-memory measurements. The approved 16 GiB VPS upgrade is not confirmed complete, and the proposed 11 GiB container cap is not sufficient evidence of readiness. Do not redeploy the VPS stack on that assumption. | kernel OOM records; `DEPLOYMENT.md` §5.5 |
| **Terry generated a real rollup proof (Oct 4):** 194.9 s cold / 129.8 s warm end-to-end, 6 KB proven transaction each; sampled memory reached 13.69 GiB under a 14 GiB RAM / 16 GiB combined RAM+swap cap, one worker, zero restarts during both successful runs. Intentional restart recovery and LAN isolation also verified. Private SSH access only, not a public game backend. | `scripts/prove-rollup-close.mjs http://127.0.0.1:16300`; `ops/compose.terry.yaml` |
| **Current regression suite:** 35 files / 353 tests pass, including timestamp-boundary tests confirming a valid close is rejected at 121 seconds. | `npm test`, 2026-10-04 |

Still incomplete: browser rollup match on a public network, hosted rollup
bot, Blockfrost proxy, durable receipt integration, timestamp/proving-latency
resolution, and Preview/Preprod rollup rehearsals. Mainnet Blockfrost access,
fresh operator-wallet custody, DUST funding and deployment authorization
remain unverified John-owned prerequisites. Nothing has deployed to Mainnet.

---

## 1. The gates (in order — each one unblocks the next)

```
 P1  Preview e2e PASSED ──► P2  Preview browser match ──► P3  Hosted infra on Preview
                                                                   │
 M1  Mainnet accounts & funds (START NOW, 12 h+ latency) ──────────┤
                                                                   ▼
                                     M2  Preprod rehearsal ──► M3  Security + rubric ──► M4  Deploy ──► M5  Launch
```

Preview work (P*) and mainnet prerequisites (M1) run **in parallel**.
M1 is John-only and has the longest fixed delay, so it starts first.

### P1 — Preview e2e passes end-to-end (in progress tonight)

- [ ] `e2e PASSED` line in `/tmp/pob-preview-e2e-2.log`
- [ ] Record all 5 tx ids in `midnight-launches-log/` and
      `midnight-launches-log/proof-or-bluff_preview-addresses.md`
- [ ] Note measured timings per step (sync, prove, confirm) — these drive
      the UX copy ("taking longer than usual" threshold) and the hosted
      proof-server sizing
- **If it fails:** fix the root cause, redeploy only if the *contract*
  changed (a client bug reuses the existing address via `set-address`).

### P2 — Browser (Lace) vs bot match on Preview

Prereqs: John's Lace set to Preview + faucet tNIGHT + DUST registered in
Lace (Lace does this itself; allow time).

- [ ] Point the app at the deployed contract: localStorage
      `pob:state-only:preview:contract-address` = `cc75d39e…06a159`
      (or add a one-time "Join existing table" input — small UI task)
- [ ] Run the bot locally against Preview: `POB_NETWORK_ID=preview
      POB_STATE_NAMESPACE=preview-2 npm run bot` (bot uses P2 seed from
      `.env.local`; it must `set-address` the same contract first)
- [ ] Build/serve app with `VITE_NETWORK_ID=preview VITE_CONTRACT_VARIANT=state-only`
- [ ] John plays one full round: connect → start → play → bot challenges or
      accepts → resolve. Watch the activity panel: does every stage read
      honestly? Does "taking longer than usual" fire at a sane moment?
- [ ] Copy a diagnostic report and confirm **nothing private** is in it
- [ ] Record tx ids + screenshots → `realDeal/docs/PREVIEW_RUN_<date>.md`
- **Known risk:** first `vite dev` state-only mode once rendered an empty
      root headlessly; the production build was fine. Use `npm run
      build:state-only && npm run preview` if dev mode misbehaves.

### P3 — Hosted infrastructure on Preview (Option B + A toggle)

This turns a developer demo into something a stranger can play.

- [ ] **Bot service**: run `realDeal/cli` bot on a VPS, bound to a private
      interface, behind a reverse proxy with TLS. Env: `POB_PUBLIC_SEED_P2`
      (a *new* operator seed for the server — never the laptop one),
      `POB_NETWORK_ID=preview`, state in a persistent volume. Add origin
      allowlist + per-IP rate limit at the proxy. Health endpoint stays.
- [ ] **Hosted proof server**: `midnightntwrk/proof-server:8.1.0` on the
      same VPS (CPU-heavy: measure `playCards` latency with 4 vCPU vs 8;
      local laptop was ~1–2 min). Expose via TLS reverse proxy with the
      same origin allowlist. Set `VITE_HOSTED_PROOF_SERVER_URL`.
      **Privacy copy in `ProofServerChoice` already states the trade-off;
      keep it.** Log *nothing* about request bodies.
- [ ] **Static app** (`realDeal/app` state-only build) → Netlify/Vercel at
      `prooforbluff.app`. **Static site** (`site/`) → `prooforbluff.com`.
      Then hand John the exact DNS records for GoDaddy (A/ALIAS + CNAME
      `www`). He changes DNS; we verify with `dig` + `curl`.
- [ ] **DUST for players (decision):** v1 on Preview = players bring
      faucet tNIGHT via Lace (free). Sponsorship is a mainnet question (M1).
- [ ] Smoke test from a *different* machine/network with a fresh Lace.
- [ ] Update `site/` status banner if anything about the claim changed.

### M1 — Mainnet accounts, keys, funds (John; START IMMEDIATELY)

These have real-world latency. None of them require code to be ready.

- [ ] **Blockfrost**: account → project → network **Midnight Mainnet** →
      copy `project_id`. Store ONLY in server env (`BLOCKFROST_PROJECT_ID`
      in `realDeal/cli/.env.local` on the server, and the proxy's env).
      Never in `VITE_*`, never in chat, never in git. Pick a plan sized for
      expected traffic (free tier limits are per-day request counts).
- [x] **Mainnet operator wallet** — fresh seed generated 2026-10-05 into
      `realDeal/cli/.env.local` as `POB_PUBLIC_SEED_MAINNET_P2` (untracked;
      bot/deployer wallet only).
      - Unshielded (NIGHT) address — only if NIGHT is ever sent ON Midnight:
        `mn_addr18wcrcr8xvnmp8dkrdlhjrxa43qxnzyxlyy3z39wvnxasaweemtmqh6ajxl`
      - **DUST address — THIS is what the cNgD registration wants:**
        `mn_dust1wwrkseeghlkz4rztjaphsknvfgmd6dl6l4u7kz40d59d9ll26p4jcwnx0jf`
      **John: copy the seed from `.env.local` into the password manager +
      paper backup BEFORE registering** — lose it and the wallet is gone.
- [ ] **cNIGHT → DUST** (cross-chain; NO NIGHT is transferred to Midnight):
      in the cNgD dApp (`midnight-dust-mainnet.nethermind.io`) register the
      Cardano stake address holding the cNIGHT → the operator **DUST
      address** above. **Then move the cNIGHT to yourself once**: per the
      docs, only cNIGHT UTXOs *created after* registration generate DUST;
      earlier UTXOs generate nothing until they move. **~12 h** until DUST
      appears on Midnight (Cardano stability delay).
      How much? Cap = 5 DUST per NIGHT, full refill ≈ 1 week (≈0.7 DUST
      per NIGHT per day). 100–200 cNIGHT is plenty for launch week; 500
      for headroom/sponsorship. Per-tx fee on Mainnet is unmeasured —
      record it from game #1. Check status without a wallet sync:
      indexer `dustGenerationStatus(cardanoRewardAddresses: [...])`.
- [ ] **Dedicated mainnet Lace** for John as Player One (separate seed
      from any wallet holding real value). Register its NIGHT for DUST.
- [ ] **Key custody doc**: who holds the operator seed, where the backup
      is, how to rotate (= redeploy a new contract address; there is no
      upgrade circuit). One paragraph in `realDeal/deployments.json`.

### M2 — Preprod rehearsal (strongly recommended, not strictly required)

Preprod tracks mainnet versions most closely; Preview may run newer builds.
Cost: one more faucet + one e2e run. Benefit: the official checklist's
first line item, and real confidence that v8 mainnet accepts our proofs.

**v3p PREVIEW REHEARSAL — DONE 2026-10-05.** Full game on Preview, 4 proven
txs, contract `6b1911887…aacfb8`; the rehearsal caught a real boundary bug
(run 1, block 1158119) that fixtures masked — fixed in `3ddf63f`. Record:
`midnight-launches-log/2026-10-05_pob-rollup-v3p_preview.md`.

**PREPROD — SKIPPED 2026-10-05 by John's call: go directly to Mainnet.**
(Fresh Preprod seed already exists as `POB_PUBLIC_SEED_PREPROD_P2` in
`.env.local` + its address `mn_addr_preprod1spc9…xva83` if a fall-back
rehearsal is ever needed; the mainnet faucet is
`midnight-tmnight-preprod.nethermind.dev`.)

**MAINNET (v3p) — the remaining gate is three John items (below), then:**
- [ ] `POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT \
       POB_NETWORK_ID=mainnet POB_STATE_NAMESPACE=mainnet-1 \
       POB_PROOF_SERVER=http://127.0.0.1:16300 \
       BLOCKFROST_PROJECT_ID=<server env only> \
       node scripts/preview-v3p-game.mjs`
      → deploys ONE v3p game on Mainnet, plays + proves its rounds, closes it.
      John approves THIS exact command — once, in writing — before it runs.
- [ ] Record address + tx ids in `realDeal/deployments.json` and the launch log
- **Skip only if** the Foundation/Discord confirms Preview and mainnet are
  on the same node/ledger versions *and* John accepts the risk in writing.

### M3 — Security review, rubric, and deployment request

- [ ] Walk the official pre-deployment security checklist
      (docs.midnight.network/guides/security-best-practices). Specifically
      for us: every `disclose()` in the contract is intentional; the
      off-chain entropy exchange (bot ↔ browser) cannot leak a hand; the
      timeout/forfeit circuits cannot be abused by the bot operator
      against a player; hosted proof server trust is disclosed in UI + site.
- [ ] **Updatability decision (already made):** immutable; redeploy = new
      address. Write it down in `deployments.json`.
- [ ] Self-score against the contract-deployment rubric in the MIP repo.
- [ ] **Deployment authorisation:** the official readiness checklist
      (re-verified via Kapa 2026-10-03) still says: open a PR under
      `deployments/` in `midnightntwrk/midnight-improvement-proposals` and
      wait for deployment credentials. Oct 2 announcements implied
      permissionless deploys. **Ask in the Midnight Discord first**; if a
      PR is required, John opens it (identity + accountability are his).
      Do not treat either answer as settled until the Foundation replies.
- [ ] Run the official mainnet connection test with the token set
      (`networks.test.ts -t mainnet` pattern) → node + indexer reachable.
- [ ] **Browser mainnet path:** today `config.js` refuses `mainnet`
      because a token in the bundle is public. Decide: (a) Blockfrost
      proxy on our VPS that injects `project_id` server-side and only
      allows our origin, or (b) rely on Lace-managed endpoints for the
      wallet and proxy only the indexer reads. Implement, then lift the
      refusal behind an explicit `VITE_MAINNET_PROXY_URL`.

### M4 — Deploy (one command, human-approved) — READY, awaiting DUST

**State on 2026-10-06 06:50 UTC.** Everything below the approval line is
built, tested (461 tests) and rehearsed on Preview twice, the second time with
the security-fixed contract from inside the production Docker image. The
service is **already running on the VPS in Mainnet mode**, wallet synced
through Blockfrost, LOCKED (no `POB_ALLOW_MAINNET_DEPLOY`), reporting
`dustReady:false` until John's cNIGHT registration is ingested.

Preconditions still open: DUST visible (`node scripts/dust-status.mjs` →
READY; a `--watch` is running), John's approval of the exact command.

Season 1 deploy is NOT one contract — it is one contract PER GAME, created
by the sponsored service when a player clicks "Deal me in". So "deploying to
Mainnet" = unlocking the service and playing the first game.

1. **Confirm DUST** (two sources): `node scripts/dust-status.mjs` and
   `curl https://api.prooforbluff.app/v1/health` → `wallet.dust > 0`.
2. **John approves this exact line** being appended to
   `/opt/prooforbluff/pob-api.env` on the VPS:
   ```
   POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT
   ```
   then `docker compose up -d pob-api` (restart ≈ 20 min cold sync; see
   hardening note). Penny runs it; John says the word.
3. **First Mainnet game, scripted** (so the first tx on Mainnet is ours,
   not a stranger's): `node /tmp/pob-drive.mjs` against
   `https://api.prooforbluff.app/v1` with `Origin: https://prooforbluff.app`.
   Expect: deploy ≈ 20 s, proveRound ≈ 55 s each, closeGame ≈ 30 s, all
   visible in `/v1/stats` and on the Blockfrost dashboard ("submitted txs").
4. **Record** contract address + every tx hash + measured DUST burn in
   `midnight-launches-log/` and `deployments.json` BEFORE anything else.
   `GET /v1/games/<id>/transcript` after close is the public verifiability
   receipt — link it.
5. **Flip the app**: `cd realDeal/app && VITE_POB_API_URL=https://api.prooforbluff.app npm run build:sponsored`
   → prebuilt deploy to production (`prooforbluff.app`). Rehearsed as a Vercel
   preview (`https://prooforbluff-1fpsdxpie-enterpisezk-labs-projects.vercel.app`),
   CORS verified. Demo build stays one command away for rollback.
6. **Smoke test in a real browser** on `prooforbluff.app`: one full game,
   receipt strip reaches "sealed", explorer link resolves.

Rollback at any step: remove the approval line + restart (service goes back
to 503 on new games; in-flight proofs finish), or redeploy the demo build.

### M5 — Launch

- [ ] Flip `site/` banner from "Preview testnet" to "Live on Midnight
      mainnet. No real money. No wagers." only after M4 step 6 passes.
- [ ] Hardening (soon after launch): persist the wallet sync snapshot
      (wallet-sdk `serializeState`) so a pob-api restart is seconds, not a
      20-minute cold sync on the 2-vCPU box.
- [ ] Observability: a cron/GitHub Action that queries
      `contractAction(address)` every 10 min and alerts if the bot's
      pending move is older than N minutes; DUST balance alert on the
      operator wallet; uptime check on proof server + bot health.
- [ ] Announcement kit: tx hash, address, explorer link, 3 sentences on
      what is proven and what is trusted (hosted proof server). Send to Jay.
- [ ] Post-launch: watch proof latency and DUST burn for 48 h; decide
      sponsorship and VPS size from real numbers.

---

## 2. Hard rules (unchanged, repeated on purpose)

1. No wagers, payouts, or payment circuits in this edition.
2. Blockfrost token server-side only. Never `VITE_*`. Never in chat/git.
3. Fresh seeds per network. Local `.env` seeds never leave the laptop.
4. No bare `compact update`; stay on 0.31.x until public nets move.
5. Mainnet deploy = John's explicit approval of one command, once.
6. Every claim of "deployed"/"passed" needs a tx hash or a log line.

## 3. What only John can do (checklist to hand him)

- [ ] Blockfrost account + Midnight Mainnet project (M1)
- [ ] Acquire cNIGHT, register via cNgD, wait ~12 h (M1)
- [ ] Generate/back up the mainnet operator seed (M1)
- [ ] Dedicated mainnet Lace + Preview Lace funding (M1 / P2)
- [ ] Ask in Midnight Discord whether the deployment PR is still required (M3)
- [ ] Open the MIP deployments PR if yes (M3)
- [ ] GoDaddy DNS changes for `.com` / `.app` once hosting exists (P3)
- [ ] Pick the VPS provider + Blockfrost plan (P3 / M1)
- [ ] Approve the one mainnet deploy command (M4)
