import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";

export type AssuranceStage =
  | "SYNTHETIC_TRIGGER"
  | "TELEMETRY_VERIFICATION"
  | "DETECTION_SCORING"
  | "GAP_PATCHING";

export type ObservationState = "OBSERVED" | "MISSING" | "UNKNOWN";

export interface BaselineScenario {
  scenarioId: string;
  name: string;
  description: string;
  category: "process" | "identity" | "file" | "network";
  expectedSignals: Array<{
    field: string;
    operator: "equals" | "contains" | "endsWith";
    value: string;
  }>;
  safeSyntheticEvent: Record<string, string>;
  detectionTemplate: Record<string, unknown>;
}

export interface AssuranceObservation {
  source: string;
  observedAt: string;
  fields: Record<string, string>;
}

export interface StageResult {
  stage: AssuranceStage;
  status: "PASS" | "FAIL" | "UNKNOWN";
  evidence: string[];
}

export interface AssuranceEvaluation {
  scenarioId: string;
  score: number;
  state: ObservationState;
  stages: StageResult[];
  matchedSignals: number;
  expectedSignals: number;
  suggestedDetectionRule: Record<string, unknown> | null;
  limitations: string[];
}

export const BASELINE_SCENARIOS: BaselineScenario[] = [
  {
    scenarioId: "synthetic-system-discovery",
    name: "Synthetic System Discovery Execution",
    description:
      "Emits a simulated process-creation event representing system-identification activity. No command is executed by Zyra.",
    category: "process",
    expectedSignals: [
      { field: "image", operator: "endsWith", value: "/whoami" },
      { field: "parentImage", operator: "contains", value: "zyra_emulation" },
    ],
    safeSyntheticEvent: {
      image: "/usr/bin/whoami",
      parentImage: "/opt/zyra/zyra_emulation",
      eventType: "process_creation",
      dataMode: "SIMULATED",
    },
    detectionTemplate: {
      title: "Zyra BAS Synthetic System Discovery",
      logsource: { category: "process_creation" },
      detection: {
        selection: {
          "Image|endswith": "/whoami",
          "ParentImage|contains": "zyra_emulation",
        },
        condition: "selection",
      },
      level: "low",
      tags: ["zyra.bas", "defensive.validation"],
    },
  },
  {
    scenarioId: "synthetic-auth-failure-burst",
    name: "Synthetic Authentication Failure Burst",
    description:
      "Produces simulated authentication-failure telemetry for validating identity monitoring and alert routing.",
    category: "identity",
    expectedSignals: [
      { field: "eventType", operator: "equals", value: "auth_failure" },
      { field: "source", operator: "contains", value: "zyra-bas" },
    ],
    safeSyntheticEvent: {
      eventType: "auth_failure",
      source: "zyra-bas-synthetic",
      outcome: "denied",
      dataMode: "SIMULATED",
    },
    detectionTemplate: {
      title: "Zyra BAS Synthetic Authentication Failure",
      logsource: { category: "authentication" },
      detection: {
        selection: {
          eventType: "auth_failure",
          "source|contains": "zyra-bas",
        },
        condition: "selection",
      },
      level: "low",
      tags: ["zyra.bas", "defensive.validation"],
    },
  },
  {
    scenarioId: "synthetic-file-read",
    name: "Synthetic Protected-File Read",
    description:
      "Generates a simulated file-read event for validating endpoint telemetry without modifying or exfiltrating data.",
    category: "file",
    expectedSignals: [
      { field: "eventType", operator: "equals", value: "file_read" },
      { field: "actor", operator: "contains", value: "zyra-bas" },
    ],
    safeSyntheticEvent: {
      eventType: "file_read",
      actor: "zyra-bas-synthetic",
      pathClass: "TEST_FIXTURE",
      dataMode: "SIMULATED",
    },
    detectionTemplate: {
      title: "Zyra BAS Synthetic File Read",
      logsource: { category: "file_event" },
      detection: {
        selection: {
          eventType: "file_read",
          "actor|contains": "zyra-bas",
        },
        condition: "selection",
      },
      level: "low",
      tags: ["zyra.bas", "defensive.validation"],
    },
  },
  {
    scenarioId: "synthetic-policy-denial",
    name: "Synthetic Network Policy Denial",
    description:
      "Creates simulated policy-denial telemetry to test whether network security controls are visible to the monitoring pipeline.",
    category: "network",
    expectedSignals: [
      { field: "eventType", operator: "equals", value: "policy_denial" },
      { field: "source", operator: "contains", value: "zyra-bas" },
    ],
    safeSyntheticEvent: {
      eventType: "policy_denial",
      source: "zyra-bas-synthetic",
      action: "blocked",
      dataMode: "SIMULATED",
    },
    detectionTemplate: {
      title: "Zyra BAS Synthetic Policy Denial",
      logsource: { category: "network" },
      detection: {
        selection: {
          eventType: "policy_denial",
          "source|contains": "zyra-bas",
        },
        condition: "selection",
      },
      level: "low",
      tags: ["zyra.bas", "defensive.validation"],
    },
  },
];

