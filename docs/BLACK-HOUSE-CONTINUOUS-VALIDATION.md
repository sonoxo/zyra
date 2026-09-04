# Black House Continuous Validation + Closed Loop Improvement

Status: implemented in-repository.

This module turns the AIPCon 9 operational priority of measurable, continuously validated workflow outcomes into a free local capability inside The Black House.

## What it does

The validator compares a source dataset against a target dataset using a stable record key and produces deterministic validation evidence. The closed-loop improver then detects degraded results, proposes a correction candidate, re-runs validation, compares before/after quality, and preserves only the better result for review.

It requires no paid model, paid API, Palantir enrollment, cloud account, or external service.

## Free runtime

Requirements:

- Node.js 20+
- local JSON or CSV files

Baseline validation:

```bash
node scripts/black-house/continuous-validator.mjs \
  --source examples/black-house-validation/source.json \
  --target examples/black-house-validation/target.json \
  --key id \
  --threshold 99 \
  --out .black-house/evidence/continuous-validation.json
```

Closed-loop improvement proof:

```bash
node scripts/black-house/closed-loop-improver.mjs \
  --source examples/black-house-validation/source.json \
  --target examples/black-house-validation/target-degraded.json \
  --key id \
  --threshold 99 \
  --candidate .black-house/evidence/improved-candidate.json \
  --evidence .black-house/evidence/closed-loop-improvement.json
```

## Closed-loop behavior

```text
SOURCE OF TRUTH
      ↓
DEGRADED TARGET
      ↓
VALIDATE + SCORE
      ↓
DETECT DELTAS
      ↓
PROPOSE RECONCILIATION CANDIDATE
      ↓
RE-VALIDATE
      ↓
COMPARE BEFORE / AFTER
   ↙                 ↘
WORSE / SAME       BETTER
     ↓                ↓
KEEP TARGET      PRESERVE CANDIDATE
                      ↓
                EVIDENCE ARTIFACT
                      ↓
              HUMAN REVIEW BEFORE
              CONSEQUENTIAL PROMOTION
```

The engine never overwrites the original target. It emits a candidate file and evidence bundle. A better score does not authorize deployment.

## Evidence produced

Validation evidence records SHA-256 input hashes, exact-match count, changed/missing/unexpected records, validation accuracy, threshold, verdict, and bounded deltas.

Closed-loop evidence adds:

- before validation score
- candidate validation score
- preserved score
- accuracy gain
- issue reduction
- proposed reconciliation operation counts
- candidate SHA-256 hash
- explicit `originalTargetMutated: false`
- explicit `humanReviewRequiredForPromotion: true`
- explicit `automaticDeploymentAuthorized: false`

## GitHub integration

`.github/workflows/black-house-continuous-validation.yml` now runs both validator and closed-loop unit tests, proves a normal migration, intentionally feeds a degraded target into the improvement engine, re-validates the preserved candidate at 100%, and uploads the complete `.black-house/evidence/` directory as an Actions artifact.

The workflow is deterministic and model-free. GitHub is used only as the repository CI surface; both engines run locally with Node.

## Source intelligence

Design source:

- Palantir AIPCon 9 March 2026 livestream: https://www.youtube.com/watch?v=3O8isI3GJXU
- Black House intelligence brief: `.black-house/intel/aipcon-9-2026-03-09.json`
- Palantir enterprise migration material describing continuous validation and continuous improvement cycles.

The implementation copies the operational pattern rather than Palantir proprietary software: measure, validate continuously, identify failure, propose a correction, re-run validation, preserve measurable improvement, retain evidence, and keep consequential promotion under human control.
