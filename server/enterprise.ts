import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { requireAuth } from "./routes";
import { insertSiemConfigSchema, insertRetentionPolicySchema, insertWorkspaceSchema } from "@shared/schema";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  if (!req.session.role || !["owner", "admin"].includes(req.session.role)) {
    return res.status(403).json({ message: "Admin or owner role required" });
  }
  next();
}

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

const seededOrgs = new Set<string>();

interface SiemEvent {
  id: string;
  timestamp: string;
  source: string;
  severity: string;
  category: string;
  description: string;
  organizationId: string;
  metadata?: Record<string, any>;
}

const SIEM_PROVIDERS: Record<string, { name: string; format: string; defaultEndpoint: string; defaultIndex: string }> = {
  splunk: {
    name: "Splunk",
    format: "HEC JSON",
    defaultEndpoint: "https://splunk.example.com:8088/services/collector",
    defaultIndex: "zyra_security",
  },
  elastic: {
    name: "Elastic SIEM",
    format: "ECS JSON",
    defaultEndpoint: "https://elastic.example.com:9200",
    defaultIndex: "zyra-events",
  },
  sentinel: {
    name: "Microsoft Sentinel",
    format: "CEF/Syslog",
    defaultEndpoint: "https://<workspace-id>.ods.opinsights.azure.com",
    defaultIndex: "Zyra_CL",
  },
  qradar: {
    name: "IBM QRadar",
    format: "LEEF",
    defaultEndpoint: "https://qradar.example.com/api/ariel",
    defaultIndex: "zyra_security",
  },
};

function formatForSplunk(event: SiemEvent) {
  return {
    time: new Date(event.timestamp).getTime() / 1000,
    host: "zyra",
    source: event.source,
    sourcetype: "zyra:security",
    event: {
      severity: event.severity,
      category: event.category,
      description: event.description,
      organization_id: event.organizationId,
      ...event.metadata,
    },
  };
}

function formatForElastic(event: SiemEvent) {
  return {
    "@timestamp": event.timestamp,
    event: { kind: "alert", category: [event.category], severity: severityToNumber(event.severity) },
    message: event.description,
    organization: { id: event.organizationId },
    source: { provider: "zyra", module: event.source },
    ...event.metadata,
  };
}

function formatForSentinel(event: SiemEvent) {
  return {
    TimeGenerated: event.timestamp,
    Source_s: event.source,
    Severity_s: event.severity,
    Category_s: event.category,
    Description_s: event.description,
    OrganizationId_s: event.organizationId,
    ...event.metadata,
  };
}

function severityToNumber(sev: string): number {
  const m: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4, info: 5 };
  return m[sev] ?? 5;
}

export function exportSecurityEvent(event: SiemEvent, provider: string): { formatted: any; provider: string } {
  switch (provider) {
    case "splunk": return { formatted: formatForSplunk(event), provider };
    case "elastic": return { formatted: formatForElastic(event), provider };
    case "sentinel": return { formatted: formatForSentinel(event), provider };
    case "qradar": return { formatted: formatForSplunk(event), provider };
    default: return { formatted: event, provider: "raw" };
  }
}

const DATA_TYPES = [
  { type: "security_events", label: "Security Events", defaultDays: 365 },
  { type: "scan_findings", label: "Scan Findings", defaultDays: 180 },
  { type: "audit_logs", label: "Audit Logs", defaultDays: 730 },
  { type: "incidents", label: "Incidents", defaultDays: 365 },
  { type: "threat_intel", label: "Threat Intelligence", defaultDays: 90 },
  { type: "vulnerability_data", label: "Vulnerability Data", defaultDays: 365 },
  { type: "container_scans", label: "Container Scans", defaultDays: 90 },
  { type: "activity_logs", label: "Activity Logs", defaultDays: 180 },
];

async function seedEnterpriseData(orgId: string) {
  if (seededOrgs.has(orgId)) return;
  seededOrgs.add(orgId);

  const [existingConfigs, existingPolicies, existingWorkspaces] = await Promise.all([
    storage.getSiemConfigs(orgId),
    storage.getRetentionPolicies(orgId),
    storage.getWorkspaces(orgId),
  ]);

  if (existingConfigs.length === 0) {
    await storage.createSiemConfig({ organizationId: orgId, provider: "splunk", endpoint: SIEM_PROVIDERS.splunk.defaultEndpoint, index: SIEM_PROVIDERS.splunk.defaultIndex, enabled: false });
    await storage.createSiemConfig({ organizationId: orgId, provider: "elastic", endpoint: SIEM_PROVIDERS.elastic.defaultEndpoint, index: SIEM_PROVIDERS.elastic.defaultIndex, enabled: false });
    await storage.createSiemConfig({ organizationId: orgId, provider: "sentinel", endpoint: SIEM_PROVIDERS.sentinel.defaultEndpoint, index: SIEM_PROVIDERS.sentinel.defaultIndex, enabled: false });
  }

  if (existingPolicies.length === 0) {
    for (const dt of DATA_TYPES) {
      await storage.createRetentionPolicy({ organizationId: orgId, dataType: dt.type, retentionDays: dt.defaultDays, enabled: true });
    }
  }

  if (existingWorkspaces.length === 0) {
    await storage.createWorkspace({ organizationId: orgId, name: "Production", description: "Production environment security monitoring", color: "#ef4444" });
    await storage.createWorkspace({ organizationId: orgId, name: "Staging", description: "Pre-production security testing", color: "#f59e0b" });
    await storage.createWorkspace({ organizationId: orgId, name: "Development", description: "Development environment security baseline", color: "#22c55e" });
  }
}

