# Zyra GEOINT / Public Intelligence Pipeline

Public-source intelligence ingestion and ontology bridge for Zyra, VA3LM, and GPT-Doug-LLM.

## Scope

This module ingests **public, declassified, or unclassified** material only. Initial source families include the CIA FOIA Electronic Reading Room, CIA Center for the Study of Intelligence, and public NGA/GEOINT standards resources. It does not claim or imply affiliation with CIA, NGA, DoD, or any other government organization.

## Architecture

```text
Public source discovery
        ↓
Source manifest + provenance capture
        ↓
Normalize to canonical intelligence record
        ↓
Schema / policy validation
        ↓
Ontology mapping
        ↓
Curated JSON/NDJSON artifact
        ↓
Palantir Foundry dataset upload (optional)
        ↓
Foundry transforms / Pipeline Builder
        ↓
Ontology object + link mappings
        ↓
Zyra / VA3LM / GPT-Doug-LLM applications
```

## Mandatory record rule

Every extracted assertion must retain:

- source URL
- source publisher
- source publication/release date when available
- ingestion timestamp
- provenance chain
- confidence
- public classification label
- transformation history for derived records

No record should be promoted into the curated intelligence graph without provenance.

## Foundry bridge

The uploader follows Palantir's public dataset file-upload API. Configure these values only in runtime secrets/variables, never in the repository:

- `FOUNDRY_HOSTNAME` — enrollment hostname, e.g. `https://example.palantirfoundry.com`
- `FOUNDRY_TOKEN` — bearer token with dataset-write permission
- `FOUNDRY_DATASET_RID` — destination dataset RID
- `FOUNDRY_BRANCH` — optional, defaults to `master`

Upload a validated artifact:

```bash
node integrations/geoint-intel/src/palantir-upload.mjs ./artifact.ndjson
```

## Recommended Foundry pipeline

1. Raw public-source dataset
2. Provenance-normalized dataset
3. Entity/relationship extraction dataset
4. GEOINT/public-intelligence curated dataset
5. Ontology mapping to `Source`, `Document`, `Observation`, `Entity`, `Place`, `Assessment`, `Standard`, and `ProvenanceRecord`
6. Scheduled builds plus quality/health checks

## Safety / integrity constraints

- PUBLIC / DECLASSIFIED / UNCLASSIFIED sources only.
- No credential scraping, access-control bypass, or collection from non-public systems.
- Do not infer classified capabilities from gaps or redactions.
- Do not present project namespaces as official U.S. government agencies.
- Preserve uncertainty and contradictory-source evidence instead of collapsing it into a single unsupported fact.
