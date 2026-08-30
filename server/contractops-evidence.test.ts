import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpportunityEvidenceMatrix,
  matchRequirementToZyraEvidence,
} from "../shared/contractops-evidence";

test("ContractOps matches AI requirements to supporting ZYRA evidence", () => {
  const match = matchRequirementToZyraEvidence("Provide artificial intelligence and machine learning capability");
  assert.equal(match.state, "SUPPORTED_CANDIDATE");
  assert.ok(match.candidates.length > 0);
  assert.ok(match.candidates.some((candidate) => candidate.domain.includes("Artificial Intelligence") || candidate.domain.includes("Machine Learning") || candidate.domain.includes("Data Science")));
});

test("ContractOps reports a gap when no evidence keyword matches", () => {
  const match = matchRequirementToZyraEvidence("Operate a certified deep sea welding vessel fleet");
  assert.equal(match.state, "GAP");
  assert.equal(match.candidates.length, 0);
  assert.equal(match.topScore, 0);
});

test("ContractOps evidence matrix is ready only when every requirement has a candidate", () => {
  const matrix = buildOpportunityEvidenceMatrix([
    "Build an AI application with data analytics",
    "Operate a certified deep sea welding vessel fleet",
  ]);
  assert.equal(matrix.ready, false);
  assert.equal(matrix.supportedCount, 1);
  assert.equal(matrix.gapCount, 1);
  assert.equal(matrix.coveragePercent, 50);
  assert.equal(matrix.authority, "SUPPORTING_EVIDENCE_ONLY");
});
