/**
 * ZYRA Ecosystem Shared Types
 * 
 * Defines contracts across gpt-doug-llm, zyra, gods-eye-viewXUNIA, and RVAI.
 * All types are ISO 8601 compatible and JSON-serializable.
 */

// ============================================================================
// VIRGINIA MISSION TYPES (gpt-doug-llm ↔ zyra)
// ============================================================================

export type VirginiaOperationType =
  | "LIST_ONTOLOGIES"
  | "LIST_OBJECT_TYPES"
  | "LIST_OBJECTS"
  | "APPLY_ACTION"
  | "GEOVISION_STATUS"
  | "GEOVISION_CAMERAS"
  | "GEOVISION_DETECTIONS"
  | "MISSION_TWIN_STATUS"
  | "SPACEX_LAUNCH_LATEST"
  | "SPACEX_LAUNCHES"
  | "FPRIME_TELEMETRY"
  | "BRAIN_UPDATE_SOURCE"
  | "SHUTDOWN_ZYRA"
  | "NOTE";

export type VirginiaMissionMode = "VIRGINIA" | "VAL3M" | "VA3LM" | "RICHMONDVA3LM";

export interface VirginiaStep {
  op: VirginiaOperationType;
  ontology?: string;
  objectType?: string;
  action?: string;
  parameters?: Record<string, unknown>;
  text?: string;
}

export interface VirginiaMission {
  mode: VirginiaMissionMode;
  agents: number;
  stopWhen: string;
  profile?: string;
  steps: VirginiaStep[];
}

// ============================================================================
// EVIDENCE STATE (gods-eye-viewXUNIA → zyra, gpt-doug-llm)
// ============================================================================

export enum EvidenceState {
  LIVE = "LIVE",
  DELAYED = "DELAYED",
  RECONSTRUCTED = "RECONSTRUCTED",
  MODELED = "MODELED",
  PARTIAL = "PARTIAL",
  UNAVAILABLE = "UNAVAILABLE",
}

export interface SourceProvenance {
  sourceUrl: string;
  attribution: string;
  licenseTerms?: string;
  retrievedAt: string; // ISO 8601
  confidence?: number; // 0-100
}

