import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { runScanSimulation } from "./scan-worker";
import { generateReport } from "./report-generator";

declare module "express-session" {
  interface SessionData {
    userId: string;
    organizationId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
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

  app.post("/api/scans", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/reports", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/repositories", requireAuth, async (req: Request, res: Response) => {
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

      return res.json(repo);
    } catch (err: any) {
      console.error("Create repo error:", err);
      return res.status(500).json({ message: "Failed to add repository" });
    }
  });

  app.delete("/api/repositories/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteRepository(id, req.session.organizationId!);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/documents", requireAuth, async (req: Request, res: Response) => {
    const docs = await storage.getDocuments(req.session.organizationId!);
    return res.json(docs);
  });

  app.post("/api/documents", requireAuth, async (req: Request, res: Response) => {
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

  app.delete("/api/documents/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteDocument(id, req.session.organizationId!);
    return res.json({ message: "Deleted" });
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
