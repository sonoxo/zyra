export type FederalRegistrationKind =
  | "SAM"
  | "UEI"
  | "CAGE"
  | "SBIR_STTR"
  | "DSIP"
  | "GRANTS_GOV"
  | "OTHER";

export type RegistrationState =
  | "NOT_RECORDED"
  | "PENDING"
  | "ACTIVE"
  | "ACTION_REQUIRED"
  | "EXPIRED";

export type OpportunityState =
  | "DISCOVERED"
  | "QUALIFYING"
  | "BID"
  | "NO_BID"
  | "DRAFTING"
  | "REVIEW"
  | "SUBMISSION_READY"
  | "SUBMITTED"
  | "CLOSED";

export type RequirementState = "UNMAPPED" | "PARTIAL" | "SUPPORTED" | "BLOCKED";
export type EvidenceTier = "ISSUER" | "REPOSITORY" | "PLATFORM_ACCESS" | "SELF_REPORTED";
export type ReviewDecision = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

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
  technicalFit: number;
  evidenceCoverage: number;
  registrationReadiness: number;
  deadlineRisk: number;
  overallFit: number;
  blockers: string[];
  recommendation: "BID" | "NO_BID" | "REVIEW";
}

export interface ProposalWorkspace {
  id: string;
  opportunityId: string;
  status: "NOT_STARTED" | "DRAFTING" | "REVIEW" | "SUBMISSION_READY" | "SUBMITTED";
  sections: ProposalSection[];
  reviewDecision: ReviewDecision;
  updatedAt: string;
}

export interface ProposalSection {
  id: string;
  title: string;
  status: "EMPTY" | "DRAFT" | "EVIDENCE_NEEDED" | "READY";
  evidenceIds: string[];
}

export interface ContractOpsSnapshot {
  registrations: FederalRegistration[];
  opportunities: ContractOpportunity[];
  requirements: ContractRequirement[];
  capabilities: ZyraCapability[];
  evidence: ContractEvidence[];
  proposals: ProposalWorkspace[];
}

export const CONTRACTOPS_GUARDRAILS = {
  neverInventRegistrationIdentifiers: true,
  credentialsDoNotEqualAuthorization: true,
  requireEvidenceForProposalClaims: true,
  requireHumanReviewBeforeSubmission: true,
  neverAutoSubmitToGovernmentPortals: true,
} as const;
