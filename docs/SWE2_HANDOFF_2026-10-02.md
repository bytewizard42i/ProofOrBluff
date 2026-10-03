# SWE-2 Handoff — Oct 2, 2026 (evening)

Scope: finish the live local gate, then launch **Preview**. No Mainnet
transaction without John present. No payment circuits — gameplay only.
Paths relative to `/home/js/DIDzMonolith/ProofOrBluff_MLH_Midnight/`.

## State you inherit (verified, not assumed)

- Provably fair state-only contract compiled (13 circuits + keys):
  `realDeal/contracts/proof-or-bluff-mainnet.compact`. 53/53 tests pass.
  All three app builds pass. Music picker + sponsor banner + Pro teaser done.
- SDK aligned to the official public-network matrix: midnight-js 4.1.1,
  `@midnight-ntwrk/wallet-sdk` 1.2.0 (single barrel, exact), ledger-v8 8.1.2
  (root `overrides` pin — one copy in the tree; run `npm dedupe` if a nested
  copy ever reappears, symptom: `expected instance of LedgerParameters`).
- Local stack re-pinned via `git pull` in `/home/js/utils_Midnight/midnight-local-dev`:
  node 1.0.0 / indexer-standalone 4.3.3 (api/v4) / proof-server 8.1.0. Healthy.
- **Deploy stall is FIXED.** Last run deployed contract
  `587b0f91557db7cacf3bb6b7d081feb3c6a669e0148863c7835b722e33d81f12` on the
  local chain and was proving `createMatch` when John paused. The e2e has NOT
  yet reported `e2e PASSED`; do not claim it.
- Nothing is committed. `git status` shows the whole day's work. Commit when
  the local e2e passes (logical commits: contract, clients, SDK bump, UI, docs).

## Step 1 — Close the local gate (G1)

```bash
cd realDeal/cli
POB_STATE_NAMESPACE=aligned-$(date +%s) npm run cli -- e2e --contract state-only 2>&1 | grep --line-buffered -v RPC-CORE
```
Expect: deploy → createMatch → join → revealSeed → P1 bluff (held card,
claim rank 0) → challenge → resolve `honest=false` → asserts incl.
`p1HandDrawn=true`, `p1HandSize=6`. Each tx is a real proof; `playCards`
prover is 19.5 MB so allow minutes. Record wall-clock proof time per tx —
John needs it for UX decisions.

If a step fails: fix, rerun. Do not weaken asserts. Common suspects: witness
staging in `realDeal/cli/src/contract.js` (`stagedPlay/HandSalt/Seed/Counts`),
hand record in `.pob-state/<ns>/hand/`, api/v4 URL drift.

Then run the bot (`npm run bot`) + browser (`npm run dev:state-only` in
`realDeal/app`) for one Lace-vs-bot match on local. John clicks Lace.

## Step 2 — Preview launch (G-Preview)

John must do first (humans only):
1. Generate two fresh 64-hex seeds (operator P2/bot wallet; plus a test P1):
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Put them in an UNTRACKED env file as `POB_PUBLIC_SEED_P2` / `_P1`.
   Never the committed local seeds (the CLI refuses them anyway).
2. Faucet tNIGHT to both unshielded addresses:
   https://midnight-tmnight-preview.nethermind.dev/
   (CLI prints the address at startup; wallet auto-registers for DUST.)
3. Set `POB_PRIVATE_STATE_PASSWORD` (≥16 chars) in the same env file.

Then:
```bash
POB_NETWORK_ID=preview POB_STATE_NAMESPACE=preview-1 \
  npm run cli -- create-match --contract state-only --player p1   # deploys
# record address → realDeal/deployments.json (network, address, deployTx, date, custody)
POB_NETWORK_ID=preview POB_STATE_NAMESPACE=preview-1 npm run cli -- e2e --contract state-only
```
Endpoints already in `cli.js` (`rpc.preview.midnight.network`,
`indexer.preview.midnight.network/api/v4/graphql`, proof server local).
`withDustRetry` handles error 170 by rebuilding. Explorer:
https://preview.midnightexplorer.com/ — paste tx ids into
`realDeal/docs/PREVIEW_RUN_2026-10-0X.md`.

## Step 3 — Architecture decision John must make before Mainnet (Fable-level)

Ghost's point stands and has a sharp consequence: **the proof server receives
private witnesses** (cards, salt, seed). Options:
- (A) Players run a local proof server — honest "dealer can't see your cards",
  but no casual user will do it.
- (B) We host the proof server + a Blockfrost proxy + DUST sponsorship —
  "it just works", but the fairness claim weakens to "trust our proof server"
  (the chain still rejects dealt-card cheating; only *visibility* is lost).
- (C) Consumer mode: our server operates both wallets (PRODUCTIZATION_PLAN).
Recommendation for first mainnet: **(B) for players, with the limitation
stated plainly in the UI**, Lace users may point at a local proof server.
Mainnet also needs: Blockfrost **Midnight Mainnet** project (server-side
only), cNIGHT → DUST registration (~12 h lead), confirm whether the Foundation
authorization PR is still required (docs say yes; Oct 2 announcement says
permissionless — ask in Discord).

## Guardrails (unchanged)
Never bare `compact update` (pin 0.31). Never commit seeds/tokens. Never touch
the wagered contract. Never point at `*.mainnet.midnight.network`. Mainnet
deploy only with `POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT` set by
John for that one command.
