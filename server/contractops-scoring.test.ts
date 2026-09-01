import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdvisoryBidAssessment,
  scoreDeadlineReadiness,
  scoreRecordedRegistrationReadiness,
} from "../shared/contractops-scoring";

test("pending CAGE reduces readiness without making the assessment unusable", () => {
  const result = scoreRecordedRegistrationReadiness([
    { system: "SAM", status: "ACTIVE", verificationSource: "https://example.gov/sam" },
    { system: "UEI", status: "ACTIVE", verificationSource: "https://example.gov/uei" },
    { system: "CAGE", status: "PENDING", verificationSource: null },
  ]);

  assert.equal(result.score, 83);
  assert.ok(result.blockers.some((blocker) => blocker.includes("CAGE is PENDING")));
});

test("deadline scoring is deterministic across readiness windows", () => {
  const now = new Date("2026-08-30T12:00:00.000Z");
  assert.equal(scoreDeadlineReadiness("2026-08-29T12:00:00.000Z", now).state, "PAST_DUE");
  assert.equal(scoreDeadlineReadiness("2026-09-03T12:00:00.000Z", now).state, "URGENT");
  assert.equal(scoreDeadlineReadiness("2026-09-09T12:00:00.000Z", now).state, "TIGHT");
  assert.equal(scoreDeadlineReadiness("2026-09-20T12:00:00.000Z", now).state, "WORKABLE");
  assert.equal(scoreDeadlineReadiness("2026-10-15T12:00:00.000Z", now).state, "HEALTHY");
});

test("high evidence plus active SAM and UEI with pending CAGE can still produce a bid candidate", () => {
  const assessment = buildAdvisoryBidAssessment({
    evidenceMatches: [
      { state: "SUPPORTED_CANDIDATE", topScore: 100 },
      { state: "SUPPORTED_CANDIDATE", topScore: 75 },
      { state: "SUPPORTED_CANDIDATE", topScore: 100 },
    ],
    registrations: [
      { system: "SAM", status: "ACTIVE", verificationSource: "https://example.gov/sam" },
      { system: "UEI", status: "ACTIVE", verificationSource: "https://example.gov/uei" },
      { system: "CAGE", status: "PENDING", verificationSource: null },
    ],
    deadline: "2026-10-15T12:00:00.000Z",
    assessedAt: new Date("2026-08-30T12:00:00.000Z"),
  });

  assert.equal(assessment.advisoryOnly, true);
  assert.equal(assessment.dimensions.registrationReadiness, 83);
  assert.ok(assessment.overallScore >= 75);
  assert.equal(assessment.recommendation, "BID_CANDIDATE");
  assert.ok(assessment.notes.some((note) => note.includes("human must make the final BID or NO_BID decision")));
});

test("evidence gaps and a past deadline create a no-bid risk advisory", () => {
  const assessment = buildAdvisoryBidAssessment({
    evidenceMatches: [
      { state: "SUPPORTED_CANDIDATE", topScore: 25 },
      { state: "GAP", topScore: 0 },
    ],
    registrations: [
      { system: "SAM", status: "NOT_STARTED" },
      { system: "UEI", status: "NOT_STARTED" },
      { system: "CAGE", status: "PENDING" },
    ],
    deadline: "2026-08-20T12:00:00.000Z",
    assessedAt: new Date("2026-08-30T12:00:00.000Z"),
  });

  assert.equal(assessment.recommendation, "NO_BID_RISK");
  assert.ok(assessment.blockers.some((blocker) => blocker.includes("no supporting ZYRA evidence")));
  assert.ok(assessment.blockers.some((blocker) => blocker.includes("deadline has passed")));
});
