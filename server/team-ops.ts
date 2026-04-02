import { storage } from "./storage";
import type { Express, Request, Response } from "express";
import { requireAuth } from "./auth";

const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  owner: {
    team: ["view", "invite", "remove", "change_role"],
    scans: ["view", "create", "delete"],
    incidents: ["view", "create", "update", "assign", "close"],
    playbooks: ["view", "create", "execute", "delete"],
    policies: ["view", "create", "update", "delete"],
    approvals: ["view", "approve", "reject", "create"],
    reports: ["view", "create", "export"],
    settings: ["view", "update"],
    billing: ["view", "update"],
    audit: ["view", "export"],
    oncall: ["view", "create", "delete"],
  },
  admin: {
    team: ["view", "invite", "remove", "change_role"],
    scans: ["view", "create", "delete"],
    incidents: ["view", "create", "update", "assign", "close"],
    playbooks: ["view", "create", "execute", "delete"],
    policies: ["view", "create", "update", "delete"],
    approvals: ["view", "approve", "reject", "create"],
    reports: ["view", "create", "export"],
    settings: ["view", "update"],
    billing: [],
    audit: ["view", "export"],
    oncall: ["view", "create", "delete"],
  },
  analyst: {
    team: ["view"],
    scans: ["view", "create"],
    incidents: ["view", "create", "update"],
    playbooks: ["view", "execute"],
    policies: ["view"],
    approvals: ["view", "create"],
    reports: ["view", "create"],
    settings: ["view"],
    billing: [],
    audit: ["view"],
    oncall: ["view"],
  },
  viewer: {
    team: ["view"],
    scans: ["view"],
    incidents: ["view"],
    playbooks: ["view"],
    policies: ["view"],
    approvals: ["view"],
    reports: ["view"],
    settings: [],
    billing: [],
    audit: [],
    oncall: ["view"],
  },
};

const seededOrgs = new Set<string>();

