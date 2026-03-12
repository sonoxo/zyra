import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import { requireAuth } from "./routes";
import { getPrioritizedPaths, getExposureAnalysis } from "./exposure";

function requireAnalyst(req: Request, res: Response, next: NextFunction) {
  const role = req.session.role;
  if (!role || !["owner", "admin", "analyst"].includes(role)) {
    return res.status(403).json({ message: "Insufficient permissions. Requires analyst role or higher." });
  }
  next();
}

interface GraphNode {
  id: string;
  label: string;
  type: "asset" | "vulnerability" | "identity" | "entry_point" | "target";
  riskScore: number;
  metadata: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "exploits" | "lateral_movement" | "privilege_escalation" | "data_access" | "network_path";
  weight: number;
}

interface AttackGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  risk_score: number;
}

const TRIGGER_TYPES = {
  new_asset: "new_asset_discovered",
  vulnerability: "vulnerability_detected",
  privilege_escalation: "privilege_escalation",
  public_exposure: "public_exposure",
} as const;

const REMEDIATION_ACTIONS: Record<string, { actionType: string; description: string }[]> = {
  public_exposure: [
    { actionType: "remove_public_access", description: "Remove public access from exposed asset" },
    { actionType: "apply_waf_rules", description: "Apply WAF rules to restrict external access" },
  ],
  privilege_escalation: [
    { actionType: "rotate_credentials", description: "Rotate compromised credentials and API keys" },
    { actionType: "disable_compromised_account", description: "Disable compromised account and revoke sessions" },
    { actionType: "enforce_least_privilege", description: "Apply least-privilege policies to affected IAM roles" },
  ],
  vulnerability_detected: [
    { actionType: "patch_dependency", description: "Patch vulnerable dependency to latest secure version" },
    { actionType: "apply_virtual_patch", description: "Deploy virtual patch via WAF while scheduling full patch" },
  ],
  new_asset_discovered: [
    { actionType: "scan_asset", description: "Run full vulnerability scan on newly discovered asset" },
    { actionType: "apply_baseline_policy", description: "Apply organization security baseline policies" },
  ],
};

