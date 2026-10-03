#!/usr/bin/env bash
# Push ops/vps/* to the POB VPS and (re)start the stack.
#
# Usage:  ops/vps/deploy.sh            # sync + up
#         ops/vps/deploy.sh status     # just show what's running
#         ops/vps/deploy.sh logs       # follow logs
#
# Requires POB_VPS_SSH_KEY to point at the private key (kept OUTSIDE git, e.g.
# in ~/Hostinger-secrets-folder). The host IP is public; the key is not.
set -euo pipefail

VPS_HOST="${POB_VPS_HOST:-69.62.70.163}"
VPS_USER="${POB_VPS_USER:-root}"
VPS_DIR="/opt/prooforbluff"
SSH_KEY="${POB_VPS_SSH_KEY:?set POB_VPS_SSH_KEY=/path/to/private/key}"
HERE="$(cd "$(dirname "$0")" && pwd)"

ssh_vps() { ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS_USER@$VPS_HOST" "$@"; }

case "${1:-up}" in
  status) ssh_vps "cd $VPS_DIR && docker compose ps && docker stats --no-stream" ;;
  logs)   ssh_vps "cd $VPS_DIR && docker compose logs -f --tail=100" ;;
  up)
    echo "→ syncing compose.yaml + Caddyfile to $VPS_HOST:$VPS_DIR"
    ssh_vps "mkdir -p $VPS_DIR"
    scp -i "$SSH_KEY" -q "$HERE/compose.yaml" "$HERE/Caddyfile" "$VPS_USER@$VPS_HOST:$VPS_DIR/"
    echo "→ docker compose up -d (pulls images if missing)"
    ssh_vps "cd $VPS_DIR && docker compose up -d --remove-orphans && docker compose ps"
    ;;
  *) echo "unknown command: $1" >&2; exit 2 ;;
esac
