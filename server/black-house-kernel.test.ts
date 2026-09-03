import assert from "node:assert/strict";
import test from "node:test";

import {
  BLACK_HOUSE_KERNEL,
  BLACK_HOUSE_OBJECT_TYPES,
  evaluateBlackHouseMission,
  requireBlackHouseRelationship,
} from "./black-house-kernel";

test("ZYRA is bound to Black House kernel v3", () => {
  assert.equal(BLACK_HOUSE_KERNEL.kernelVersion, "3.0.0");
  assert.equal(BLACK_HOUSE_KERNEL.controlPlane, "THE_BLACK_HOUSE_V1");
  assert.equal(BLACK_HOUSE_KERNEL.cloudLayer, "Zyra Cloud");
  assert.equal(BLACK_HOUSE_KERNEL.approvalAuthority, true);
  assert.ok(BLACK_HOUSE_OBJECT_TYPES.includes("Mission"));
});

test("consequential missions require explicit human approval", () => {
  const mission = {
    missionId: "BH-3",
    actorId: "GPT_DOUG_MAX",
    target: "repo:sonoxo/zyra",
    action: "UPDATE_REPOSITORY",
    objectType: "Repository" as const,
    evidence: ["test:green"],
    consequential: true,
  };
  assert.equal(evaluateBlackHouseMission(mission), "REVIEW");
  assert.equal(evaluateBlackHouseMission({ ...mission, approvedBy: "human:operator" }), "ALLOW");
});

test("missing evidence and unknown relationships fail closed", () => {
  assert.equal(
    evaluateBlackHouseMission({
      missionId: "BH-4",
      actorId: "VA3LM",
      target: "service:zyra",
      action: "READ_STATUS",
      objectType: "Service",
      evidence: [],
      consequential: false,
    }),
    "BLOCK",
  );
  assert.equal(requireBlackHouseRelationship("AUDITS"), "AUDITS");
  assert.throws(() => requireBlackHouseRelationship("ROOTS"), /BLACK_HOUSE_UNREGISTERED_RELATIONSHIP/);
});
