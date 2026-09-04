import assert from "node:assert/strict";
import test from "node:test";

import { improveRecords } from "./closed-loop-improver.mjs";

test("closed loop improves a degraded migration candidate", () => {
  const source = [
    { id: "A", amount: "10", status: "open" },
    { id: "B", amount: "20", status: "closed" },
    { id: "C", amount: "30", status: "open" },
  ];
  const target = [
    { id: "A", amount: "11", status: "open" },
    { id: "B", amount: "20", status: "closed" },
    { id: "X", amount: "99", status: "unknown" },
  ];

  const result = improveRecords(source, target, { threshold: 99 });

  assert.equal(result.status, "IMPROVED_CANDIDATE");
  assert.equal(result.before.verdict, "FAIL");
  assert.equal(result.preserved.verdict, "PASS");
  assert.equal(result.preserved.metrics.validationAccuracyPct, 100);
  assert.ok(result.improvement.accuracyGainPct > 0);
  assert.ok(result.improvement.issueReduction > 0);
  assert.deepEqual(result.preservedRecords, source);
  assert.equal(result.policy.originalTargetMutated, false);
  assert.equal(result.policy.humanReviewRequiredForPromotion, true);
});

test("closed loop preserves an already-perfect target", () => {
  const source = [{ id: "A", value: 1 }, { id: "B", value: 2 }];
  const target = structuredClone(source);

  const result = improveRecords(source, target, { threshold: 100 });

  assert.equal(result.status, "NO_CHANGE");
  assert.equal(result.before.verdict, "PASS");
  assert.equal(result.improvement.accuracyGainPct, 0);
  assert.equal(result.improvement.issueReduction, 0);
  assert.deepEqual(result.preservedRecords, target);
});
