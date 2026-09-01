export type FederalRegistrationKind =
  | "SAM"
  | "UEI"
  | "CAGE"
  | "SBIR_STTR"
  | "DSIP"
  | "GRANTS_GOV"
  | "OTHER";

export type RegistrationState =
  | "NOT_STARTED"
  | "NOT_RECORDED"
  | "PENDING"
  | "ACTIVE"
  | "ACTION_REQUIRED"
  | "EXPIRED";

export type OpportunityState =
  | "DISCOVERED"
  | "CAPTURED"
  | "EVIDENCE_READY"
  | "EVIDENCE_GAPS"
  | "SCORED"
  | "QUALIFYING"
  | "BID_CONFIRMED"
  | "NO_BID_CONFIRMED"
  | "DRAFTING"
  | "REVIEW"
  | "SUBMISSION_READY"
  | "SUBMITTED"
  | "CLOSED";

export type RequirementState = "UNMAPPED" | "PARTIAL" | "SUPPORTED" | "BLOCKED";
export type EvidenceTier = "ISSUER" | "REPOSITORY" | "PLATFORM_ACCESS" | "SELF_REPORTED";
export type ReviewDecision = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type HumanBidDecision = "UNDER_REVIEW" | "BID" | "NO_BID";
export type ProposalStatus = "DRAFTING" | "REVIEW" | "REVIEW_CHANGES" | "REJECTED" | "SUBMISSION_READY";
export type ProposalSectionStatus = "DRAFT" | "EVIDENCE_NEEDED" | "READY";

export interface FederalRegistration {
  id: string;
  kind: FederalRegistrationKind;
  state: RegistrationState;
  identifier?: string;
  source?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ContractOpportunity {
  id: string;
  title: string;
  agency?: string;
  solicitationNumber?: string;
  sourceUrl?: string;
  deadline?: string;
  naics?: string[];
  psc?: string[];
  setAside?: string;
  state: OpportunityState;
  bidDecision: HumanBidDecision;
  capturedAt: string;
}

export interface ContractRequirement {
  id: string;
  opportunityId: string;
  text: string;
  category: "TECHNICAL" | "PAST_PERFORMANCE" | "REGISTRATION" | "SECURITY" | "PRICING" | "DELIVERABLE" | "OTHER";
  state: RequirementState;
  mandatory: boolean;
  evidenceIds: string[];
}

export interface ZyraCapability {
  id: string;
  name: string;
  domain: string;
  summary: string;
  productRefs: string[];
  credentialEvidenceIds: string[];
  repositoryEvidenceIds: string[];
}

export interface ContractEvidence {
  id: string;
  title: string;
  tier: EvidenceTier;
  source: string;
  verificationUrl?: string;
  artifactHash?: string;
  verified: boolean;
  authorizationGrant: boolean;
}

export interface BidAssessment {
  opportunityId: string;
  advisoryOnly: true;
  technicalFitProxy: number;
  evidenceCoverage: number;
  registrationReadiness: number;
  deadlineReadiness: number;
  overallScore: number;
  blockers: string[];
  recommendation: "BID_CANDIDATE" | "NO_BID_RISK" | "HUMAN_REVIEW";
  humanDecision?: {
    decision: "BID" | "NO_BID";
    rationale: string;
    decidedAt: string;
    decidedByUserId: string;
  };
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

export interface ProposalWorkspace {
  id: string;
  opportunityId: string;
  title: string;
  status: ProposalStatus;
  sections: ProposalSection[];
  reviewDecision: ReviewDecision;
  readiness: ProposalReadiness;
  blockers: string[];
  reviewNotes?: string;
  updatedAt: string;
}

export interface ProposalSection {
  id: string;
  key: string;
  title: string;
  ordinal: number;
  content: string;
  status: ProposalSectionStatus;
  requirementRefs: string[];
  evidenceRefs: string[];
}

export interface ContractOpsSnapshot {
  registrations: FederalRegistration[];
  opportunities: ContractOpportunity[];
  requirements: ContractRequirement[];
  capabilities: ZyraCapability[];
  evidence: ContractEvidence[];
  proposals: ProposalWorkspace[];
}

export const CONTRACTOPS_SCORING_WEIGHTS = {
  technicalFitProxy: 35,
  evidenceCoverage: 30,
  registrationReadiness: 20,
  deadlineReadiness: 15,
} as const;

export const CONTRACTOPS_PROPOSAL_POLICY = {
  id: "NXYZ_CONTRACTOPS_DEFAULT_V1",
  coreRegistrationReview: ["SAM", "UEI", "CAGE"],
  requireHumanBidDecision: true,
  requireAllSectionsReady: true,
  requireNoEvidenceGaps: true,
  externalSubmissionPerformed: false,
} as const;

export const CONTRACTOPS_GUARDRAILS = {
  neverInventRegistrationIdentifiers: true,
  credentialsDoNotEqualAuthorization: true,
  readinessScoresAreAdvisoryOnly: true,
  proposalDraftsRequireHumanValidation: true,
  requireEvidenceForProposalClaims: true,
  requireHumanBidDecision: true,
  requireHumanReviewBeforeSubmission: true,
  submissionReadyIsInternalWorkflowState: true,
  neverAutoSubmitToGovernmentPortals: true,
} as const;