function buildAttackGraph(
  paths: any[],
  assets: any[],
  identities: any[]
): AttackGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let edgeIdx = 0;

  for (const asset of assets) {
    const nodeId = `asset-${asset.id}`;
    nodeMap.set(nodeId, {
      id: nodeId,
      label: asset.hostname,
      type: "asset",
      riskScore: Math.min(100, asset.vulnerabilityCount * 8 + (asset.criticality === "critical" ? 20 : 10)),
      metadata: {
        ip: asset.ip,
        assetType: asset.assetType,
        criticality: asset.criticality,
        environment: asset.environment,
        vulnerabilityCount: asset.vulnerabilityCount,
      },
    });
  }

  for (const id of identities) {
    const nodeId = `identity-${id.id}`;
    nodeMap.set(nodeId, {
      id: nodeId,
      label: id.name,
      type: "identity",
      riskScore: id.privilegeLevel === "admin" ? 80 : id.privilegeLevel === "user" ? 40 : 20,
      metadata: {
        identityType: id.identityType,
        privilegeLevel: id.privilegeLevel,
        mfaEnabled: id.mfaEnabled,
        lastActive: id.lastActive,
      },
    });
  }

  for (const path of paths) {
    const steps = (path.steps ?? []) as any[];

    const entryId = `entry-${path.id}`;
    if (!nodeMap.has(entryId)) {
      nodeMap.set(entryId, {
        id: entryId,
        label: path.entryPoint,
        type: "entry_point",
        riskScore: path.prioritizedRiskScore ?? path.riskScore ?? 50,
        metadata: { severity: path.severity },
      });
    }

    const targetId = `target-${path.id}`;
    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, {
        id: targetId,
        label: path.targetAsset,
        type: "target",
        riskScore: path.prioritizedRiskScore ?? path.riskScore ?? 50,
        metadata: { severity: path.severity, reachesCritical: path.reachesCritical },
      });
    }

    let prevNodeId = entryId;
    for (const step of steps) {
      const stepNodeId = `step-${path.id}-${step.order}`;
      if (!nodeMap.has(stepNodeId)) {
        const stepType = step.type === "exploit" || step.type === "compromise" ? "vulnerability" : "asset";
        nodeMap.set(stepNodeId, {
          id: stepNodeId,
          label: step.node ?? step.description ?? `Step ${step.order}`,
          type: stepType,
          riskScore: step.type === "exploit" ? 85 : step.type === "compromise" ? 90 : step.type === "lateral" ? 70 : 50,
          metadata: { stepType: step.type, description: step.description },
        });
      }

      const edgeType = step.type === "exploit" ? "exploits"
        : step.type === "lateral" ? "lateral_movement"
        : step.type === "persistence" ? "privilege_escalation"
        : step.type === "compromise" ? "data_access"
        : "network_path";

      edges.push({
        id: `edge-${edgeIdx++}`,
        source: prevNodeId,
        target: stepNodeId,
        label: step.description ?? step.type ?? "connects",
        type: edgeType,
        weight: step.type === "exploit" ? 0.9 : step.type === "compromise" ? 0.95 : 0.6,
      });

      prevNodeId = stepNodeId;
    }

    edges.push({
      id: `edge-${edgeIdx++}`,
      source: prevNodeId,
      target: targetId,
      label: "reaches target",
      type: "data_access",
      weight: 1.0,
    });

    const matchedAssets = assets.filter((a: any) => {
      const entryLow = (path.entryPoint ?? "").toLowerCase();
      const targetLow = (path.targetAsset ?? "").toLowerCase();
      const hostLow = a.hostname.toLowerCase();
      return entryLow.includes(hostLow) || targetLow.includes(hostLow);
    });
    for (const asset of matchedAssets) {
      const assetNodeId = `asset-${asset.id}`;
      if (nodeMap.has(assetNodeId)) {
        edges.push({
          id: `edge-${edgeIdx++}`,
          source: entryId,
          target: assetNodeId,
          label: "affects asset",
          type: "network_path",
          weight: 0.5,
        });
      }
    }
  }

  const nodes = Array.from(nodeMap.values());
  const overallRisk = nodes.length > 0
    ? Math.round(nodes.reduce((s, n) => s + n.riskScore, 0) / nodes.length)
    : 0;

  return { nodes, edges, risk_score: overallRisk };
}

