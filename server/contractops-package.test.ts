import assert from "node:assert/strict";
import test from "node:test";
import { buildSubmissionPackage, renderSubmissionPackageMarkdown } from "@shared/contractops-package";

const baseInput = {
  proposal: {
    id: "proposal-1",
    title: "Example Proposal",
    status: "SUBMISSION_READY",
    reviewDecision: "APPROVED",
    reviewNotes: "Human review complete",
    reviewedAt: "2026-08-30T20:00:00.000Z",
  },
  opportunity: {
    id: "opp-1",
    title: "Example Opportunity",
    agency: "Example Agency",
    solicitationNumber: "TEST-001",
    sourceUrl: "https://example.gov/opportunity",
    deadline: "2026-09-30T20:00:00.000Z",
    naics: "541512",
    psc: "DA01",
    setAside: "Small business",
  },
  sections: [
    {
      key: "technical-approach",
      title: "Technical Approach",
      content: "Human-validated technical approach with enough substantive content for the internal readiness gate.",
      status: "READY",
      requirementRefs: ["Secure cloud deployment"],
      evidenceRefs: ["palantir-foundry-aware"],
    },
  ],
  readiness: { ready: true, policy: "NXYZ_CONTRACTOPS_DEFAULT_V1" },
  registrations: [
    { system: "SAM", status: "ACTIVE", identifier: "recorded", verificationSource: "https://example.gov/sam" },
    { system: "UEI", status: "ACTIVE", identifier: "recorded", verificationSource: "https://example.gov/uei" },
    { system: "CAGE", status: "ACTIVE", identifier: "recorded", verificationSource: "https://example.gov/cage" },
  ],
};

test("approved internal proposal generates export with no external submission effect", () => {
  const pkg = buildSubmissionPackage(baseInput, new Date("2026-08-30T21:00:00.000Z"));
  assert.equal(pkg.internalStatus, "SUBMISSION_READY");
  assert.equal(pkg.externalSubmissionPerformed, false);
  assert.deepEqual(pkg.evidenceIndex, ["palantir-foundry-aware"]);
  assert.ok(pkg.checklist.some((item) => item.state === "HUMAN_ACTION" && item.id === "portal-submit"));

  const markdown = renderSubmissionPackageMarkdown(pkg);
  assert.match(markdown, /External submission performed:\*\* NO/);
  assert.match(markdown, /Human submission checklist/);
  assert.match(markdown, /Technical Approach/);
});

test("package builder rejects proposal that has not passed internal human approval", () => {
  assert.throws(
    () => buildSubmissionPackage({
      ...baseInput,
      proposal: { ...baseInput.proposal, status: "DRAFTING", reviewDecision: "PENDING" },
    }),
    /PROPOSAL_NOT_INTERNALLY_APPROVED/,
  );
});

test("package builder rejects incomplete sections even if proposal state is mislabeled ready", () => {
  assert.throws(
    () => buildSubmissionPackage({
      ...baseInput,
      sections: baseInput.sections.map((section) => ({ ...section, status: "DRAFT" })),
    }),
    /PROPOSAL_SECTIONS_NOT_READY/,
  );
});
