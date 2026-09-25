# ZYRA Defensive Awareness OSS Stack

ZYRA is the governed execution and alerting layer for the shared GPT-DOUG / XUNIA defensive-awareness stack.

## Live upstream status

[![Open MCT](https://img.shields.io/github/last-commit/nasa/openmct?label=Open%20MCT)](https://github.com/nasa/openmct)
[![CesiumJS](https://img.shields.io/github/last-commit/CesiumGS/cesium?label=CesiumJS)](https://github.com/CesiumGS/cesium)
[![Stone Soup](https://img.shields.io/github/last-commit/dstl/Stone-Soup?label=Stone%20Soup)](https://github.com/dstl/Stone-Soup)
[![Tracktable](https://img.shields.io/github/last-commit/sandialabs/tracktable?label=Tracktable)](https://github.com/sandialabs/tracktable)
[![PostGIS](https://img.shields.io/github/last-commit/postgis/postgis?label=PostGIS)](https://github.com/postgis/postgis)
[![MapLibre](https://img.shields.io/github/last-commit/maplibre/maplibre-gl-js?label=MapLibre)](https://github.com/maplibre/maplibre-gl-js)

The badges above are live GitHub-backed status indicators; no manual timestamps are required.

## ZYRA role

```text
AUTHORIZED DATA
    |
    v
PROVENANCE + POLICY
    |
    v
TRACK / ANOMALY ANALYTICS
    |
    v
SPATIAL + TEMPORAL STATE
    |
    v
ZYRA ALERT / REVIEW GATE
    |
    +--> Open MCT telemetry views
    +--> Cesium 3D views
    +--> MapLibre 2D views
    |
    v
HUMAN REVIEW + AUDIT EVIDENCE
```

| Integration | ZYRA use |
| --- | --- |
| Open MCT | telemetry dashboards and historical playback |
| CesiumJS | 3D real-world geospatial situational awareness |
| Stone Soup | multi-source tracking and state-estimation decision support |
| Tracktable | movement analytics and anomaly detection |
| PostGIS | spatial state, safety geofences, historical observations |
| MapLibre GL JS | 2D operational layers, alerts, and incident visualization |

Registry: [`defensive-awareness-oss.json`](defensive-awareness-oss.json)

## Operating contract

Authorized live telemetry and real-world coordinates may be used for situational awareness, sensor-health monitoring, safety-zone checks, incident correlation, historical playback, and human-reviewed alerts. Source provenance and confidence remain attached to derived state.

Material external writes remain fail-closed unless an approved ZYRA adapter explicitly grants them.

## Boundary

This layer does not implement weapon targeting, aimpoint generation, intercept guidance, fire-control, autonomous engagement, or weapons release. Tracking and mapping outputs remain decision-support data rather than weapon-control instructions.
