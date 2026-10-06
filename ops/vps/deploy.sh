#!/usr/bin/env bash
# Push ops/vps/* (+ the pob-api source tree) to the POB VPS and (re)start the stack.
#
# Usage:  ops/vps/deploy.sh            # sync + build pob-api + up
#         ops/vps/deploy.sh status     # just show what's running
#         ops/vps/deploy.sh logs       # follow logs
#         ops/vps/deploy.sh health     # curl the public health endpoints
#
# Requires POB_VPS_SSH_KEY to point at the private key (kept OUTSIDE git, e.g.
# in ~/Hostinger-secrets-folder). The host IP is public; the key is not.
#
# How pob-api gets to the box: there is NO git checkout on the VPS. The image
# needs the gitignored proving keys (realDeal/contracts/managed/.../keys), so we
# rsync the exact source subtrees the Dockerfile COPYs — same relative paths —
# into /opt/prooforbluff/src and compose builds from there (context ./src).
# The list below MUST match the COPY lines in pob-api.Dockerfile.
set -euo pipefail

VPS_HOST="${POB_VPS_HOST:-69.62.70.163}"
VPS_USER="${POB_VPS_USER:-root}"
VPS_DIR="/opt/prooforbluff"
SSH_KEY="${POB_VPS_SSH_KEY:?set POB_VPS_SSH_KEY=/path/to/private/key}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

ssh_vps() { ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS_USER@$VPS_HOST" "$@"; }
rsync_vps() { rsync -az --delete -e "ssh -i $SSH_KEY -o BatchMode=yes" "$@"; }

# Source subtrees the image needs (repo-relative). Keep in lockstep with the Dockerfile.
SRC_PATHS=(
  package.json package-lock.json
  realDeal/app/package.json
  realDeal/cli/package.json
  realDeal/cli/src
  realDeal/shared
  realDeal/contracts/rollup-v3p-referee.js
  realDeal/contracts/rollup-referee.js
  realDeal/contracts/managed/proof-or-bluff-rollup-v3p
  realDeal/contracts/managed/proof-or-bluff-rollup/contract
  demoLand/src/game
)

case "${1:-up}" in
  status) ssh_vps "cd $VPS_DIR && docker compose ps && docker stats --no-stream" ;;
  logs)   ssh_vps "cd $VPS_DIR && docker compose logs -f --tail=100 ${2:-}" ;;
  health)
    echo "proof: $(curl -sS -m 10 https://proof.prooforbluff.app/ready)"
    echo "api:   $(curl -sS -m 10 https://api.prooforbluff.app/v1/health)"
    ;;
  up)
    for p in "${SRC_PATHS[@]}"; do [[ -e "$REPO/$p" ]] || { echo "missing $REPO/$p (keys not built?)" >&2; exit 1; }; done
    [[ -s "$REPO/realDeal/contracts/managed/proof-or-bluff-rollup-v3p/keys/proveRound.prover" ]] \
      || { echo "v3p prover key missing — restore from Terry's build before deploying" >&2; exit 1; }

    echo "→ syncing compose.yaml, Caddyfile, Dockerfile to $VPS_HOST:$VPS_DIR"
    ssh_vps "mkdir -p $VPS_DIR/src"
    scp -i "$SSH_KEY" -q "$HERE/compose.yaml" "$HERE/Caddyfile" "$HERE/pob-api.Dockerfile" "$VPS_USER@$VPS_HOST:$VPS_DIR/"
    if [[ -f "$HERE/pob-api.env" ]]; then
      echo "→ syncing local pob-api.env (secrets; not in git)"
      scp -i "$SSH_KEY" -q "$HERE/pob-api.env" "$VPS_USER@$VPS_HOST:$VPS_DIR/pob-api.env"
      ssh_vps "chmod 600 $VPS_DIR/pob-api.env"
    else
      ssh_vps "test -f $VPS_DIR/pob-api.env" || { echo "no pob-api.env on the box and none here — create it (see README.md)" >&2; exit 1; }
    fi

    echo "→ rsyncing pob-api source tree (incl. 49 MB proving keys) to $VPS_DIR/src"
    # --relative keeps the repo-relative paths under src/.
    (cd "$REPO" && rsync -azR --delete-missing-args -e "ssh -i $SSH_KEY -o BatchMode=yes" \
        --exclude 'node_modules' --exclude '.pob-state' --exclude '*.test.js' \
        "${SRC_PATHS[@]}" "$VPS_USER@$VPS_HOST:$VPS_DIR/src/")

    echo "→ docker compose build pob-api && up -d"
    ssh_vps "cd $VPS_DIR && docker compose build --pull pob-api && docker compose up -d --remove-orphans && docker compose ps"
    ;;
  *) echo "unknown command: $1" >&2; exit 2 ;;
esac
