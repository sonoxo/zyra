#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${XRATLAS_TARGET_URL:-https://nukesimulation.com/}"
PROFILE="$ROOT/.chrome-profile"
EXTENSION="$ROOT/chrome-extension"

printf '\n=== xrAtlas 1.2 — Native Chrome 3D launcher ===\n'
printf 'Target: %s\n' "$TARGET"
printf 'Architecture: %s\n' "$(uname -m)"

CHROME_CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta"
)

CHROME=""
for candidate in "${CHROME_CANDIDATES[@]}"; do
  if [[ -x "$candidate" ]]; then
    CHROME="$candidate"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  printf 'Google Chrome was not found. Falling back to Electron.\n'
  exec bash "$ROOT/start-electron.command"
fi

mkdir -p "$PROFILE"

printf 'Renderer: Google Chrome (native browser engine)\n'
printf 'Mode: app window, address bar hidden\n'
printf 'Profile: %s\n' "$PROFILE"
printf '\nLaunching xrAtlas with native Chrome rendering...\n'

exec "$CHROME" \
  --app="$TARGET" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --enable-features=CanvasOopRasterization \
  --disable-extensions-except="$EXTENSION" \
  --load-extension="$EXTENSION"
