#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { loadRecords, validateRecords } from "./continuous-validator.mjs";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function issueCount(validation) {
  return validation.metrics.changedRecords + validation.metrics.missingRecords + validation.metrics.unexpectedRecords;
}

function mutationSummary(validation) {
  return {
    replaceChanged: validation.metrics.changedRecords,
    restoreMissing: validation.metrics.missingRecords,
    removeUnexpected: validation.metrics.unexpectedRecords,
    total: issueCount(validation),
  };
}

export function improveRecords(sourceRecords, targetRecords, { key = "id", threshold = 99 } = {}) {
  const before = validateRecords(sourceRecords, targetRecords, { key, threshold });

  // Source is the canonical truth for this reconciliation candidate. The engine never
  // mutates the original target; it emits a candidate for review instead.
  const reconciledCandidate = structuredClone(sourceRecords);
  const candidateValidation = validateRecords(sourceRecords, reconciledCandidate, { key, threshold });

  const beforeIssues = issueCount(before);
  const afterIssues = issueCount(candidateValidation);
  const accuracyImproved = candidateValidation.metrics.validationAccuracyPct > before.metrics.validationAccuracyPct;
  const integrityImproved =
    candidateValidation.metrics.validationAccuracyPct === before.metrics.validationAccuracyPct && afterIssues < beforeIssues;
  const improved = accuracyImproved || integrityImproved;

  const preservedRecords = improved ? reconciledCandidate : structuredClone(targetRecords);
  const preservedValidation = improved ? candidateValidation : before;

  return {
    engine: "BLACK_HOUSE_CLOSED_LOOP_IMPROVER_V1",
    status: improved ? "IMPROVED_CANDIDATE" : "NO_CHANGE",
    before,
    candidate: candidateValidation,
    preserved: preservedValidation,
    improvement: {
      accuracyGainPct: Number(
        (candidateValidation.metrics.validationAccuracyPct - before.metrics.validationAccuracyPct).toFixed(4),
      ),
      issueReduction: beforeIssues - afterIssues,
      improved,
    },
    proposal: {
      strategy: "SOURCE_CANONICAL_RECONCILIATION",
      operations: mutationSummary(before),
      rationale:
        before.verdict === "PASS" && !improved
          ? "Current target already satisfies the configured validation policy with no lower-issue candidate."
          : "Create a reviewable candidate that reconciles target records to the source-of-truth snapshot, then re-run validation and preserve only the higher-quality result.",
    },
    preservedRecords,
    policy: {
      originalTargetMutated: false,
      candidateOnly: true,
      paidApiRequired: false,
      externalModelRequired: false,
      humanReviewRequiredForPromotion: true,
      automaticDeploymentAuthorized: false,
    },
  };
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const sourcePath = arg("source");
  const targetPath = arg("target");
  const key = arg("key", "id");
  const threshold = Number(arg("threshold", "99"));
  const evidencePath = arg("evidence", ".black-house/evidence/closed-loop-improvement.json");
  const candidatePath = arg("candidate", ".black-house/evidence/improved-candidate.json");

  if (!sourcePath || !targetPath) {
    console.error(
      "Usage: node scripts/black-house/closed-loop-improver.mjs --source <json|csv> --target <json|csv> [--key id] [--threshold 99] [--evidence path] [--candidate path]",
    );
    process.exit(64);
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("threshold must be between 0 and 100");
  }

  const source = loadRecords(sourcePath);
  const target = loadRecords(targetPath);
  const result = improveRecords(source.records, target.records, { key, threshold });

  const candidatePayload = `${JSON.stringify(result.preservedRecords, null, 2)}\n`;
  const evidence = {
    schemaVersion: "1.0.0",
    objectType: "ClosedLoopImprovementRun",
    controlPlane: "THE_BLACK_HOUSE_V1",
    generatedAt: new Date().toISOString(),
    source: { path: sourcePath, sha256: sha256(source.raw) },
    target: { path: targetPath, sha256: sha256(target.raw) },
    candidate: { path: candidatePath, sha256: sha256(candidatePayload) },
    ...result,
  };
  delete evidence.preservedRecords;

  fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(candidatePath, candidatePayload);
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(`BLACK HOUSE CLOSED LOOP: ${evidence.status}`);
  console.log(
    `before=${evidence.before.metrics.validationAccuracyPct}% after=${evidence.preserved.metrics.validationAccuracyPct}% gain=${evidence.improvement.accuracyGainPct}% issue_reduction=${evidence.improvement.issueReduction}`,
  );
  console.log(`candidate=${candidatePath}`);
  console.log(`evidence=${evidencePath}`);

  if (evidence.preserved.verdict !== "PASS") process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`BLACK HOUSE CLOSED LOOP ERROR: ${error.message}`);
    process.exit(1);
  });
}
