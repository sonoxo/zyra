import assert from "node:assert/strict";
import test from "node:test";
import {
  ZYRA_EYES_POLICY,
  consumeActionApproval,
  encodeBinaryVision,
  issueActionApproval,
  planVisionAction,
  sanitizeActionForAudit,
} from "./zyra-eyes";

test("ZYRA Eyes stays local, simulation-first, and approval-gated", () => {
  assert.equal(ZYRA_EYES_POLICY.localOnly, true);
  assert.equal(ZYRA_EYES_POLICY.simulationDefault, true);
  assert.equal(ZYRA_EYES_POLICY.nativeExecutionDefault, false);
  assert.equal(ZYRA_EYES_POLICY.humanApprovalRequired, true);
  assert.equal(ZYRA_EYES_POLICY.noRawScreenshotLogging, true);
  assert.equal(ZYRA_EYES_POLICY.noCredentialExtraction, true);
});

test("binary encoder converts grayscale pixels to a deterministic VA grid", () => {
  const vision = encodeBinaryVision({
    width: 4,
    height: 2,
    threshold: 128,
    pixels: [0, 127, 128, 255, 255, 200, 40, 0],
  });
  assert.deepEqual(vision.rows, ["0011", "1100"]);
  assert.equal(vision.density, 0.5);
  assert.equal(vision.brightest.value, 255);
  assert.equal(vision.darkest.value, 0);
  assert.equal(vision.frameHash.length, 64);
});

test("planner maps a visual target into bounded screen coordinates", () => {
  const result = planVisionAction({
    width: 2,
    height: 2,
    threshold: 128,
    pixels: [0, 255, 0, 0],
    goal: "BRIGHTEST_REGION",
    screenWidth: 100,
    screenHeight: 100,
    action: "MOVE",
  });
  assert.deepEqual(result.action, { type: "MOVE", x: 75, y: 25 });
});

test("approval tokens are one-time and bound to user plus exact action", () => {
  const action = { type: "LEFT_CLICK", x: 20, y: 40 } as const;
  const approval = issueActionApproval("owner-1", action);
  assert.equal(consumeActionApproval("owner-2", approval.token, action), false);
  assert.equal(consumeActionApproval("owner-1", approval.token, { type: "LEFT_CLICK", x: 21, y: 40 }), false);
  assert.equal(consumeActionApproval("owner-1", approval.token, action), true);
  assert.equal(consumeActionApproval("owner-1", approval.token, action), false);
});

test("typed text is never retained in plaintext audit metadata", () => {
  const audit = sanitizeActionForAudit({ type: "TYPE_TEXT", text: "private-value" });
  assert.equal(audit.type, "TYPE_TEXT");
  assert.equal(audit.length, 13);
  assert.equal(typeof audit.textHash, "string");
  assert.equal("text" in audit, false);
});
