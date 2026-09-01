export type NxyzCapabilityTier = "CORE" | "MAX" | "ALPHA" | "GOD";
export type NxyzExecutionMode = "DOCUMENT_ONLY" | "PLAN_ONLY" | "READ_ONLY" | "GOVERNED_WRITE";
export type NxyzFailurePolicy = "STOP" | "CONTINUE" | "ROLLBACK";

export interface NxyzDocumentProvenance {
  sourceId: string;
  sourceType: "URL" | "GITHUB" | "FILE" | "FOUNDRY" | "OTHER";
  sourceLocation: string;
  sha256?: string;
  retrievedAt: string;
  version?: string;
}

export interface NxyzExecutionStep {
  stepId: string;
  description: string;
  operation: string;
  target: string;
  toolBinding: string;
  parameters?: Record<string, unknown>;
  mutating: boolean;
  authorizationRequired: boolean;
  approvalRequired: boolean;
  requiredCapability: NxyzCapabilityTier;
  timeoutSeconds: number;
  successCriteria: string[];
  failurePolicy: NxyzFailurePolicy;
}

export interface NxyzExecutionManifest {
  manifestId: string;
  sourceDocumentId: string;
  sourceHash?: string;
  sourceVersion?: string;
  generatedAt: string;
  requestedBy: string;
  capabilityTier: NxyzCapabilityTier;
  mode: NxyzExecutionMode;
  provenance: NxyzDocumentProvenance[];
  preconditions: string[];
  postconditions: string[];
  steps: NxyzExecutionStep[];
  rollbackPlan: string[];
}

export interface NxyzApprovalDecision {
  stepId: string;
  approved: boolean;
  decidedBy: string;
  decidedAt: string;
  rationale?: string;
}

export interface NxyzStepResult {
  stepId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED" | "ROLLED_BACK";
  startedAt?: string;
  finishedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
  verificationArtifacts?: string[];
}

export interface NxyzExecutionRun {
  runId: string;
  manifestId: string;
  startedAt: string;
  finishedAt?: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "PARTIAL" | "ROLLED_BACK";
  approvals: NxyzApprovalDecision[];
  results: NxyzStepResult[];
  auditRefs: string[];
}

export const CAPABILITY_ORDER: Record<NxyzCapabilityTier, number> = {
  CORE: 0,
  MAX: 1,
  ALPHA: 2,
  GOD: 3,
};

export function capabilityAllows(actual: NxyzCapabilityTier, required: NxyzCapabilityTier): boolean {
  return CAPABILITY_ORDER[actual] >= CAPABILITY_ORDER[required];
}

export function validateExecutionManifest(manifest: NxyzExecutionManifest): string[] {
  const errors: string[] = [];
  if (!manifest.manifestId) errors.push("manifestId is required");
  if (!manifest.sourceDocumentId) errors.push("sourceDocumentId is required");
  if (!manifest.requestedBy) errors.push("requestedBy is required");
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) errors.push("at least one execution step is required");

  for (const step of manifest.steps || []) {
    if (!step.stepId) errors.push("stepId is required");
    if (!step.toolBinding) errors.push(`${step.stepId || "step"}: toolBinding is required`);
    if (step.mutating && !step.authorizationRequired) {
      errors.push(`${step.stepId}: mutating steps must require authorization`);
    }
    if (step.mutating && !step.approvalRequired) {
      errors.push(`${step.stepId}: mutating steps must require approval by default`);
    }
    if (!capabilityAllows(manifest.capabilityTier, step.requiredCapability)) {
      errors.push(`${step.stepId}: ${manifest.capabilityTier} does not satisfy ${step.requiredCapability}`);
    }
    if (step.timeoutSeconds <= 0) errors.push(`${step.stepId}: timeoutSeconds must be positive`);
    if (!step.successCriteria?.length) errors.push(`${step.stepId}: successCriteria is required`);
  }

  return errors;
}
