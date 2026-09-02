# xrAtlas

**xrAtlas** is a geospatial desktop shell optimized for Apple Silicon Macs, including the M2.

The current default target is `https://nukesimulation.com/`. xrAtlas does **not** include, copy, or claim ownership of the upstream site's proprietary source code or assets. It loads the live site at runtime.

## v1.2 rendering mode

`start.command` now launches xrAtlas through the installed **Google Chrome** engine in app mode. This keeps the browser address bar hidden while using Chrome's normal WebGL, referrer, cookie, session, and Google Maps request behavior. This is the preferred runtime for Photorealistic 3D Tiles and building meshes.

Electron remains available as a fallback through:

```bash
bash ./start-electron.command
```

## M2 quick start

1. Download or clone this folder.
2. On macOS, run `start.command`.
3. xrAtlas looks for Google Chrome and launches it in app mode.
4. The browser address bar stays hidden.
5. The bundled content script keeps the presentation label as `xrAtlas`.

## Localhost mode

`start-localhost.command` exposes:

```text
http://127.0.0.1:8787
```

Health check:

```text
http://127.0.0.1:8787/__health
```

## Architecture

- native Google Chrome app-mode runtime for the 3D map view
- Electron fallback runtime
- Apple Silicon / arm64 support
- WebGL / GPU rasterization
- optional localhost reverse proxy
- presentation-layer xrAtlas branding

## Configuration

Override the default remote target when launching:

```bash
XRATLAS_TARGET_URL="https://example.com" bash ./start.command
```

## Diagnostics

Electron fallback diagnostics:

```bash
node diagnostics.js
```

## Upstream attribution

The default runtime target is **nukesimulation.com**. xrAtlas is a separate local wrapper/launcher and does not redistribute that site's application source or assets.
