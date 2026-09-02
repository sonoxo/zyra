import type { AuditEvent, AuthorizationState, CredentialEvidence, EvidenceObject } from "./index";

export type AipIntegrationPattern =
  | "CONVERSATIONAL_AGENT"
  | "OSDK_LOCAL_ONTOLOGY_ACCESS"
  | "COMPUTE_MODULE"
  | "WORKSHOP_WIDGET"
  | "GEOSPATIAL"
  | "PUSH_BASED_EVENTS"
  | "PLATFORM_GOVERNANCE"
  | "AIP_EVAL_FEEDBACK_LOOP"
  | "EXTERNAL_CONNECTOR"
  | "MEDIA_DERIVED_PROPERTIES"
  | "DEVOPS_AI_PRODUCTS"
  | "AI_FDE"
  | "AUTOMATE"
  | "PALANTIR_MCP"
  | "ONTOLOGY_MCP";

export type AipProjectSupportState = "COMMUNITY_EXAMPLE" | "OWNER_IMPLEMENTATION" | "VERIFIED_DEPLOYMENT";

export interface AipOntologyObjectType {
  apiName: string;
  displayName?: string;
  description?: string;
  properties?: Record<string, string>;
}

export interface AipOntologyAction {
  apiName: string;
  displayName?: string;
  description?: string;
  parameters?: Record<string, string>;
  requiresWriteAuthorization: boolean;
}

export interface AipCommunityProject {
  id: string;
  name: string;
  sourceRepository: string;
  sourcePath?: string;
  patterns: AipIntegrationPattern[];
  supportState: AipProjectSupportState;
  objectTypes?: AipOntologyObjectType[];
  actions?: AipOntologyAction[];
  evidence?: EvidenceObject[];
  credentials?: CredentialEvidence[];
  authorization?: AuthorizationState;
  auditEvents?: AuditEvent[];
}

export type NxyzEcosystemNode =
  | "GPT-DOUG-LLM"
  | "ZYRA"
  | "XUNIA_GLASS_ONION"
  | "NXYZ"
  | "RVIA_REPOSITORY_INTELLIGENCE"
  | "RVAI";

export interface AipEcosystemBinding {
  producer: NxyzEcosystemNode;
  consumer: NxyzEcosystemNode;
  contract: string;
  version: string;
  authorizationRequired: boolean;
}

export type PalantirPublicReferenceVerificationState = "METADATA_PENDING" | "METADATA_VERIFIED" | "CONTENT_RECONCILED";

export interface PalantirPublicReference {
  id: string;
  sourceUri: string;
  sourceType: "PUBLIC_VIDEO" | "PUBLIC_DOCUMENTATION" | "PUBLIC_REPOSITORY";
  verificationState: PalantirPublicReferenceVerificationState;
  suppliedAt: string;
  evidenceClass: "PUBLIC_REFERENCE";
  promotionPolicy: "VERIFY_AGAINST_CONTROLLING_DOCS";
}

export type ApolloRuntimeAccessState = "UNVERIFIED" | "CONFIGURED" | "AUTHORIZED" | "DEGRADED";

export type ApolloSignalKind =
  | "ENVIRONMENT_HEALTH"
  | "PRODUCT_RELEASE_STATE"
  | "DEPLOYMENT_ENTITY_STATE"
  | "PLAN_STATE"
  | "CHANGE_REQUEST_STATE"
  | "RELEASE_PROMOTION_STATE"
  | "DEPLOYMENT_CONSTRAINT"
  | "MAINTENANCE_WINDOW"
  | "RUNTIME_TELEMETRY";

export interface ApolloIntelligenceSignal {
  id: string;
  kind: ApolloSignalKind;
  source: "PALANTIR_APOLLO";
  environment?: string;
  product?: string;
  release?: string;
  deploymentEntity?: string;
  observedAt: string;
  accessState: ApolloRuntimeAccessState;
  evidence?: EvidenceObject[];
  metadata?: Record<string, unknown>;
}

export interface ApolloDeploymentRiskAssessment {
  id: string;
  signalIds: string[];
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  confidence: number;
  reasons: string[];
  recommendedAction?: string;
  requiresHumanApproval: boolean;
  authorization?: AuthorizationState;
  auditEvents?: AuditEvent[];
}

export interface NxyzAipApolloContext {
  platform: "NXYZ";
  ontologyId: "nxyz:aip-apollo-intelligence";
  aipFoundryConfigured: boolean;
  apolloAccessState: ApolloRuntimeAccessState;
  ontologyObjects?: AipOntologyObjectType[];
  ontologyActions?: AipOntologyAction[];
  apolloSignals?: ApolloIntelligenceSignal[];
  assessments?: ApolloDeploymentRiskAssessment[];
}

export const PALANTIR_AIP_COMMUNITY_SOURCE = "https://github.com/palantir/aip-community-registry" as const;
export const NXYZ_AIP_APOLLO_ONTOLOGY_ID = "nxyz:aip-apollo-intelligence" as const;
export const PALANTIR_OWNER_VIDEO_REFERENCE_WDYKBZBXM6W: PalantirPublicReference = {
  id: "youtube:wdyKBzBxM6w",
  sourceUri: "https://www.youtube.com/watch?v=wdyKBzBxM6w",
  sourceType: "PUBLIC_VIDEO",
  verificationState: "METADATA_PENDING",
  suppliedAt: "2026-09-02",
  evidenceClass: "PUBLIC_REFERENCE",
  promotionPolicy: "VERIFY_AGAINST_CONTROLLING_DOCS",
};
