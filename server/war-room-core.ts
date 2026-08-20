export type ConnectorState = "CONNECTED" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN";

export type WarRoomConnector = {
  id: string;
  label: string;
  category: "LOCAL" | "PUBLIC_WEATHER" | "PUBLIC_ORBITAL" | "PUBLIC_RESEARCH";
  state: ConnectorState;
  source: string;
  observedAt: string;
  detail?: Record<string, string | number | boolean | null>;
  error?: string;
};

const blockedPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(target|targeting|target selection|target acquisition)\b/i, reason: "Target selection and targeting are outside the War Room safety boundary." },
  { pattern: /\b(weapon release|fire control|firing solution|engagement control|strike planning)\b/i, reason: "Weapon employment and fire-control functions are not available." },
  { pattern: /\b(drone control|flight control|payload control|autonomous strike|autonomous lethal)\b/i, reason: "Direct drone flight/payload control and autonomous lethal functions are not available." },
  { pattern: /\b(offensive cyber|exploit deployment|malware deployment|intrusion execution)\b/i, reason: "Offensive cyber execution is outside the defensive mission-assurance boundary." },
];

export function checkWarRoomCapability(request: string): { allowed: boolean; reason: string } {
  const text = request.trim();
  if (!text) return { allowed: false, reason: "A capability description is required." };

  for (const rule of blockedPatterns) {
    if (rule.pattern.test(text)) return { allowed: false, reason: rule.reason };
  }

  return {
    allowed: true,
    reason: "Permitted for defensive decision support, readiness, maintenance, resilience, public awareness, or simulation subject to normal authorization.",
  };
}

export function connectorFailure(
  id: string,
  label: string,
  category: WarRoomConnector["category"],
  source: string,
  error: unknown,
): WarRoomConnector {
  return {
    id,
    label,
    category,
    state: "UNAVAILABLE",
    source,
    observedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message.slice(0, 240) : "Connector request failed",
  };
}

export function summarizeConnectorStates(connectors: WarRoomConnector[]) {
  return connectors.reduce(
    (acc, connector) => {
      acc.total += 1;
      acc[connector.state.toLowerCase() as "connected" | "degraded" | "unavailable" | "unknown"] += 1;
      return acc;
    },
    { total: 0, connected: 0, degraded: 0, unavailable: 0, unknown: 0 },
  );
}
