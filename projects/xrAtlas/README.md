# xrAtlas

**xrAtlas** is a Node.js/Electron desktop shell and optional localhost reverse proxy optimized for Apple Silicon Macs, including the M2.

The current default target is `https://nukesimulation.com/`. xrAtlas does **not** include, copy, or claim ownership of the upstream site's proprietary source code or assets. It loads the live site at runtime.

## M2 quick start

1. Download or clone this folder.
2. On macOS, run `start.command`.
3. xrAtlas uses a native arm64 Node.js 20+ install when available.
4. If necessary, the launcher downloads a private official Node.js 22 arm64 runtime and verifies its SHA-256 checksum.
5. Electron launches xrAtlas as a standalone desktop window without a normal browser address bar.

## Localhost mode

After the first desktop launch, run `start-localhost.command` to expose:

```text
http://127.0.0.1:8787
```

Health check:

```text
http://127.0.0.1:8787/__health
```

## Architecture

- Node.js 20+ / Node.js 22 bootstrap fallback
- Electron desktop shell
- native Apple Silicon / arm64 support
- Chromium GPU rasterization for WebGL/Three.js workloads
- isolated remote content (`nodeIntegration: false`, `contextIsolation: true`, sandbox enabled)
- optional local reverse proxy

## Rendering compatibility

xrAtlas v1.1.3 presents a normal Chrome-on-macOS user agent to the live renderer and explicitly enables WebGL, GPU rasterization, zero-copy rendering, and Chromium's GPU path. This is intended to improve compatibility with map and 3D-tile renderers that take a different code path when Electron is detected.

Press **F12** or **Cmd+Option+I** inside xrAtlas to open Chromium DevTools. xrAtlas also writes failed Google / tile / WorldPop requests to the Terminal that launched the app.

Optional ANGLE/Metal troubleshooting mode:

```bash
XRATLAS_FORCE_METAL=1 npm start
```

## Configuration

Override the default remote target when launching:

```bash
XRATLAS_TARGET_URL="https://example.com" npm start
```

Start full screen:

```bash
XRATLAS_FULLSCREEN=1 npm start
```

## Diagnostics

```bash
node diagnostics.js
```

## Upstream attribution

The default runtime target is **nukesimulation.com**. xrAtlas is a separate local wrapper/launcher and does not redistribute that site's application source or assets.

## xrAtlas branding

The Electron shell replaces the upstream page's visible `NukeSimulation.com` text label with `xrAtlas` after each page load and watches dynamic DOM updates so the shell branding remains consistent. This is a presentation-layer override only: it does not copy or modify the upstream site's source repository. Upstream attribution remains documented here.
