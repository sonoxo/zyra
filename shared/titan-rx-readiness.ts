export type TitanReadiness = "READY" | "LIMITED" | "MAINTENANCE" | "FAULT" | "OFFLINE" | "UNKNOWN";

export type TitanSubsystem = {
  id: string;
  label: string;
  state: TitanReadiness;
  health: number | null;
  evidence: "OBSERVED" | "SIMULATED" | "STALE" | "UNKNOWN";
};

export type TitanPlatform = {
  platformId: string;
  callsign: string;
  readiness: TitanReadiness;
  maintenance: TitanReadiness;
  powerHealth: number | null;
  thermalHealth: number | null;
  communicationsHealth: number | null;
  sensorHealth: number | null;
  softwareBaseline: string;
  firmwareBaseline: string;
  supplyStatus: TitanReadiness;
  crewQualificationState: TitanReadiness;
  safetyInterlockState: "ENFORCED" | "FAULT" | "UNKNOWN";
  evidenceState: "SIMULATED" | "OBSERVED" | "UNKNOWN";
  subsystems: TitanSubsystem[];
};

export type TitanScenario =
  | "communications_loss"
  | "power_degradation"
  | "thermal_fault"
  | "sensor_degradation"
  | "software_mismatch"
  | "maintenance_overdue"
  | "supply_shortage"
  | "site_isolation"
  | "recovery_failover";

export type TitanSimulationResult = {
  scenario: TitanScenario;
  expectedState: TitanReadiness;
  affected: string[];
  recommendedActions: string[];
  requiresHumanReview: true;
  goldenShieldDecision: "REVIEW_REQUIRED" | "ALLOW_RECOVERY";
  evidenceState: "SIMULATED";
  realityDelta: "NOT_OBSERVED";
};

export const TITAN_RX_PLATFORM_REGISTRY: TitanPlatform[] = [
  {
    platformId: "titan-rx-001",
    callsign: "TITAN RX // ALPHA",
    readiness: "READY",
    maintenance: "READY",
    powerHealth: 96,
    thermalHealth: 94,
    communicationsHealth: 91,
    sensorHealth: 89,
    softwareBaseline: "TRX-SW-1.0.0",
    firmwareBaseline: "TRX-FW-1.0.0",
    supplyStatus: "READY",
    crewQualificationState: "READY",
    safetyInterlockState: "ENFORCED",
    evidenceState: "SIMULATED",
    subsystems: [
      { id: "power", label: "Power", state: "READY", health: 96, evidence: "SIMULATED" },
      { id: "thermal", label: "Thermal", state: "READY", health: 94, evidence: "SIMULATED" },
      { id: "comms", label: "Communications", state: "READY", health: 91, evidence: "SIMULATED" },
      { id: "sensors", label: "Sensors", state: "READY", health: 89, evidence: "SIMULATED" },
      { id: "logistics", label: "Supply / Logistics", state: "READY", health: 88, evidence: "SIMULATED" },
      { id: "crew", label: "Crew Qualification", state: "READY", health: 100, evidence: "SIMULATED" },
    ],
  },
];

const scenarioTable: Record<TitanScenario, Omit<TitanSimulationResult, "scenario">> = {
  communications_loss: {
    expectedState: "LIMITED",
    affected: ["communications", "mission continuity"],
    recommendedActions: ["switch to approved continuity channel", "verify link health", "open human review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  power_degradation: {
    expectedState: "LIMITED",
    affected: ["power", "thermal", "compute"],
    recommendedActions: ["verify backup power readiness", "shed noncritical load", "open maintenance review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  thermal_fault: {
    expectedState: "MAINTENANCE",
    affected: ["thermal", "sensor availability"],
    recommendedActions: ["pause noncritical workload", "inspect thermal subsystem", "prepare recovery plan"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  sensor_degradation: {
    expectedState: "LIMITED",
    affected: ["sensors", "awareness quality"],
    recommendedActions: ["mark affected observations degraded", "cross-check independent sources", "request maintenance review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  software_mismatch: {
    expectedState: "MAINTENANCE",
    affected: ["software baseline", "assurance"],
    recommendedActions: ["compare approved baseline", "quarantine unverified release", "prepare rollback"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  maintenance_overdue: {
    expectedState: "MAINTENANCE",
    affected: ["maintenance", "readiness"],
    recommendedActions: ["schedule inspection", "limit availability", "attach maintenance evidence"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  supply_shortage: {
    expectedState: "LIMITED",
    affected: ["supply", "maintenance continuity"],
    recommendedActions: ["prioritize critical spares", "review alternate approved suppliers", "update continuity estimate"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  site_isolation: {
    expectedState: "LIMITED",
    affected: ["communications", "remote support", "evidence synchronization"],
    recommendedActions: ["enter local continuity mode", "preserve local evidence", "prepare governed rejoin"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  recovery_failover: {
    expectedState: "READY",
    affected: ["recovery", "continuity"],
    recommendedActions: ["verify backup readiness", "perform approved failover simulation", "compare predicted and observed state"],
    requiresHumanReview: true,
    goldenShieldDecision: "ALLOW_RECOVERY",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
};

export function runTitanScenario(scenario: TitanScenario): TitanSimulationResult {
  return { scenario, ...scenarioTable[scenario] };
}

export const TITAN_RX_CONTROL_BOUNDARY = Object.freeze({
  executionDomain: "READINESS_RECOVERY_ONLY",
  externalHardwareControl: false,
  targetDesignation: false,
  aiming: false,
  ballistics: false,
  fireControl: false,
  weaponRelease: false,
  strikePlanning: false,
  autonomousLethalExecution: false,
  hardwareFiringInterfaces: false,
});
