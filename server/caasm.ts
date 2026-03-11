import { storage } from "./storage";
import type { Express, Request, Response } from "express";
import { requireAuth } from "./routes";

// ── Risk Scoring Engine ──────────────────────────────────────────────────────

function calcAssetRiskScore(asset: any): number {
  let score = 0;
  // Vulnerability burden
  score += Math.min(asset.vulnerabilityCount * 8, 40);
  score += Math.min(asset.cveCount * 5, 30);
  // Exposure
  if (asset.assetType === "domain") score += 20;
  if (asset.environment === "production") score += 15;
  if (asset.environment === "staging") score += 5;
  // Criticality
  if (asset.criticality === "critical") score += 20;
  else if (asset.criticality === "high") score += 12;
  else if (asset.criticality === "medium") score += 5;
  // Cloud assets are often more exposed
  if (asset.cloudProvider) score += 5;
  return Math.min(score, 100);
}

function calcIdentityRiskScore(identity: any): number {
  let score = 0;
  if (identity.privilegeLevel === "admin") score += 40;
  else if (identity.privilegeLevel === "elevated") score += 20;
  if (!identity.mfaEnabled) score += 25;
  if (identity.identityType === "service_account") score += 15;
  if (identity.identityType === "api_key") score += 10;
  if (!identity.lastActivity) score += 10;
  else {
    const daysSinceActivity = (Date.now() - new Date(identity.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity > 90) score += 15;
    else if (daysSinceActivity > 30) score += 5;
  }
  const permCount = identity.permissions?.length ?? 0;
  score += Math.min(permCount * 2, 10);
  return Math.min(score, 100);
}

// ── Asset Correlation Engine ─────────────────────────────────────────────────

export async function buildCorrelatedAssets(orgId: string) {
  const [assets, identities, vulnerabilities, incidents, risks, attackPaths] = await Promise.all([
    storage.getAssets(orgId),
    storage.getCaasmIdentities(orgId),
    storage.getVulnerabilities(orgId),
    storage.getIncidents(orgId),
    storage.getRisks(orgId),
    storage.getAttackPaths(orgId),
  ]);

  return assets.map(asset => {
    const riskScore = calcAssetRiskScore(asset);
    const linkedVulns = vulnerabilities.filter(v =>
      v.assetId === asset.id ||
      (v.title?.toLowerCase().includes(asset.hostname.toLowerCase()))
    );
    const linkedIncidents = incidents.filter(i =>
      i.affectedAssets?.includes(asset.id) ||
      i.affectedAssets?.includes(asset.hostname)
    );
    const linkedRisks = risks.filter(r =>
      r.description?.toLowerCase().includes(asset.hostname.toLowerCase())
    );
    const linkedPaths = attackPaths.filter(p =>
      p.entryPoint?.toLowerCase().includes(asset.hostname.toLowerCase()) ||
      p.targetAsset?.toLowerCase().includes(asset.hostname.toLowerCase())
    );
    const linkedIdentities = identities.filter(i =>
      i.linkedAssetIds?.includes(asset.id)
    );

    return {
      ...asset,
      riskScore,
      linkedVulnerabilities: linkedVulns.length,
      linkedIncidents: linkedIncidents.length,
      linkedRisks: linkedRisks.length,
      linkedAttackPaths: linkedPaths.length,
      linkedIdentities: linkedIdentities.length,
      correlations: {
        vulnerabilities: linkedVulns.slice(0, 3).map(v => ({ id: v.id, title: v.title, severity: v.severity })),
        incidents: linkedIncidents.slice(0, 3).map(i => ({ id: i.id, title: i.title, severity: i.severity })),
        attackPaths: linkedPaths.slice(0, 2).map(p => ({ id: p.id, name: p.name, riskScore: p.riskScore })),
      },
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

// ── External Attack Surface Discovery ────────────────────────────────────────

export async function getExternalAttackSurface(orgId: string) {
  const assets = await storage.getAssets(orgId);
  const exposed = assets.filter(a =>
    a.assetType === "domain" ||
    a.environment === "production" ||
    a.criticality === "critical" ||
    a.tags?.includes("public")
  );
  return exposed.map(a => ({
    ...a,
    riskScore: calcAssetRiskScore(a),
    exposureLevel: a.assetType === "domain" ? "internet" : "cloud",
    discoveryMethod: a.assetType === "domain" ? "dns_enumeration" : "cloud_api",
  }));
}

// ── Identity Seeding ─────────────────────────────────────────────────────────

export async function ensureIdentitiesSeeded(orgId: string) {
  const existing = await storage.getCaasmIdentities(orgId);
  if (existing.length > 0) return;

  const now = new Date();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

  const seeds = [
    {
      organizationId: orgId,
      identityType: "user",
      name: "admin@company.com",
      email: "admin@company.com",
      permissions: ["admin", "write", "read", "delete"],
      privilegeLevel: "admin",
      mfaEnabled: false,
      lastActivity: daysAgo(2),
      source: "okta",
      riskScore: 65,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "service_account",
      name: "api-svc-account",
      email: null,
      permissions: ["read", "write", "execute"],
      privilegeLevel: "elevated",
      mfaEnabled: false,
      lastActivity: daysAgo(1),
      source: "aws_iam",
      riskScore: 55,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "iam_role",
      name: "DevOps-AdminRole",
      email: null,
      permissions: ["admin", "write", "read", "ec2:*", "s3:*", "iam:*"],
      privilegeLevel: "admin",
      mfaEnabled: false,
      lastActivity: daysAgo(7),
      source: "aws_iam",
      riskScore: 80,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "api_key",
      name: "ci-deploy-token",
      email: null,
      permissions: ["read", "deploy"],
      privilegeLevel: "standard",
      mfaEnabled: false,
      lastActivity: daysAgo(0),
      source: "github",
      riskScore: 30,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "user",
      name: "alice.chen@company.com",
      email: "alice.chen@company.com",
      permissions: ["read", "write"],
      privilegeLevel: "standard",
      mfaEnabled: true,
      lastActivity: daysAgo(1),
      source: "okta",
      riskScore: 10,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "user",
      name: "svc.monitor@company.com",
      email: "svc.monitor@company.com",
      permissions: ["read"],
      privilegeLevel: "standard",
      mfaEnabled: false,
      lastActivity: daysAgo(120),
      source: "okta",
      riskScore: 35,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "iam_role",
      name: "GCP-StorageAdmin",
      email: null,
      permissions: ["storage:*", "read", "write"],
      privilegeLevel: "elevated",
      mfaEnabled: false,
      lastActivity: daysAgo(14),
      source: "gcp_iam",
      riskScore: 45,
      linkedAssetIds: [],
      status: "active",
    },
    {
      organizationId: orgId,
      identityType: "api_key",
      name: "legacy-integration-key",
      email: null,
      permissions: ["read", "write", "admin"],
      privilegeLevel: "admin",
      mfaEnabled: false,
      lastActivity: daysAgo(180),
      source: "manual",
      riskScore: 90,
      linkedAssetIds: [],
      status: "active",
    },
  ];

  for (const seed of seeds) {
    try { await storage.createCaasmIdentity(seed as any); } catch {}
  }
}

// ── CAASM Stats ───────────────────────────────────────────────────────────────

export async function getCaasmStats(orgId: string) {
  const [assets, identities] = await Promise.all([
    storage.getAssets(orgId),
    storage.getCaasmIdentities(orgId),
  ]);

  const scoredAssets = assets.map(a => ({ ...a, riskScore: calcAssetRiskScore(a) }));
  const highRisk = scoredAssets.filter(a => a.riskScore >= 70);
  const exposed = scoredAssets.filter(a => a.assetType === "domain" || a.environment === "production");
  const byType: Record<string, number> = {};
  for (const a of assets) byType[a.assetType] = (byType[a.assetType] ?? 0) + 1;
  const cloudAssets = assets.filter(a => a.cloudProvider).length;

  const identitiesWithRisk = identities.map(i => ({ ...i, riskScore: calcIdentityRiskScore(i) }));
  const highRiskIdentities = identitiesWithRisk.filter(i => i.riskScore >= 60);
  const noMfa = identities.filter(i => !i.mfaEnabled).length;
  const adminIdentities = identities.filter(i => i.privilegeLevel === "admin").length;

  return {
    totalAssets: assets.length,
    highRiskAssets: highRisk.length,
    exposedAssets: exposed.length,
    cloudAssets,
    assetsByType: byType,
    totalIdentities: identities.length,
    highRiskIdentities: highRiskIdentities.length,
    identitiesNoMfa: noMfa,
    adminIdentities,
    avgAssetRisk: scoredAssets.length > 0
      ? Math.round(scoredAssets.reduce((s, a) => s + a.riskScore, 0) / scoredAssets.length)
      : 0,
  };
}

// ── Route Registration ────────────────────────────────────────────────────────

export async function registerCaasmRoutes(app: Express) {
  app.get("/api/caasm/assets", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      res.json(await buildCorrelatedAssets(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/caasm/assets/high-risk", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const correlated = await buildCorrelatedAssets(orgId);
      res.json(correlated.filter(a => a.riskScore >= 70));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/caasm/assets/exposed", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      res.json(await getExternalAttackSurface(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/caasm/identities", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await ensureIdentitiesSeeded(orgId);
      const identities = await storage.getCaasmIdentities(orgId);
      res.json(identities.map(i => ({ ...i, riskScore: calcIdentityRiskScore(i) })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/caasm/identities", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      res.json(await storage.createCaasmIdentity({ ...req.body, organizationId: orgId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/caasm/identities/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await storage.deleteCaasmIdentity(req.params.id, orgId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/caasm/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await ensureIdentitiesSeeded(orgId);
      res.json(await getCaasmStats(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
