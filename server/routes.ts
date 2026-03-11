import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { runScanSimulation } from "./scan-worker";
import { generateReport } from "./report-generator";
import { runPentestSimulation, runCloudScanSimulation, refreshThreatIntel } from "./simulations";
import {
  insertPentestSessionSchema,
  insertCloudScanTargetSchema,
  insertAlertRuleSchema,
  insertPipelineConfigSchema,
  insertThreatIntelItemSchema,
  insertMonitoringConfigSchema,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    organizationId: string;
    role: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

async function logAudit(orgId: string, userId: string, action: string, resourceType?: string, resourceId?: string, details?: any, ipAddress?: string) {
  try {
    await storage.createAuditLog({ organizationId: orgId, userId, action, resourceType, resourceId, details, ipAddress });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "sentinel-forge-secret-key-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, fullName, organizationName } = req.body;

      if (!username || !email || !password || !fullName || !organizationName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const org = await storage.createOrganization({
        name: organizationName,
        slug,
        plan: "starter",
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        organizationId: org.id,
        username,
        email,
        password: hashedPassword,
        fullName,
        role: "owner",
      });

      await seedComplianceData(org.id);

      req.session.userId = user.id;
      req.session.organizationId = org.id;
      req.session.role = user.role;

      await logAudit(org.id, user.id, "user.register", "user", user.id, { username }, req.ip);

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        organization: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
      });
    } catch (err: any) {
      console.error("Register error:", err);
      return res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const org = await storage.getOrganization(user.organizationId);

      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;

      await logAudit(user.organizationId, user.id, "user.login", "user", user.id, { username }, req.ip);

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        organization: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : undefined,
      });
    } catch (err: any) {
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const org = await storage.getOrganization(user.organizationId);

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      organization: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : undefined,
    });
  });

  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const allScans = await storage.getScans(orgId);
      const allFindings = await storage.getFindingsByOrg(orgId);
      const mappings = await storage.getComplianceMappings(orgId);

      const activeScans = allScans.filter((s) => s.status === "running").length;
      const resolvedFindings = allFindings.filter((f) => f.isResolved).length;
      const criticalFindings = allFindings.filter((f) => f.severity === "critical" && !f.isResolved).length;
      const highFindings = allFindings.filter((f) => f.severity === "high" && !f.isResolved).length;
      const mediumFindings = allFindings.filter((f) => f.severity === "medium" && !f.isResolved).length;
      const lowFindings = allFindings.filter((f) => f.severity === "low" && !f.isResolved).length;
      const totalFindings = allFindings.length;

      const completedScans = allScans.filter((s) => s.status === "completed");
      const securityScore = completedScans.length > 0
        ? Math.round(completedScans.reduce((acc, s) => acc + (s.securityScore || 0), 0) / completedScans.length)
        : 85;

      const frameworks = ["SOC2", "HIPAA", "ISO27001", "PCI-DSS", "FedRAMP", "GDPR"];
      const complianceCoverage = frameworks.map((fw) => {
        const fwMappings = mappings.filter((m) => m.framework === fw);
        const avg = fwMappings.length > 0
          ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
          : 0;
        return {
          framework: fw,
          coverage: avg,
          status: avg >= 80 ? "compliant" : avg >= 50 ? "partial" : "non-compliant",
        };
      });
      const complianceScore = complianceCoverage.length > 0
        ? Math.round(complianceCoverage.reduce((a, c) => a + c.coverage, 0) / complianceCoverage.length)
        : 0;

      const scansByTool = [
        { tool: "Semgrep", count: allScans.filter((s) => s.scanType === "semgrep").length, color: "#3b82f6" },
        { tool: "Trivy", count: allScans.filter((s) => s.scanType === "trivy").length, color: "#8b5cf6" },
        { tool: "Bandit", count: allScans.filter((s) => s.scanType === "bandit").length, color: "#f97316" },
        { tool: "OWASP ZAP", count: allScans.filter((s) => s.scanType === "zap").length, color: "#10b981" },
      ];

      const today = new Date();
      const findingsTrend = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const dayFindings = allFindings.filter((f) => {
          const fDate = new Date(f.createdAt);
          return fDate.toDateString() === d.toDateString();
        });
        return {
          date: dateStr,
          critical: dayFindings.filter((f) => f.severity === "critical").length,
          high: dayFindings.filter((f) => f.severity === "high").length,
          medium: dayFindings.filter((f) => f.severity === "medium").length,
          low: dayFindings.filter((f) => f.severity === "low").length,
        };
      });

      const recentScans = allScans.slice(0, 5);
      const criticalIssues = allFindings
        .filter((f) => f.severity === "critical" && !f.isResolved)
        .slice(0, 5);

      // T002: Enhanced dashboard stats
      const pentestSessions = await storage.getPentestSessions(orgId);
      const cloudTargets = await storage.getCloudScanTargets(orgId);
      const cloudResults = await storage.getCloudScanResults(orgId);
      const threatIntel = await storage.getThreatIntelItems(orgId);
      const monitors = await storage.getMonitoringConfigs(orgId);

      const pentestStats = {
        sessions: pentestSessions.length,
        criticalFindings: (await Promise.all(pentestSessions.map(s => storage.getPentestFindings(s.id))))
          .flat()
          .filter(f => f.severity === "critical").length
      };

      const cloudStats = {
        targets: cloudTargets.length,
        criticalMisconfigs: cloudResults.filter(r => r.severity === "critical" && r.status === "open").length
      };

      const threatIntelStats = {
        activeThreats: threatIntel.filter(t => t.status === "active").length,
        criticalCVEs: threatIntel.filter(t => t.severity === "critical" || t.severity === "high").length
      };

      const monitoringActive = monitors.some(m => m.isEnabled);

      return res.json({
        totalScans: allScans.length,
        activeScans,
        totalFindings,
        resolvedFindings,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        securityScore,
        complianceScore,
        recentScans,
        criticalIssues,
        findingsTrend,
        complianceCoverage,
        scansByTool,
        pentestStats,
        cloudStats,
        threatIntelStats,
        monitoringActive
      });
    } catch (err: any) {
      console.error("Dashboard error:", err);
      return res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  app.get("/api/scans", requireAuth, async (req: Request, res: Response) => {
    const orgScans = await storage.getScans(req.session.organizationId!);
    return res.json(orgScans);
  });

  app.get("/api/scans/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const scan = await storage.getScan(id, req.session.organizationId!);
    if (!scan) return res.status(404).json({ message: "Scan not found" });
    return res.json(scan);
  });

  app.get("/api/scans/:id/findings", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const scan = await storage.getScan(id, req.session.organizationId!);
    if (!scan) return res.status(403).json({ message: "Access denied" });
    const findings = await storage.getScanFindings(id);
    return res.json(findings);
  });

  app.post("/api/scans", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { name, scanType, targetType, targetId, targetName } = req.body;

      if (!scanType) {
        return res.status(400).json({ message: "Scan type is required" });
      }

      const scan = await storage.createScan({
        organizationId: orgId,
        name: name || `${scanType.toUpperCase()} Scan`,
        scanType,
        status: "pending",
        targetType: targetType || "repository",
        targetId: targetId || null,
        targetName: targetName || null,
        initiatedById: userId,
        progress: 0,
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
      });

      runScanSimulation(scan.id, orgId, scanType);
      await logAudit(orgId, userId, "scan.create", "scan", scan.id, { scanType, name: scan.name }, req.ip);

      return res.json(scan);
    } catch (err: any) {
      console.error("Create scan error:", err);
      return res.status(500).json({ message: "Failed to create scan" });
    }
  });

  app.get("/api/compliance", requireAuth, async (req: Request, res: Response) => {
    const mappings = await storage.getComplianceMappings(req.session.organizationId!);
    return res.json(mappings);
  });

  app.get("/api/reports", requireAuth, async (req: Request, res: Response) => {
    const orgReports = await storage.getReports(req.session.organizationId!);
    return res.json(orgReports);
  });

  app.get("/api/reports/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await storage.getReport(id, req.session.organizationId!);
    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.json(report);
  });

  app.post("/api/reports", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { title, frameworks } = req.body;

      const report = await storage.createReport({
        organizationId: orgId,
        title: title || `Security Audit Report - ${new Date().toLocaleDateString()}`,
        status: "generating",
        frameworks: frameworks || ["SOC2", "HIPAA"],
        generatedById: userId,
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      });

      generateReport(report.id, orgId, frameworks || ["SOC2", "HIPAA"]);
      await logAudit(orgId, userId, "report.create", "report", report.id, { title: report.title }, req.ip);

      return res.json(report);
    } catch (err: any) {
      console.error("Create report error:", err);
      return res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.get("/api/reports/:id/export/pdf", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await storage.getReport(id, req.session.organizationId!);
    if (!report) return res.status(404).json({ message: "Report not found" });

    const pdfContent = generatePDFContent(report);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "_")}.pdf"`);
    res.send(pdfContent);
  });

  app.get("/api/repositories", requireAuth, async (req: Request, res: Response) => {
    const repos = await storage.getRepositories(req.session.organizationId!);
    return res.json(repos);
  });

  app.post("/api/repositories", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { provider, name, fullName, url, branch } = req.body;

      if (!name || !url) {
        return res.status(400).json({ message: "Name and URL are required" });
      }

      const repo = await storage.createRepository({
        organizationId: orgId,
        name,
        fullName: fullName || name,
        provider: provider || "github",
        url,
        branch: branch || "main",
      });

      await logAudit(orgId, req.session.userId!, "repository.create", "repository", repo.id, { name, provider }, req.ip);
      return res.json(repo);
    } catch (err: any) {
      console.error("Create repo error:", err);
      return res.status(500).json({ message: "Failed to add repository" });
    }
  });

  app.delete("/api/repositories/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteRepository(id, req.session.organizationId!);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/documents", requireAuth, async (req: Request, res: Response) => {
    const docs = await storage.getDocuments(req.session.organizationId!);
    return res.json(docs);
  });

  app.post("/api/documents", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const userId = req.session.userId!;
      const { name, type, size } = req.body;

      const doc = await storage.createDocument({
        organizationId: orgId,
        name,
        type,
        size,
        uploadedById: userId,
        status: "ready",
      });

      return res.json(doc);
    } catch (err: any) {
      console.error("Upload doc error:", err);
      return res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await logAudit(req.session.organizationId!, req.session.userId!, "document.delete", "document", id, null, req.ip);
    await storage.deleteDocument(id, req.session.organizationId!);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/settings", requireAuth, async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const allSettings = await storage.getSettings(req.session.organizationId!, category);
    return res.json(allSettings);
  });

  app.put("/api/settings", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { category, key, value } = req.body;
      if (!category || !key) {
        return res.status(400).json({ message: "Category and key are required" });
      }
      const setting = await storage.upsertSetting({ organizationId: orgId, category, key, value });
      await logAudit(orgId, req.session.userId!, "settings.update", "setting", setting.id, { category, key }, req.ip);
      return res.json(setting);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to save setting" });
    }
  });

  app.get("/api/audit-logs", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.session.organizationId!);
    return res.json(logs);
  });

  app.get("/api/reports/:id/export/csv", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await storage.getReport(id, req.session.organizationId!);
    if (!report) return res.status(404).json({ message: "Report not found" });

    const findings = await storage.getFindingsByOrg(req.session.organizationId!);
    const mappings = await storage.getComplianceMappings(req.session.organizationId!);

    function csvSafe(val: string): string {
      let s = (val || "").replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s}"`;
    }

    const lines: string[] = [];
    lines.push("Section,Field,Value");
    lines.push(`Summary,Title,${csvSafe(report.title || "")}`);
    lines.push(`Summary,Security Score,${report.securityScore || "N/A"}`);
    lines.push(`Summary,Total Vulnerabilities,${report.totalVulnerabilities}`);
    lines.push(`Summary,Critical,${report.criticalCount}`);
    lines.push(`Summary,High,${report.highCount}`);
    lines.push(`Summary,Medium,${report.mediumCount}`);
    lines.push(`Summary,Low,${report.lowCount}`);
    lines.push("");
    lines.push("Title,Severity,Category,File,Remediation,Compliance Frameworks");
    findings.forEach((f) => {
      lines.push(`${csvSafe(f.title)},${f.severity},${csvSafe(f.category || "")},${csvSafe(f.filePath || "")},${csvSafe(f.remediation || "")},${csvSafe((f.complianceFrameworks || []).join("; "))}`);
    });
    lines.push("");
    lines.push("Framework,Coverage %,Status");
    const frameworks = ["SOC2", "HIPAA", "ISO27001", "PCI-DSS", "FedRAMP", "GDPR"];
    frameworks.forEach((fw) => {
      const fwMappings = mappings.filter((m) => m.framework === fw);
      const avg = fwMappings.length > 0 ? Math.round(fwMappings.reduce((a, m) => a + m.coverage, 0) / fwMappings.length) : 0;
      const status = avg >= 80 ? "compliant" : avg >= 50 ? "partial" : "non-compliant";
      lines.push(`${fw},${avg},${status}`);
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${report.title?.replace(/\s+/g, "_") || "report"}.csv"`);
    res.send(lines.join("\n"));
  });

  // === API KEY MANAGEMENT ===
  app.get("/api/api-keys", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const keys = await storage.getApiKeys(req.session.organizationId!);
    return res.json(keys.map((k) => ({ ...k, keyHash: undefined })));
  });

  app.post("/api/api-keys", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { name, permissions, expiresInDays } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      const rawKey = `sf_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 10);

      let expiresAt: Date | null = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      const apiKey = await storage.createApiKey({
        organizationId: orgId,
        name,
        keyHash,
        keyPrefix,
        permissions: permissions || ["read:scans", "read:reports"],
        expiresAt: expiresAt ? expiresAt : undefined,
        isActive: true,
        createdById: req.session.userId!,
      });

      await logAudit(orgId, req.session.userId!, "apikey.create", "api_key", apiKey.id, { name }, req.ip);
      return res.json({ ...apiKey, keyHash: undefined, rawKey });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await logAudit(req.session.organizationId!, req.session.userId!, "apikey.revoke", "api_key", id, null, req.ip);
    await storage.deleteApiKey(id, req.session.organizationId!);
    return res.json({ message: "API key revoked" });
  });

  app.post("/api/api-keys/:id/regenerate", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await storage.getApiKey(id, req.session.organizationId!);
      if (!existing) return res.status(404).json({ message: "API key not found" });

      const rawKey = `sf_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 10);

      await storage.updateApiKey(id, { keyHash, keyPrefix });
      await logAudit(req.session.organizationId!, req.session.userId!, "apikey.regenerate", "api_key", id, null, req.ip);
      return res.json({ rawKey, keyPrefix });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to regenerate key" });
    }
  });

  // === BILLING & SUBSCRIPTIONS ===
  const PLAN_DETAILS: Record<string, any> = {
    starter: { name: "Starter", price: 0, maxUsers: 5, maxScansPerMonth: 50, maxRepositories: 10, features: ["Basic scanning", "3 compliance frameworks", "Email support", "Community access"] },
    professional: { name: "Professional", price: 99, maxUsers: 25, maxScansPerMonth: 500, maxRepositories: 50, features: ["All scan tools", "All compliance frameworks", "Priority support", "API access", "SSO integration", "Advanced analytics", "CSV/PDF export"] },
    enterprise: { name: "Enterprise", price: 499, maxUsers: -1, maxScansPerMonth: -1, maxRepositories: -1, features: ["Unlimited everything", "All compliance frameworks", "Dedicated support", "SSO & SAML", "Custom integrations", "SLA guarantee", "Multi-region deployment", "Audit log export", "Advanced RBAC"] },
  };

  app.get("/api/billing/plans", requireAuth, async (_req: Request, res: Response) => {
    return res.json(Object.entries(PLAN_DETAILS).map(([key, val]) => ({ id: key, ...val })));
  });

  app.get("/api/billing/subscription", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.session.organizationId!;
    let sub = await storage.getSubscription(orgId);
    if (!sub) {
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      sub = await storage.createSubscription({
        organizationId: orgId,
        plan: "starter",
        status: "active",
        maxUsers: 5,
        maxScansPerMonth: 50,
        maxRepositories: 10,
        features: PLAN_DETAILS.starter.features,
        currentPeriodEnd: periodEnd,
      });
    }
    return res.json(sub);
  });

  app.put("/api/billing/subscription", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { plan } = req.body;
      if (!plan || !PLAN_DETAILS[plan]) return res.status(400).json({ message: "Invalid plan" });

      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const sub = await storage.updateSubscription(orgId, {
        plan,
        maxUsers: PLAN_DETAILS[plan].maxUsers,
        maxScansPerMonth: PLAN_DETAILS[plan].maxScansPerMonth,
        maxRepositories: PLAN_DETAILS[plan].maxRepositories,
        features: PLAN_DETAILS[plan].features,
        currentPeriodEnd: periodEnd,
      });

      await logAudit(orgId, req.session.userId!, "billing.subscription_update", "subscription", undefined, { plan }, req.ip);
      return res.json(sub);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // === ANALYTICS & INSIGHTS ===
  app.get("/api/analytics/overview", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const findings = await storage.getFindingsByOrg(orgId);
      const open = findings.filter((f) => !f.isResolved);

      return res.json({
        remediationVelocity: "4.2 days",
        vulnerabilityDensity: (findings.length / 10).toFixed(1),
        riskScore: Math.max(0, 100 - (open.filter(f => f.severity === 'critical').length * 15 + open.filter(f => f.severity === 'high').length * 5)),
        attackSurfaceCoverage: "92%",
        breakdown: {
          infrastructure: Math.round(open.length * 0.3),
          application: Math.round(open.length * 0.7),
        },
      });
    } catch (err: any) {
      console.error("Analytics error:", err);
      return res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // === MULTI-REGION DEPLOYMENT ===
  app.get("/api/deployment/regions", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.session.organizationId!;
    const config = await storage.getSetting(orgId, "deployment", "regions");
    const savedConfig = (config?.value as any) || {};

    const regions = [
      { id: "us-east-1", name: "US East (Virginia)", latency: "12ms", status: savedConfig["us-east-1"] || "active" },
      { id: "us-west-2", name: "US West (Oregon)", latency: "45ms", status: savedConfig["us-west-2"] || "standby" },
      { id: "eu-west-1", name: "EU West (Ireland)", latency: "89ms", status: savedConfig["eu-west-1"] || "standby" },
      { id: "eu-central-1", name: "EU Central (Frankfurt)", latency: "95ms", status: savedConfig["eu-central-1"] || "disabled" },
      { id: "ap-southeast-1", name: "AP Southeast (Singapore)", latency: "180ms", status: savedConfig["ap-southeast-1"] || "disabled" },
      { id: "ap-northeast-1", name: "AP Northeast (Tokyo)", latency: "165ms", status: savedConfig["ap-northeast-1"] || "disabled" },
    ];
    return res.json(regions);
  });

  app.put("/api/deployment/config", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { regions, primaryRegion, failoverEnabled, rateLimit } = req.body;

      if (regions) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "regions", value: regions });
      if (primaryRegion) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "primaryRegion", value: primaryRegion });
      if (failoverEnabled !== undefined) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "failoverEnabled", value: failoverEnabled });
      if (rateLimit) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "rate_limit", value: rateLimit });

      await logAudit(orgId, req.session.userId!, "deployment.config_update", "deployment", undefined, { primaryRegion, failoverEnabled }, req.ip);
      return res.json({ message: "Deployment configuration updated" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update deployment config" });
    }
  });

  // === ENHANCED AUDIT LOGS ===
  app.get("/api/audit-logs/export", requireAuth, requireRole("owner"), async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.session.organizationId!, 1000);
    const lines = ["Timestamp,Action,Resource Type,Resource ID,User ID,IP Address,Details"];
    logs.forEach((log) => {
      lines.push(`${log.createdAt},${log.action},${log.resourceType || ""},${log.resourceId || ""},${log.userId || ""},${log.ipAddress || ""},${JSON.stringify(log.details || {}).replace(/"/g, '""')}`);
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="audit_logs.csv"');
    res.send(lines.join("\n"));
  });

  // === AI PENTEST ROUTES ===
  app.get("/api/pentest/sessions", requireAuth, async (req: Request, res: Response) => {
    const sessions = await storage.getPentestSessions(req.session.organizationId!);
    res.json(sessions);
  });

  app.post("/api/pentest/sessions", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const userId = req.session.userId!;
      const data = insertPentestSessionSchema.parse(req.body);

      if (!data.authorizedBy) {
        return res.status(400).json({ message: "Authorization is required" });
      }

      const session = await storage.createPentestSession({
        ...data,
        organizationId: orgId,
        createdById: userId,
        status: "running",
        startedAt: new Date()
      });

      runPentestSimulation(session.id, orgId, data.testTypes || []);
      await logAudit(orgId, userId, "pentest.create", "pentest_session", session.id, { name: session.name }, req.ip);
      
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/pentest/sessions/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = await storage.getPentestSession(id, req.session.organizationId!);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const findings = await storage.getPentestFindings(session.id);
    res.json({ ...session, findings });
  });

  app.get("/api/pentest/sessions/:id/findings", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = await storage.getPentestSession(id, req.session.organizationId!);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const findings = await storage.getPentestFindings(session.id);
    res.json(findings);
  });

  app.post("/api/pentest/sessions/:id/run", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = await storage.getPentestSession(id, req.session.organizationId!);
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    await storage.updatePentestSession(session.id, {
      status: "running",
      startedAt: new Date(),
      completedAt: null
    });

    runPentestSimulation(session.id, req.session.organizationId!, session.testTypes || []);
    res.json({ message: "Pentest session restarted" });
  });

  // === CLOUD SECURITY ROUTES ===
  app.get("/api/cloud-security/targets", requireAuth, async (req: Request, res: Response) => {
    const targets = await storage.getCloudScanTargets(req.session.organizationId!);
    res.json(targets);
  });

  app.post("/api/cloud-security/targets", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertCloudScanTargetSchema.parse(req.body);
      const target = await storage.createCloudScanTarget({
        ...data,
        organizationId: req.session.organizationId!
      });
      await logAudit(req.session.organizationId!, req.session.userId!, "cloud_target.create", "cloud_scan_target", target.id, { name: target.name }, req.ip);
      res.json(target);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/cloud-security/targets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteCloudScanTarget(id, req.session.organizationId!);
    res.json({ message: "Target deleted" });
  });

  app.post("/api/cloud-security/targets/:id/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const targets = await storage.getCloudScanTargets(req.session.organizationId!);
    const found = targets.find(t => t.id === id);
    if (!found) return res.status(404).json({ message: "Target not found" });

    runCloudScanSimulation(found.id, req.session.organizationId!, found.provider);
    res.json({ message: "Cloud scan started" });
  });

  app.get("/api/cloud-security/results", requireAuth, async (req: Request, res: Response) => {
    const targetId = req.query.targetId as string | undefined;
    const results = await storage.getCloudScanResults(req.session.organizationId!, targetId);
    res.json(results);
  });

  app.get("/api/cloud-security/summary", requireAuth, async (req: Request, res: Response) => {
    const results = await storage.getCloudScanResults(req.session.organizationId!);
    const summary = {
      critical: results.filter(r => r.severity === "critical").length,
      high: results.filter(r => r.severity === "high").length,
      medium: results.filter(r => r.severity === "medium").length,
      low: results.filter(r => r.severity === "low").length,
      info: results.filter(r => r.severity === "info").length
    };
    res.json(summary);
  });

  // === THREAT INTELLIGENCE ROUTES ===
  app.get("/api/threat-intel", requireAuth, async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    let items = await storage.getThreatIntelItems(req.session.organizationId!);
    if (status) {
      items = items.filter(i => i.status === status);
    }
    res.json(items);
  });

  app.post("/api/threat-intel/refresh", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await refreshThreatIntel(req.session.organizationId!);
    res.json({ message: "Threat intelligence refreshed" });
  });

  app.put("/api/threat-intel/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await storage.updateThreatIntelItem(id, req.body);
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json(updated);
  });

  app.get("/api/threat-intel/stats", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getThreatIntelItems(req.session.organizationId!);
    const severityStats: Record<string, number> = {};
    const sourceStats: Record<string, number> = {};
    
    items.forEach(i => {
      severityStats[i.severity] = (severityStats[i.severity] || 0) + 1;
      sourceStats[i.source] = (sourceStats[i.source] || 0) + 1;
    });

    res.json({ severity: severityStats, source: sourceStats });
  });

  // === MONITORING ROUTES ===
  app.get("/api/monitoring/configs", requireAuth, async (req: Request, res: Response) => {
    const configs = await storage.getMonitoringConfigs(req.session.organizationId!);
    res.json(configs);
  });

  app.put("/api/monitoring/configs", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const configs = req.body;
      if (!Array.isArray(configs)) return res.status(400).json({ message: "Expected array of configs" });
      
      const results = [];
      for (const config of configs) {
        const validated = insertMonitoringConfigSchema.parse(config);
        results.push(await storage.upsertMonitoringConfig({
          ...validated,
          organizationId: req.session.organizationId!
        }));
      }
      res.json(results);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/monitoring/trigger", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    // Manually trigger a scan - simulation
    res.json({ message: "Monitoring scan triggered" });
  });

  app.get("/api/monitoring/history", requireAuth, async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.session.organizationId!);
    const monitoringLogs = logs.filter(l => l.action.startsWith("monitoring."));
    res.json(monitoringLogs);
  });

  // === ALERT RULES ROUTES ===
  app.get("/api/alerts/rules", requireAuth, async (req: Request, res: Response) => {
    const rules = await storage.getAlertRules(req.session.organizationId!);
    res.json(rules);
  });

  app.post("/api/alerts/rules", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule({
        ...data,
        organizationId: req.session.organizationId!
      });
      res.json(rule);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/alerts/rules/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await storage.updateAlertRule(id, req.body);
    if (!updated) return res.status(404).json({ message: "Rule not found" });
    res.json(updated);
  });

  app.delete("/api/alerts/rules/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteAlertRule(id, req.session.organizationId!);
    res.json({ message: "Rule deleted" });
  });

  app.get("/api/alerts/history", requireAuth, async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.session.organizationId!);
    const alertLogs = logs.filter(l => l.action.startsWith("alert."));
    res.json(alertLogs);
  });

  // === PIPELINE ROUTES ===
  app.get("/api/pipelines", requireAuth, async (req: Request, res: Response) => {
    const pipelines = await storage.getPipelineConfigs(req.session.organizationId!);
    res.json(pipelines);
  });

  app.post("/api/pipelines", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertPipelineConfigSchema.parse(req.body);
      const webhookSecret = crypto.randomBytes(16).toString("hex");
      const pipeline = await storage.createPipelineConfig({
        ...data,
        organizationId: req.session.organizationId!,
        webhookSecret
      });
      await logAudit(req.session.organizationId!, req.session.userId!, "pipeline.create", "pipeline_config", pipeline.id, { name: pipeline.name }, req.ip);
      res.json(pipeline);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/pipelines/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await storage.updatePipelineConfig(id, req.body);
    if (!updated) return res.status(404).json({ message: "Pipeline not found" });
    res.json(updated);
  });

  app.delete("/api/pipelines/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deletePipelineConfig(id, req.session.organizationId!);
    res.json({ message: "Pipeline deleted" });
  });

  app.get("/api/pipelines/webhook-docs", requireAuth, (req: Request, res: Response) => {
    const docs = {
      github_actions: "name: Sentinel Scan\non: [push]\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Sentinel Scan\n        run: curl -X POST https://api.sentinel-forge.com/webhook -H 'X-Sentinel-Secret: ${{ secrets.SENTINEL_SECRET }}'",
      gitlab_ci: "sentinel_scan:\n  script:\n    - curl -X POST https://api.sentinel-forge.com/webhook -H 'X-Sentinel-Secret: $SENTINEL_SECRET'",
    };
    res.json(docs);
  });

  return httpServer;
}

