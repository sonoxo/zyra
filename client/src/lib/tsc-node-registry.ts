export type TscNodeKind = "NUCLEAR_SAFETY" | "DRONE_READINESS";
export type TscNodeState = "READY" | "LIMITED" | "MAINTENANCE" | "DEGRADED" | "UNKNOWN";
export type EvidenceState = "VERIFIED_FIXTURE" | "SIMULATED" | "OBSERVED" | "STALE" | "UNKNOWN";

export interface TscNodeMetric {
  key: string;
  label: string;
  value: string;
  state: TscNodeState;
  evidence: EvidenceState;
}

export interface TscNode {
  nodeId: string;
  kind: TscNodeKind;
  name: string;
  purpose: string;
  state: TscNodeState;
  confidence: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  dataMode: "SIMULATED" | "AUTHORIZED_LIVE";
  metrics: TscNodeMetric[];
  allowedActions: string[];
  blockedActions: string[];
}

export const tscNodes: TscNode[] = [
  {
    nodeId: "tsc-nuclear-safety-01",
    kind: "NUCLEAR_SAFETY",
    name: "Nuclear Safety Node",
    purpose: "Non-operational safety, continuity, emergency-readiness, maintenance, and resilience awareness for authorized nuclear infrastructure data.",
    state: "READY",
    confidence: "HIGH",
    dataMode: "SIMULATED",
    metrics: [
      { key: "containment", label: "Containment status", value: "NOMINAL", state: "READY", evidence: "VERIFIED_FIXTURE" },
      { key: "backup-power", label: "Backup power readiness", value: "AVAILABLE", state: "READY", evidence: "VERIFIED_FIXTURE" },
      { key: "cooling", label: "Cooling-system health", value: "NOMINAL", state: "READY", evidence: "SIMULATED" },
      { key: "emergency-comms", label: "Emergency communications", value: "AVAILABLE", state: "READY", evidence: "SIMULATED" },
      { key: "monitoring", label: "Safety monitoring", value: "ACTIVE", state: "READY", evidence: "SIMULATED" },
    ],
    allowedActions: [
      "READINESS_REVIEW",
      "MAINTENANCE_PRIORITIZATION",
      "BACKUP_VERIFY",
      "CONTINUITY_SIMULATION",
      "EMERGENCY_COMMS_CHECK",
      "EVIDENCE_EXPORT",
    ],
    blockedActions: [
      "REACTOR_CONTROL",
      "SAFETY_INTERLOCK_BYPASS",
      "PROTECTED_CONTROL_NETWORK_COMMAND",
      "WEAPON_COMMAND",
      "TARGETING",
    ],
  },
  {
    nodeId: "tsc-drone-readiness-01",
    kind: "DRONE_READINESS",
    name: "Drone Readiness Node",
    purpose: "Maintenance, battery, firmware, communications-health, inspection, qualification, and availability awareness for authorized unmanned systems.",
    state: "LIMITED",
    confidence: "MODERATE",
    dataMode: "SIMULATED",
    metrics: [
      { key: "battery", label: "Battery readiness", value: "82%", state: "READY", evidence: "SIMULATED" },
      { key: "maintenance", label: "Maintenance state", value: "INSPECTION DUE", state: "LIMITED", evidence: "SIMULATED" },
      { key: "firmware", label: "Firmware compliance", value: "CURRENT", state: "READY", evidence: "VERIFIED_FIXTURE" },
      { key: "comms", label: "Communications health", value: "DEGRADED", state: "DEGRADED", evidence: "SIMULATED" },
      { key: "qualification", label: "Operator qualification", value: "UNKNOWN", state: "UNKNOWN", evidence: "UNKNOWN" },
    ],
    allowedActions: [
      "READINESS_REVIEW",
      "MAINTENANCE_PRIORITIZATION",
      "FIRMWARE_COMPLIANCE_CHECK",
      "COMMUNICATIONS_HEALTH_CHECK",
      "GROUND_TEST_SIMULATION",
      "EVIDENCE_EXPORT",
    ],
    blockedActions: [
      "FLIGHT_CONTROL",
      "AUTONOMOUS_NAVIGATION_COMMAND",
      "PAYLOAD_CONTROL",
      "TARGETING",
      "WEAPON_RELEASE",
    ],
  },
];

export function getTscNode(nodeId: string): TscNode | undefined {
  return tscNodes.find((node) => node.nodeId === nodeId);
}
