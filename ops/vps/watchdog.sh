#!/usr/bin/env bash
# pob-api watchdog — automatic recovery for a wedged service.
#
# What it does (runs every minute via cron on the VPS):
#   1. If any stack container is stopped (OOM-kill, manual stop, dockerd
#      hiccup), start it again. `restart: unless-stopped` already covers
#      process crashes and reboots; this covers the "container exited and
#      Docker didn't restart it" tail.
#   2. If pob-api's Docker HEALTHCHECK has been unhealthy past its retries
#      (listener dead or wedged — e.g. the wallet-sync stall), restart it.
#      Restart triggers the snapshot-restore path, so recovery is ~1-10 min.
#
# Install once on the box (deploy.sh does this):
#   (crontab -l | grep -v watchdog.sh; echo "* * * * * /opt/prooforbluff/watchdog.sh >> /opt/prooforbluff/watchdog.log 2>&1") | crontab -
#
# Logs to /opt/prooforbluff/watchdog.log on the box (kept out of git — it's a
# host artefact, not config).
set -u

for c in pob-api pob-caddy pob-proof-server; do
  state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo missing)
  if [ "$state" != "running" ]; then
    echo "$(date -Is) $c is $state — starting"
    docker start "$c" 2>&1 || true
  fi
done

health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' pob-api 2>/dev/null || echo missing)
if [ "$health" = "unhealthy" ]; then
  echo "$(date -Is) pob-api healthcheck unhealthy — restarting"
  docker restart pob-api 2>&1 || true
fi
