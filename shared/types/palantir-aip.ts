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
  | "DEVOPS_AI_PRODUCTS";

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

export interface AipEcosystemBinding {
  producer: "GPT-DOUG-LLM" | "ZYRA" | "XUNIA_GLASS_ONION" | "RVAI";
  consumer: "GPT-DOUG-LLM" | "ZYRA" | "XUNIA_GLASS_ONION" | "RVAI";
  contract: string;
  version: string;
  authorizationRequired: boolean;
}

export const PALANTIR_AIP_COMMUNITY_SOURCE = "https://github.com/palantir/aip-community-registry" as const;