function generatePDFContent(report: any): Buffer {
  const lines = [
    `%PDF-1.4`,
    `SENTINEL FORGE - SECURITY AUDIT REPORT`,
    ``,
    `Title: ${report.title}`,
    `Generated: ${report.generatedAt || new Date().toISOString()}`,
    `Security Score: ${report.securityScore || "N/A"}/100`,
    ``,
    `EXECUTIVE SUMMARY`,
    report.executiveSummary || "No summary available.",
    ``,
    `VULNERABILITY BREAKDOWN`,
    `Total: ${report.totalVulnerabilities}`,
    `Critical: ${report.criticalCount}`,
    `High: ${report.highCount}`,
    `Medium: ${report.mediumCount}`,
    `Low: ${report.lowCount}`,
    ``,
    `FRAMEWORKS: ${(report.frameworks || []).join(", ")}`,
  ];

  if (report.recommendations) {
    lines.push("", "RECOMMENDATIONS");
    (report.recommendations as any[]).forEach((r: any, i: number) => {
      lines.push(`${i + 1}. [${r.priority}] ${r.title}: ${r.description}`);
    });
  }

  return Buffer.from(lines.join("\n"), "utf-8");
}

async function seedComplianceData(orgId: string) {
  const controlsByFramework: Record<string, Array<{ id: string; name: string }>> = {
    SOC2: [
      { id: "CC6.1", name: "Logical and Physical Access Controls" },
      { id: "CC6.2", name: "System Access Registration and Authorization" },
      { id: "CC6.3", name: "Role-Based Access and Least Privilege" },
      { id: "CC7.1", name: "Detection of Configuration Changes" },
      { id: "CC7.2", name: "Monitoring for Security Incidents" },
      { id: "CC8.1", name: "Change Management Controls" },
    ],
    HIPAA: [
      { id: "164.312(a)", name: "Access Control" },
      { id: "164.312(c)", name: "Integrity Controls" },
      { id: "164.312(d)", name: "Authentication" },
      { id: "164.312(e)", name: "Transmission Security" },
      { id: "164.308(a)(1)", name: "Security Management Process" },
    ],
    ISO27001: [
      { id: "A.5.1", name: "Information Security Policies" },
      { id: "A.6.1", name: "Organization of Information Security" },
      { id: "A.8.1", name: "Asset Management" },
      { id: "A.9.1", name: "Access Control Policy" },
      { id: "A.12.1", name: "Operational Procedures" },
      { id: "A.14.1", name: "Security Requirements of Information Systems" },
    ],
    "PCI-DSS": [
      { id: "Req 1", name: "Install and Maintain Network Security Controls" },
      { id: "Req 2", name: "Apply Secure Configurations" },
      { id: "Req 3", name: "Protect Stored Account Data" },
      { id: "Req 6", name: "Develop and Maintain Secure Systems" },
      { id: "Req 10", name: "Log and Monitor All Access" },
    ],
    FedRAMP: [
      { id: "AC-2", name: "Account Management" },
      { id: "AU-2", name: "Audit Events" },
      { id: "CA-2", name: "Security Assessments" },
      { id: "CM-6", name: "Configuration Settings" },
      { id: "IA-2", name: "Identification and Authentication" },
      { id: "SC-7", name: "Boundary Protection" },
    ],
    GDPR: [
      { id: "Art 5", name: "Principles of Processing" },
      { id: "Art 25", name: "Data Protection by Design" },
      { id: "Art 30", name: "Records of Processing" },
      { id: "Art 32", name: "Security of Processing" },
      { id: "Art 33", name: "Breach Notification" },
    ],
  };

  const statuses = ["compliant", "partial", "non-compliant"];

  for (const [framework, controls] of Object.entries(controlsByFramework)) {
    for (const control of controls) {
      const status = statuses[Math.floor(Math.random() * 3)];
      const coverage = status === "compliant" ? 80 + Math.floor(Math.random() * 21)
        : status === "partial" ? 40 + Math.floor(Math.random() * 40)
        : Math.floor(Math.random() * 40);

      await storage.createComplianceMapping({
        organizationId: orgId,
        framework: framework as any,
        controlId: control.id,
        controlName: control.name,
        status,
        coverage,
        notes: `Assessed via automated security scanning`,
      });
    }
  }
}
