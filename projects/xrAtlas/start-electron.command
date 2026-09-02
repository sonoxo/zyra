#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

printf '\n=== xrAtlas — Apple Silicon Electron fallback ===\n'
MACHINE_ARCH="$(uname -m)"
printf 'Mac architecture: %s\n' "$MACHINE_ARCH"

RUNTIME="$ROOT/.runtime/node"
NODE_BIN=""
use_system_node=false

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  NODE_ARCH="$(node -p 'process.arch' 2>/dev/null || echo unknown)"
  if [[ "$NODE_MAJOR" -ge 20 ]] && { [[ "$MACHINE_ARCH" != "arm64" ]] || [[ "$NODE_ARCH" == "arm64" ]]; }; then
    use_system_node=true
    NODE_BIN="$(command -v node)"
    printf 'Using system Node: %s (%s)\n' "$(node -v)" "$NODE_ARCH"
  fi
fi

if [[ "$use_system_node" != true ]]; then
  mkdir -p "$ROOT/.runtime" "$ROOT/.cache"
  if [[ ! -x "$RUNTIME/bin/node" ]]; then
    printf 'Installing a private Node.js 22 runtime for xrAtlas...\n'
    if [[ "$MACHINE_ARCH" == "arm64" ]]; then NODE_PLATFORM_ARCH="darwin-arm64"; else NODE_PLATFORM_ARCH="darwin-x64"; fi
    SHASUMS="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)"
    TAR_NAME="$(printf '%s\n' "$SHASUMS" | awk -v a="$NODE_PLATFORM_ARCH.tar.gz" '$2 ~ a"$" {print $2; exit}')"
    EXPECTED_SHA="$(printf '%s\n' "$SHASUMS" | awk -v f="$TAR_NAME" '$2 == f {print $1; exit}')"
    VERSION_DIR="${TAR_NAME%.tar.gz}"
    DOWNLOAD="$ROOT/.cache/$TAR_NAME"
    curl -fL "https://nodejs.org/dist/latest-v22.x/$TAR_NAME" -o "$DOWNLOAD"
    ACTUAL_SHA="$(shasum -a 256 "$DOWNLOAD" | awk '{print $1}')"
    [[ "$ACTUAL_SHA" == "$EXPECTED_SHA" ]] || { printf 'ERROR: Node runtime checksum mismatch.\n'; exit 1; }
    rm -rf "$RUNTIME" "$ROOT/.runtime/$VERSION_DIR"
    tar -xzf "$DOWNLOAD" -C "$ROOT/.runtime"
    mv "$ROOT/.runtime/$VERSION_DIR" "$RUNTIME"
  fi
  export PATH="$RUNTIME/bin:$PATH"
  NODE_BIN="$RUNTIME/bin/node"
fi

export PATH="$(dirname "$NODE_BIN"):$PATH"
"$NODE_BIN" diagnostics.js

if [[ ! -x "$ROOT/node_modules/.bin/electron" ]]; then
  npm install --no-audit --no-fund
fi

npm start
