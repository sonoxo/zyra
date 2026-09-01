import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_FDE_DEFAULT_MAX_REPAIR_CYCLES,
  AI_FDE_MIGRATION_FLEET,
  AI_FDE_MIGRATION_STAGES,
  AI_FDE_VALIDATION_LOOP,
  ENGINEERING_DECISION_LOOP,
  ENGINEERING_GUIDE_SOURCES,
  ENGINEERING_STACK_STAGES,
  aiFdeMigrationMissionPlan,
  buildEngineeringSystemContext,
  engineeringMissionPlan,
  selectEngineeringFleet,
} from "./engineering-context";

test("engineering sources include supplied guides and public AI FDE references", () => {
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("data-engineer-guide")));
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("application-developer-guide")));
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("/ai-fde/overview")));
  assert.ok(ENGINEERING_GUIDE_SOURCES.some(url => url.includes("e90qUUh8_us")));
});

test("data mission selects pipeline, quality, ontology, security, release, and observer roles", () => {
  const ids = selectEngineeringFleet("Build a streaming data pipeline with schema validation").map(role => role.id);
  assert.deepEqual(ids, ["intake", "pipeline", "quality", "ontology", "security", "release", "observer"]);
});

test("application mission selects ontology and application roles", () => {
  const ids = selectEngineeringFleet("Build a React application with ontology objects and actions").map(role => role.id);
  assert.deepEqual(ids, ["intake", "ontology", "application", "security", "release", "observer"]);
});

test("production and migration missions require approval", () => {
  assert.equal(engineeringMissionPlan("Deploy the application to production").approvalRequired, true);
  assert.equal(engineeringMissionPlan("Migrate the legacy ERP dataset").approvalRequired, true);
});

test("AI FDE migration plan is staged, bounded, and approval-gated", () => {
  const plan = aiFdeMigrationMissionPlan("Migrate legacy ERP data and business logic into the XUNIA ontology");
  assert.deepEqual(plan.stages, ["PLAN", "CONNECT", "INTERPRET", "ENHANCE", "STANDARDIZE", "VERIFY", "DEPLOY"]);
  assert.equal(plan.branchRequired, true);
  assert.equal(plan.approvalRequired, true);
  assert.equal(plan.maxRepairCycles, 3);
  assert.equal(plan.contextPolicy.strategy, "minimum-viable-context");
  assert.equal(plan.contextPolicy.implicitBroadAccess, false);
  assert.ok(plan.phaseGates.includes("deployment evidence recorded"));
});

test("AI FDE fleet separates read, proposal, test, and gated-write authority", () => {
  const byId = new Map(AI_FDE_MIGRATION_FLEET.map(role => [role.id, role.authority]));
  assert.equal(byId.get("source-scout"), "read-only");
  assert.equal(byId.get("mapping-engineer"), "proposal-only");
  assert.equal(byId.get("verifier"), "test-execution");
  assert.equal(byId.get("release-controller"), "approval-gated-write");
  assert.equal(AI_FDE_DEFAULT_MAX_REPAIR_CYCLES, 3);
  assert.equal(AI_FDE_MIGRATION_STAGES.at(-1), "DEPLOY");
  assert.equal(AI_FDE_VALIDATION_LOOP.at(-1), "VERIFY");
});

test("stack and decision loop are complete", () => {
  assert.equal(ENGINEERING_STACK_STAGES.at(-1), "AUDIT");
  assert.equal(ENGINEERING_DECISION_LOOP.at(0), "INSPECT");
  assert.equal(ENGINEERING_DECISION_LOOP.at(-1), "AUDIT");
  const context = buildEngineeringSystemContext("test");
  assert.match(context, /bounded specialist fleet/i);
  assert.match(context, /minimum viable context/i);
  assert.match(context, /approval-gated/i);
  assert.match(context, /model weights/i);
  assert.match(context, /Palantir affiliation/i);
});
