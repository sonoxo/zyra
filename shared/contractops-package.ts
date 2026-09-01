export interface SubmissionPackageSectionInput {
  key: string;
  title: string;
  content: string;
  status: string;
  requirementRefs: string[];
  evidenceRefs: string[];
}

export interface SubmissionPackageInput {
  proposal: {
    id: string;
    title: string;
    status: string;
    reviewDecision: string;
    reviewNotes?: string | null;
    reviewedAt?: Date | string | null;
  };
  opportunity: {
    id: string;
    title: string;
    agency: string;
    solicitationNumber?: string | null;
    sourceUrl: string;
    deadline?: Date | string | null;
    naics?: string | null;
    psc?: string | null;
    setAside?: string | null;
  };
  sections: SubmissionPackageSectionInput[];
  readiness: Record<string, unknown>;
  registrations: Array<{
    system: string;
    status: string;
    identifier?: string | null;
    verificationSource?: string | null;
  }>;
}

export interface SubmissionChecklistItem {
  id: string;
  label: string;
  state: "PASSED" | "HUMAN_CHECK" | "HUMAN_ACTION";
  detail: string;
}

export interface ContractOpsSubmissionPackage {
  schemaVersion: "nxyz-contractops-package/1.0";
  packageId: string;
  generatedAt: string;
  internalStatus: "SUBMISSION_READY";
  externalSubmissionPerformed: false;
  disclaimer: string;
  proposal: SubmissionPackageInput["proposal"];
  opportunity: SubmissionPackageInput["opportunity"];
  registrationSnapshot: SubmissionPackageInput["registrations"];
  readiness: Record<string, unknown>;
  evidenceIndex: string[];
  requirementIndex: string[];
  checklist: SubmissionChecklistItem[];
  sections: SubmissionPackageSectionInput[];
}

function dateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export function buildSubmissionPackage(input: SubmissionPackageInput, now = new Date()): ContractOpsSubmissionPackage {
  if (input.proposal.status !== "SUBMISSION_READY" || input.proposal.reviewDecision !== "APPROVED") {
    throw new Error("PROPOSAL_NOT_INTERNALLY_APPROVED");
  }
  if (input.sections.length === 0 || input.sections.some((section) => section.status !== "READY")) {
    throw new Error("PROPOSAL_SECTIONS_NOT_READY");
  }

  const evidenceIndex = Array.from(new Set(input.sections.flatMap((section) => section.evidenceRefs || []))).sort();
  const requirementIndex = Array.from(new Set(input.sections.flatMap((section) => section.requirementRefs || []))).sort();
  const registrationSnapshot = input.registrations.map((row) => ({ ...row }));

  return {
    schemaVersion: "nxyz-contractops-package/1.0",
    packageId: `nxyz-contractops-${input.proposal.id}`,
    generatedAt: now.toISOString(),
    internalStatus: "SUBMISSION_READY",
    externalSubmissionPerformed: false,
    disclaimer: "This package is an internally reviewed ContractOps export. It is not proof of agency receipt, eligibility, certification, award, signature, pricing acceptance, or government authorization. A human must validate opportunity-specific instructions and perform any external submission.",
    proposal: {
      ...input.proposal,
      reviewedAt: dateString(input.proposal.reviewedAt),
    },
    opportunity: {
      ...input.opportunity,
      deadline: dateString(input.opportunity.deadline),
    },
    registrationSnapshot,
    readiness: input.readiness,
    evidenceIndex,
    requirementIndex,
    checklist: [
      { id: "internal-review", label: "ContractOps internal proposal review", state: "PASSED", detail: "Proposal is APPROVED and internally marked SUBMISSION_READY." },
      { id: "official-source", label: "Official opportunity source", state: "HUMAN_CHECK", detail: `Human must re-check the current instructions at ${input.opportunity.sourceUrl}.` },
      { id: "forms-certifications", label: "Required forms, representations, certifications, and signatures", state: "HUMAN_CHECK", detail: "Confirm the exact solicitation and portal requirements. ContractOps does not sign or certify externally." },
      { id: "pricing", label: "Pricing / cost / budget commitments", state: "HUMAN_CHECK", detail: "Validate all financial commitments and required pricing formats outside automated draft generation." },
      { id: "attachments", label: "Required attachments and formatting", state: "HUMAN_CHECK", detail: "Confirm file names, page limits, attachments, formatting, and amendment acknowledgements." },
      { id: "portal-submit", label: "External portal submission", state: "HUMAN_ACTION", detail: "An authorized human performs the actual upload, certification, and submission." },
    ],
    sections: input.sections,
  };
}

export function renderSubmissionPackageMarkdown(pkg: ContractOpsSubmissionPackage): string {
  const lines: string[] = [
    `# ${pkg.proposal.title}`,
    "",
    `**ContractOps package:** ${pkg.packageId}`,
    `**Generated:** ${pkg.generatedAt}`,
    `**Internal state:** ${pkg.internalStatus}`,
    `**External submission performed:** NO`,
    "",
    `> ${pkg.disclaimer}`,
    "",
    "## Opportunity",
    "",
    `- Agency: ${pkg.opportunity.agency}`,
    `- Opportunity: ${pkg.opportunity.title}`,
    `- Solicitation: ${pkg.opportunity.solicitationNumber || "Not recorded"}`,
    `- Official source: ${pkg.opportunity.sourceUrl}`,
    `- Deadline: ${pkg.opportunity.deadline || "Not recorded"}`,
    `- NAICS: ${pkg.opportunity.naics || "Not recorded"}`,
    `- PSC: ${pkg.opportunity.psc || "Not recorded"}`,
    `- Set-aside: ${pkg.opportunity.setAside || "Not recorded"}`,
    "",
    "## Human submission checklist",
    "",
    ...pkg.checklist.map((item) => `- [${item.state === "PASSED" ? "x" : " "}] **${item.label}** — ${item.state}: ${item.detail}`),
    "",
    "## Registration snapshot",
    "",
    ...pkg.registrationSnapshot.map((row) => `- ${row.system}: ${row.status}${row.identifier ? ` — ${row.identifier}` : ""}${row.verificationSource ? ` — ${row.verificationSource}` : ""}`),
    "",
    "## Evidence index",
    "",
    ...(pkg.evidenceIndex.length ? pkg.evidenceIndex.map((id) => `- ${id}`) : ["- No evidence IDs recorded in proposal sections."]),
    "",
    "## Proposal sections",
    "",
  ];

  for (const section of pkg.sections) {
    lines.push(`### ${section.title}`, "", section.content, "");
  }
  lines.push("---", "", "Generated by NXYZ ContractOps for internal human review. No external submission was performed.");
  return lines.join("\n");
}
