import { storage } from "./storage";
import type { Express, Request, Response } from "express";
import { requireAuth } from "./routes";

interface ExposureResult {
  exposed: boolean;
  exposureLevel: "internet" | "cloud" | "internal" | "none";
  reasons: string[];
}

interface ExploitabilityResult {
  score: number;
  activelyExploited: boolean;
  knownExploitKits: string[];
  cveReferences: string[];
}

interface PrioritizedPath {
  id: string;
  name: string;
  description: string;
  entryPoint: string;
  targetAsset: string;
  steps: any[];
  severity: string;
  status: string;
  mitigated: boolean;
  baseRiskScore: number;
  prioritizedRiskScore: number;
  exposureScore: number;
  exploitabilityScore: number;
  privilegeScore: number;
  threatIntelScore: number;
  impactScore: number;
  exposureDetails: ExposureResult;
  exploitabilityDetails: ExploitabilityResult;
  affectedAssets: { hostname: string; type: string; criticality: string; riskScore: number }[];
  remediations: { priority: number; action: string; effort: string; impact: string }[];
  reachesCritical: boolean;
  criticalTargetType: string | null;
}

const KNOWN_EXPLOIT_MAP: Record<string, { kits: string[]; score: number }> = {
  "CVE-2021-44228": { kits: ["Log4Shell-RCE", "Cobalt Strike"], score: 100 },
  "CVE-2024-0727": { kits: ["OpenSSL-BOF"], score: 75 },
  "CWE-89": { kits: ["SQLMap", "Havij"], score: 85 },
  "CWE-95": { kits: ["MetaSploit-Eval"], score: 70 },
  "CWE-79": { kits: ["BeEF", "XSS-Hunter"], score: 55 },
  "CWE-352": { kits: [], score: 40 },
};

const CRITICAL_TARGETS = [
  "database", "production database", "postgresql", "rds", "mysql",
  "identity provider", "iam", "okta", "active directory", "auth",
  "kubernetes", "k8s", "cluster",
  "root", "admin", "privileged",
];

function isAssetExposed(asset: any): ExposureResult {
  const reasons: string[] = [];
  let level: ExposureResult["exposureLevel"] = "internal";

  if (asset.assetType === "domain") {
    level = "internet";
    reasons.push("Asset is a public domain");
  }
  if (asset.tags?.includes("public")) {
    level = "internet";
    reasons.push("Tagged as public-facing");
  }
  if (asset.environment === "production") {
    if (level !== "internet") level = "cloud";
    reasons.push("Running in production environment");
  }
  if (asset.cloudProvider) {
    if (level === "internal") level = "cloud";
    reasons.push(`Hosted on ${asset.cloudProvider} cloud`);
  }
  if (asset.criticality === "critical") {
    reasons.push("Classified as critical asset");
  }
  if (asset.vulnerabilityCount > 3) {
    reasons.push(`${asset.vulnerabilityCount} known vulnerabilities`);
  }

  return {
    exposed: level !== "internal" && level !== "none",
    exposureLevel: level,
    reasons,
  };
}

function getExploitabilityScore(path: any, threatIntel: any[]): ExploitabilityResult {
  const cveRefs: string[] = [];
  const kits: string[] = [];
  let maxScore = 0;
  let activelyExploited = false;

  for (const step of (path.steps ?? [])) {
    const desc = (step.description ?? "").toUpperCase();
    for (const [cve, info] of Object.entries(KNOWN_EXPLOIT_MAP)) {
      if (desc.includes(cve.toUpperCase()) || (path.name ?? "").toUpperCase().includes(cve.toUpperCase())) {
        cveRefs.push(cve);
        kits.push(...info.kits);
        if (info.score > maxScore) maxScore = info.score;
      }
    }
  }

  for (const intel of threatIntel) {
    if (intel.cveId && cveRefs.includes(intel.cveId)) {
      activelyExploited = true;
      maxScore = Math.max(maxScore, 90);
    }
  }

  if (cveRefs.length === 0) {
    const stepTypes = (path.steps ?? []).map((s: any) => s.type);
    if (stepTypes.includes("exploit")) maxScore = Math.max(maxScore, 50);
    if (stepTypes.includes("compromise")) maxScore = Math.max(maxScore, 40);
  }

  return {
    score: maxScore,
    activelyExploited,
    knownExploitKits: [...new Set(kits)],
    cveReferences: [...new Set(cveRefs)],
  };
}

