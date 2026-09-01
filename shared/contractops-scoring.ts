export type ContractOpsAdvisoryRecommendation = "BID_CANDIDATE" | "HUMAN_REVIEW" | "NO_BID_RISK";

export interface RegistrationScoreInput {
  system: string;
  status: string;
  verificationSource?: string | null;
}

export interface EvidenceScoreInput {
  state: "SUPPORTED_CANDIDATE" | "GAP";
  topScore: number;
}

export interface ContractOpsBidAssessment {
  advisoryOnly: true;
  overallScore: number;
  recommendation: ContractOpsAdvisoryRecommendation;
  dimensions: {
    technicalFitProxy: number;
    evidenceCoverage: number;
    registrationReadiness: number;
    deadlineReadiness: number;
  };
  weights: {
    technicalFitProxy: 35;
    evidenceCoverage: 30;
    registrationReadiness: 20;
    deadlineReadiness: 15;
  };
  registrationSystemsScored: string[];
  deadlineState: "UNKNOWN" | "PAST_DUE" | "URGENT" | "TIGHT" | "WORKABLE" | "HEALTHY";
  blockers: string[];
  notes: string[];
  assessedAt: string;
}

const PRIMARY_REGISTRATION_SYSTEMS = ["SAM", "UEI", "CAGE"] as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function registrationStateScore(status: string, verificationSource?: string | null): number {
  switch (status) {
    case "ACTIVE":
      return verificationSource ? 100 : 50;
    case "PENDING":
      return 50;
    case "ACTION_REQUIRED":
      return 20;
    case "EXPIRED":
    case "NOT_STARTED":
    default:
      return 0;
  }
}

export function scoreRecordedRegistrationReadiness(registrations: RegistrationScoreInput[]): {
  score: number;
  blockers: string[];
  systems: string[];
} {
  const bySystem = new Map(registrations.map((item) => [item.system.toUpperCase(), item]));
  const blockers: string[] = [];
  const scores = PRIMARY_REGISTRATION_SYSTEMS.map((system) => {
    const row = bySystem.get(system);
    if (!row) {
      blockers.push(`${system} status is not recorded in ContractOps.`);
      return 0;
    }
    if (row.status !== "ACTIVE") blockers.push(`${system} is ${row.status}.`);
    if (row.status === "ACTIVE" && !row.verificationSource) blockers.push(`${system} is marked ACTIVE without a verification source.`);
    return registrationStateScore(row.status, row.verificationSource);
  });

  return {
    score: clampScore(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    blockers,
    systems: [...PRIMARY_REGISTRATION_SYSTEMS],
  };
}

export function scoreDeadlineReadiness(deadline: Date | string | null | undefined, now = new Date()): {
  score: number;
  state: ContractOpsBidAssessment["deadlineState"];
  note: string;
} {
  if (!deadline) return { score: 25, state: "UNKNOWN", note: "No deadline is recorded; schedule risk cannot be fully assessed." };
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return { score: 25, state: "UNKNOWN", note: "The recorded deadline is invalid or unreadable." };
  const days = (date.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return { score: 0, state: "PAST_DUE", note: "The recorded deadline has passed." };
  if (days < 7) return { score: 20, state: "URGENT", note: "Fewer than 7 days remain before the recorded deadline." };
  if (days < 14) return { score: 50, state: "TIGHT", note: "Fewer than 14 days remain before the recorded deadline." };
  if (days <= 30) return { score: 75, state: "WORKABLE", note: "Between 14 and 30 days remain before the recorded deadline." };
  return { score: 100, state: "HEALTHY", note: "More than 30 days remain before the recorded deadline." };
}

export function buildAdvisoryBidAssessment(input: {
  evidenceMatches: EvidenceScoreInput[];
  registrations: RegistrationScoreInput[];
  deadline?: Date | string | null;
  assessedAt?: Date;
}): ContractOpsBidAssessment {
  const matches = input.evidenceMatches || [];
  const supported = matches.filter((match) => match.state === "SUPPORTED_CANDIDATE");
  const technicalFitProxy = matches.length
    ? clampScore(matches.reduce((sum, match) => sum + clampScore(match.topScore || 0), 0) / matches.length)
    : 0;
  const evidenceCoverage = matches.length ? clampScore((supported.length / matches.length) * 100) : 0;
  const registration = scoreRecordedRegistrationReadiness(input.registrations);
  const deadline = scoreDeadlineReadiness(input.deadline, input.assessedAt || new Date());

  const overallScore = clampScore(
    technicalFitProxy * 0.35 +
      evidenceCoverage * 0.30 +
      registration.score * 0.20 +
      deadline.score * 0.15,
  );

  const recommendation: ContractOpsAdvisoryRecommendation =
    overallScore >= 75 ? "BID_CANDIDATE" : overallScore >= 50 ? "HUMAN_REVIEW" : "NO_BID_RISK";

  const blockers = [...registration.blockers];
  if (matches.length === 0) blockers.push("No requirement evidence matrix has been generated.");
  if (matches.some((match) => match.state === "GAP")) blockers.push("One or more requirements have no supporting ZYRA evidence candidate.");
  if (deadline.state === "PAST_DUE") blockers.push("The recorded opportunity deadline has passed.");
  if (deadline.state === "URGENT") blockers.push("The opportunity has fewer than 7 days remaining.");

  return {
    advisoryOnly: true,
    overallScore,
    recommendation,
    dimensions: {
      technicalFitProxy,
      evidenceCoverage,
      registrationReadiness: registration.score,
      deadlineReadiness: deadline.score,
    },
    weights: {
      technicalFitProxy: 35,
      evidenceCoverage: 30,
      registrationReadiness: 20,
      deadlineReadiness: 15,
    },
    registrationSystemsScored: registration.systems,
    deadlineState: deadline.state,
    blockers,
    notes: [
      deadline.note,
      "Technical fit is a proxy derived from deterministic keyword-to-evidence matching; it is not an agency evaluation.",
      "Registration readiness scores only SAM, UEI, and CAGE records stored in ContractOps.",
      "This recommendation is advisory. A human must make the final BID or NO_BID decision.",
    ],
    assessedAt: (input.assessedAt || new Date()).toISOString(),
  };
}
