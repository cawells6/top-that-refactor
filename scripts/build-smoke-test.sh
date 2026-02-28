#!/usr/bin/env bash
# ===========================================================================
# scripts/build-smoke-test.sh
#
# Build-output smoke test for Top That! (#21 on Roadmap)
#
# Runs:
#   1. npm run build         — type-check TS + bundle client via Vite
#   2. Start server           — launch from TS source via tsx (production-like)
#   3. Curl /health           — verify the server responds
#   4. Teardown               — kill the server, report pass/fail
#
# Note: The project uses noEmit:true in tsconfig — tsc type-checks only.
#       The server always runs from TS source (tsx / ts-node / node --loader).
#       Vite builds the client into dist/client/.
#
# Usage:
#   bash scripts/build-smoke-test.sh
#   SMOKE_PORT=9999 bash scripts/build-smoke-test.sh
#
# Exit codes:
#   0 — build + server + health check all passed
#   1 — any step failed
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

# Use a high fixed port to avoid collisions with dev servers on 3000/5173
SMOKE_PORT="${SMOKE_PORT:-19283}"

SERVER_PID=""
EXIT_CODE=0

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[smoke] Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

# ── Step 1: Build (type-check + client bundle) ────────────────────────────
echo ""
echo "========================================"
echo "[smoke] Step 1/3: Building project..."
echo "========================================"

if ! npm run build; then
  echo "[smoke] ❌ Build failed."
  exit 1
fi
echo "[smoke] ✅ Build succeeded."

# ── Step 2: Start server from TS source ────────────────────────────────────
echo ""
echo "========================================"
echo "[smoke] Step 2/3: Starting server on port ${SMOKE_PORT}..."
echo "========================================"

export NODE_ENV=production
export PORT="$SMOKE_PORT"

# Run server from TS source using tsx (how the project actually runs)
npx tsx start-server.ts &
SERVER_PID=$!

echo "[smoke] Server PID: $SERVER_PID"

# Wait for the server to be ready (up to 15 seconds)
MAX_WAIT=15
WAITED=0
SERVER_READY=false

while [[ $WAITED -lt $MAX_WAIT ]]; do
  sleep 1
  WAITED=$((WAITED + 1))

  # Check server process is still alive
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[smoke] ❌ Server process exited unexpectedly."
    SERVER_PID=""
    exit 1
  fi

  # Try health endpoint
  if curl -sf "http://localhost:${SMOKE_PORT}/health" >/dev/null 2>&1; then
    SERVER_READY=true
    break
  fi
done

if [[ "$SERVER_READY" != "true" ]]; then
  echo "[smoke] ❌ Server did not become ready within ${MAX_WAIT}s."
  exit 1
fi

echo "[smoke] Server ready (waited ${WAITED}s)."

# ── Step 3: Health check ──────────────────────────────────────────────────
echo ""
echo "========================================"
echo "[smoke] Step 3/3: Health check..."
echo "========================================"

HEALTH_RESPONSE=$(curl -sf "http://localhost:${SMOKE_PORT}/health" 2>&1 || true)

if [[ "$HEALTH_RESPONSE" == "OK" ]]; then
  echo "[smoke] ✅ Health check passed: $HEALTH_RESPONSE"
else
  echo "[smoke] ❌ Health check failed. Response: '$HEALTH_RESPONSE'"
  EXIT_CODE=1
fi

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "========================================"
  echo "[smoke] ✅ BUILD SMOKE TEST PASSED"
  echo "========================================"
else
  echo "========================================"
  echo "[smoke] ❌ BUILD SMOKE TEST FAILED"
  echo "========================================"
fi

exit $EXIT_CODE
