#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if command -v node >/dev/null 2>&1; then
  NODE=node
elif [[ -x "$ROOT/.runtime/node/bin/node" ]]; then
  NODE="$ROOT/.runtime/node/bin/node"
else
  echo 'Node.js is not installed yet. Run start.command once first.'
  read -r -p 'Press Return to close...'
  exit 1
fi

"$NODE" proxy-server.js &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT INT TERM
sleep 1

URL='http://127.0.0.1:8787'
if [[ -d '/Applications/Google Chrome.app' ]]; then
  open -na 'Google Chrome' --args --app="$URL"
elif [[ -d '/Applications/Chromium.app' ]]; then
  open -na 'Chromium' --args --app="$URL"
else
  open "$URL"
fi

printf 'xrAtlas local proxy running at %s\nKeep this Terminal window open.\n' "$URL"
wait "$PID"
