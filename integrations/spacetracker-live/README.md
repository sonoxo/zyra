# SpaceTracker Live — Zyra Integration

Zyra integration for current Earth-orbit object data, registered under the requested ecosystem reference:

- `https://live.spacetracker.org/`

## Design

The tracker website is kept as the canonical ecosystem reference. The backend adapter does **not** scrape the UI. It consumes the machine-readable current GP/OMM orbital-element feed from CelesTrak and exposes a stable authenticated Zyra API.

Default upstream:

- `https://celestrak.org/NORAD/elements/gp.php`

The returned records are current orbital elements suitable for SGP4/SDP4 propagation. They are not direct spacecraft telemetry and should not be labeled as such.

## Zyra routes

All routes require the normal Zyra authentication middleware.

```text
GET /api/spacetracker/capabilities
GET /api/spacetracker/health
GET /api/spacetracker/live/:norad
GET /api/spacetracker/live/group/:group?offset=0&limit=100
```

Examples:

```text
GET /api/spacetracker/live/25544
GET /api/spacetracker/live/group/ACTIVE?limit=100
GET /api/spacetracker/live/group/STATIONS?limit=100
```

## Configuration

```bash
SPACETRACKER_LIVE_URL=https://live.spacetracker.org/
SPACETRACKER_ORBITAL_API_URL=https://celestrak.org/NORAD/elements/gp.php
SPACETRACKER_CACHE_TTL_MS=7200000
SPACETRACKER_REQUEST_TIMEOUT_MS=15000
```

## Response provenance

Every live-data response includes a `source` envelope that records:

- requested SpaceTracker ecosystem reference
- verified public tracker reference
- upstream data provider
- upstream API
- orbital-data class
- SGP4/SDP4 compatibility
- explicit `directSpacecraftTelemetry: false`

This keeps the integration auditable for later Foundry/Ontology ingestion.

## Next integration layer

Recommended ontology mapping:

```text
SpaceObject
├── noradCatalogId
├── objectName
├── objectType
├── internationalDesignator
├── epoch
├── inclination
├── eccentricity
├── meanMotion
├── raan
├── argumentOfPericenter
├── meanAnomaly
├── bstar
├── sourceSystem
├── retrievedAt
└── provenance
```

A propagation service can then transform those orbital elements into time-indexed latitude/longitude/altitude tracks for the Xunia/Zyra geospatial layer.
