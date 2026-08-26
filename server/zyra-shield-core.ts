import { createHash } from "node:crypto";

export const ZYRA_SHIELD_POLICY_VERSION = "zyra-shield/1.1.0";

export const SHIELD_CAPABILITIES = [
  "read_only",
  "repository_read",
  "repository_write",
  "deployment",
  "network_egress",
  "credential_access",
  "shell",
] as const;

export type ShieldCapability = (typeof SHIELD_CAPABILITIES)[number];
export type ShieldDataClass = "public" | "internal" | "confidential" | "restricted";
export type ShieldDecisionAction = "allow" | "review" | "deny";
export type ShieldRiskLevel = "low" | "medium" | "high" | "critical";

export interface ShieldHumanApproval {
  approvedBy: string;
  approverRole: "owner" | "admin";
  approvedAt: string;
}

export function createHumanApproval(
  confirmed: boolean,
  userId: string,
  role: string,
  now: Date = new Date(),
): ShieldHumanApproval | undefined {
  if (!confirmed || (role !== "owner" && role !== "admin")) return undefined;
  return {
    approvedBy: userId,
    approverRole: role,
    approvedAt: now.toISOString(),
  };
}

export interface ShieldRequest {
  agentId: string;
  action: string;
  capability: ShieldCapability;
  purpose: string;
  declaredScopes: string[];
  requestedScopes: string[];
  dataClass?: ShieldDataClass;
  networkDestinations?: string[];
  egressApproval?: ShieldHumanApproval;
  humanApproval?: ShieldHumanApproval;
}

export interface ShieldDecision {
  action: ShieldDecisionAction;
  riskLevel: ShieldRiskLevel;
  reasons: string[];
  policyVersion: string;
  evaluatedAt: string;
}

export interface ShieldFinding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  evidence: string;
}

export interface ShieldScanResult {
  findings: ShieldFinding[];
  maximumSeverity: ShieldFinding["severity"] | "none";
  blocked: boolean;
  policyVersion: string;
}

const registeredCapabilities = new Set<string>(SHIELD_CAPABILITIES);
const highRiskCapabilities = new Set<ShieldCapability>([
  "repository_write",
  "deployment",
  "network_egress",
  "credential_access",
  "shell",
]);

const prohibitedPhysicalForcePatterns = [
  /\bweapon(?:s)?\s+(?:targeting|control|guidance|firing)\b/i,
  /\b(?:autonomous|automated)\s+(?:targeting|firing|physical[- ]force)\b/i,
  /\b(?:select|track|engage)\s+(?:a\s+)?(?:human|person|civilian)\s+target\b/i,
  /\blethal\s+(?:targeting|engagement|force)\b/i,
];

