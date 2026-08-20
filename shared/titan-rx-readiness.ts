export type TitanReadiness = "READY" | "LIMITED" | "MAINTENANCE" | "FAULT" | "OFFLINE" | "UNKNOWN";

export type TitanSubsystem = {
  id: string;
  label: string;
  state: TitanReadiness;
  health: number | null;
  evidence: "OBSERVED" | "SIMULATED" | "STALE" | "UNKNOWN";
};

export type TitanUavReadinessProfile = {
  platformClass: "MULTIROTOR_UAV_READINESS";
  airframeClass: string;
  propulsionArchitecture: string;
  powerArchitecture: string;
  flightControllerClass: string;
  navigationSensors: string[];
  telemetryBands: string[];
  autopilotBaselines: string[];
  groundControlStations: string[];
  telemetryProtocol: "MAVLink";
  companionComputeClasses: string[];
  safeUseCases: string[];
  flightActuationEnabled: false;
  payloadActuationEnabled: false;
  weaponizationEnabled: false;
  autonomousAttackEnabled: false;
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
  uavReadinessProfile: TitanUavReadinessProfile;
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
    softwareBaseline: "TRX-SW-1.1.0-UAV",
    firmwareBaseline: "TRX-FW-1.1.0-UAV",
    supplyStatus: "READY",
    crewQualificationState: "READY",
    safetyInterlockState: "ENFORCED",
    evidenceState: "SIMULATED",
    uavReadinessProfile: {
      platformClass: "MULTIROTOR_UAV_READINESS",
      airframeClass: "250-450mm rigid carbon-fiber/composite multirotor class",
      propulsionArchitecture: "BLDC motors + ESC readiness telemetry",
      powerArchitecture: "battery + power-distribution + regulated avionics rails",
      flightControllerClass: "32-bit STM32 / Pixhawk-compatible readiness class",
      navigationSensors: ["IMU", "barometer", "GNSS/Galileo", "magnetometer"],
      telemetryBands: ["900MHz", "2.4GHz", "5.8GHz"],
      autopilotBaselines: ["PX4", "ArduPilot"],
      groundControlStations: ["QGroundControl", "Mission Planner"],
      telemetryProtocol: "MAVLink",
      companionComputeClasses: ["Raspberry Pi", "NVIDIA Jetson"],
      safeUseCases: ["inspection", "mapping", "research", "training", "logistics", "maintenance", "readiness", "recovery"],
      flightActuationEnabled: false,
      payloadActuationEnabled: false,
      weaponizationEnabled: false,
      autonomousAttackEnabled: false,
    },
    subsystems: [
      { id: "power", label: "Power", state: "READY", health: 96, evidence: "SIMULATED" },
      { id: "thermal", label: "Thermal", state: "READY", health: 94, evidence: "SIMULATED" },
      { id: "comms", label: "Communications", state: "READY", health: 91, evidence: "SIMULATED" },
      { id: "sensors", label: "Sensors", state: "READY", health: 89, evidence: "SIMULATED" },
      { id: "logistics", label: "Supply / Logistics", state: "READY", health: 88, evidence: "SIMULATED" },
      { id: "crew", label: "Crew Qualification", state: "READY", health: 100, evidence: "SIMULATED" },
      { id: "uav-airframe", label: "UAV Airframe / Vibration Isolation", state: "READY", health: 95, evidence: "SIMULATED" },
      { id: "uav-propulsion", label: "UAV BLDC Motors / ESC", state: "READY", health: 93, evidence: "SIMULATED" },
      { id: "uav-power", label: "UAV Battery / Power Distribution", state: "READY", health: 92, evidence: "SIMULATED" },
      { id: "uav-flight-controller", label: "UAV Flight Controller", state: "READY", health: 96, evidence: "SIMULATED" },
      { id: "uav-imu", label: "UAV IMU / Barometer", state: "READY", health: 94, evidence: "SIMULATED" },
      { id: "uav-nav", label: "UAV GNSS / Magnetometer", state: "READY", health: 91, evidence: "SIMULATED" },
      { id: "uav-telemetry", label: "UAV Telemetry / RC Link", state: "LIMITED", health: 84, evidence: "SIMULATED" },
      { id: "uav-autopilot", label: "UAV PX4 / ArduPilot Baseline", state: "READY", health: 100, evidence: "SIMULATED" },
      { id: "uav-gcs", label: "UAV Ground Control Station", state: "READY", health: 95, evidence: "SIMULATED" },
      { id: "uav-mavlink", label: "UAV MAVLink Telemetry", state: "READY", health: 94, evidence: "SIMULATED" },
      { id: "uav-companion", label: "UAV Companion Compute", state: "READY", health: 90, evidence: "SIMULATED" },
      { id: "uav-calibration", label: "UAV Calibration / Ground Test", state: "MAINTENANCE", health: 86, evidence: "SIMULATED" },
    ],
  },
];

const scenarioTable: Record<TitanScenario, Omit<TitanSimulationResult, "scenario">> = {
  communications_loss: {
    expectedState: "LIMITED",
    affected: ["communications", "mission continuity", "UAV telemetry/RC readiness"],
    recommendedActions: ["switch to approved continuity channel", "verify link health", "open human review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  power_degradation: {
    expectedState: "LIMITED",
    affected: ["power", "thermal", "compute", "UAV battery/PDB readiness"],
    recommendedActions: ["verify backup power readiness", "shed noncritical load", "open maintenance review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  thermal_fault: {
    expectedState: "MAINTENANCE",
    affected: ["thermal", "sensor availability", "companion-compute readiness"],
    recommendedActions: ["pause noncritical workload", "inspect thermal subsystem", "prepare recovery plan"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  sensor_degradation: {
    expectedState: "LIMITED",
    affected: ["sensors", "awareness quality", "UAV IMU/GNSS readiness"],
    recommendedActions: ["mark affected observations degraded", "cross-check independent sources", "request calibration/maintenance review"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  software_mismatch: {
    expectedState: "MAINTENANCE",
    affected: ["software baseline", "assurance", "UAV autopilot/firmware baseline"],
    recommendedActions: ["compare approved baseline", "quarantine unverified release", "prepare rollback"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  maintenance_overdue: {
    expectedState: "MAINTENANCE",
    affected: ["maintenance", "readiness", "UAV preflight/ground-test evidence"],
    recommendedActions: ["schedule inspection", "limit availability", "attach maintenance evidence"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  supply_shortage: {
    expectedState: "LIMITED",
    affected: ["supply", "maintenance continuity", "UAV batteries/motors/ESC spares"],
    recommendedActions: ["prioritize critical spares", "review alternate approved suppliers", "update continuity estimate"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  site_isolation: {
    expectedState: "LIMITED",
    affected: ["communications", "remote support", "evidence synchronization", "UAV GCS connectivity"],
    recommendedActions: ["enter local continuity mode", "preserve local evidence", "prepare governed rejoin"],
    requiresHumanReview: true,
    goldenShieldDecision: "REVIEW_REQUIRED",
    evidenceState: "SIMULATED",
    realityDelta: "NOT_OBSERVED",
  },
  recovery_failover: {
    expectedState: "READY",
    affected: ["recovery", "continuity", "UAV readiness evidence"],
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
  uavFlightActuation: false,
  uavPayloadActuation: false,
  weaponization: false,
  autonomousAttack: false,
  targetDesignation: false,
  aiming: false,
  ballistics: false,
  fireControl: false,
  weaponRelease: false,
  strikePlanning: false,
  autonomousLethalExecution: false,
  hardwareFiringInterfaces: false,
});
