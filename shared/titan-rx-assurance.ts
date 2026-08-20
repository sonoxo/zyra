export type TitanAssuranceCheckState = "PASS" | "REVIEW_REQUIRED" | "UNKNOWN";
export type TitanAssuranceEvidence = "SIMULATED" | "OBSERVED" | "STALE" | "UNKNOWN";

export type TitanAssuranceCheck = {
  checkId: string;
  label: string;
  domain:
    | "SAFETY_INTERLOCK"
    | "CONFIGURATION_BASELINE"
    | "MAINTENANCE"
    | "OPERATOR_QUALIFICATION"
    | "EVIDENCE_FRESHNESS"
    | "RECOVERY_READINESS";
  state: TitanAssuranceCheckState;
  evidence: TitanAssuranceEvidence;
  confidence: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  source: string;
  limitation: string;
};

export type TitanAssuranceEvaluation = {
  profileId: string;
  version: string;
  mode: "NON_OPERATIONAL_ASSURANCE";
  state: "SIMULATION_PASS" | "REVIEW_REQUIRED" | "UNKNOWN";
  score: number;
  passedChecks: number;
  totalChecks: number;
  humanReviewRequired: true;
  evidenceState: "SIMULATED";
  observedPhysicalOutcome: false;
  recommendations: string[];
};

export const TITAN_RX_ASSURANCE_PROFILE = Object.freeze({
  profileId: "titan-rx-v2-assurance",
  version: "2.0.0",
  mode: "NON_OPERATIONAL_ASSURANCE" as const,
  purpose: "Evidence-first readiness, maintenance, configuration, qualification, interlock, and recovery assurance for simulation/training and governed support workflows.",
  allowedSupportActions: [
    "READ_EVIDENCE",
    "COMPARE_APPROVED_CONFIGURATION_BASELINE",
    "REVIEW_MAINTENANCE_STATUS",
    "REVIEW_SAFETY_INTERLOCK_RECORD",
    "REVIEW_OPERATOR_QUALIFICATION",
    "RUN_RECOVERY_SIMULATION",
    "EXPORT_ASSURANCE_EVIDENCE",
  ] as const,
});

export const TITAN_RX_ASSURANCE_CHECKS: TitanAssuranceCheck[] = [
  { checkId: "interlock-record", label: "Safety interlock evidence record", domain: "SAFETY_INTERLOCK", state: "PASS", evidence: "SIMULATED", confidence: "HIGH", source: "titan-rx-simulated-assurance-fixture", limitation: "Fixture evidence does not prove a physical interlock state." },
  { checkId: "configuration-baseline", label: "Approved software/firmware configuration baseline", domain: "CONFIGURATION_BASELINE", state: "PASS", evidence: "SIMULATED", confidence: "HIGH", source: "titan-rx-simulated-assurance-fixture", limitation: "No external device configuration is read or changed." },
  { checkId: "maintenance-current", label: "Maintenance evidence current", domain: "MAINTENANCE", state: "PASS", evidence: "SIMULATED", confidence: "MODERATE", source: "titan-rx-simulated-assurance-fixture", limitation: "Maintenance status is a simulation fixture until authorized observed evidence exists." },
  { checkId: "qualification-review", label: "Operator qualification evidence reviewed", domain: "OPERATOR_QUALIFICATION", state: "PASS", evidence: "SIMULATED", confidence: "MODERATE", source: "titan-rx-simulated-assurance-fixture", limitation: "Qualification is never inferred from job title, role, branch, or assignment." },
  { checkId: "evidence-freshness", label: "Evidence freshness policy", domain: "EVIDENCE_FRESHNESS", state: "PASS", evidence: "SIMULATED", confidence: "HIGH", source: "titan-rx-simulated-assurance-fixture", limitation: "Stale or missing evidence must downgrade to REVIEW_REQUIRED or UNKNOWN." },
  { checkId: "recovery-readiness", label: "Recovery and failover readiness simulation", domain: "RECOVERY_READINESS", state: "PASS", evidence: "SIMULATED", confidence: "HIGH", source: "titan-rx-simulated-assurance-fixture", limitation: "Recovery simulation cannot establish a real-world recovery outcome without observed evidence." },
];

export const TITAN_RX_ASSURANCE_BOUNDARY = Object.freeze({
  executionDomain: "ASSURANCE_READINESS_RECOVERY_ONLY",
  externalHardwareControl: false,
  deviceActuation: false,
  targeting: false,
  firingSolutionComputation: false,
  weaponRelease: false,
  firingRelayControl: false,
  autonomousLethalExecution: false,
  offensiveCyber: false,
});

export function evaluateTitanAssurance(checks: TitanAssuranceCheck[] = TITAN_RX_ASSURANCE_CHECKS): TitanAssuranceEvaluation {
  if (checks.length === 0) {
    return { profileId: TITAN_RX_ASSURANCE_PROFILE.profileId, version: TITAN_RX_ASSURANCE_PROFILE.version, mode: TITAN_RX_ASSURANCE_PROFILE.mode, state: "UNKNOWN", score: 0, passedChecks: 0, totalChecks: 0, humanReviewRequired: true, evidenceState: "SIMULATED", observedPhysicalOutcome: false, recommendations: ["Provide complete, authorized assurance evidence before review."] };
  }
  const passedChecks = checks.filter((check) => check.state === "PASS").length;
  const hasUnknown = checks.some((check) => check.state === "UNKNOWN" || check.evidence === "UNKNOWN");
  const hasReview = checks.some((check) => check.state === "REVIEW_REQUIRED" || check.evidence === "STALE");
  const score = Math.round((passedChecks / checks.length) * 100);
  return {
    profileId: TITAN_RX_ASSURANCE_PROFILE.profileId,
    version: TITAN_RX_ASSURANCE_PROFILE.version,
    mode: TITAN_RX_ASSURANCE_PROFILE.mode,
    state: hasUnknown ? "UNKNOWN" : hasReview ? "REVIEW_REQUIRED" : "SIMULATION_PASS",
    score,
    passedChecks,
    totalChecks: checks.length,
    humanReviewRequired: true,
    evidenceState: "SIMULATED",
    observedPhysicalOutcome: false,
    recommendations: hasUnknown || hasReview
      ? ["Keep affected capability unavailable for automated promotion.", "Request authorized evidence review.", "Re-run readiness/recovery simulation after evidence is refreshed."]
      : ["Record human assurance review.", "Preserve simulated evidence with the release candidate.", "Require observed evidence before any real-world readiness claim."],
  };
}

export function simulateTitanAssuranceFault(checkId: string): TitanAssuranceEvaluation {
  const checks = TITAN_RX_ASSURANCE_CHECKS.map((check) => check.checkId === checkId ? { ...check, state: "REVIEW_REQUIRED" as const, evidence: "STALE" as const, confidence: "LOW" as const } : check);
  return evaluateTitanAssurance(checks);
}
