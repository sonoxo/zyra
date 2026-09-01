# ZYRA // RVIA Federal Intel Public-Source Layer

ZYRA consumes the shared RVIA source vocabulary for five U.S. intelligence entities/programs represented in the operator reference:

| ID | Entity | Model |
|---|---|---|
| `cia` | Central Intelligence Agency | agency |
| `nsa` | National Security Agency | agency |
| `nro` | National Reconnaissance Office | agency |
| `ngp` | National Geospatial-Intelligence Program | program mapped to NGA public resources |
| `gdip` | General Defense Intelligence Program | program mapped to DIA public resources |

Machine-readable manifest: [`../intel/rvia-federal-intel.json`](../intel/rvia-federal-intel.json)

Canonical runtime/API implementation: `sonoxo/gpt-doug-llm/va3lm`.

## Verified official GitHub sources

ZYRA only promotes organizations independently verified as official public agency organizations:

- NSA: `https://github.com/NationalSecurityAgency`
- NSA Cybersecurity Directorate: `https://github.com/nsacyber`
- NGA: `https://github.com/ngageoint`

Curated public software includes Ghidra, DataWave, Foundation, GEOINT standards, GeoPackage, Hootenanny, and MAGE Server.

CIA, NRO, and DIA/GDIP are represented through official government public sources because this catalog did not verify an official GitHub organization for those entities as of 2026-09-01. Third-party repositories must not be labeled official.

## ZYRA ingestion role

```text
OFFICIAL PUBLIC SOURCE / VERIFIED OFFICIAL GITHUB
                     ↓
              SOURCE PROVENANCE
                     ↓
          RVIA FEDERAL-INTEL MANIFEST
                     ↓
                  ZYRA
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   search/index   citations    ontology tags
        └────────────┼────────────┘
                     ↓
               human review
```

The manifest is a source-control contract. It can be used by ZYRA agents to classify sources, route research, attach provenance, and reject unverified agency claims.

## Hard boundaries

This integration is limited to public OSINT/open-source software and does not authorize:

- classified, leaked, stolen, credentialed, or access-controlled material;
- interception of communications or signals collection;
- covert person tracking or biometric identification;
- targeting or operational tasking;
- bypassing government or security controls.

ZYRA remains an independent software project and is not affiliated with, endorsed by, or part of any U.S. intelligence agency.
