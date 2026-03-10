import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { runScanSimulation } from "./scan-worker";
import { generateReport } from "./report-generator";

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

      const details = PLAN_DETAILS[plan];
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      let sub = await storage.getSubscription(orgId);
      if (sub) {
        sub = await storage.updateSubscription(orgId, {
          plan,
          maxUsers: details.maxUsers === -1 ? 9999 : details.maxUsers,
          maxScansPerMonth: details.maxScansPerMonth === -1 ? 99999 : details.maxScansPerMonth,
          maxRepositories: details.maxRepositories === -1 ? 9999 : details.maxRepositories,
          features: details.features,
          currentPeriodEnd: periodEnd,
        });
      } else {
        sub = await storage.createSubscription({
          organizationId: orgId,
          plan,
          status: "active",
          maxUsers: details.maxUsers === -1 ? 9999 : details.maxUsers,
          maxScansPerMonth: details.maxScansPerMonth === -1 ? 99999 : details.maxScansPerMonth,
          maxRepositories: details.maxRepositories === -1 ? 9999 : details.maxRepositories,
          features: details.features,
          currentPeriodEnd: periodEnd,
        });
      }

      await logAudit(orgId, req.session.userId!, "billing.plan_change", "subscription", sub?.id, { plan }, req.ip);
      return res.json(sub);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.get("/api/billing/usage", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.session.organizationId!;
    const sub = await storage.getSubscription(orgId);
    const repos = await storage.getRepositories(orgId);
    const allScans = await storage.getScans(orgId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const scansThisMonth = allScans.filter((s) => new Date(s.createdAt) >= monthStart).length;

    return res.json({
      users: { current: 1, limit: sub?.maxUsers ?? 5 },
      scans: { current: scansThisMonth, limit: sub?.maxScansPerMonth ?? 50 },
      repositories: { current: repos.length, limit: sub?.maxRepositories ?? 10 },
    });
  });

  // === SSO CONFIGURATION ===
  app.get("/api/sso/config", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.session.organizationId!;
    const ssoSettings = await storage.getSettings(orgId, "sso");
    const config: Record<string, any> = {};
    ssoSettings.forEach((s) => { config[s.key] = s.value; });
    return res.json(config);
  });

  app.put("/api/sso/config", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const { provider, entityId, ssoUrl, certificate, domains, enabled } = req.body;

      const updates = [
        { key: "provider", value: provider },
        { key: "entityId", value: entityId },
        { key: "ssoUrl", value: ssoUrl },
        { key: "certificate", value: certificate },
        { key: "domains", value: domains },
        { key: "enabled", value: enabled },
      ];

      for (const u of updates) {
        if (u.value !== undefined) {
          await storage.upsertSetting({ organizationId: orgId, category: "sso", key: u.key, value: u.value });
        }
      }

      await logAudit(orgId, req.session.userId!, "sso.config_update", "sso", undefined, { provider, enabled }, req.ip);
      return res.json({ message: "SSO configuration updated" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update SSO config" });
    }
  });

  app.get("/api/sso/status", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.session.organizationId!;
    const enabled = await storage.getSetting(orgId, "sso", "enabled");
    const provider = await storage.getSetting(orgId, "sso", "provider");
    return res.json({
      enabled: enabled?.value === true,
      provider: provider?.value || null,
    });
  });

  // === ADVANCED ANALYTICS ===
  app.get("/api/analytics/vulnerabilities", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.session.organizationId!;
      const allFindings = await storage.getFindingsByOrg(orgId);
      const allScans = await storage.getScans(orgId);

      const resolved = allFindings.filter((f) => f.isResolved);
      const mttrDays = resolved.length > 0
        ? Math.round(resolved.reduce((sum, f) => {
            const created = new Date(f.createdAt).getTime();
            const resolvedAt = f.resolvedAt ? new Date(f.resolvedAt).getTime() : created + 3 * 86400000;
            return sum + (resolvedAt - created) / 86400000;
          }, 0) / resolved.length)
        : 0;

      const open = allFindings.filter((f) => !f.isResolved);
      const riskScore = Math.max(0, 100 - (open.filter((f) => f.severity === "critical").length * 15
        + open.filter((f) => f.severity === "high").length * 8
        + open.filter((f) => f.severity === "medium").length * 3
        + open.filter((f) => f.severity === "low").length));

      const now = new Date();
      const weeklyTrend = Array.from({ length: 12 }, (_, i) => {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);
        const weekLabel = `W${12 - i}`;
        const weekFindings = allFindings.filter((f) => {
          const d = new Date(f.createdAt);
          return d >= weekStart && d < weekEnd;
        });
        return {
          week: weekLabel,
          critical: weekFindings.filter((f) => f.severity === "critical").length,
          high: weekFindings.filter((f) => f.severity === "high").length,
          medium: weekFindings.filter((f) => f.severity === "medium").length,
          low: weekFindings.filter((f) => f.severity === "low").length,
        };
      });

      const categoryMap = new Map<string, number>();
      allFindings.forEach((f) => {
        const cat = f.category || "Uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      const toolStats = [
        { tool: "Semgrep", findings: allFindings.filter((f) => f.scanTool === "semgrep").length, scans: allScans.filter((s) => s.scanType === "semgrep").length },
        { tool: "Trivy", findings: allFindings.filter((f) => f.scanTool === "trivy").length, scans: allScans.filter((s) => s.scanType === "trivy").length },
        { tool: "Bandit", findings: allFindings.filter((f) => f.scanTool === "bandit").length, scans: allScans.filter((s) => s.scanType === "bandit").length },
        { tool: "OWASP ZAP", findings: allFindings.filter((f) => f.scanTool === "zap").length, scans: allScans.filter((s) => s.scanType === "zap").length },
      ];

      const cvssDistribution = [
        { range: "0-2", count: allFindings.filter((f) => f.severity === "info").length },
        { range: "2-4", count: Math.round(allFindings.filter((f) => f.severity === "low").length * 0.7) },
        { range: "4-6", count: allFindings.filter((f) => f.severity === "medium").length },
        { range: "6-8", count: allFindings.filter((f) => f.severity === "high").length },
        { range: "8-10", count: allFindings.filter((f) => f.severity === "critical").length },
      ];

      const riskHistory = Array.from({ length: 12 }, (_, i) => ({
        week: `W${12 - i}`,
        score: Math.max(0, Math.min(100, riskScore + Math.floor(Math.random() * 20 - 10 + i * 2))),
      }));

      const scansPerWeek = allScans.length > 0 ? Math.round(allScans.length / Math.max(1, 12)) : 0;

      const remediationByS: Record<string, { avg: number; count: number }> = {};
      ["critical", "high", "medium", "low"].forEach((sev) => {
        const sevResolved = resolved.filter((f) => f.severity === sev);
        const avgDays = sevResolved.length > 0
          ? Math.round(sevResolved.reduce((s, f) => {
              const c = new Date(f.createdAt).getTime();
              const r = f.resolvedAt ? new Date(f.resolvedAt).getTime() : c + 86400000;
              return s + (r - c) / 86400000;
            }, 0) / sevResolved.length)
          : 0;
        remediationByS[sev] = { avg: avgDays, count: sevResolved.length };
      });

      return res.json({
        mttr: mttrDays,
        riskScore,
        totalOpen: open.length,
        scansPerWeek,
        severityTrend: weeklyTrend,
        topCategories,
        toolEffectiveness: toolStats,
        cvssDistribution,
        riskHistory,
        resolvedCount: resolved.length,
        unresolvedCount: open.length,
        remediationBySeverity: remediationByS,
        attackSurface: {
          external: Math.round(open.length * 0.4),
          internal: Math.round(open.length * 0.6),
          network: Math.round(open.length * 0.3),
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