const scanRules: Array<{
  ruleId: string;
  severity: ShieldFinding["severity"];
  title: string;
  pattern: RegExp;
}> = [
  {
    ruleId: "ZYRA-AI-001",
    severity: "high",
    title: "Prompt-injection instruction",
    pattern: /\b(?:ignore|override|bypass)\s+(?:all\s+)?(?:previous|prior|system|developer)(?:\s+(?:system|developer))?\s+(?:instructions?|rules?|prompts?)\b/i,
  },
  {
    ruleId: "ZYRA-AI-002",
    severity: "high",
    title: "System-prompt extraction request",
    pattern: /\b(?:reveal|print|return|expose)\s+(?:the\s+)?(?:system|developer)\s+prompt\b/i,
  },
  {
    ruleId: "ZYRA-DATA-001",
    severity: "critical",
    title: "Possible credential exfiltration",
    pattern: /(?:curl|wget|fetch)\b[^\n]{0,240}(?:process\.env|\$\{?[A-Z][A-Z0-9_]{2,}\}?|authorization|api[_-]?key|token)/i,
  },
  {
    ruleId: "ZYRA-CODE-001",
    severity: "high",
    title: "Dynamic command execution",
    pattern: /\b(?:eval\s*\(|child_process|execSync\s*\(|spawnSync\s*\()/i,
  },
  {
    ruleId: "ZYRA-SECRET-001",
    severity: "critical",
    title: "Embedded credential-like value",
    pattern: /\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["'][^"'\s]{12,}["']/i,
  },
  {
    ruleId: "ZYRA-SUPPLY-001",
    severity: "medium",
    title: "Unpinned remote source",
    pattern: /https:\/\/raw\.githubusercontent\.com\/[^\s"']+\/(?:main|master)\//i,
  },
];

const severityRank: Record<ShieldFinding["severity"] | "none", number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function evaluateShieldRequest(
  request: ShieldRequest,
  now: Date = new Date(),
): ShieldDecision {
  const reasons: string[] = [];
  const requestedScopes = new Set(request.requestedScopes);
  const undeclaredScopes = [...requestedScopes].filter(
    (scope) => !request.declaredScopes.includes(scope),
  );
  const combinedIntent = `${request.action} ${request.purpose}`;

  if (!request.agentId.trim() || !request.action.trim() || !request.purpose.trim()) {
    reasons.push("Agent identity, action, and purpose are required.");
  }

  if (!registeredCapabilities.has(request.capability)) {
    reasons.push("Capability is not registered in the Zyra Shield policy.");
  }

  if (prohibitedPhysicalForcePatterns.some((pattern) => pattern.test(combinedIntent))) {
    reasons.push("Weapon targeting and autonomous physical-force systems are outside Zyra's authorized scope.");
  }

  if (undeclaredScopes.length > 0) {
    reasons.push(`Requested scopes exceed the agent declaration: ${undeclaredScopes.sort().join(", ")}.`);
  }

  if (
    request.dataClass === "restricted" &&
    (request.networkDestinations?.length ?? 0) > 0 &&
    !request.egressApproval
  ) {
    reasons.push("Restricted data cannot leave the trust boundary without explicit egress approval.");
  }

  if (reasons.length > 0) {
    return {
      action: "deny",
      riskLevel: "critical",
      reasons,
      policyVersion: ZYRA_SHIELD_POLICY_VERSION,
      evaluatedAt: now.toISOString(),
    };
  }

  if (highRiskCapabilities.has(request.capability) && !request.humanApproval) {
    return {
      action: "review",
      riskLevel: "high",
      reasons: ["High-impact capability requires recorded owner or administrator approval."],
      policyVersion: ZYRA_SHIELD_POLICY_VERSION,
      evaluatedAt: now.toISOString(),
    };
  }

  return {
    action: "allow",
    riskLevel: highRiskCapabilities.has(request.capability) ? "medium" : "low",
    reasons: ["Request is within declared scopes and satisfies the active policy."],
    policyVersion: ZYRA_SHIELD_POLICY_VERSION,
    evaluatedAt: now.toISOString(),
  };
}

export function scanAgentManifest(content: string): ShieldScanResult {
  const findings = scanRules.flatMap((rule) => {
    const match = content.match(rule.pattern);
    if (!match) return [];

    return [{
      ruleId: rule.ruleId,
      severity: rule.severity,
      title: rule.title,
      evidence: redactEvidence(match[0]),
    } satisfies ShieldFinding];
  });

  const maximumSeverity = findings.reduce<ShieldScanResult["maximumSeverity"]>(
    (maximum, finding) => severityRank[finding.severity] > severityRank[maximum]
      ? finding.severity
      : maximum,
    "none",
  );

  return {
    findings,
    maximumSeverity,
    blocked: maximumSeverity === "high" || maximumSeverity === "critical",
    policyVersion: ZYRA_SHIELD_POLICY_VERSION,
  };
}

export function createManifestEvidence(
  source: string,
  manifest: string,
  result: ShieldScanResult,
): { manifestHash: string; evidenceHash: string } {
  const manifestHash = createEvidenceHash(manifest);
  return {
    manifestHash,
    evidenceHash: createEvidenceHash({ source, manifestHash, result }),
  };
}

export function createEvidenceHash(value: unknown): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function redactEvidence(value: string): string {
  return value
    .replace(/(["'])([^"']{4})[^"']+(["'])/g, "$1$2…REDACTED$3")
    .slice(0, 240);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}
