# NXYZ Horizons Gateway Build Summary

Branch: `nxyz-horizons-intel-gateway`

Implemented:

- Typed screening seed and evidence contracts.
- Horizons bulk-search CSV generator.
- Companion screening manifest retaining NXYZ-only metadata.
- Typed evidence normalizer with explicit `UNVERIFIED_MATCH` / `CORROBORATED` states.
- SHA-256 integrity envelope for normalized evidence metadata.
- Authenticated capability, export, and normalization API routes.
- Sensitive-route logging suppression for Horizons payloads.
- NXYZ ontology contract for Horizons investigative signals.
- Automated unit tests added to `npm test`.
- Handling/security documentation.

Not implemented or claimed:

- Direct Horizons API access.
- Horizons account/session automation.
- Web scraping.
- Investigation ZIP parsing without a real exported fixture.
- Automatic identity resolution or wrongdoing determinations.
- Foundry Ontology production binding.

The current integration intentionally stops at the boundary that can be built and tested from public documentation without pretending third-party access exists.
