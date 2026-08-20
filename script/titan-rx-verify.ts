import assert from "node:assert/strict";
import {
  TITAN_RX_CONTROL_BOUNDARY,
  TITAN_RX_PLATFORM_REGISTRY,
  runTitanScenario,
  type TitanScenario,
} from "../shared/titan-rx-readiness";

const scenarios: TitanScenario[] = [
  "communications_loss",
  "power_degradation",
  "thermal_fault",
  "sensor_degradation",
  "software_mismatch",
  "maintenance_overdue",
  "supply_shortage",
  "site_isolation",
  "recovery_failover",
];

assert.equal(TITAN_RX_PLATFORM_REGISTRY.length > 0, true, "platform registry must not be empty");
const platform = TITAN_RX_PLATFORM_REGISTRY[0];
assert.equal(platform.safetyInterlockState, "ENFORCED");
assert.equal(platform.evidenceState, "SIMULATED");
assert.equal(platform.subsystems.length >= 6, true);

for (const scenario of scenarios) {
  const result = runTitanScenario(scenario);
  assert.equal(result.scenario, scenario);
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.evidenceState, "SIMULATED");
  assert.equal(result.realityDelta, "NOT_OBSERVED");
  assert.equal(result.recommendedActions.length > 0, true);
}

assert.equal(TITAN_RX_CONTROL_BOUNDARY.externalHardwareControl, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.executionDomain, "READINESS_RECOVERY_ONLY");

console.log("TITAN RX readiness digital twin verification: PASS");
console.log(`platform=${platform.platformId}`);
console.log(`scenarios=${scenarios.length}`);
console.log(`executionDomain=${TITAN_RX_CONTROL_BOUNDARY.executionDomain}`);
