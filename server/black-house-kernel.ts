export const BLACK_HOUSE_KERNEL_VERSION = "3.0.0" as const;
export const BLACK_HOUSE_CONTROL_PLANE = "THE_BLACK_HOUSE_V1" as const;

export const BLACK_HOUSE_OBJECT_TYPES = [
  "Mission", "Agent", "Model", "User", "Repository", "Service", "Tool", "Resource", "Evidence",
  "Source", "Decision", "Approval", "Action", "Deployment", "Incident", "Policy",
  "CredentialReference", "Artifact", "IntelligenceBrief",
] as const;

export const BLACK_HOUSE_RELATIONSHIP_TYPES = [
  "EXECUTES", "USES", "PRODUCES", "DERIVED_FROM", "AUTHORIZES", "GOVERNS", "DEPLOYED_TO",
  "IMPLEMENTS", "RUNS_ON", "ROUTES_TO", "AUDITS", "EVIDENCES",
] as const;

export type BlackHouseObjectType = typeof BLACK_HOUSE_OBJECT_TYPES[number];
export type BlackHouseRelationshipType = typeof BLACK_HOUSE_RELATIONSHIP_TYPES[number];

export type BlackHouseMissionEnvelope = {
  missionId: string;
  actorId: string;
  target: string;
  action: string;
  objectType: BlackHouseObjectType;
  evidence: readonly string[];
  consequential: boolean;
  approvedBy?: string;
};

export type BlackHouseKernelDecision = "ALLOW" | "REVIEW" | "BLOCK";

export function evaluateBlackHouseMission(mission: BlackHouseMissionEnvelope): BlackHouseKernelDecision {
  if (!mission.missionId.trim() || !mission.actorId.trim() || !mission.target.trim() || !mission.action.trim()) {
    return "BLOCK";
  }
  if (mission.evidence.length === 0) return "BLOCK";
  if (mission.consequential && !mission.approvedBy?.trim()) return "REVIEW";
  return "ALLOW";
}

export function requireBlackHouseRelationship(relation: string): BlackHouseRelationshipType {
  if (!(BLACK_HOUSE_RELATIONSHIP_TYPES as readonly string[]).includes(relation)) {
    throw new Error(`BLACK_HOUSE_UNREGISTERED_RELATIONSHIP:${relation}`);
  }
  return relation as BlackHouseRelationshipType;
}

export const BLACK_HOUSE_KERNEL = {
  kernelVersion: BLACK_HOUSE_KERNEL_VERSION,
  controlPlane: BLACK_HOUSE_CONTROL_PLANE,
  canonicalRoot: "sonoxo/gpt-doug-llm/the-black-house",
  component: "ZYRA",
  role: "SECURITY_APPROVAL_AUDIT_AND_CLOUD_EXECUTION",
  cloudLayer: "Zyra Cloud",
  approvalAuthority: true,
  objectTypes: BLACK_HOUSE_OBJECT_TYPES,
  relationshipTypes: BLACK_HOUSE_RELATIONSHIP_TYPES,
  invariants: {
    evidenceRequired: true,
    consequentialMutationRequiresHumanApproval: true,
    unknownRelationshipsFailClosed: true,
    externalAuthorizationNeverImplied: true,
  },
} as const;
