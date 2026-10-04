# Mainnet Launch Runbook — Proof or Bluff, state-only edition

**Written:** 2026-10-03, the night the contract first deployed on Preview.
**Owner of the "go" decision:** John. Nothing here deploys to mainnet
without his explicit approval of one specific command.

This is the *execution* plan. `MAINNET_PLAN.md` holds the design decisions
and history; `../../midnight-launches-log/` holds the dated evidence.

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
| **Proving-memory blocker → resolved by upgrade (approved Oct 3):** `closeGame` proving peaks **~9–10 GiB RSS**; the 8 GiB VPS OOM-killed it twice (4.5 & 6.5 GiB caps). **John approved a 16 GiB VPS upgrade (~$75/yr)** — `ops/vps/compose.yaml` already targets it (`mem_limit 11264m`, `NUM_WORKERS=1`); do **not** redeploy compose until the bigger box is live. | dmesg OOM logs; `DEPLOYMENT.md` §6 |

What is **not** true yet: no browser (Lace) match on a public network; no
hosted bot on a public network; no closeGame-capable proving host; no
Blockfrost account; no mainnet wallet; no DUST sponsorship; no Foundation
deployment request.

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
- [ ] **Mainnet operator wallet** (bot + sponsorship + contract deployer):
      generate a fresh 64-hex seed on an offline/clean machine; write it to
      a password manager AND a paper backup; put it in server env as
      `POB_PUBLIC_SEED_P2`. Print its address with
      `npm run cli -- address --player p2 --network mainnet`
      (needs `BLOCKFROST_PROJECT_ID` set even for derivation checks —
      the CLI refuses mainnet config without it).
- [ ] **cNIGHT → DUST**: acquire cNIGHT; register for DUST via the cNgD
      dApp (`midnight-dust-mainnet.nethermind.io`) to the operator wallet;
      **~12 h** until DUST appears. How much? Each contract call burns
      DUST that regenerates (cap ≈ 5 DUST per NIGHT). For a bot playing
      hundreds of moves/day plus any sponsorship, size generously and
      measure on day 1.
- [ ] **Dedicated mainnet Lace** for John as Player One (separate seed
      from any wallet holding real value). Register its NIGHT for DUST.
- [ ] **Key custody doc**: who holds the operator seed, where the backup
      is, how to rotate (= redeploy a new contract address; there is no
      upgrade circuit). One paragraph in `realDeal/deployments.json`.

### M2 — Preprod rehearsal (strongly recommended, not strictly required)

Preprod tracks mainnet versions most closely; Preview may run newer builds.
Cost: one more faucet + one e2e run. Benefit: the official checklist's
first line item, and real confidence that v8 mainnet accepts our proofs.

- [ ] New `POB_PUBLIC_SEED_*` pair for Preprod (never reuse Preview seeds
      on another network), faucet `midnight-tmnight-preprod.nethermind.dev`
- [ ] `POB_NETWORK_ID=preprod POB_STATE_NAMESPACE=preprod-1 npm run cli -- e2e --network preprod --contract state-only`
- [ ] Record address + tx ids in `realDeal/deployments.json` and the log
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

### M4 — Deploy (one command, human-approved)

Preconditions: P3 live on Preview, M1 funded with visible DUST, M2 done or
waived in writing, M3 complete, Discord answer recorded.

1. John reviews `git diff` of the exact commit to be deployed and the
   `deployments.json` custody entry.
2. On the server, with `BLOCKFROST_PROJECT_ID` and the mainnet operator seed
   in env, John (or SOL with John watching) runs **exactly once**:
   ```bash
   POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT \
   POB_NETWORK_ID=mainnet POB_STATE_NAMESPACE=mainnet-1 \
   npm run cli -- create-match --player p2 --network mainnet --contract state-only --mode 1
   ```
   (`create-match` is the only deploy-capable command; the guard rejects
   everything else. The bot/operator wallet is the deployer so the
   contract's first match is the house table.)
3. Verify via Blockfrost indexer `contractAction(address)` → block height
   + tx hash. Record in `deployments.json` and the launch log **before**
   anything else.
4. Point the hosted bot and the `.app` build at the mainnet address;
   restart; smoke test with John's mainnet Lace. One full round.

### M5 — Launch

- [ ] Flip `site/` banner from "Preview testnet" to "Live on Midnight
      mainnet. No real money. No wagers." only after M4 step 4 passes.
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
