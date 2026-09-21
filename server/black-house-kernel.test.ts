import assert from "node:assert/strict";
import fs from "node:fs";
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
  assert.ok(BLACK_HOUSE_OBJECT_TYPES.includes("RiskAssessment"));
  assert.equal(BLACK_HOUSE_KERNEL.invariants.nistAiRmfProfile, "NIST_AI_RMF_1_0_XUNIA_PROFILE_V1");
  assert.equal(BLACK_HOUSE_KERNEL.invariants.nistAiRmfRiskEnvelopeRequired, true);
  assert.equal(BLACK_HOUSE_KERNEL.invariants.nistAiRmfTevvRequiredBeforeGreen, true);
  assert.equal(BLACK_HOUSE_KERNEL.invariants.criticalRiskDefaultsToHold, true);
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


test("NIST AI RMF governance profile is fail closed and decommission-aware", () => {
  const profile = JSON.parse(fs.readFileSync(".black-house/nist-ai-rmf.json", "utf8"));
  assert.equal(profile.policyId, "NIST_AI_RMF_1_0_XUNIA_PROFILE_V1");
  assert.equal(profile.enforcement.failClosed, true);
  assert.equal(profile.enforcement.humanOwnerRequired, true);
  assert.equal(profile.enforcement.tevvRequiredBeforeGreen, true);
  assert.equal(profile.enforcement.criticalRiskDefault, "HOLD");
  assert.equal(profile.enforcement.decommissionPathRequired, true);
  assert.equal(requireBlackHouseRelationship("DECOMMISSIONS"), "DECOMMISSIONS");
  assert.equal(requireBlackHouseRelationship("CONFORMS_TO_PROFILE"), "CONFORMS_TO_PROFILE");
});
