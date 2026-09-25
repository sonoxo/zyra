import { isIP } from "node:net";

export type SecurityMode = "ASSESS" | "PENTEST" | "SIMULATE";
export type ToolRisk = "PASSIVE" | "DISCOVERY" | "SAFE_ACTIVE" | "LAB_ACTIVE";
export type EngagementTargetType = "url" | "host" | "cidr" | "path" | "image" | "cloud";

export interface EngagementTarget {
  type: EngagementTargetType;
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
  targetTypes: EngagementTargetType[];
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
  authorization: SecurityEngagementManifest;
  steps: SecurityPlanStep[];
}

export const SECURITY_TOOL_CATALOG: readonly SecurityTool[] = [
  { id: "nmap", name: "Nmap", check: "service.discovery", risk: "DISCOVERY", freeOpenSource: true, targetTypes: ["url", "host", "cidr"], phases: ["recon", "assessment"] },
  { id: "nuclei", name: "Nuclei", check: "web.templates", risk: "SAFE_ACTIVE", freeOpenSource: true, targetTypes: ["url"], phases: ["assessment", "validation"] },
  { id: "owasp-zap", name: "OWASP ZAP", check: "web.baseline", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["url"], phases: ["assessment"] },
  { id: "trivy", name: "Trivy", check: "supply-chain.vulnerability", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path", "image"], phases: ["supply-chain"] },
  { id: "syft", name: "Syft", check: "supply-chain.sbom", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path", "image"], phases: ["supply-chain"] },
  { id: "grype", name: "Grype", check: "supply-chain.cve", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path", "image"], phases: ["supply-chain"] },
  { id: "gitleaks", name: "Gitleaks", check: "source.secrets", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path"], phases: ["supply-chain"] },
  { id: "semgrep", name: "Semgrep Community", check: "source.sast", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path"], phases: ["supply-chain"] },
  { id: "osv-scanner", name: "OSV-Scanner", check: "dependency.osv", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path"], phases: ["supply-chain"] },
  { id: "checkov", name: "Checkov", check: "iac.misconfiguration", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["path"], phases: ["cloud", "supply-chain"] },
  { id: "prowler", name: "Prowler", check: "cloud.posture", risk: "PASSIVE", freeOpenSource: true, targetTypes: ["cloud"], phases: ["cloud", "assessment"] },
] as const;

function normalized(target: EngagementTarget): string {
  const trimmed = target.value.trim();
  if (target.type === "url") {
    try {
      const url = new URL(trimmed);
      const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
      return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${path}`;
    } catch {
      return trimmed.replace(/\/$/, "");
    }
  }
  if (target.type === "host" || target.type === "cidr") return trimmed.toLowerCase();
  if (target.type === "path") return trimmed === "/" ? "/" : trimmed.replace(/\/+$/, "");
  return trimmed;
}

function targetMatches(scope: EngagementTarget, requested: EngagementTarget): boolean {
  if (scope.type !== requested.type) return false;
  const a = normalized(scope);
  const r = normalized(requested);
  if (a === r) return true;
  if (scope.type === "path" && a === "/") return r.startsWith("/");
  if (scope.type === "url" || scope.type === "path") return r.startsWith(`${a}/`);
  if (scope.type === "host" && a.startsWith("*.")) return r.endsWith(a.slice(1));
  return false;
}

function riskAllowed(mode: SecurityMode, risk: ToolRisk): boolean {
  if (mode === "ASSESS") return risk === "PASSIVE" || risk === "DISCOVERY";
  if (mode === "PENTEST") return risk !== "LAB_ACTIVE";
  return true;
}

const TARGET_TYPES = ["url", "host", "cidr", "path", "image", "cloud"];

function validTarget(target: unknown): target is EngagementTarget {
  if (!target || typeof target !== "object") return false;
  const value = target as EngagementTarget;
  if (!TARGET_TYPES.includes(value.type) || typeof value.value !== "string" || !value.value.trim()) return false;
  if (/[\\\x00-\x20]/.test(value.value)) return false;
  if (value.type === "url") {
    try {
      const url = new URL(value.value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && !value.value.includes("%");
    } catch { return false; }
  }
  if (value.type === "path") return value.value.startsWith("/") && !value.value.split("/").includes("..");
  if (value.type === "host") return isIP(value.value) !== 0 || /^(\*\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(value.value);
  if (value.type === "cidr") {
    const [address, prefix, extra] = value.value.split("/");
    const family = isIP(address);
    return !extra && (family === 4 || family === 6) && /^\d+$/.test(prefix || "") && Number(prefix) <= (family === 4 ? 32 : 128);
  }
  return true;
}

export function assertEngagementAuthorized(manifest: unknown, now = new Date()): asserts manifest is SecurityEngagementManifest {
  if (!manifest || typeof manifest !== "object") throw new Error("ENGAGEMENT_MANIFEST_INVALID");
  const m = manifest as SecurityEngagementManifest;
  if (m.schemaVersion !== "xunia.security.engagement/v1") throw new Error("UNSUPPORTED_ENGAGEMENT_SCHEMA");
  if (![m.engagementId, m.owner, m.authorizationReference].every(v => typeof v === "string" && v.trim())) throw new Error("ENGAGEMENT_AUTHORIZATION_INCOMPLETE");
  if (!["ASSESS", "PENTEST", "SIMULATE"].includes(m.mode)) throw new Error("ENGAGEMENT_MODE_INVALID");
  if (!Array.isArray(m.targets) || !m.targets.length || !m.targets.every(validTarget)) throw new Error("ENGAGEMENT_TARGETS_INVALID");
  if (m.exclusions !== undefined && (!Array.isArray(m.exclusions) || !m.exclusions.every(validTarget))) throw new Error("ENGAGEMENT_EXCLUSIONS_INVALID");
  if (!Array.isArray(m.allowedChecks) || !m.allowedChecks.length || !m.allowedChecks.every(c => typeof c === "string" && SECURITY_TOOL_CATALOG.some(t => t.check === c))) throw new Error("ENGAGEMENT_CHECKS_INVALID");
  if (m.destructiveAllowed !== false) throw new Error("DESTRUCTIVE_ACTIONS_NOT_SUPPORTED");
  if (!Number.isSafeInteger(m.maxConcurrency) || m.maxConcurrency < 1 || !Number.isFinite(m.maxRequestsPerSecond) || m.maxRequestsPerSecond < 1) throw new Error("ENGAGEMENT_LIMITS_INVALID");
  const start = typeof m.startsAt === "string" ? Date.parse(m.startsAt) : NaN;
  const end = typeof m.endsAt === "string" ? Date.parse(m.endsAt) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || !Number.isFinite(now.getTime())) throw new Error("ENGAGEMENT_WINDOW_INVALID");
  if (now.getTime() < start || now.getTime() >= end) throw new Error("ENGAGEMENT_OUTSIDE_AUTHORIZED_WINDOW");
}

// Broad adapters cannot promise to honor a nested exclusion. Omit an overlapping
// step until an adapter can enforce the narrower scope at every request.
function scopesOverlap(a: EngagementTarget, b: EngagementTarget): boolean {
  if (targetMatches(a, b) || targetMatches(b, a)) return true;
  const network = ["url", "host", "cidr"];
  if (network.includes(a.type) && network.includes(b.type)) {
    if (a.type === "cidr" || b.type === "cidr") return true;
    const host = (t: EngagementTarget) => t.type === "url" ? new URL(t.value).hostname : t.value.toLowerCase();
    if (a.type !== b.type) return targetMatches({ type: "host", value: host(a) }, { type: "host", value: host(b) }) || targetMatches({ type: "host", value: host(b) }, { type: "host", value: host(a) });
  }
  return false;
}

export function buildSecurityPlan(manifest: SecurityEngagementManifest, now = new Date()): SecurityPlan {
  assertEngagementAuthorized(manifest, now);
  const steps: SecurityPlanStep[] = [];
  let order = 1;

  for (const target of manifest.targets) {
    const excluded = (manifest.exclusions || []).some((item) => scopesOverlap(item, target));
    if (excluded) continue;

    for (const tool of SECURITY_TOOL_CATALOG) {
      if (!tool.targetTypes.includes(target.type)) continue;
      if (tool.id === "nmap" && target.type === "url") {
        const url = new URL(target.value);
        // Host discovery cannot honor a path-only URL authorization.
        if (url.pathname !== "/") continue;
        const hostTarget: EngagementTarget = { type: "host", value: url.hostname };
        if ((manifest.exclusions || []).some(item => scopesOverlap(item, hostTarget))) continue;
      }
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
    authorization: structuredClone(manifest),
    steps,
  };
}

export function authorizePlanTarget(manifest: SecurityEngagementManifest, requested: EngagementTarget, now = new Date()): boolean {
  try { assertEngagementAuthorized(manifest, now); } catch { return false; }
  if (!validTarget(requested)) return false;
  if ((manifest.exclusions || []).some((target) => scopesOverlap(target, requested))) return false;
  return manifest.targets.some((target) => targetMatches(target, requested));
}