function detectCriticalTarget(path: any): { reachesCritical: boolean; targetType: string | null } {
  const targetLower = (path.targetAsset ?? "").toLowerCase();
  const nameLower = (path.name ?? "").toLowerCase();
  const combined = `${targetLower} ${nameLower}`;

  for (const target of CRITICAL_TARGETS) {
    if (combined.includes(target)) {
      if (["database", "postgresql", "rds", "mysql"].some(t => combined.includes(t)))
        return { reachesCritical: true, targetType: "Production Database" };
      if (["identity", "iam", "okta", "active directory", "auth"].some(t => combined.includes(t)))
        return { reachesCritical: true, targetType: "Identity Provider" };
      if (["kubernetes", "k8s", "cluster"].some(t => combined.includes(t)))
        return { reachesCritical: true, targetType: "Container Orchestration" };
      if (["root", "admin", "privileged"].some(t => combined.includes(t)))
        return { reachesCritical: true, targetType: "Privileged Access" };
    }
  }
  return { reachesCritical: false, targetType: null };
}

function calculatePrivilegeScore(path: any, identities: any[]): number {
  let score = 0;
  const stepsText = JSON.stringify(path.steps ?? []).toLowerCase();
  const nameText = (path.name ?? "").toLowerCase();
  const combined = `${stepsText} ${nameText}`;

  if (combined.includes("admin") || combined.includes("root")) score += 35;
  if (combined.includes("privilege") || combined.includes("escalat")) score += 25;
  if (combined.includes("service account") || combined.includes("svc")) score += 20;
  if (combined.includes("credential") || combined.includes("key")) score += 15;
  if (combined.includes("lateral")) score += 10;

  for (const id of identities) {
    if (combined.includes(id.name.toLowerCase())) {
      if (id.privilegeLevel === "admin") score += 20;
      if (!id.mfaEnabled) score += 10;
    }
  }

  return Math.min(score, 100);
}

function generateRemediations(path: any, exposure: ExposureResult, exploitability: ExploitabilityResult): { priority: number; action: string; effort: string; impact: string }[] {
  const rems: { priority: number; action: string; effort: string; impact: string }[] = [];

  if (exploitability.activelyExploited) {
    rems.push({ priority: 1, action: "Patch actively exploited vulnerabilities immediately", effort: "Medium", impact: "Critical — eliminates known exploit vector" });
  }

  if (exploitability.cveReferences.length > 0) {
    rems.push({ priority: 2, action: `Apply patches for ${exploitability.cveReferences.join(", ")}`, effort: "Medium", impact: "High — removes exploitable entry points" });
  }

  if (exposure.exposureLevel === "internet") {
    rems.push({ priority: 2, action: "Restrict public exposure with WAF rules and network segmentation", effort: "Low", impact: "High — reduces attack surface" });
  }

  const stepsText = JSON.stringify(path.steps ?? []).toLowerCase();
  if (stepsText.includes("lateral")) {
    rems.push({ priority: 3, action: "Implement network microsegmentation to block lateral movement", effort: "High", impact: "High — prevents east-west propagation" });
  }
  if (stepsText.includes("credential") || stepsText.includes("key")) {
    rems.push({ priority: 2, action: "Rotate compromised credentials and enforce MFA on all privileged accounts", effort: "Low", impact: "Critical — breaks credential-based attack chains" });
  }
  if (stepsText.includes("privilege") || stepsText.includes("escalat")) {
    rems.push({ priority: 3, action: "Apply least-privilege policies to service accounts and IAM roles", effort: "Medium", impact: "High — limits blast radius" });
  }

  if (rems.length === 0) {
    rems.push({ priority: 3, action: "Review and harden the attack chain entry point", effort: "Medium", impact: "Medium — reduces overall risk" });
  }

  return rems.sort((a, b) => a.priority - b.priority);
}

