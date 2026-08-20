import assert from "node:assert/strict";
import {
  TITAN_RX_ASSURANCE_BOUNDARY,
  TITAN_RX_ASSURANCE_CHECKS,
  TITAN_RX_ASSURANCE_PROFILE,
  evaluateTitanAssurance,
  simulateTitanAssuranceFault,
} from "../shared/titan-rx-assurance";

assert.equal(TITAN_RX_ASSURANCE_PROFILE.version, "2.0.0");
assert.equal(TITAN_RX_ASSURANCE_PROFILE.mode, "NON_OPERATIONAL_ASSURANCE");
assert.equal(TITAN_RX_ASSURANCE_PROFILE.allowedSupportActions.length >= 6, true);
assert.equal(TITAN_RX_ASSURANCE_CHECKS.length >= 6, true);
assert.equal(TITAN_RX_ASSURANCE_CHECKS.every((check) => check.evidence === "SIMULATED"), true);

const baseline = evaluateTitanAssurance();
assert.equal(baseline.state, "SIMULATION_PASS");
assert.equal(baseline.score, 100);
assert.equal(baseline.humanReviewRequired, true);
assert.equal(baseline.evidenceState, "SIMULATED");
assert.equal(baseline.observedPhysicalOutcome, false);

for (const check of TITAN_RX_ASSURANCE_CHECKS) {
  const fault = simulateTitanAssuranceFault(check.checkId);
  assert.equal(fault.state, "REVIEW_REQUIRED");
  assert.equal(fault.humanReviewRequired, true);
  assert.equal(fault.observedPhysicalOutcome, false);
  assert.equal(fault.score < 100, true);
}

assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.externalHardwareControl, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.deviceActuation, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.targeting, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.firingSolutionComputation, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.weaponRelease, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.firingRelayControl, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.autonomousLethalExecution, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.offensiveCyber, false);
assert.equal(TITAN_RX_ASSURANCE_BOUNDARY.executionDomain, "ASSURANCE_READINESS_RECOVERY_ONLY");

console.log("TITAN RX v2 governed systems assurance verification: PASS");
console.log(`profile=${TITAN_RX_ASSURANCE_PROFILE.profileId}`);
console.log(`checks=${TITAN_RX_ASSURANCE_CHECKS.length}`);
console.log(`score=${baseline.score}`);
console.log(`state=${baseline.state}`);
console.log(`executionDomain=${TITAN_RX_ASSURANCE_BOUNDARY.executionDomain}`);
