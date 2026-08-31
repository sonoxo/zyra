# NXYZ Horizons Intelligence Gateway

## Status

**Implementation:** file-exchange gateway ready on the `nxyz-horizons-intel-gateway` branch.

**Direct Horizons API:** not configured and not claimed.

NXYZ uses supported analyst workflows around C4ADS Horizons rather than scraping the site or automating credentials.

## Why this exists

Horizons supports bulk search with CSV screening lists, Investigations that can be exported, and Bring Your Own Data. NXYZ can therefore provide a governed bridge around those supported file workflows:

```text
NXYZ screening seeds
        |
        v
bulk-search CSV + companion manifest
        |
        v
C4ADS Horizons Investigation
        |
        v
analyst-selected / exported evidence
        |
        v
NXYZ evidence normalization
        |
        v
IntelligenceSignal + provenance + verification state
        |
        v
Foundry / AIP binding (next integration step)
```

## Implemented endpoints

All endpoints require an authenticated Zyra/NXYZ session.

### `GET /api/nxyz/horizons/capabilities`

Reports exactly what the gateway can and cannot do. The direct machine-to-machine Horizons API state is explicitly `NOT_CONFIGURED`.

### `POST /api/nxyz/horizons/bulk-export`

Creates a Horizons-compatible screening CSV plus an NXYZ companion manifest.

Example request:

```json
{
  "seeds": [
    {
      "seedId": "vendor-001",
      "entityType": "COMPANY",
      "primaryTerm": "Example Technologies LLC",
      "qualifiers": ["Virginia", "123 Main Street"],
      "notes": "ContractOps vendor screening"
    }
  ]
}
```

The CSV contains only search values:

```csv
Example Technologies LLC,Virginia,123 Main Street
```

NXYZ keeps `seedId`, `entityType`, notes, and row numbers in the returned companion manifest so they do not accidentally become Horizons search terms.

Horizons documentation states that multiple values in a single imported CSV row are combined as one search using AND semantics. The gateway preserves that behavior.

### `POST /api/nxyz/horizons/normalize`

Normalizes analyst-reviewed investigation evidence into typed NXYZ signals.

Example request:

```json
{
  "investigationName": "Vendor due diligence",
  "retrievedAt": "2026-08-31T20:05:00.000Z",
  "records": [
    {
      "sourceFile": "corporate-registry-result.pdf",
      "datasetName": "Corporate registry",
      "jurisdiction": "Virginia, USA",
      "matchedTerms": ["Example Technologies LLC"],
      "identifiers": [
        { "kind": "address", "value": "123 Main Street" }
      ],
      "corroborated": false
    }
  ]
}
```

The result is assigned an integrity envelope hash and a verification state. A raw name match defaults to `UNVERIFIED_MATCH`; NXYZ only marks a record `CORROBORATED` when the caller explicitly supplies corroboration after analyst review.

## Verification model

The gateway intentionally separates:

- **match** — the search term appears in an evidence record;
- **identity** — independent identifiers support that the record concerns the intended entity;
- **assessment** — NXYZ/AIP may summarize or score evidence;
- **decision** — any consequential decision remains governed by the surrounding NXYZ policy and human-review controls.

A search hit is not proof of wrongdoing.

## Evidence integrity

Every normalized signal receives an `envelopeHash` calculated from canonicalized NXYZ metadata. This is useful for detecting later changes to the normalization record.

If NXYZ has the original exported file bytes, callers can also provide the file's SHA-256 as `sourceHash`. These hashes have different meanings:

- `sourceHash`: hash of the upstream source file, when available;
- `envelopeHash`: hash of the NXYZ normalization envelope.

Neither hash independently proves that a third-party document is factually accurate.

## Privacy and logging

`/api/nxyz/horizons` is treated as a sensitive API namespace. Response bodies from this namespace should not be copied into normal application request logs because screening terms and evidence may contain sensitive investigative context.

Do not commit investigation exports or private screening data to the public repository.

## Supported workflow today

1. Build an authorized NXYZ screening seed list.
2. Call `/api/nxyz/horizons/bulk-export`.
3. Save the returned CSV locally.
4. Import the CSV into a Horizons Investigation.
5. Conduct the investigation using authorized Horizons access.
6. Export or select relevant evidence from Horizons.
7. Record source metadata and optional SHA-256 hashes.
8. Submit evidence metadata to `/api/nxyz/horizons/normalize`.
9. Review all `UNVERIFIED_MATCH` signals.
10. Corroborate identity with independent identifiers before downstream high-impact use.

## Next implementation stages

- Parser for the documented Horizons Investigation export package once fixture files are available for testing.
- Optional local SHA-256 utility for exported source files.
- Foundry Ontology object/action bindings for `IntelligenceSignal`, `EvidenceArtifact`, and `SourceProvenance`.
- ContractOps vendor-screening UI that generates seed lists and consumes normalized signals.
- Investigation evidence dashboard with explicit verification-state transitions.

## External references

- Horizons: `https://horizons.c4ads.org/`
- C4ADS Horizons Investigations documentation: `https://support.horizons.c4ads.org/articles/1036691089-investigations-101`
- C4ADS Bring Your Own Data announcement: `https://c4ads.org/news/bring-your-own-data/`

Use of Horizons remains subject to C4ADS account permissions, terms, acceptable-use requirements, dataset restrictions, and publication rules.