async function ensureTeamOpsSeeded(orgId: string) {
  if (seededOrgs.has(orgId)) return;
  seededOrgs.add(orgId);

  const activities = await storage.getTeamActivities(orgId, 1);
  if (activities.length > 0) return;

  const now = new Date();
  const seedActivities = [
    { action: "scan.triggered", resourceType: "scan", userName: "Sarah Chen", details: { scanType: "semgrep", target: "api-gateway" } },
    { action: "incident.created", resourceType: "incident", userName: "Marcus Rodriguez", details: { severity: "critical", title: "Unauthorized API access detected" } },
    { action: "playbook.executed", resourceType: "soar", userName: "System", details: { playbook: "Isolate Compromised Host", status: "completed" } },
    { action: "asset.discovered", resourceType: "caasm", userName: "System", details: { hostname: "staging-db-02", assetType: "database" } },
    { action: "incident.assigned", resourceType: "incident", userName: "Sarah Chen", details: { assignee: "Marcus Rodriguez", incident: "INC-2024-0142" } },
    { action: "policy.updated", resourceType: "escalation", userName: "Admin User", details: { policy: "Critical Alert Escalation", change: "timeout reduced to 5 min" } },
    { action: "approval.requested", resourceType: "approval", userName: "Marcus Rodriguez", details: { actionType: "playbook_execution", playbook: "Rotate All API Keys" } },
    { action: "vulnerability.patched", resourceType: "vulnerability", userName: "DevOps Bot", details: { cve: "CVE-2024-0727", asset: "web-prod-01" } },
    { action: "oncall.rotated", resourceType: "oncall", userName: "System", details: { from: "Sarah Chen", to: "Marcus Rodriguez" } },
    { action: "credential.rotated", resourceType: "secrets", userName: "System", details: { scope: "production API keys", count: 4 } },
    { action: "scan.completed", resourceType: "scan", userName: "System", details: { scanType: "trivy", findings: 12, critical: 2 } },
    { action: "incident.resolved", resourceType: "incident", userName: "Sarah Chen", details: { title: "SQL injection on /api/search", resolution: "Input validation added" } },
    { action: "team.member_invited", resourceType: "team", userName: "Admin User", details: { email: "analyst@company.com", role: "analyst" } },
    { action: "report.generated", resourceType: "report", userName: "System", details: { type: "SOC2 Compliance", pages: 24 } },
    { action: "alert.escalated", resourceType: "escalation", userName: "System", details: { alert: "Brute force detected", escalatedTo: "Security Lead" } },
  ];

  for (let i = 0; i < seedActivities.length; i++) {
    const a = seedActivities[i];
    await storage.createTeamActivity({
      organizationId: orgId,
      userId: null,
      userName: a.userName,
      action: a.action,
      resourceType: a.resourceType,
      details: a.details,
    });
  }

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const schedules = [
    { userName: "Sarah Chen", userId: "user-1", label: "Primary On-Call", dayOffset: 0, duration: 2 },
    { userName: "Marcus Rodriguez", userId: "user-2", label: "Primary On-Call", dayOffset: 2, duration: 2 },
    { userName: "Admin User", userId: "user-3", label: "Primary On-Call", dayOffset: 4, duration: 3 },
    { userName: "Sarah Chen", userId: "user-1", label: "Secondary On-Call", dayOffset: 2, duration: 5 },
  ];
  for (const s of schedules) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + s.dayOffset);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + s.duration);
    end.setHours(8, 0, 0, 0);
    await storage.createOncallSchedule({
      organizationId: orgId,
      userId: s.userId,
      userName: s.userName,
      startTime: start,
      endTime: end,
      label: s.label,
    });
  }

  const policies = [
    {
      name: "Critical Alert Escalation",
      description: "Escalate unacknowledged critical alerts to the security lead after 10 minutes",
      conditions: { severity: "critical", unacknowledgedMinutes: 10 },
      actions: { escalateTo: "security_lead", notifyChannel: "slack", createIncident: true },
    },
    {
      name: "High Severity Timeout",
      description: "Escalate high severity alerts to manager after 30 minutes without response",
      conditions: { severity: "high", unacknowledgedMinutes: 30 },
      actions: { escalateTo: "manager", notifyChannel: "email", createIncident: false },
    },
    {
      name: "Failed Playbook Escalation",
      description: "Notify SOC lead when automated playbook execution fails",
      conditions: { eventType: "playbook_failure", consecutive: 2 },
      actions: { escalateTo: "soc_lead", notifyChannel: "pagerduty", createIncident: true },
    },
  ];
  for (const p of policies) {
    await storage.createEscalationPolicy({
      organizationId: orgId,
      name: p.name,
      description: p.description,
      conditions: p.conditions,
      actions: p.actions,
      enabled: true,
    });
  }

  const approvals = [
    {
      requesterName: "Marcus Rodriguez", requesterId: "user-2",
      actionType: "playbook_execution",
      actionDetails: { playbook: "Rotate All API Keys", scope: "production", affectedAssets: 12 },
      status: "pending",
    },
    {
      requesterName: "Sarah Chen", requesterId: "user-1",
      actionType: "policy_change",
      actionDetails: { policy: "WAF Rules", change: "Disable rate limiting for /api/webhook", reason: "Partner integration testing" },
      status: "pending",
    },
    {
      requesterName: "DevOps Bot", requesterId: "system",
      actionType: "credential_rotation",
      actionDetails: { scope: "Database credentials", environment: "staging", scheduledFor: "2026-03-15T02:00:00Z" },
      status: "approved", approverName: "Admin User", approverId: "user-3",
    },
  ];
  for (const a of approvals) {
    await storage.createApprovalRequest({
      organizationId: orgId,
      requesterId: a.requesterId,
      requesterName: a.requesterName,
      actionType: a.actionType,
      actionDetails: a.actionDetails,
      status: a.status,
      approverId: a.approverId ?? null,
      approverName: a.approverName ?? null,
      reason: null,
    });
  }
}

function getSessionUser(req: Request) {
  return {
    id: req.user?.userId ?? "unknown",
    name: "User",
    role: req.user?.role ?? "analyst",
  };
}

function hasPermission(role: string, module: string, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;
  return (perms[module] ?? []).includes(action);
}

