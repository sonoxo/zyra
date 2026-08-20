import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BASELINE_SCENARIOS,
  evaluateBaselineScenario,
  type AssuranceObservation,
} from "../server/baseline-assurance";

assert.equal(BASELINE_SCENARIOS.length >= 4, true, "expected at least four defensive validation scenarios");

for (const scenario of BASELINE_SCENARIOS) {
  assert.equal(
    scenario.safeSyntheticEvent.dataMode,
    "SIMULATED",
    `${scenario.scenarioId} must remain simulated`,
  );

  const observation: AssuranceObservation = {
    source: "verification-fixture",
    observedAt: new Date().toISOString(),
    fields: scenario.safeSyntheticEvent,
  };

  const observed = evaluateBaselineScenario(scenario, [observation]);
  assert.equal(observed.state, "OBSERVED");
  assert.equal(observed.score, 100);
  assert.equal(observed.matchedSignals, observed.expectedSignals);
  assert.equal(observed.suggestedDetectionRule, null);
  assert.equal(observed.stages.every((stage) => stage.status === "PASS"), true);

  const missing = evaluateBaselineScenario(scenario, []);
  assert.equal(missing.state, "UNKNOWN");
  assert.equal(missing.score, 0);
  assert.notEqual(missing.suggestedDetectionRule, null);
}

const source = fs.readFileSync(
  path.resolve("server/baseline-assurance.ts"),
  "utf8",
);

const prohibitedExecutionPatterns = [
  "child_process",
  "execSync(",
  "spawnSync(",
  "execFileSync(",
  "shell: true",
];

for (const pattern of prohibitedExecutionPatterns) {
  assert.equal(
    source.includes(pattern),
    false,
    `defensive BAS module must not contain execution primitive: ${pattern}`,
  );
}

console.log("ZYRA baseline assurance verification: PASS");
console.log(`scenarios=${BASELINE_SCENARIOS.length}`);
console.log("executionMode=DEFENSIVE_VALIDATION_ONLY");
console.log("syntheticExecution=ABSENT");
