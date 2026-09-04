# Black House Continuous Validation

Status: implemented in-repository.

This module turns the AIPCon 9 operational priority of measurable, continuously validated workflow outcomes into a free local capability inside The Black House.

## What it does

The validator compares a source dataset against a target dataset using a stable record key and produces deterministic validation evidence. It is designed for migration checks, configuration promotion, data-pipeline verification, and other before/after operational workflows.

It requires no paid model, paid API, Palantir enrollment, cloud account, or external service.

## Free runtime

Requirements:

- Node.js 20+
- local JSON or CSV files

Run:

```bash
node scripts/black-house/continuous-validator.mjs \
  --source examples/black-house-validation/source.json \
  --target examples/black-house-validation/target.json \
  --key id \
  --threshold 99 \
  --out .black-house/evidence/continuous-validation.json
```

## Evidence produced

The evidence envelope records:

- SHA-256 hash of both source and target inputs
- exact-match count
- changed-record count
- missing-record count
- unexpected-record count
- validation accuracy percentage
- policy threshold
- PASS / FAIL verdict
- bounded delta samples for review

A failed threshold exits non-zero, so the validator can gate CI or promotion workflows.

## GitHub integration

`.github/workflows/black-house-continuous-validation.yml` runs the validator tests and a migration proof automatically, then uploads the evidence JSON as an Actions artifact.

The workflow is intentionally deterministic and model-free. GitHub is used only as the repository CI surface; the validator itself runs locally with Node.

## Black House policy

```text
SOURCE SNAPSHOT
      ↓
TARGET SNAPSHOT
      ↓
SHA-256 INPUT IDENTITY
      ↓
RECORD VALIDATION
      ↓
METRICS + DELTAS
      ↓
THRESHOLD POLICY
   ↙       ↘
 FAIL      PASS
  ↓         ↓
BLOCK    EVIDENCE
            ↓
   HUMAN REVIEW IF
   PROMOTION IS CONSEQUENTIAL
```

A PASS verdict means the configured validation threshold was met. It does not grant deployment permission, external authorization, or approval for a consequential action.

## Source intelligence

Design source:

- Palantir AIPCon 9 March 2026 livestream: https://www.youtube.com/watch?v=3O8isI3GJXU
- Black House intelligence brief: `.black-house/intel/aipcon-9-2026-03-09.json`
- Palantir enterprise migration material describing continuous validation and continuous improvement cycles.

The implementation intentionally copies the operational pattern rather than Palantir proprietary software: measure, validate continuously, preserve evidence, iterate, and keep consequential promotion under human control.