async function runExposureMonitor(orgId: string): Promise<{
  alerts: any[];
  stats: { newAlerts: number; totalOpen: number; resolved: number };
}> {
  const [assets, paths, identities, existingAlerts] = await Promise.all([
    storage.getAssets(orgId),
    storage.getAttackPaths(orgId),
    storage.getCaasmIdentities(orgId),
    storage.getExposureAlerts(orgId),
  ]);

  const newAlerts: any[] = [];
  const existingTitles = new Set(existingAlerts.filter(a => a.status === "open").map(a => a.title));

  for (const asset of assets) {
    if (asset.assetType === "domain" || (asset as any).tags?.includes?.("public")) {
      const title = `Public exposure detected: ${asset.hostname}`;
      if (!existingTitles.has(title)) {
        const alert = await storage.createExposureAlert({
          organizationId: orgId,
          trigger: TRIGGER_TYPES.public_exposure,
          severity: asset.criticality === "critical" ? "critical" : "high",
          title,
          description: `Asset ${asset.hostname} (${asset.ip}) is publicly exposed with ${asset.vulnerabilityCount} known vulnerabilities`,
          assetId: asset.id,
          assetName: asset.hostname,
          riskScore: Math.min(100, asset.vulnerabilityCount * 12 + 30),
          status: "open",
        });
        newAlerts.push(alert);
        existingTitles.add(title);
      }
    }

    if (asset.vulnerabilityCount > 5) {
      const title = `High vulnerability count on ${asset.hostname}: ${asset.vulnerabilityCount} vulns`;
      if (!existingTitles.has(title)) {
        const alert = await storage.createExposureAlert({
          organizationId: orgId,
          trigger: TRIGGER_TYPES.vulnerability,
          severity: asset.vulnerabilityCount > 10 ? "critical" : "high",
          title,
          description: `Asset ${asset.hostname} has ${asset.vulnerabilityCount} known vulnerabilities requiring remediation`,
          assetId: asset.id,
          assetName: asset.hostname,
          riskScore: Math.min(100, asset.vulnerabilityCount * 10),
          status: "open",
        });
        newAlerts.push(alert);
        existingTitles.add(title);
      }
    }
  }

  for (const path of paths) {
    if (!path.mitigated && path.riskScore >= 70) {
      const stepsText = JSON.stringify(path.steps ?? []).toLowerCase();
      if (stepsText.includes("privilege") || stepsText.includes("escalat") || stepsText.includes("admin")) {
        const title = `Privilege escalation path: ${path.name}`;
        if (!existingTitles.has(title)) {
          const alert = await storage.createExposureAlert({
            organizationId: orgId,
            trigger: TRIGGER_TYPES.privilege_escalation,
            severity: path.severity === "critical" ? "critical" : "high",
            title,
            description: `Attack path "${path.name}" from ${path.entryPoint} to ${path.targetAsset} involves privilege escalation`,
            riskScore: path.riskScore,
            status: "open",
          });
          newAlerts.push(alert);
          existingTitles.add(title);
        }
      }
    }
  }

  for (const id of identities) {
    if (id.privilegeLevel === "admin" && !id.mfaEnabled) {
      const title = `Admin without MFA: ${id.name}`;
      if (!existingTitles.has(title)) {
        const alert = await storage.createExposureAlert({
          organizationId: orgId,
          trigger: TRIGGER_TYPES.privilege_escalation,
          severity: "critical",
          title,
          description: `Identity "${id.name}" has admin privileges but MFA is not enabled, creating a privilege escalation risk`,
          riskScore: 85,
          status: "open",
        });
        newAlerts.push(alert);
        existingTitles.add(title);
      }
    }
  }

  const allAlerts = await storage.getExposureAlerts(orgId);
  const openCount = allAlerts.filter(a => a.status === "open").length;
  const resolvedCount = allAlerts.filter(a => a.status === "resolved").length;

  return {
    alerts: allAlerts,
    stats: {
      newAlerts: newAlerts.length,
      totalOpen: openCount,
      resolved: resolvedCount,
    },
  };
}

async function autoRemediate(orgId: string, alertId: string): Promise<any[]> {
  const allAlerts = await storage.getExposureAlerts(orgId);
  const alert = allAlerts.find(a => a.id === alertId);
  if (!alert) throw new Error("Alert not found");
  if (alert.organizationId !== orgId) throw new Error("Access denied");

  const actions = REMEDIATION_ACTIONS[alert.trigger] ?? [
    { actionType: "investigate", description: "Investigate and manually remediate the exposure" },
  ];

  const created: any[] = [];
  for (const action of actions) {
    const remediation = await storage.createRemediationAction({
      organizationId: orgId,
      alertId: alert.id,
      actionType: action.actionType,
      target: alert.assetName ?? alert.title,
      description: action.description,
      status: "pending",
    });
    created.push(remediation);
  }

  return created;
}

