# Proof or Bluff — VPS runbook

Host: Hostinger KVM (`69.62.70.163`), stack in `/opt/prooforbluff`, shared with
TaskFence. Everything is Docker Compose; this folder is the source of truth.

| Container | What | Public name |
|---|---|---|
| `pob-proof-server` | Midnight proof server 9.0.0 (fallback prover) | `proof.prooforbluff.app` |
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

## Pausing the API on purpose (maintenance marker)

`watchdog.sh` runs from cron every minute and restarts any stopped stack
container. A deliberate stop therefore needs the marker file, or cron brings
the API straight back:

```bash
ssh root@69.62.70.163 'touch /opt/prooforbluff/pob-api.maintenance && cd /opt/prooforbluff && docker compose stop pob-api'
# ...repair...
ssh root@69.62.70.163 'rm /opt/prooforbluff/pob-api.maintenance && cd /opt/prooforbluff && docker compose up -d pob-api'
```

Caddy and the fallback prover stay monitored while the marker exists.

## Indexer quota incident (2026-11-08)

Blockfrost's free tier allows 50k requests/day. After the ledger-9 hard fork
the ledger-8 wallet could not decode the new event format and retried its
sync continuously (~9,400 failures in six hours), exhausting the allowance
with zero games open. Blockfrost then answered `HTTP 402` until the daily
reset. Safeguards now in place:

* `checkIndexerAvailability` sends ONE block query before wallet sync starts;
  a 402/429 leaves the API in paused mode (`/v1/health` → `ok:false` with the
  reason) instead of starting the SDK's background subscriptions.
* Readiness follows the SDK's live `isSynced` verdict, and an observation
  older than five minutes counts as stalled (the SDK heartbeats every 30 s).
* A wallet that stays unavailable for ten minutes after a successful start is
  shut down; the process stays alive and reports paused until an operator
  checks the provider and restarts it.
* Startup/sync failures stop the facade before rethrowing, so no orphaned
  wallet keeps polling behind a paused health response.

## Rollback

```bash
ssh root@69.62.70.163 'cd /opt/prooforbluff && docker compose stop pob-api'
```

Caddy then answers 502 on `api.` — acceptable; the browser falls back to the
local demo. `proof.` is unaffected. To roll forward, run `deploy.sh` again.
Never `docker volume rm pob-api-state` while games are mid-proof: it holds the
queue of submitted-but-unconfirmed steps.

## Proving runs on Terry (John's home server) — the VPS is fallback

Terry (LAN, 8 cores/19 GiB, 4 proving workers) is THE production prover. It
has no public address and opens no ports: it dials OUT to this box over SSH
and holds a reverse tunnel (`~/.config/systemd/user/pob-tunnel.service` on
Terry, user `j5i`, linger enabled so it survives logout/reboot).

```
pob-api → http://caddy:6301 → terry-proof:16300 (tunnel) → Terry 127.0.0.1:6300
                            ↘ proof-server:6300 (local, fallback)
```

* Caddy `:6301` uses `lb_policy first` + `/ready` health checks every 15 s:
  Terry when healthy, local proof-server otherwise. Jobs never get stuck,
  they get slower.
* VPS side: user `pobtunnel` (nologin, `ForceCommand /bin/false`, remote
  forwarding only, `permitlisten` pinned to `172.16.2.1:16300` = the
  prooforbluff compose network gateway), sshd drop-in
  `/etc/ssh/sshd_config.d/10-pob-tunnel.conf`, ufw rule allowing only
  `172.16.2.0/24 → 172.16.2.1:16300`. Nothing is reachable from the internet.
* Check which prover is live: `docker compose exec caddy wget -qO- http://127.0.0.1:6301/ready`
  → `jobCapacity: 24` = Terry, `10` = local fallback.
* Terry down? `ssh j5i@terry systemctl --user status pob-tunnel` and
  `curl 127.0.0.1:6300/ready` there. Terry's compose: `~/pob/compose.yaml`
  (backup of the 1-worker version beside it).
