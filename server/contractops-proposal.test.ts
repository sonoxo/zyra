import assert from "node:assert/strict";
import test from "node:test";
import { buildProposalSeed, computeProposalReadiness } from "@shared/contractops-proposal";

const supportedMatch = {
  requirement: "Secure AI data platform with governance",
  state: "SUPPORTED_CANDIDATE" as const,
  topScore: 75,
  candidates: [{
    id: "palantir-foundry-aware",
    label: "Palantir Foundry Aware",
    domain: "Palantir Foundry / AIP",
    score: 75,
  }],
};

test("proposal seed creates governed sections without claiming external authorization", () => {
  const sections = buildProposalSeed({
    title: "Data modernization",
    agency: "Example Agency",
    solicitationNumber: "TEST-001",
    summary: "Modernize governed data workflows.",
    requirements: [supportedMatch.requirement],
    evidenceMatches: [supportedMatch],
  });

  assert.equal(sections.length, 6);
  assert.equal(sections[0].key, "executive-summary");
  assert.ok(sections.every((section) => section.content.includes("HUMAN") || section.key === "credentials-evidence" || section.key === "requirements-evidence-matrix" || section.key === "risk-assumptions"));
  assert.ok(sections.some((section) => section.evidenceRefs.includes("palantir-foundry-aware")));
});

test("pending CAGE blocks internal submission readiness but not proposal drafting", () => {
  const sections = buildProposalSeed({
    title: "Data modernization",
    agency: "Example Agency",
    requirements: [supportedMatch.requirement],
    evidenceMatches: [supportedMatch],
  }).map((section) => ({ ...section, status: "READY" as const }));

  const readiness = computeProposalReadiness({
    bidDecision: "BID",
    evidenceMatches: [supportedMatch],
    registrations: [
      { system: "SAM", status: "ACTIVE", verificationSource: "https://example.com/sam" },
      { system: "UEI", status: "ACTIVE", verificationSource: "https://example.com/uei" },
      { system: "CAGE", status: "PENDING", verificationSource: null },
    ],
    sections,
  });

  assert.equal(readiness.ready, false);
  assert.ok(readiness.registrationFlags.some((flag) => flag.startsWith("CAGE: PENDING")));
  assert.ok(readiness.blockers.some((blocker) => blocker.includes("registration review")));
});

test("fully supported human BID package clears the internal readiness gate", () => {
  const sections = buildProposalSeed({
    title: "Data modernization",
    agency: "Example Agency",
    requirements: [supportedMatch.requirement],
    evidenceMatches: [supportedMatch],
  }).map((section) => ({ ...section, status: "READY" as const }));

  const readiness = computeProposalReadiness({
    bidDecision: "BID",
    evidenceMatches: [supportedMatch],
    registrations: [
      { system: "SAM", status: "ACTIVE", verificationSource: "https://example.com/sam" },
      { system: "UEI", status: "ACTIVE", verificationSource: "https://example.com/uei" },
      { system: "CAGE", status: "ACTIVE", verificationSource: "https://example.com/cage" },
    ],
    sections,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.readySectionCount, readiness.requiredSectionCount);
  assert.match(readiness.warning, /not an agency eligibility determination/i);
});
