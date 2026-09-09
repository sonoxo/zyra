import assert from "node:assert/strict";
import test from "node:test";
import { assertEngagementAuthorized, authorizePlanTarget, buildSecurityPlan, type SecurityEngagementManifest } from "./xunia-security-platform.ts";

const now = new Date("2026-09-09T12:00:00Z");
const base: SecurityEngagementManifest = {
  schemaVersion: "xunia.security.engagement/v1", engagementId: "boundary-test", owner: "test",
  mode: "ASSESS", startsAt: "2026-09-09T00:00:00Z", endsAt: "2026-09-10T00:00:00Z",
  targets: [{ type: "url", value: "https://example.test/API" }], exclusions: [],
  allowedChecks: ["web.baseline"], maxRequestsPerSecond: 1, maxConcurrency: 1,
  destructiveAllowed: false, authorizationReference: "test-fixture",
};

test("malformed runtime inputs cannot bypass typed manifest", () => {
  for (const value of [null, {}, { ...base, mode: "UNKNOWN" }, { ...base, maxConcurrency: NaN }, { ...base, maxRequestsPerSecond: Infinity }, { ...base, targets: "all" }, { ...base, exclusions: {} }, { ...base, allowedChecks: ["unknown"] }]) {
    assert.throws(() => assertEngagementAuthorized(value, now));
  }
});
test("nested exclusions prevent broad plan dispatch", () => {
  const manifest = { ...base, exclusions: [{ type: "url" as const, value: "https://example.test/API/billing" }] };
  assert.equal(buildSecurityPlan(manifest, now).steps.length, 0);
  assert.equal(authorizePlanTarget(manifest, base.targets[0], now), false);
});
test("URL path case remains scoped", () => {
  assert.equal(authorizePlanTarget(base, { type: "url", value: "https://example.test/api" }, now), false);
  assert.equal(authorizePlanTarget(base, { type: "url", value: "https://example.test/API/items" }, now), true);
});
test("expiry is exclusive and survives plan serialization", () => {
  const plan = JSON.parse(JSON.stringify(buildSecurityPlan(base, now)));
  assert.equal(plan.authorization.endsAt, base.endsAt);
  assert.equal(plan.authorization.maxConcurrency, 1);
  assert.equal(authorizePlanTarget(plan.authorization, base.targets[0], new Date(base.endsAt)), false);
});
test("invalid dates and URL credentials are rejected", () => {
  assert.throws(() => assertEngagementAuthorized(base, new Date("invalid")));
  assert.equal(authorizePlanTarget(base, { type: "url", value: "https://user:password@example.test/API" }, now), false);
});
test("host exclusions also block URL targets", () => {
  const manifest = { ...base, exclusions: [{ type: "host" as const, value: "example.test" }] };
  assert.equal(buildSecurityPlan(manifest, now).steps.length, 0);
});

test("host discovery cannot widen a path-only authorization", () => {
  const manifest = { ...base, allowedChecks: ["service.discovery"] };
  assert.equal(buildSecurityPlan(manifest, now).steps.length, 0);
});
