#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "[1/3] HTTP health endpoint..."
curl -fsS "$BASE_URL/health" >/dev/null
echo "  OK"

echo "[2/3] DB connectivity (requires DATABASE_URL in env inside container)..."
node dist/system/healthCheck.cli.js db

echo "[3/3] API smoke (requires ADMIN token env if enabled)..."
node dist/system/healthCheck.cli.js api || true

echo "All checks complete."
