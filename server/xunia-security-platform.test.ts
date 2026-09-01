import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizePlanTarget,
  buildSecurityPlan,
  type SecurityEngagementManifest,
} from "./xunia-security-platform";

const base: SecurityEngagementManifest = {
  schemaVersion: "xunia.security.engagement/v1",
  engagementId: "zyra-demo-001",
  owner: "security-owner",
  mode: "PENTEST",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-09-02T00:00:00.000Z",
  targets: [{ type: "url", value: "https://lab.example.test" }],
  exclusions: [{ type: "url", value: "https://lab.example.test/billing" }],
  allowedChecks: ["web.baseline", "service.discovery", "web.templates", "supply-chain.sbom"],
  maxRequestsPerSecond: 10,
  maxConcurrency: 4,
  destructiveAllowed: false,
  authorizationReference: "AUTH-ZYRA-001",
};

const now = new Date("2026-09-01T12:00:00.000Z");

test("PENTEST URL plan combines only compatible web/network tools", () => {
  const plan = buildSecurityPlan(base, now);
  assert.equal(plan.destructiveActions, "DENIED");
  assert.deepEqual(
    plan.steps.map((step) => step.tool.id),
    ["nmap", "nuclei", "owasp-zap"],
  );
});

test("source path plan selects SBOM and source-analysis adapters only", () => {
  const plan = buildSecurityPlan({
    ...base,
    mode: "ASSESS",
    targets: [{ type: "path", value: "/workspace/repository" }],
    exclusions: [],
    allowedChecks: ["supply-chain.vulnerability", "supply-chain.sbom", "supply-chain.cve", "source.secrets", "source.sast", "dependency.osv", "iac.misconfiguration"],
  }, now);
  assert.deepEqual(
    plan.steps.map((step) => step.tool.id),
    ["trivy", "syft", "grype", "gitleaks", "semgrep", "osv-scanner", "checkov"],
  );
});

test("ASSESS mode removes safe-active validation", () => {
  const plan = buildSecurityPlan({ ...base, mode: "ASSESS" }, now);
  assert.equal(plan.steps.some((step) => step.tool.id === "nuclei"), false);
  assert.equal(plan.steps.some((step) => step.tool.id === "nmap"), true);
});

test("explicit exclusions override the parent target", () => {
  assert.equal(
    authorizePlanTarget(base, { type: "url", value: "https://lab.example.test/billing" }),
    false,
  );
  assert.equal(
    authorizePlanTarget(base, { type: "url", value: "https://lab.example.test/api" }),
    true,
  );
});

test("expired engagements cannot create a run plan", () => {
  assert.throws(
    () => buildSecurityPlan(base, new Date("2026-09-03T00:00:00.000Z")),
    /ENGAGEMENT_OUTSIDE_AUTHORIZED_WINDOW/,
  );
});
