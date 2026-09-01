export type SecurityMode = "ASSESS" | "PENTEST" | "SIMULATE";
export type ToolRisk = "PASSIVE" | "DISCOVERY" | "SAFE_ACTIVE" | "LAB_ACTIVE";

export interface EngagementTarget {
  type: "url" | "host" | "cidr";
  value: string;
}

export interface SecurityEngagementManifest {
  schemaVersion: "xunia.security.engagement/v1";
  engagementId: string;
  owner: string;
  mode: SecurityMode;
  startsAt: string;
  endsAt: string;
  targets: EngagementTarget[];
  exclusions?: EngagementTarget[];
  allowedChecks: string[];
  maxRequestsPerSecond: number;
  maxConcurrency: number;
  destructiveAllowed: false;
  authorizationReference: string;
}

export interface SecurityTool {
  id: string;
  name: string;
  check: string;
  risk: ToolRisk;
  freeOpenSource: true;
  phases: Array<"recon" | "assessment" | "validation" | "supply-chain" | "cloud">;
}

export interface SecurityPlanStep {
  order: number;
  tool: SecurityTool;
  target: EngagementTarget;
  status: "PLANNED";
}

export interface SecurityPlan {
  engagementId: string;
  mode: SecurityMode;
  authorizationReference: string;
  destructiveActions: "DENIED";
  steps: SecurityPlanStep[];
}

export const SECURITY_TOOL_CATALOG: readonly SecurityTool[] = [
  { id: "nmap", name: "Nmap", check: "service.discovery", risk: "DISCOVERY", freeOpenSource: true, phases: ["recon", "assessment"] },
  { id: "nuclei", name: "Nuclei", check: "web.templates", risk: "SAFE_ACTIVE", freeOpenSource: true, phases: ["assessment", "validation"] },
  { id: "owasp-zap", name: "OWASP ZAP", check: "web.baseline", risk: "PASSIVE", freeOpenSource: true, phases: ["assessment"] },
  { id: "trivy", name: "Trivy", check: "supply-chain.vulnerability", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "syft", name: "Syft", check: "supply-chain.sbom", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "grype", name: "Grype", check: "supply-chain.cve", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "gitleaks", name: "Gitleaks", check: "source.secrets", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "semgrep", name: "Semgrep Community", check: "source.sast", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "osv-scanner", name: "OSV-Scanner", check: "dependency.osv", risk: "PASSIVE", freeOpenSource: true, phases: ["supply-chain"] },
  { id: "checkov", name: "Checkov", check: "iac.misconfiguration", risk: "PASSIVE", freeOpenSource: true, phases: ["cloud", "supply-chain"] },
  { id: "prowler", name: "Prowler", check: "cloud.posture", risk: "PASSIVE", freeOpenSource: true, phases: ["cloud", "assessment"] },
] as const;

function normalized(target: EngagementTarget): string {
  return target.value.trim().toLowerCase().replace(/\/$/, "");
}

function targetMatches(scope: EngagementTarget, requested: EngagementTarget): boolean {
  if (scope.type !== requested.type) return false;
  const a = normalized(scope);
  const r = normalized(requested);
  if (a === r) return true;
  if (scope.type === "url") return r.startsWith(`${a}/`);
  if (scope.type === "host" && a.startsWith("*.")) return r.endsWith(a.slice(1));
  return false;
}

function riskAllowed(mode: SecurityMode, risk: ToolRisk): boolean {
  if (mode === "ASSESS") return risk === "PASSIVE" || risk === "DISCOVERY";
  if (mode === "PENTEST") return risk !== "LAB_ACTIVE";
  return true;
}

export function assertEngagementAuthorized(manifest: SecurityEngagementManifest, now = new Date()): void {
  if (manifest.schemaVersion !== "xunia.security.engagement/v1") throw new Error("UNSUPPORTED_ENGAGEMENT_SCHEMA");
  if (!manifest.engagementId || !manifest.owner || !manifest.authorizationReference) throw new Error("ENGAGEMENT_AUTHORIZATION_INCOMPLETE");
  if (!manifest.targets.length || !manifest.allowedChecks.length) throw new Error("ENGAGEMENT_SCOPE_REQUIRED");
  if (manifest.destructiveAllowed !== false) throw new Error("DESTRUCTIVE_ACTIONS_NOT_SUPPORTED");
  if (manifest.maxConcurrency < 1 || manifest.maxRequestsPerSecond < 1) throw new Error("ENGAGEMENT_LIMITS_INVALID");
  const start = Date.parse(manifest.startsAt);
  const end = Date.parse(manifest.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error("ENGAGEMENT_WINDOW_INVALID");
  if (now.getTime() < start || now.getTime() > end) throw new Error("ENGAGEMENT_OUTSIDE_AUTHORIZED_WINDOW");
}

export function buildSecurityPlan(manifest: SecurityEngagementManifest, now = new Date()): SecurityPlan {
  assertEngagementAuthorized(manifest, now);
  const steps: SecurityPlanStep[] = [];
  let order = 1;

  for (const target of manifest.targets) {
    const excluded = (manifest.exclusions || []).some((item) => targetMatches(item, target));
    if (excluded) continue;

    for (const tool of SECURITY_TOOL_CATALOG) {
      if (!manifest.allowedChecks.includes(tool.check)) continue;
      if (!riskAllowed(manifest.mode, tool.risk)) continue;
      steps.push({ order: order++, tool, target, status: "PLANNED" });
    }
  }

  return {
    engagementId: manifest.engagementId,
    mode: manifest.mode,
    authorizationReference: manifest.authorizationReference,
    destructiveActions: "DENIED",
    steps,
  };
}

export function authorizePlanTarget(manifest: SecurityEngagementManifest, requested: EngagementTarget): boolean {
  if ((manifest.exclusions || []).some((target) => targetMatches(target, requested))) return false;
  return manifest.targets.some((target) => targetMatches(target, requested));
}