const observationSchema = z.object({
  source: z.string().min(1).max(200),
  observedAt: z.string().datetime(),
  fields: z.record(z.string()),
});

const evaluateSchema = z
  .object({
    scenarioId: z.string().min(1).max(100),
    observations: z.array(observationSchema).max(1000).default([]),
  })
  .strict();

function signalMatches(
  fields: Record<string, string>,
  signal: BaselineScenario["expectedSignals"][number],
): boolean {
  const candidate = fields[signal.field];
  if (typeof candidate !== "string") return false;

  if (signal.operator === "equals") return candidate === signal.value;
  if (signal.operator === "contains") return candidate.includes(signal.value);
  return candidate.endsWith(signal.value);
}

export function evaluateBaselineScenario(
  scenario: BaselineScenario,
  observations: AssuranceObservation[],
): AssuranceEvaluation {
  const allFields = observations.map((item) => item.fields);
  const matched = scenario.expectedSignals.filter((signal) =>
    allFields.some((fields) => signalMatches(fields, signal)),
  );

  const expected = scenario.expectedSignals.length;
  const matchedCount = matched.length;
  const score = expected === 0 ? 0 : Math.round((matchedCount / expected) * 100);
  const hasTelemetry = observations.length > 0;
  const state: ObservationState = !hasTelemetry
    ? "UNKNOWN"
    : matchedCount === expected
      ? "OBSERVED"
      : "MISSING";

  const stages: StageResult[] = [
    {
      stage: "SYNTHETIC_TRIGGER",
      status: "PASS",
      evidence: [
        `Synthetic fixture available: ${scenario.scenarioId}`,
        "No operating-system command, exploit, or external action is executed by this pipeline.",
      ],
    },
    {
      stage: "TELEMETRY_VERIFICATION",
      status: !hasTelemetry ? "UNKNOWN" : matchedCount > 0 ? "PASS" : "FAIL",
      evidence: !hasTelemetry
        ? ["No telemetry observations were supplied."]
        : [`${matchedCount}/${expected} expected signals were observed.`],
    },
    {
      stage: "DETECTION_SCORING",
      status: !hasTelemetry ? "UNKNOWN" : score === 100 ? "PASS" : "FAIL",
      evidence: [`Detection coverage score: ${score}%`],
    },
    {
      stage: "GAP_PATCHING",
      status: !hasTelemetry ? "UNKNOWN" : score === 100 ? "PASS" : "FAIL",
      evidence:
        score === 100
          ? ["No detection gap identified for the supplied observations."]
          : ["A defensive detection template is available for analyst review."],
    },
  ];

  return {
    scenarioId: scenario.scenarioId,
    score,
    state,
    stages,
    matchedSignals: matchedCount,
    expectedSignals: expected,
    suggestedDetectionRule: score === 100 ? null : scenario.detectionTemplate,
    limitations: [
      "Synthetic BAS events do not prove production telemetry collection without matching observed evidence.",
      "Suggested rules require analyst validation before deployment.",
      "This module performs defensive validation only and does not execute adversary actions.",
    ],
  };
}

export function registerBaselineAssuranceRoutes(app: Express): void {
  app.get("/api/bas/scenarios", requireAuth, (_req: Request, res: Response) => {
    res.json({
      dataMode: "SIMULATED",
      executionMode: "DEFENSIVE_VALIDATION_ONLY",
      scenarios: BASELINE_SCENARIOS,
    });
  });

  app.post("/api/bas/evaluate", requireAuth, (req: Request, res: Response) => {
    const parsed = evaluateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
    }

    const scenario = BASELINE_SCENARIOS.find(
      (candidate) => candidate.scenarioId === parsed.data.scenarioId,
    );
    if (!scenario) {
      return res.status(404).json({ message: "Unknown baseline assurance scenario" });
    }

    const evaluation = evaluateBaselineScenario(
      scenario,
      parsed.data.observations,
    );

    return res.json({
      scenario,
      evaluation,
      syntheticTrigger: scenario.safeSyntheticEvent,
    });
  });
}
