import assert from "node:assert/strict";
import test from "node:test";

import { validateRecords } from "./continuous-validator.mjs";

test("continuous validator passes identical migration data", () => {
  const source = [
    { id: "A", amount: "10", status: "open" },
    { id: "B", amount: "20", status: "closed" },
  ];
  const result = validateRecords(source, structuredClone(source), { threshold: 100 });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.metrics.validationAccuracyPct, 100);
  assert.equal(result.metrics.changedRecords, 0);
  assert.equal(result.metrics.missingRecords, 0);
});

test("continuous validator fails when accuracy falls below threshold", () => {
  const source = [
    { id: "A", amount: "10" },
    { id: "B", amount: "20" },
  ];
  const target = [
    { id: "A", amount: "10" },
    { id: "B", amount: "21" },
  ];
  const result = validateRecords(source, target, { threshold: 99 });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.metrics.validationAccuracyPct, 50);
  assert.equal(result.metrics.changedRecords, 1);
});

test("continuous validator identifies missing and unexpected records", () => {
  const source = [{ id: "A" }, { id: "B" }];
  const target = [{ id: "A" }, { id: "C" }];
  const result = validateRecords(source, target, { threshold: 50 });
  assert.equal(result.verdict, "PASS");
  assert.deepEqual(result.deltas.missing, ["B"]);
  assert.deepEqual(result.deltas.unexpected, ["C"]);
});
