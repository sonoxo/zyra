export type ProposalSectionStatus = "DRAFT" | "EVIDENCE_NEEDED" | "READY";

export interface ProposalEvidenceCandidateRef {
  id: string;
  label: string;
  domain: string;
  score: number;
  verificationUrl?: string;
  repositoryPath?: string;
}

export interface ProposalEvidenceMatchInput {
  requirement: string;
  state: "SUPPORTED_CANDIDATE" | "GAP";
  topScore: number;
  candidates?: ProposalEvidenceCandidateRef[];
}

export interface ProposalSeedInput {
  title: string;
  agency: string;
  solicitationNumber?: string | null;
  summary?: string | null;
  requirements: string[];
  evidenceMatches: ProposalEvidenceMatchInput[];
}

export interface ProposalSeedSection {
  key: string;
  title: string;
  ordinal: number;
  content: string;
  status: ProposalSectionStatus;
  requirementRefs: string[];
  evidenceRefs: string[];
}

export interface ProposalReadinessInput {
  bidDecision: string;
  evidenceMatches: ProposalEvidenceMatchInput[];
  registrations: Array<{ system: string; status: string; verificationSource?: string | null }>;
  sections: Array<{ key: string; title: string; status: string; content: string }>;
}

export interface ProposalReadiness {
  ready: boolean;
  policy: "NXYZ_CONTRACTOPS_DEFAULT_V1";
  blockers: string[];
  readySectionCount: number;
  requiredSectionCount: number;
  evidenceGapCount: number;
  registrationFlags: string[];
  warning: string;
}

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function matchedEvidenceIds(matches: ProposalEvidenceMatchInput[]): string[] {
  return Array.from(new Set(matches.flatMap((match) => (match.candidates || []).slice(0, 2).map((candidate) => candidate.id))));
}

function requirementMatrix(matches: ProposalEvidenceMatchInput[]): string {
  if (matches.length === 0) return "No captured requirements are available yet.";
  return matches
    .map((match, index) => {
      const top = match.candidates?.[0];
      const support = match.state === "SUPPORTED_CANDIDATE" && top
        ? `SUPPORTING CANDIDATE: ${top.label} (${top.domain}, match ${top.score}%)`
        : "EVIDENCE GAP: no supporting ZYRA evidence candidate has been recorded.";
      return `${index + 1}. ${match.requirement}\n   ${support}`;
    })
    .join("\n\n");
}

function evidencePlan(matches: ProposalEvidenceMatchInput[]): string {
  const supported = matches.filter((match) => match.state === "SUPPORTED_CANDIDATE");
  const gaps = matches.filter((match) => match.state === "GAP");
  const evidence = supported.flatMap((match) => (match.candidates || []).slice(0, 1));
  const unique = Array.from(new Map(evidence.map((candidate) => [candidate.id, candidate])).values());

  const lines = unique.length
    ? unique.map((candidate) => `- ${candidate.label} — ${candidate.domain} — supporting evidence only.`)
    : ["- No supporting evidence candidates have been resolved yet."];
  if (gaps.length) lines.push(`- ${gaps.length} captured requirement${gaps.length === 1 ? "" : "s"} still require evidence resolution.`);
  lines.push("- Every material proposal claim must be validated by a human against its cited source before submission.");
  return lines.join("\n");
}

