import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINEERING_DECISION_LOOP,
  ENGINEERING_GUIDE_SOURCES,
  ENGINEERING_STACK_STAGES,
  buildEngineeringSystemContext,
  engineeringMissionPlan,
  selectEngineeringFleet,
} from "./engineering-context";

test("engineering sources include both supplied Palantir Learn guides", () => {
  assert.equal(ENGINEERING_GUIDE_SOURCES.length, 2);
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("data-engineer-guide")));
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("application-developer-guide")));
});

test("data mission selects pipeline, quality, ontology, security, release, and observer roles", () => {
  const ids = selectEngineeringFleet("Build a streaming data pipeline with schema validation").map(role => role.id);
  assert.deepEqual(ids, ["intake", "pipeline", "quality", "ontology", "security", "release", "observer"]);
});

test("application mission selects ontology and application roles", () => {
  const ids = selectEngineeringFleet("Build a React application with ontology objects and actions").map(role => role.id);
  assert.deepEqual(ids, ["intake", "ontology", "application", "security", "release", "observer"]);
});

test("production mission requires approval", () => {
  const plan = engineeringMissionPlan("Deploy the application to production");
  assert.equal(plan.approvalRequired, true);
  assert.ok(plan.completionGates.includes("execution evidence recorded"));
});

test("stack and decision loop are complete", () => {
  assert.equal(ENGINEERING_STACK_STAGES.at(-1), "AUDIT");
  assert.equal(ENGINEERING_DECISION_LOOP.at(0), "INSPECT");
  assert.equal(ENGINEERING_DECISION_LOOP.at(-1), "AUDIT");
  const context = buildEngineeringSystemContext("test");
  assert.match(context, /bounded specialist fleet/i);
  assert.match(context, /approval-gated/i);
  assert.match(context, /Palantir affiliation/i);
});
