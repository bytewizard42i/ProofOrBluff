# Proof or Bluff — VPS runbook

Host: Hostinger KVM (`69.62.70.163`), stack in `/opt/prooforbluff`, shared with
TaskFence. Everything is Docker Compose; this folder is the source of truth.

| Container | What | Public name |
|---|---|---|
| `pob-proof-server` | Midnight proof server 8.1.0 | `proof.prooforbluff.app` |
| `pob-api` | Sponsored game service (Node 22) | `api.prooforbluff.app` |
| `pob-caddy` | TLS + origin-locked CORS | both |

## Deploy / operate (from the dev machine)

```bash
export POB_VPS_SSH_KEY=~/Hostinger-secrets-folder/TaskFence_Ai_Hostinger_VPS_ed25519
ops/vps/deploy.sh            # rsync source + keys, build pob-api on the box, up -d
ops/vps/deploy.sh status     # compose ps + docker stats
ops/vps/deploy.sh logs pob-api
ops/vps/deploy.sh health     # curls proof /ready and api /v1/health
```

`deploy.sh up` refuses to run if the v3p prover key is missing locally — the
keys are gitignored, so restore them from Terry's build first
(`~/pob/build-v3p*/full/keys`).

## Secrets: `pob-api.env`

Lives at `/opt/prooforbluff/pob-api.env` on the box (mode 600) and, optionally,
as `ops/vps/pob-api.env` locally so `deploy.sh` can push it. Both locations are
gitignored. Contents:

```
POB_NETWORK_ID=mainnet
POB_PUBLIC_SEED_MAINNET_P2=<64 hex — operator wallet>
BLOCKFROST_PROJECT_ID=<Midnight Mainnet project id>
POB_PRIVATE_STATE_PASSWORD=<>=16 chars>
POB_PROOF_SERVER=http://proof-server:6300
POB_SPONSORED_STATE_DIR=/state
POB_ALLOWED_ORIGINS=https://prooforbluff.app
POB_API_HOST=0.0.0.0
POB_STATE_NAMESPACE=mainnet-sponsored
# Deploying a game on Mainnet is LOCKED unless John has approved this exact
# line for this exact deployment. Leave it out until he has.
# POB_ALLOW_MAINNET_DEPLOY=I_APPROVE_MAINNET_DEPLOYMENT
```

Without the approval line the service boots, syncs the wallet, answers
`/v1/health`, and every `POST /v1/games` deploy step fails with
"Mainnet deployment is locked" — which is the intended safe state.

## Health

```bash
curl -s https://api.prooforbluff.app/v1/health | jq
# { ok, network, wallet: { address, dustReady }, proofQueue: { pending }, openGames }
curl -s https://api.prooforbluff.app/v1/stats | jq
# games created/ended/closed, wins, chain { submitted, failed, lastError, avgSeconds }
```

First boot on a fresh `pob-api-state` volume syncs the Mainnet wallet
(~10 min; `syncing…` lines in the logs). Restarts resume from the saved sync
position in seconds. The Docker HEALTHCHECK only probes HTTP; read `ok` /
`wallet.dustReady` from the body for the real picture.

## Logs

```bash
ssh root@69.62.70.163 'cd /opt/prooforbluff && docker compose logs -f --tail=200 pob-api'
```

The Blockfrost project id is scrubbed from the service's own output
(`project_id=[redacted]`). Chain steps log as
`chain <game8> proveRound(2) tx=… block=… 55.0s`.

## Rollback

```bash
ssh root@69.62.70.163 'cd /opt/prooforbluff && docker compose stop pob-api'
```

Caddy then answers 502 on `api.` — acceptable; the browser falls back to the
local demo. `proof.` is unaffected. To roll forward, run `deploy.sh` again.
Never `docker volume rm pob-api-state` while games are mid-proof: it holds the
queue of submitted-but-unconfirmed steps.