export function buildProposalSeed(input: ProposalSeedInput): ProposalSeedSection[] {
  const identifier = clean(input.solicitationNumber) || "solicitation number not recorded";
  const summary = clean(input.summary) || "No opportunity summary has been recorded. Review the official source before drafting a claim.";
  const requirements = input.requirements.length ? input.requirements : input.evidenceMatches.map((match) => match.requirement);
  const evidenceIds = matchedEvidenceIds(input.evidenceMatches);
  const gapCount = input.evidenceMatches.filter((match) => match.state === "GAP").length;

  return [
    {
      key: "executive-summary",
      title: "Executive Summary",
      ordinal: 10,
      content: `DRAFT FRAMEWORK — HUMAN VALIDATION REQUIRED\n\nOpportunity: ${input.title}\nAgency: ${input.agency}\nReference: ${identifier}\n\nCaptured opportunity summary:\n${summary}\n\nDrafting instruction: describe the organization's proposed value using only claims that can be traced to approved evidence. Do not infer eligibility, past performance, authorization, clearance, or agency acceptance.`,
      status: "DRAFT",
      requirementRefs: [],
      evidenceRefs: [],
    },
    {
      key: "technical-approach",
      title: "Technical Approach",
      ordinal: 20,
      content: `DRAFT FRAMEWORK — HUMAN VALIDATION REQUIRED\n\nAddress each captured requirement with a concrete implementation approach, delivery method, verification step, and evidence citation.\n\nCaptured requirements:\n${requirements.length ? requirements.map((requirement, index) => `${index + 1}. ${requirement}`).join("\n") : "No requirements captured yet."}`,
      status: gapCount > 0 ? "EVIDENCE_NEEDED" : "DRAFT",
      requirementRefs: requirements,
      evidenceRefs: evidenceIds,
    },
    {
      key: "requirements-evidence-matrix",
      title: "Requirements & Evidence Matrix",
      ordinal: 30,
      content: `TRACEABILITY MATRIX — SUPPORTING EVIDENCE IS NOT AUTHORIZATION\n\n${requirementMatrix(input.evidenceMatches)}`,
      status: gapCount > 0 ? "EVIDENCE_NEEDED" : "DRAFT",
      requirementRefs: requirements,
      evidenceRefs: evidenceIds,
    },
    {
      key: "credentials-evidence",
      title: "Credentials & Evidence Plan",
      ordinal: 40,
      content: `EVIDENCE PLAN\n\n${evidencePlan(input.evidenceMatches)}`,
      status: gapCount > 0 ? "EVIDENCE_NEEDED" : "DRAFT",
      requirementRefs: requirements,
      evidenceRefs: evidenceIds,
    },
    {
      key: "management-delivery",
      title: "Management & Delivery Plan",
      ordinal: 50,
      content: "DRAFT FRAMEWORK — HUMAN VALIDATION REQUIRED\n\nDefine accountable roles, delivery milestones, quality controls, reporting cadence, risk ownership, acceptance criteria, and change-management procedures. Do not claim staffing, facilities, certifications, past performance, pricing, or delivery commitments unless the supporting record exists.",
      status: "DRAFT",
      requirementRefs: [],
      evidenceRefs: [],
    },
    {
      key: "risk-assumptions",
      title: "Risks, Assumptions & Open Items",
      ordinal: 60,
      content: `OPEN-ITEM CONTROL\n\n- Validate every requirement against the official solicitation source.\n- Resolve all evidence gaps before claiming coverage.\n- Confirm registration and eligibility requirements for this specific opportunity.\n- Confirm pricing, schedule, representations, certifications, and submission instructions outside this automated draft.\n- Current evidence gaps detected: ${gapCount}.`,
      status: gapCount > 0 ? "EVIDENCE_NEEDED" : "DRAFT",
      requirementRefs: requirements,
      evidenceRefs: evidenceIds,
    },
  ];
}

export function computeProposalReadiness(input: ProposalReadinessInput): ProposalReadiness {
  const blockers: string[] = [];
  const evidenceGapCount = input.evidenceMatches.filter((match) => match.state === "GAP").length;
  const requiredSectionCount = input.sections.length;
  const readySectionCount = input.sections.filter((section) => section.status === "READY" && clean(section.content).length >= 30).length;

  if (input.bidDecision !== "BID") blockers.push("A human BID decision is required before proposal submission readiness can be approved.");
  if (evidenceGapCount > 0) blockers.push(`${evidenceGapCount} captured requirement${evidenceGapCount === 1 ? " has" : "s have"} unresolved evidence gaps.`);
  if (requiredSectionCount === 0) blockers.push("Proposal sections have not been generated.");
  else if (readySectionCount !== requiredSectionCount) blockers.push(`${requiredSectionCount - readySectionCount} proposal section${requiredSectionCount - readySectionCount === 1 ? " is" : "s are"} not marked READY with substantive content.`);

  const registrationBySystem = new Map(input.registrations.map((row) => [row.system, row]));
  const registrationFlags = ["SAM", "UEI", "CAGE"].flatMap((system) => {
    const row = registrationBySystem.get(system);
    if (row?.status === "ACTIVE" && row.verificationSource) return [];
    return [`${system}: ${row?.status || "NOT_STARTED"} — verify the opportunity-specific registration requirement before submission.`];
  });
  if (registrationFlags.length) blockers.push("Core federal registration review is incomplete under the default ContractOps readiness policy.");

  return {
    ready: blockers.length === 0,
    policy: "NXYZ_CONTRACTOPS_DEFAULT_V1",
    blockers,
    readySectionCount,
    requiredSectionCount,
    evidenceGapCount,
    registrationFlags,
    warning: "SUBMISSION_READY is an internal ContractOps workflow state, not an agency eligibility determination, award decision, or automatic portal submission.",
  };
}
