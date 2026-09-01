# XUNIA OSCAL + Evidence Engine

## Purpose

This layer turns the public-source government cyber baseline into auditable machine-readable workflow without claiming government certification or importing restricted information.

```text
AUTHORITATIVE PUBLIC SOURCE
          |
          v
   RELEASE / DIGEST LOCK
          |
          v
    OSCAL VALIDATION
          |
          v
  METADATA + CONTROL-ID INDEX
          |
          v
   XUNIA CONTROL CROSSWALK
          |
          v
      EVIDENCE INDEX
          |
          v
 VALIDATION / STATUS REPORT
```

The system intentionally separates four things that are often incorrectly collapsed together:

1. a government publication exists;
2. XUNIA maps an internal control to that publication;
3. an implementation artifact exists;
4. the implementation has actually been verified.

Only item 4 permits the internal `verified` state, and even that state is **not** a government authorization, certification, ATO, CMMC result, or FedRAMP status.

## Official release pins

`governance/usg-cyber/oscal-release-lock.json` pins the authoritative public NIST release metadata reviewed for this repository.

Current pins reviewed 2026-09-01:

- OSCAL schema/specification: `usnistgov/OSCAL` `v1.2.3`;
- NIST OSCAL content: `usnistgov/oscal-content` `v1.5.0`;
- OSCAL content release `v1.5.0` is authored using OSCAL `v1.2.2` syntax and is tracked separately from the newer OSCAL schema release.

The lock records release URLs and SHA-256 digests published by the GitHub release API. A future update must change the lock explicitly; the runtime must not silently follow `latest` in production evidence generation.

## Safe OSCAL ingestion

`scripts/oscal_ingest.py` accepts either:

- a local OSCAL JSON file; or
- an HTTPS URL on the explicit NIST/GitHub allowlist.

Remote ingestion is limited to 50 MiB and fails closed for non-HTTPS or unapproved hosts. When `--sha256` is supplied, a digest mismatch aborts ingestion.

Example:

```bash
python3 scripts/oscal_ingest.py path/to/catalog.json \
  --sha256 EXPECTED_SHA256 \
  --out .xunia/oscal/catalog-manifest.json
```

The generated manifest contains:

- source locator;
- SHA-256 digest;
- whether the digest was explicitly verified;
- OSCAL model type;
- document UUID;
- title/version/OSCAL version/last-modified metadata;
- normalized control identifiers.

It does **not** copy:

- complete control prose;
- OSCAL party/person records;
- full imported source documents.

This keeps the public repository focused on provenance and mappings rather than becoming an uncontrolled mirror or personnel corpus.

## Evidence index

`governance/usg-cyber/evidence-index.json` tracks evidence for XUNIA-native controls.

Allowed states:

| State | Meaning |
|---|---|
| `not_assessed` | No implementation determination has been made. |
| `not_applicable` | Out of scope with a required written rationale. |
| `planned` | Planned but not materially implemented. |
| `partially_implemented` | Some required behavior exists but gaps remain. |
| `implemented_unverified` | Implementation artifacts exist but verification is incomplete. |
| `verified` | Evidence artifacts and explicit automated or human verification metadata exist. |

A `verified` record is rejected unless it has both evidence artifacts and verification metadata.

The engine validates repository-relative artifact paths and can verify artifact SHA-256 values when they are recorded. It does not read or upload sensitive evidence to an external service.

Generate a summary locally:

```bash
python3 scripts/compliance_evidence.py
```

Optional reports:

```bash
python3 scripts/compliance_evidence.py \
  --report-json .xunia/evidence/status.json \
  --report-md .xunia/evidence/STATUS.md
```

## Sensitive evidence rule

The public Git repository is not a storage boundary for operational secrets or regulated evidence.

Do not put any of the following into the evidence index or its public artifact paths:

- classified information;
- CUI unless a separately authorized repository and handling boundary explicitly permits it;
- CAC or DoD identifiers;
- military personnel rosters;
- private contact/location/schedule information;
- passwords, API keys, access tokens, session cookies, private keys;
- raw production logs containing credentials or personal information;
- exploit payloads or offensive targeting data unrelated to an authorized defensive lab.

For sensitive environments, retain evidence in the approved external evidence store and place only a non-sensitive reference or digest in a repository designed for that classification/handling level.

## CI behavior

`.github/workflows/usg-cyber-baseline.yml` performs three offline checks for relevant changes:

1. baseline source/safety validation;
2. evidence-index validation;
3. synthetic OSCAL ingestion smoke test.

GitHub Actions receives `contents: read` only for this workflow. The OSCAL CI test uses a synthetic local fixture and does not fetch NIST or DoD resources from the network.

## Updating an official source

When NIST publishes a new OSCAL or content release:

1. verify the release through an authoritative NIST/GitHub source;
2. record the release date and immutable release/tag URL;
3. record an official asset digest when available;
4. update `oscal-release-lock.json`;
5. update `sources.yaml`;
6. run the ingestion smoke test and baseline validator;
7. review compatibility before changing production profiles;
8. merge through a normal reviewed pull request.

Never auto-promote a draft or a newly observed `latest` release directly into a production compliance assertion.
