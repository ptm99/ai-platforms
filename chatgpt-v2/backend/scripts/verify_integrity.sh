#!/usr/bin/env sh
set -eu

echo "Verifying file integrity (manifest)..."
node dist/system/fileIntegrity.cli.js
echo "OK"
