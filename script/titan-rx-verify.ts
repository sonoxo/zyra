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
assert.equal(platform.assuranceProfile, "TITAN_RX_V2_GOVERNED_SYSTEMS_ASSURANCE");
assert.equal(platform.softwareBaseline, "TRX-SW-2.0.0-ASSURANCE");
assert.equal(platform.firmwareBaseline, "TRX-FW-2.0.0-ASSURANCE");
assert.equal(platform.subsystems.length >= 22, true, "registry must include v2 assurance and UAV readiness subsystems");
assert.equal(platform.subsystems.some((item) => item.id === "assurance"), true);
assert.equal(platform.subsystems.some((item) => item.id === "interlock-evidence"), true);
assert.equal(platform.subsystems.some((item) => item.id === "config-baseline"), true);
assert.equal(platform.subsystems.some((item) => item.id === "recovery-assurance"), true);

const uav = platform.uavReadinessProfile;
assert.equal(uav.platformClass, "MULTIROTOR_UAV_READINESS");
assert.equal(uav.telemetryProtocol, "MAVLink");
assert.equal(uav.autopilotBaselines.includes("PX4"), true);
assert.equal(uav.autopilotBaselines.includes("ArduPilot"), true);
assert.equal(uav.groundControlStations.includes("QGroundControl"), true);
assert.equal(uav.groundControlStations.includes("Mission Planner"), true);
assert.equal(uav.navigationSensors.includes("IMU"), true);
assert.equal(uav.navigationSensors.includes("GNSS/Galileo"), true);
assert.equal(uav.flightActuationEnabled, false);
assert.equal(uav.payloadActuationEnabled, false);
assert.equal(uav.weaponizationEnabled, false);
assert.equal(uav.autonomousAttackEnabled, false);

for (const scenario of scenarios) {
  const result = runTitanScenario(scenario);
  assert.equal(result.scenario, scenario);
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.evidenceState, "SIMULATED");
  assert.equal(result.realityDelta, "NOT_OBSERVED");
  assert.equal(result.recommendedActions.length > 0, true);
}

assert.equal(TITAN_RX_CONTROL_BOUNDARY.externalHardwareControl, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.uavFlightActuation, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.uavPayloadActuation, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.weaponization, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.autonomousAttack, false);
assert.equal(TITAN_RX_CONTROL_BOUNDARY.executionDomain, "READINESS_RECOVERY_ONLY");

console.log("TITAN RX readiness digital twin verification: PASS");
console.log(`platform=${platform.platformId}`);
console.log(`assuranceProfile=${platform.assuranceProfile}`);
console.log(`subsystems=${platform.subsystems.length}`);
console.log(`uavProfile=${uav.platformClass}`);
console.log(`scenarios=${scenarios.length}`);
console.log(`executionDomain=${TITAN_RX_CONTROL_BOUNDARY.executionDomain}`);