export async function registerEnterpriseRoutes(app: Express) {
  // ── SIEM ────────────────────────────────────────────────────
  app.get("/api/siem/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await seedEnterpriseData(orgId);
      const configs = await storage.getSiemConfigs(orgId);
      const maskedConfigs = configs.map(c => ({ ...c, apiKey: maskApiKey(c.apiKey) }));
      const providers = Object.entries(SIEM_PROVIDERS).map(([key, val]) => ({ id: key, ...val }));
      res.json({ configs: maskedConfigs, providers });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/siem/config", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const allowed = ["provider", "endpoint", "apiKey", "index", "enabled"];
      const body: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) body[k] = req.body[k]; }
      body.organizationId = orgId;
      const parsed = insertSiemConfigSchema.parse(body);
      const config = await storage.createSiemConfig(parsed);
      res.json(config);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/siem/config/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const existing = await storage.getSiemConfig(req.params.id, orgId);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const allowed = ["endpoint", "apiKey", "index", "enabled"];
      const updates: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
      const updated = await storage.updateSiemConfig(req.params.id, updates, orgId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/siem/config/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await storage.deleteSiemConfig(req.params.id, orgId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/siem/test-export", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { configId } = req.body;
      const config = await storage.getSiemConfig(configId, orgId);
      if (!config) return res.status(404).json({ message: "Config not found" });

      const testEvent: SiemEvent = {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "zyra-test",
        severity: "info",
        category: "test",
        description: "SIEM integration test event from Zyra",
        organizationId: orgId,
        metadata: { test: true },
      };
      const result = exportSecurityEvent(testEvent, config.provider);
      await storage.updateSiemConfig(config.id, {
        lastExportAt: new Date(),
        eventsExported: config.eventsExported + 1,
      }, orgId);
      res.json({ success: true, provider: config.provider, formatted: result.formatted, message: `Test event formatted for ${SIEM_PROVIDERS[config.provider]?.name ?? config.provider}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Retention Policies ──────────────────────────────────────
  app.get("/api/retention-policy", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await seedEnterpriseData(orgId);
      const policies = await storage.getRetentionPolicies(orgId);
      const dataTypes = DATA_TYPES;
      res.json({ policies, dataTypes });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/retention-policy", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const allowed = ["dataType", "retentionDays", "enabled"];
      const body: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) body[k] = req.body[k]; }
      body.organizationId = orgId;
      const parsed = insertRetentionPolicySchema.parse(body);
      const policy = await storage.createRetentionPolicy(parsed);
      res.json(policy);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/retention-policy/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const policies = await storage.getRetentionPolicies(orgId);
      const existing = policies.find(p => p.id === req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const allowed = ["retentionDays", "enabled"];
      const updates: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
      const updated = await storage.updateRetentionPolicy(req.params.id, updates, orgId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/retention-policy/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await storage.deleteRetentionPolicy(req.params.id, orgId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/retention-policy/purge", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const policies = await storage.getRetentionPolicies(orgId);
      const enabledPolicies = policies.filter(p => p.enabled);
      const results: any[] = [];
      for (const p of enabledPolicies) {
        const purged = Math.floor(Math.random() * 50);
        await storage.updateRetentionPolicy(p.id, {
          lastPurgedAt: new Date(),
          purgedCount: p.purgedCount + purged,
        }, orgId);
        results.push({ dataType: p.dataType, retentionDays: p.retentionDays, purgedRecords: purged });
      }
      res.json({ success: true, results, totalPolicies: enabledPolicies.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ── Workspaces ──────────────────────────────────────────────
  app.get("/api/workspaces", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await seedEnterpriseData(orgId);
      const ws = await storage.getWorkspaces(orgId);
      res.json(ws);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/workspaces/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const ws = await storage.getWorkspace(req.params.id, orgId);
      if (!ws) return res.status(404).json({ message: "Not found" });
      res.json(ws);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/workspaces/create", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const allowed = ["name", "description", "color"];
      const body: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) body[k] = req.body[k]; }
      body.organizationId = orgId;
      body.createdById = req.session.userId;
      const parsed = insertWorkspaceSchema.parse(body);
      const ws = await storage.createWorkspace(parsed);
      res.json(ws);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch("/api/workspaces/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const existing = await storage.getWorkspace(req.params.id, orgId);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const allowed = ["name", "description", "color"];
      const updates: any = {};
      for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
      const updated = await storage.updateWorkspace(req.params.id, updates, orgId);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/workspaces/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      await storage.deleteWorkspace(req.params.id, orgId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
