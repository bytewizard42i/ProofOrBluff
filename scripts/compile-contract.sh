#!/usr/bin/env bash
# compile-contract.sh — compile the POB Compact contract into managed artifacts.
#
# WHAT THIS DOES (for John, learning the toolchain):
#   `compact compile` turns realDeal/contracts/proof-or-bluff.compact into
#   three things under contracts/managed/proof-or-bluff/:
#     contract/  JS + TypeScript bindings the app and CLI import
#     keys/      prover + verifier keys, one pair per circuit
#     zkir/      the zero-knowledge circuit representations
#   The browser app reaches these through the symlink realDeal/app/src/contract,
#   so a successful compile updates every surface at once — no copying needed.
#
# FLAGS DECODED:
#   set -e            stop at the first failing command instead of plowing on
#   set -u            treat unset variables as errors (catches typos)
#   set -o pipefail   a failure anywhere in a pipeline fails the pipeline
set -euo pipefail

# Resolve paths from this script's location so it works from any directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../realDeal/contracts"
CONTRACT_NAME="proof-or-bluff"
if [[ "${1:-}" == "--mainnet" ]]; then
  CONTRACT_NAME="proof-or-bluff-mainnet"
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--mainnet]" >&2
  exit 2
fi
SOURCE_FILE="$CONTRACTS_DIR/$CONTRACT_NAME.compact"
OUTPUT_DIR="$CONTRACTS_DIR/managed/$CONTRACT_NAME"

if ! command -v compact >/dev/null 2>&1; then
  echo "ERROR: the 'compact' devtool is not on PATH." >&2
  echo "Install per docs.midnight.network/getting-started/installation," >&2
  echo "then pin the PUBLIC-NETWORK toolchain with:  compact update 0.31" >&2
  echo "(A bare 'compact update' installs 0.35+, which targets ledger 9 —" >&2
  echo " NOT yet deployed on preview/preprod/mainnet. Verify against the" >&2
  echo " support matrix at docs.midnight.network/relnotes/support-matrix.)" >&2
  exit 1
fi

COMPILER_VERSION="$(compact compile --version)"
if [[ "$COMPILER_VERSION" != 0.31.* ]]; then
  echo "ERROR: public networks currently require compact 0.31.x; found $COMPILER_VERSION" >&2
  echo "Run 'compact update 0.31' after verifying the official support matrix." >&2
  exit 1
fi
echo "Compiler version: $COMPILER_VERSION"
echo "Compiling $SOURCE_FILE"
echo "       -> $OUTPUT_DIR"
# Full compile, NO skip flags: deployment needs keys/ and zkir/, not just JS.
compact compile "$SOURCE_FILE" "$OUTPUT_DIR"

echo
echo "Done. Artifacts:"
ls "$OUTPUT_DIR"
echo
echo "Reminder: rerun the test suite and an e2e against the local stack"
echo "before deploying anywhere public (see docs/MAINNET_PLAN.md)."