export async function getPrioritizedPaths(orgId: string): Promise<PrioritizedPath[]> {
  const [paths, assets, identities, threatIntel] = await Promise.all([
    storage.getAttackPaths(orgId),
    storage.getAssets(orgId),
    storage.getCaasmIdentities(orgId),
    storage.getThreatIntelItems(orgId),
  ]);

  const prioritized: PrioritizedPath[] = paths.map(path => {
    const matchedAssets = assets.filter(a => {
      const entry = (path.entryPoint ?? "").toLowerCase();
      const target = (path.targetAsset ?? "").toLowerCase();
      const hostname = a.hostname.toLowerCase();
      return entry.includes(hostname) || target.includes(hostname) || hostname.includes(entry.split(" ")[0]) || hostname.includes(target.split(" ")[0]);
    });

    const exposureResults = matchedAssets.map(a => isAssetExposed(a));
    const bestExposure = exposureResults.find(e => e.exposed) ?? exposureResults[0] ?? { exposed: false, exposureLevel: "none" as const, reasons: [] };
    const exposureScore = bestExposure.exposureLevel === "internet" ? 90 : bestExposure.exposureLevel === "cloud" ? 60 : 20;

    const exploitability = getExploitabilityScore(path, threatIntel);
    const privilegeScore = calculatePrivilegeScore(path, identities);
    const { reachesCritical, targetType } = detectCriticalTarget(path);

    const impactScore = reachesCritical ? 95 : path.severity === "critical" ? 80 : path.severity === "high" ? 60 : 40;

    const prioritizedRiskScore = Math.min(100, Math.round(
      path.riskScore * 0.2 +
      exposureScore * 0.2 +
      exploitability.score * 0.25 +
      privilegeScore * 0.15 +
      impactScore * 0.2
    ));

    const remediations = generateRemediations(path, bestExposure, exploitability);

    return {
      id: path.id,
      name: path.name,
      description: path.description ?? "",
      entryPoint: path.entryPoint,
      targetAsset: path.targetAsset,
      steps: path.steps as any[],
      severity: path.severity,
      status: path.status,
      mitigated: path.mitigated,
      baseRiskScore: path.riskScore,
      prioritizedRiskScore,
      exposureScore,
      exploitabilityScore: exploitability.score,
      privilegeScore,
      threatIntelScore: exploitability.activelyExploited ? 100 : exploitability.score,
      impactScore,
      exposureDetails: bestExposure,
      exploitabilityDetails: exploitability,
      affectedAssets: matchedAssets.map(a => ({
        hostname: a.hostname,
        type: a.assetType,
        criticality: a.criticality,
        riskScore: Math.min(100, a.vulnerabilityCount * 8 + (a.criticality === "critical" ? 20 : 10)),
      })),
      remediations,
      reachesCritical,
      criticalTargetType: targetType,
    };
  });

  return prioritized.sort((a, b) => b.prioritizedRiskScore - a.prioritizedRiskScore);
}

export async function getExposureAnalysis(orgId: string) {
  const assets = await storage.getAssets(orgId);
  const exposedAssets = assets.map(a => {
    const exposure = isAssetExposed(a);
    return { ...a, exposure };
  }).filter(a => a.exposure.exposed);

  const internetExposed = exposedAssets.filter(a => a.exposure.exposureLevel === "internet");
  const cloudExposed = exposedAssets.filter(a => a.exposure.exposureLevel === "cloud");

  return {
    totalExposed: exposedAssets.length,
    internetExposed: internetExposed.length,
    cloudExposed: cloudExposed.length,
    internalOnly: assets.length - exposedAssets.length,
    assets: exposedAssets.map(a => ({
      hostname: a.hostname,
      ip: a.ip,
      assetType: a.assetType,
      exposureLevel: a.exposure.exposureLevel,
      reasons: a.exposure.reasons,
      vulnerabilityCount: a.vulnerabilityCount,
      criticality: a.criticality,
    })),
  };
}

export async function registerExposureRoutes(app: Express) {
  app.get("/api/attack-paths/prioritized", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const paths = await getPrioritizedPaths(orgId);
      const top10 = paths.slice(0, 10);
      const criticalCount = top10.filter(p => p.reachesCritical).length;
      const avgScore = top10.length > 0 ? Math.round(top10.reduce((s, p) => s + p.prioritizedRiskScore, 0) / top10.length) : 0;
      const activelyExploited = top10.filter(p => p.exploitabilityDetails.activelyExploited).length;

      res.json({
        paths: top10,
        stats: {
          totalAnalyzed: paths.length,
          criticalPaths: criticalCount,
          avgPrioritizedScore: avgScore,
          activelyExploitedPaths: activelyExploited,
          highestRisk: top10[0]?.prioritizedRiskScore ?? 0,
        },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/attack-paths/exposure", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      res.json(await getExposureAnalysis(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