export async function registerTeamOpsRoutes(app: Express) {
  app.get("/api/team-ops/permissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getSessionUser(req);
      const role = user.role;
      res.json({
        role,
        permissions: ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer,
        allRoles: Object.keys(ROLE_PERMISSIONS),
        allModules: Object.keys(ROLE_PERMISSIONS.owner),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/team-ops/permissions/matrix", requireAuth, async (req: Request, res: Response) => {
    res.json(ROLE_PERMISSIONS);
  });

  app.get("/api/team-ops/activity", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const activities = await storage.getTeamActivities(orgId, limit);
      res.json(activities);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/team-ops/activity", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      const activity = await storage.createTeamActivity({
        organizationId: orgId,
        userId: user.id,
        userName: user.name,
        action: req.body.action,
        resourceType: req.body.resourceType,
        resourceId: req.body.resourceId ?? null,
        details: req.body.details ?? null,
      });
      res.json(activity);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/team-ops/comments/:incidentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const comments = await storage.getIncidentComments(orgId, req.params.incidentId);
      res.json(comments);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/team-ops/comments/:incidentId", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      if (!req.body.message || typeof req.body.message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      const comment = await storage.createIncidentComment({
        organizationId: orgId,
        incidentId: req.params.incidentId,
        authorId: user.id,
        authorName: user.name,
        parentId: req.body.parentId ?? null,
        message: req.body.message,
      });
      await storage.createTeamActivity({
        organizationId: orgId,
        userId: user.id,
        userName: user.name,
        action: "comment.added",
        resourceType: "incident",
        resourceId: req.params.incidentId,
        details: { preview: req.body.message.slice(0, 100) },
      });
      res.json(comment);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/team-ops/comments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteIncidentComment(req.params.id, req.user!.organizationId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/team-ops/oncall", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const schedules = await storage.getOncallSchedules(orgId);
      const now = new Date();
      const current = schedules.find(s => new Date(s.startTime) <= now && new Date(s.endTime) >= now && s.label === "Primary On-Call");
      res.json({ schedules, currentOnCall: current ?? null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/team-ops/oncall", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "oncall", "create")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      const schedule = await storage.createOncallSchedule({
        organizationId: orgId,
        userId: req.body.userId,
        userName: req.body.userName,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        label: req.body.label ?? "Primary On-Call",
      });
      res.json(schedule);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/team-ops/oncall/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "oncall", "delete")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      await storage.deleteOncallSchedule(req.params.id, req.user!.organizationId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/team-ops/escalation", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      res.json(await storage.getEscalationPolicies(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/team-ops/escalation", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "policies", "create")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      const policy = await storage.createEscalationPolicy({
        organizationId: orgId,
        name: req.body.name,
        description: req.body.description ?? null,
        conditions: req.body.conditions,
        actions: req.body.actions,
        enabled: req.body.enabled ?? true,
      });
      res.json(policy);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/team-ops/escalation/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "policies", "update")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      const existing = (await storage.getEscalationPolicies(orgId)).find(p => p.id === req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateEscalationPolicy(req.params.id, {
        name: req.body.name,
        description: req.body.description,
        conditions: req.body.conditions,
        actions: req.body.actions,
        enabled: req.body.enabled,
      });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/team-ops/escalation/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "policies", "delete")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      await storage.deleteEscalationPolicy(req.params.id, req.user!.organizationId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/team-ops/approvals", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      res.json(await storage.getApprovalRequests(orgId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/team-ops/approvals", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      if (!hasPermission(user.role, "approvals", "create")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      const approval = await storage.createApprovalRequest({
        organizationId: orgId,
        requesterId: user.id,
        requesterName: user.name,
        actionType: req.body.actionType,
        actionDetails: req.body.actionDetails,
        status: "pending",
        approverId: null,
        approverName: null,
        reason: null,
      });
      await storage.createTeamActivity({
        organizationId: orgId,
        userId: user.id,
        userName: user.name,
        action: "approval.requested",
        resourceType: "approval",
        resourceId: approval.id,
        details: { actionType: req.body.actionType },
      });
      res.json(approval);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/team-ops/approvals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const user = getSessionUser(req);
      const status = req.body.status;
      if (status !== "approved" && status !== "rejected") {
        return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
      }
      if (status === "approved" && !hasPermission(user.role, "approvals", "approve")) {
        return res.status(403).json({ error: "Insufficient permissions to approve" });
      }
      if (status === "rejected" && !hasPermission(user.role, "approvals", "reject")) {
        return res.status(403).json({ error: "Insufficient permissions to reject" });
      }
      const existing = (await storage.getApprovalRequests(orgId)).find(a => a.id === req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateApprovalRequest(req.params.id, {
        status,
        approverId: user.id,
        approverName: user.name,
        reason: req.body.reason ?? null,
        resolvedAt: new Date(),
      });
      if (!updated) return res.status(404).json({ message: "Not found" });
      await storage.createTeamActivity({
        organizationId: orgId,
        userId: user.id,
        userName: user.name,
        action: `approval.${status}`,
        resourceType: "approval",
        resourceId: req.params.id,
        details: { reason: req.body.reason },
      });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