export interface EvidenceObject {
  id: string;
  type: string;
  state: EvidenceState;
  source: string;
  retrievedAt: string; // ISO 8601
  provenance?: SourceProvenance;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CREDENTIAL EVIDENCE (zyra → gpt-doug-llm, agency_cloud)
// ============================================================================

export type CredentialType =
  | "BADGE"
  | "CERTIFICATE"
  | "SKILL"
  | "LICENSE"
  | "CLEARANCE"
  | "PLATFORM_ACCESS"
  | "AUTHORIZATION";

export type CredentialAuditState =
  | "VERIFIED"
  | "UNDER_REVIEW"
  | "REVOKED"
  | "HISTORICAL"
  | "EXPIRED";

export interface CredentialEvidence {
  id: string;
  type: CredentialType;
  issuer: string;
  issuedDate: string; // ISO 8601
  expiresDate?: string; // ISO 8601
  verificationId?: string;
  issuanceSource: string; // e.g., "credly", "course-platform", "palantir-org"
  evidence: string; // proof URL or artifact hash
  isExpired: boolean;
  isAuthorization: boolean; // true only if it grants actual access rights
  auditState: CredentialAuditState;
  lastVerifiedAt?: string; // ISO 8601
}

// ============================================================================
// AUTHORIZATION STATE (zyra, gpt-doug-llm → agency_cloud)
// ============================================================================

export type AuthorizationLevel =
  | "DENIED"
  | "VIEWER"
  | "EDITOR"
  | "OPERATOR"
  | "ADMIN"
  | "SYSTEM";

export interface AuthorizationState {
  subject: string; // user ID or service principal
  level: AuthorizationLevel;
  scope: string[]; // ["read:ontologies", "write:objects", etc.]
  grantedAt: string; // ISO 8601
  expiresAt?: string; // ISO 8601
  grantedBy: string;
  auditTrail?: string[]; // decision explanation chain
}

// ============================================================================
// AUDIT EVENT (all repos)
// ============================================================================

export type AuditEventType =
  | "CREDENTIAL_ISSUED"
  | "CREDENTIAL_REVOKED"
  | "CREDENTIAL_VERIFIED"
  | "AUTHORIZATION_GRANTED"
  | "AUTHORIZATION_REVOKED"
  | "VIRGINIA_MISSION_EXECUTED"
  | "GEOVISION_ACCESS"
  | "FOUNDRY_ACTION"
  | "SECURITY_INCIDENT"
  | "CONFIGURATION_CHANGE";

export interface AuditEvent {
  eventId: string; // UUID
  timestamp: string; // ISO 8601
  type: AuditEventType;
  actor: string; // user/service that triggered the event
  resource: string; // what was acted upon
  action: string; // what was done
  result: "SUCCESS" | "FAILURE" | "PARTIAL";
  details: Record<string, unknown>;
  classification: ClassificationLevel;
  riceSignals?: string[]; // social engineering signals from Zyra
  auditTrail?: string; // immutable HMAC chain reference
}

// ============================================================================
// CLASSIFICATION LEVELS (zyra, gpt-doug-llm)
// ============================================================================

export type ClassificationLevel =
  | "UNCLASSIFIED"
  | "CUI"
  | "CONFIDENTIAL"
  | "SECRET"
  | "TOP_SECRET";

export interface ClassificationMetadata {
  level: ClassificationLevel;
  markings: string[];
  handlingInstructions: string;
  declassificationDate?: string; // ISO 8601
}

// ============================================================================
// VA3LM / GEOVISION TYPES (zyra ↔ gods-eye-viewXUNIA, gpt-doug-llm)
// ============================================================================

export interface GeovisionStatus {
  foundryConfigured: boolean;
  foundryOnline: boolean;
  eyerisModelService?: {
    online: boolean;
    version: string;
  };
  wgs84Pipeline: {
    operational: boolean;
  };
  privacyBoundary: string; // "non-identifying-object-scene-recognition"
}

export interface DetectionObject {
  id: string;
  type: string;
  state: EvidenceState;
  confidence: number; // 0-100
  timestamp: string; // ISO 8601
  location?: {
    lat: number;
    lon: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CameraObject {
  id: string;
  state: EvidenceState;
  ontology: string;
  location?: {
    lat: number;
    lon: number;
    description?: string;
  };
  lastSeenAt: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PALANTIR FOUNDRY INTEGRATION (gpt-doug-llm → zyra, agency_cloud)
// ============================================================================

export interface FoundryOntologyObject {
  id: string;
  objectType: string;
  properties: Record<string, unknown>;
  lastModified: string; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface FoundryActionRequest {
  ontology: string;
  action: string;
  parameters: Record<string, unknown>;
}

export interface FoundryActionResult {
  success: boolean;
  validation?: {
    result: "VALID" | "INVALID";
    messages?: string[];
  };
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// MISSION EXECUTION RESULT (all repos)
// ============================================================================

export interface VirginiaExecutionResult {
  missionId: string; // UUID
  mission: VirginiaMission;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  steps: VirginiaStepResult[];
  finalEvidence?: Record<string, unknown>;
  errors?: string[];
  auditEvent?: AuditEvent;
}

export interface VirginiaStepResult {
  stepIndex: number;
  step: VirginiaStep;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  result?: Record<string, unknown>;
  error?: string;
  executedAt?: string; // ISO 8601
}

// ============================================================================
// VALIDATION & SERIALIZATION HELPERS
// ============================================================================

/**
 * Type guard: verify an object is a valid VirginiaMission
 */
export function isVirginiaMission(obj: unknown): obj is VirginiaMission {
  if (!obj || typeof obj !== "object") return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m.mode === "string" &&
    typeof m.agents === "number" &&
    typeof m.stopWhen === "string" &&
    Array.isArray(m.steps)
  );
}

/**
 * Type guard: verify an object is a valid EvidenceObject
 */
export function isEvidenceObject(obj: unknown): obj is EvidenceObject {
  if (!obj || typeof obj !== "object") return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.type === "string" &&
    Object.values(EvidenceState).includes(e.state as EvidenceState) &&
    typeof e.retrievedAt === "string"
  );
}

/**
 * Type guard: verify a classification level
 */
export function isClassificationLevel(val: unknown): val is ClassificationLevel {
  return (
    val === "UNCLASSIFIED" ||
    val === "CUI" ||
    val === "CONFIDENTIAL" ||
    val === "SECRET" ||
    val === "TOP_SECRET"
  );
}