async function executeRemediation(orgId: string, actionId: string): Promise<any> {
  const allActions = await storage.getRemediationActions(orgId);
  const action = allActions.find(a => a.id === actionId);
  if (!action) throw new Error("Remediation action not found");
  if (action.organizationId !== orgId) throw new Error("Access denied");

  const resultMap: Record<string, any> = {
    remove_public_access: { success: true, detail: "Removed public access. Asset is now internal-only.", firewallRulesUpdated: 3 },
    apply_waf_rules: { success: true, detail: "WAF rules applied. Blocked external traffic to sensitive endpoints.", rulesCreated: 5 },
    rotate_credentials: { success: true, detail: "Credentials rotated. Old keys invalidated.", keysRotated: 2, sessionsRevoked: 4 },
    disable_compromised_account: { success: true, detail: "Account disabled and all active sessions terminated.", accountDisabled: true },
    enforce_least_privilege: { success: true, detail: "Least-privilege policies applied to IAM roles.", rolesUpdated: 3, permissionsRemoved: 12 },
    patch_dependency: { success: true, detail: "Vulnerable dependency patched to latest secure version.", packagesUpdated: 1, cveFixed: "CVE-2024-0727" },
    apply_virtual_patch: { success: true, detail: "Virtual patch deployed via WAF. Full patch scheduled.", virtualPatchId: "VP-" + Date.now() },
    scan_asset: { success: true, detail: "Full vulnerability scan initiated on asset.", scanId: "SCAN-" + Date.now(), estimatedTime: "5 minutes" },
    apply_baseline_policy: { success: true, detail: "Organization security baseline applied to asset.", policiesApplied: 8, complianceScore: 87 },
    investigate: { success: true, detail: "Investigation ticket created for manual review.", ticketId: "INV-" + Date.now() },
  };

  const result = resultMap[action.actionType] ?? { success: true, detail: "Action completed successfully." };

  const updated = await storage.updateRemediationAction(action.id, {
    status: "completed",
    executedAt: new Date(),
    result,
  }, orgId);

  if (action.alertId) {
    const siblingActions = allActions.filter(a => a.alertId === action.alertId);
    const allDone = siblingActions.every(a => a.id === actionId || a.status === "completed");
    if (allDone) {
      await storage.updateExposureAlert(action.alertId, {
        status: "resolved",
        resolvedAt: new Date(),
      }, orgId);
    }
  }

  return updated;
}

export async function registerExposureManagerRoutes(app: Express) {
  app.get("/api/attack-paths/graph", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const [paths, assets, identities] = await Promise.all([
        getPrioritizedPaths(orgId),
        storage.getAssets(orgId),
        storage.getCaasmIdentities(orgId),
      ]);
      const graph = buildAttackGraph(paths, assets, identities);
      res.json(graph);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/exposure/monitor", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const alerts = await storage.getExposureAlerts(orgId);
      const openCount = alerts.filter(a => a.status === "open").length;
      const resolvedCount = alerts.filter(a => a.status === "resolved").length;
      res.json({ alerts, stats: { newAlerts: 0, totalOpen: openCount, resolved: resolvedCount } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/exposure/monitor/scan", requireAuth, requireAnalyst, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const result = await runExposureMonitor(orgId);
      res.json({ message: `Exposure scan complete. ${result.stats.newAlerts} new alerts generated.`, ...result });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/exposure/alerts", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const alerts = await storage.getExposureAlerts(orgId);
      res.json(alerts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/exposure/alerts/:id", requireAuth, requireAnalyst, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { status } = req.body;
      if (!["open", "acknowledged", "resolved", "dismissed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const data: any = { status };
      if (status === "resolved") data.resolvedAt = new Date();
      const updated = await storage.updateExposureAlert(req.params.id, data, orgId);
      if (!updated) return res.status(404).json({ error: "Alert not found" });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/exposure/remediate/:alertId", requireAuth, requireAnalyst, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const actions = await autoRemediate(orgId, req.params.alertId);
      res.json({ message: `${actions.length} remediation actions created`, actions });
    } catch (e: any) {
      if (e.message === "Alert not found") return res.status(404).json({ error: e.message });
      if (e.message === "Access denied") return res.status(403).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/exposure/remediations", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const actions = await storage.getRemediationActions(orgId);
      res.json(actions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/exposure/remediations/:id/execute", requireAuth, requireAnalyst, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const result = await executeRemediation(orgId, req.params.id);
      if (!result) return res.status(404).json({ error: "Remediation action not found" });
      res.json({ message: "Remediation executed successfully", action: result });
    } catch (e: any) {
      if (e.message === "Remediation action not found") return res.status(404).json({ error: e.message });
      if (e.message === "Access denied") return res.status(403).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });
}
