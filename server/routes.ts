import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { runScanSimulation } from "./scan-worker";
import { generateReport } from "./report-generator";
import { runPentestSimulation, runCloudScanSimulation, refreshThreatIntel } from "./simulations";
import { fetchCveDatabase, runThreatHunt, runSecurityCopilot } from "./intelligence";
import { executePlaybook } from "./soar";
import { getMetrics, getPrometheusMetrics, requestMetricsMiddleware, runThreatCorrelation } from "./metrics";
import { getGraphData, addGraphNode, addGraphEdge } from "./graph";
import {
  insertPentestSessionSchema,
  insertCloudScanTargetSchema,
  insertAlertRuleSchema,
  insertPipelineConfigSchema,
  insertThreatIntelItemSchema,
  insertMonitoringConfigSchema,
  insertTaskSchema,
} from "@shared/schema";
import { registerStripeRoutes, isStripeConfigured, isPaidPlan } from "./stripe";
import { executeTask, processPendingTasks, getTaskExecutionHistory } from "./task-runner";
import { generateVerificationToken, getVerificationExpiry, sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { requireAuth, requireRole, generateAccessToken, generateRefreshToken, verifyToken } from "./auth";
import { z } from "zod";
export { requireAuth } from "./auth";

const registerBodySchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(100),
  organizationName: z.string().min(2).max(100),
});

const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

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
  app.use(requestMetricsMiddleware());

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerBodySchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(", ");
        return res.status(400).json({ message: errors });
      }
      const { username, email, password, fullName, organizationName } = parsed.data;

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
      const verificationToken = generateVerificationToken();
      const verificationExpires = getVerificationExpiry();

      const user = await storage.createUser({
        organizationId: org.id,
        username,
        email,
        password: hashedPassword,
        fullName,
        role: "owner",
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);
      const trialPeriodEnd = new Date(trialEndsAt);

      await storage.createSubscription({
        organizationId: org.id,
        plan: "starter",
        status: "trialing",
        trialEndsAt,
        currentPeriodEnd: trialPeriodEnd,
        maxUsers: 25,
        maxScansPerMonth: 500,
        maxRepositories: 50,
        features: ["Full platform access", "All scan tools", "All compliance frameworks", "3-day free trial"],
      });

      await seedComplianceData(org.id);
      await logAudit(org.id, user.id, "user.register", "user", user.id, { username }, req.ip);

      await sendVerificationEmail(email, verificationToken, fullName);

      return res.json({
        message: "Account created. Please check your email to verify your account.",
        requiresVerification: true,
        email: user.email,
      });
    } catch (err: any) {
      console.error("Register error:", err);
      return res.status(500).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const { username, password } = parsed.data;
      const isEmail = username.includes("@");
      const user = isEmail
        ? await storage.getUserByEmail(username)
        : await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        return res.status(403).json({
          message: "Please verify your email before signing in.",
          requiresVerification: true,
          email: user.email,
        });
      }

      const org = await storage.getOrganization(user.organizationId);

      const tokenPayload = { userId: user.id, organizationId: user.organizationId, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await logAudit(user.organizationId, user.id, "user.login", "user", user.id, { username }, req.ip);

      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          organizationId: user.organizationId,
          organization: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : undefined,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email already verified. You can sign in." });
      }

      if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
        return res.status(400).json({ message: "Verification link has expired. Please request a new one." });
      }

      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      await logAudit(user.organizationId, user.id, "user.email_verified", "user", user.id, {}, req.ip);

      return res.json({ message: "Email verified successfully. You can now sign in." });
    } catch (err: any) {
      console.error("Email verification error:", err);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If that email exists, a verification link has been sent." });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email is already verified. You can sign in." });
      }

      const verificationToken = generateVerificationToken();
      const verificationExpires = getVerificationExpiry();

      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      await sendVerificationEmail(email, verificationToken, user.fullName);

      return res.json({ message: "If that email exists, a verification link has been sent." });
    } catch (err: any) {
      console.error("Resend verification error:", err);
      return res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const { email } = parsed.data;
      const user = await storage.getUserByEmail(email);

      if (user) {
        const resetToken = generateVerificationToken();
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1);

        await storage.updateUser(user.id, {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        });

        await sendPasswordResetEmail(email, resetToken, user.fullName);
      }

      return res.json({ message: "If that email exists, a password reset link has been sent." });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ message: "Failed to send password reset email" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(", ");
        return res.status(400).json({ message: errors });
      }
      const { token, password } = parsed.data;

      const allUsers = await storage.getUserByPasswordResetToken(token);
      if (!allUsers) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (!allUsers.passwordResetExpires || new Date(allUsers.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(allUsers.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      await logAudit(allUsers.organizationId, allUsers.id, "user.password_reset", "user", allUsers.id, {}, req.ip);

      return res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (err: any) {
      console.error("Reset password error:", err);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ message: "Logged out" });
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }
      const payload = verifyToken(refreshToken, "refresh");
      if (!payload) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const tokenPayload = { userId: user.id, organizationId: user.organizationId, role: user.role };
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err: any) {
      return res.status(500).json({ message: "Token refresh failed" });
    }
  });

  app.delete("/api/auth/account", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const orgId = req.user!.organizationId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required to delete your account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      await logAudit(orgId, userId, "user.account_deleted", "user", userId, { username: user.username }, req.ip);
      await storage.deleteUser(userId);

      res.json({ message: "Account deleted successfully" });
    } catch (err: any) {
      console.error("Account deletion error:", err);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.user!.userId);
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
      const orgId = req.user!.organizationId;
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
        : 0;

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

      const [allIncidents, allVulnerabilities, allRisks, latestPosture] = await Promise.all([
        storage.getIncidents(orgId),
        storage.getVulnerabilities(orgId),
        storage.getRisks(orgId),
        storage.getLatestPostureScore(orgId),
      ]);

      const incidentsStats = {
        total: allIncidents.length,
        open: allIncidents.filter(i => i.status !== "closed").length,
        critical: allIncidents.filter(i => i.severity === "critical").length,
      };
      const vulnerabilitiesStats = {
        total: allVulnerabilities.length,
        open: allVulnerabilities.filter(v => v.status === "open").length,
        critical: allVulnerabilities.filter(v => v.severity === "critical").length,
        high: allVulnerabilities.filter(v => v.severity === "high").length,
      };
      const risksStats = {
        total: allRisks.length,
        critical: allRisks.filter(r => r.riskScore >= 20).length,
        high: allRisks.filter(r => r.riskScore >= 12 && r.riskScore < 20).length,
      };

      const [teamMembers, recentAuditLogs, subscription] = await Promise.all([
        storage.getOrganizationUsers(orgId),
        storage.getAuditLogs(orgId),
        storage.getSubscription(orgId),
      ]);

      const recentActivity = recentAuditLogs.slice(0, 10).map(l => ({
        id: l.id,
        action: l.action,
        userId: l.userId,
        resourceType: l.resourceType,
        createdAt: l.createdAt,
      }));

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
        monitoringActive,
        incidentsStats,
        vulnerabilitiesStats,
        risksStats,
        latestPostureScore: latestPosture?.overallScore ?? null,
        teamMemberCount: teamMembers.length,
        subscriptionStatus: subscription?.status ?? "none",
        subscriptionPlan: subscription?.plan ?? "none",
        recentActivity,
      });
    } catch (err: any) {
      console.error("Dashboard error:", err);
      return res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  app.get("/api/scans", requireAuth, async (req: Request, res: Response) => {
    const orgScans = await storage.getScans(req.user!.organizationId);
    return res.json(orgScans);
  });

  app.get("/api/scans/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const scan = await storage.getScan(id, req.user!.organizationId);
    if (!scan) return res.status(404).json({ message: "Scan not found" });
    return res.json(scan);
  });

  app.get("/api/scans/:id/findings", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const scan = await storage.getScan(id, req.user!.organizationId);
    if (!scan) return res.status(403).json({ message: "Access denied" });
    const findings = await storage.getScanFindings(id);
    return res.json(findings);
  });

  app.post("/api/scans", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
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
    const mappings = await storage.getComplianceMappings(req.user!.organizationId);
    return res.json(mappings);
  });

  app.get("/api/reports", requireAuth, async (req: Request, res: Response) => {
    const orgReports = await storage.getReports(req.user!.organizationId);
    return res.json(orgReports);
  });

  app.get("/api/reports/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await storage.getReport(id, req.user!.organizationId);
    if (!report) return res.status(404).json({ message: "Report not found" });
    return res.json(report);
  });

  app.post("/api/reports", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
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
    const report = await storage.getReport(id, req.user!.organizationId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    const pdfContent = generatePDFContent(report);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "_")}.pdf"`);
    res.send(pdfContent);
  });

  app.get("/api/repositories", requireAuth, async (req: Request, res: Response) => {
    const repos = await storage.getRepositories(req.user!.organizationId);
    return res.json(repos);
  });

  app.post("/api/repositories", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
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

      await logAudit(orgId, req.user!.userId, "repository.create", "repository", repo.id, { name, provider }, req.ip);
      return res.json(repo);
    } catch (err: any) {
      console.error("Create repo error:", err);
      return res.status(500).json({ message: "Failed to add repository" });
    }
  });

  app.delete("/api/repositories/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteRepository(id, req.user!.organizationId);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/documents", requireAuth, async (req: Request, res: Response) => {
    const docs = await storage.getDocuments(req.user!.organizationId);
    return res.json(docs);
  });

  app.post("/api/documents", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
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
    await logAudit(req.user!.organizationId, req.user!.userId, "document.delete", "document", id, null, req.ip);
    await storage.deleteDocument(id, req.user!.organizationId);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/settings", requireAuth, async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const allSettings = await storage.getSettings(req.user!.organizationId, category);
    return res.json(allSettings);
  });

  app.put("/api/settings", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const { category, key, value } = req.body;
      if (!category || !key) {
        return res.status(400).json({ message: "Category and key are required" });
      }
      const setting = await storage.upsertSetting({ organizationId: orgId, category, key, value });
      await logAudit(orgId, req.user!.userId, "settings.update", "setting", setting.id, { category, key }, req.ip);
      return res.json(setting);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to save setting" });
    }
  });

  app.get("/api/audit-logs", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.user!.organizationId);
    return res.json(logs);
  });

  app.get("/api/reports/:id/export/csv", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await storage.getReport(id, req.user!.organizationId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    const findings = await storage.getFindingsByOrg(req.user!.organizationId);
    const mappings = await storage.getComplianceMappings(req.user!.organizationId);

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
    const keys = await storage.getApiKeys(req.user!.organizationId);
    return res.json(keys.map((k) => ({ ...k, keyHash: undefined })));
  });

  app.post("/api/api-keys", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
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
        createdById: req.user!.userId,
      });

      await logAudit(orgId, req.user!.userId, "apikey.create", "api_key", apiKey.id, { name }, req.ip);
      return res.json({ ...apiKey, keyHash: undefined, rawKey });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await logAudit(req.user!.organizationId, req.user!.userId, "apikey.revoke", "api_key", id, null, req.ip);
    await storage.deleteApiKey(id, req.user!.organizationId);
    return res.json({ message: "API key revoked" });
  });

  app.post("/api/api-keys/:id/regenerate", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const existing = await storage.getApiKey(id, req.user!.organizationId);
      if (!existing) return res.status(404).json({ message: "API key not found" });

      const rawKey = `sf_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.substring(0, 10);

      await storage.updateApiKey(id, { keyHash, keyPrefix });
      await logAudit(req.user!.organizationId, req.user!.userId, "apikey.regenerate", "api_key", id, null, req.ip);
      return res.json({ rawKey, keyPrefix });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to regenerate key" });
    }
  });

  // === BILLING & SUBSCRIPTIONS ===
  const PLAN_DETAILS: Record<string, any> = {
    professional: { name: "Professional", price: 99, maxUsers: 25, maxScansPerMonth: 500, maxRepositories: 50, features: ["All scan tools", "All compliance frameworks", "Priority support", "API access", "SSO integration", "Advanced analytics", "CSV/PDF export"] },
    enterprise: { name: "Enterprise", price: 499, maxUsers: -1, maxScansPerMonth: -1, maxRepositories: -1, features: ["Unlimited everything", "All compliance frameworks", "Dedicated support", "SSO & SAML", "Custom integrations", "SLA guarantee", "Multi-region deployment", "Audit log export", "Advanced RBAC"] },
  };

  app.get("/api/billing/plans", requireAuth, async (_req: Request, res: Response) => {
    return res.json(Object.entries(PLAN_DETAILS).map(([key, val]) => ({ id: key, ...val })));
  });

  app.get("/api/billing/subscription", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    let sub = await storage.getSubscription(orgId);
    if (!sub) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);
      sub = await storage.createSubscription({
        organizationId: orgId,
        plan: "starter",
        status: "trialing",
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
        maxUsers: 25,
        maxScansPerMonth: 500,
        maxRepositories: 50,
        features: ["Full platform access", "3-day free trial"],
      });
    }

    if (sub.status === "trialing" && sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) {
      sub = (await storage.updateSubscription(orgId, {
        status: "expired",
        maxUsers: 1,
        maxScansPerMonth: 0,
        maxRepositories: 0,
      }))!;
    }

    const trialDaysRemaining = sub.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return res.json({
      ...sub,
      trialDaysRemaining,
      trialExpired: sub.status === "expired",
    });
  });

  app.put("/api/billing/subscription", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const { plan } = req.body;
      if (!plan || !PLAN_DETAILS[plan]) return res.status(400).json({ message: "Invalid plan. Choose: professional or enterprise." });

      if (isStripeConfigured()) {
        return res.status(402).json({ message: "Plan upgrades require payment. Use the upgrade button to proceed through checkout." });
      }

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const sub = await storage.updateSubscription(orgId, {
        plan,
        status: "active",
        maxUsers: PLAN_DETAILS[plan].maxUsers,
        maxScansPerMonth: PLAN_DETAILS[plan].maxScansPerMonth,
        maxRepositories: PLAN_DETAILS[plan].maxRepositories,
        features: PLAN_DETAILS[plan].features,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      });

      await logAudit(orgId, req.user!.userId, "billing.subscription_update", "subscription", undefined, { plan }, req.ip);
      return res.json(sub);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // === ANALYTICS & INSIGHTS ===
  app.get("/api/analytics/overview", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
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
    const orgId = req.user!.organizationId;
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
      const orgId = req.user!.organizationId;
      const { regions, primaryRegion, failoverEnabled, rateLimit } = req.body;

      if (regions) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "regions", value: regions });
      if (primaryRegion) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "primaryRegion", value: primaryRegion });
      if (failoverEnabled !== undefined) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "failoverEnabled", value: failoverEnabled });
      if (rateLimit) await storage.upsertSetting({ organizationId: orgId, category: "deployment", key: "rate_limit", value: rateLimit });

      await logAudit(orgId, req.user!.userId, "deployment.config_update", "deployment", undefined, { primaryRegion, failoverEnabled }, req.ip);
      return res.json({ message: "Deployment configuration updated" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update deployment config" });
    }
  });

  // === ENHANCED AUDIT LOGS ===
  app.get("/api/audit-logs/export", requireAuth, requireRole("owner"), async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.user!.organizationId, 1000);
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
    const sessions = await storage.getPentestSessions(req.user!.organizationId);
    res.json(sessions);
  });

  app.post("/api/pentest/sessions", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
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
    const session = await storage.getPentestSession(id, req.user!.organizationId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const findings = await storage.getPentestFindings(session.id);
    res.json({ ...session, findings });
  });

  app.get("/api/pentest/sessions/:id/findings", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = await storage.getPentestSession(id, req.user!.organizationId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const findings = await storage.getPentestFindings(session.id);
    res.json(findings);
  });

  app.post("/api/pentest/sessions/:id/run", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const session = await storage.getPentestSession(id, req.user!.organizationId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    await storage.updatePentestSession(session.id, {
      status: "running",
      startedAt: new Date(),
      completedAt: null
    });

    runPentestSimulation(session.id, req.user!.organizationId, session.testTypes || []);
    res.json({ message: "Pentest session restarted" });
  });

  // === CLOUD SECURITY ROUTES ===
  app.get("/api/cloud-security/targets", requireAuth, async (req: Request, res: Response) => {
    const targets = await storage.getCloudScanTargets(req.user!.organizationId);
    res.json(targets);
  });

  app.post("/api/cloud-security/targets", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertCloudScanTargetSchema.parse(req.body);
      const target = await storage.createCloudScanTarget({
        ...data,
        organizationId: req.user!.organizationId
      });
      await logAudit(req.user!.organizationId, req.user!.userId, "cloud_target.create", "cloud_scan_target", target.id, { name: target.name }, req.ip);
      res.json(target);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/cloud-security/targets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteCloudScanTarget(id, req.user!.organizationId);
    res.json({ message: "Target deleted" });
  });

  app.post("/api/cloud-security/targets/:id/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const targets = await storage.getCloudScanTargets(req.user!.organizationId);
    const found = targets.find(t => t.id === id);
    if (!found) return res.status(404).json({ message: "Target not found" });

    runCloudScanSimulation(found.id, req.user!.organizationId, found.provider);
    res.json({ message: "Cloud scan started" });
  });

  app.get("/api/cloud-security/results", requireAuth, async (req: Request, res: Response) => {
    const targetId = req.query.targetId as string | undefined;
    const results = await storage.getCloudScanResults(req.user!.organizationId, targetId);
    res.json(results);
  });

  app.get("/api/cloud-security/summary", requireAuth, async (req: Request, res: Response) => {
    const results = await storage.getCloudScanResults(req.user!.organizationId);
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
    let items = await storage.getThreatIntelItems(req.user!.organizationId);
    if (status) {
      items = items.filter(i => i.status === status);
    }
    res.json(items);
  });

  app.post("/api/threat-intel/refresh", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await refreshThreatIntel(req.user!.organizationId);
    res.json({ message: "Threat intelligence refreshed" });
  });

  app.put("/api/threat-intel/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await storage.updateThreatIntelItem(id, req.body);
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json(updated);
  });

  app.get("/api/threat-intel/stats", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getThreatIntelItems(req.user!.organizationId);
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
    const configs = await storage.getMonitoringConfigs(req.user!.organizationId);
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
          organizationId: req.user!.organizationId
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
    const logs = await storage.getAuditLogs(req.user!.organizationId);
    const monitoringLogs = logs.filter(l => l.action.startsWith("monitoring."));
    res.json(monitoringLogs);
  });

  // === ALERT RULES ROUTES ===
  app.get("/api/alerts/rules", requireAuth, async (req: Request, res: Response) => {
    const rules = await storage.getAlertRules(req.user!.organizationId);
    res.json(rules);
  });

  app.post("/api/alerts/rules", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertAlertRuleSchema.parse(req.body);
      const rule = await storage.createAlertRule({
        ...data,
        organizationId: req.user!.organizationId
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
    await storage.deleteAlertRule(id, req.user!.organizationId);
    res.json({ message: "Rule deleted" });
  });

  app.get("/api/alerts/history", requireAuth, async (req: Request, res: Response) => {
    const logs = await storage.getAuditLogs(req.user!.organizationId);
    const alertLogs = logs.filter(l => l.action.startsWith("alert."));
    res.json(alertLogs);
  });

  // === PIPELINE ROUTES ===
  app.get("/api/pipelines", requireAuth, async (req: Request, res: Response) => {
    const pipelines = await storage.getPipelineConfigs(req.user!.organizationId);
    res.json(pipelines);
  });

  app.post("/api/pipelines", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const data = insertPipelineConfigSchema.parse(req.body);
      const webhookSecret = crypto.randomBytes(16).toString("hex");
      const pipeline = await storage.createPipelineConfig({
        ...data,
        organizationId: req.user!.organizationId,
        webhookSecret
      });
      await logAudit(req.user!.organizationId, req.user!.userId, "pipeline.create", "pipeline_config", pipeline.id, { name: pipeline.name }, req.ip);
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
    await storage.deletePipelineConfig(id, req.user!.organizationId);
    res.json({ message: "Pipeline deleted" });
  });

  app.get("/api/pipelines/webhook-docs", requireAuth, (req: Request, res: Response) => {
    const docs = {
      github_actions: "name: Zyra Scan\non: [push]\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2\n      - name: Zyra Scan\n        run: curl -X POST https://api.zyra.security/webhook -H 'X-Zyra-Secret: ${{ secrets.ZYRA_SECRET }}'",
      gitlab_ci: "zyra_scan:\n  script:\n    - curl -X POST https://api.zyra.security/webhook -H 'X-Zyra-Secret: $ZYRA_SECRET'",
    };
    res.json(docs);
  });

  // ===== INCIDENT RESPONSE =====
  app.get("/api/incidents", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getIncidents(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/incidents", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const item = await storage.createIncident({ ...req.body, organizationId: orgId });
    await storage.createAuditLog({ organizationId: orgId, userId: req.user!.userId, action: "incident.create", resource: "incident", resourceId: item.id, details: { title: item.title } });
    const isCritical = item.severity === "critical";
    await storage.createNotification({ organizationId: orgId, title: isCritical ? "Critical Incident Created" : "New Incident Created", message: `Incident "${item.title}" has been created with ${item.severity} severity.`, type: "incident", severity: item.severity, resourceType: "incident", resourceId: item.id });
    res.json(item);
  });
  app.put("/api/incidents/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const item = await storage.updateIncident(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: "Not found" });
    await storage.createAuditLog({ organizationId: req.user!.organizationId, userId: req.user!.userId, action: "incident.update", resource: "incident", resourceId: item.id, details: { status: item.status } });
    res.json(item);
  });
  app.delete("/api/incidents/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteIncident(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });
  app.post("/api/incidents/:id/timeline", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const incident = await storage.getIncident(req.params.id, req.user!.organizationId);
    if (!incident) return res.status(404).json({ message: "Not found" });
    const entry = { timestamp: new Date().toISOString(), action: req.body.action, note: req.body.note, user: req.body.user || "System" };
    const timeline = [...(incident.timeline as any[] || []), entry];
    const updated = await storage.updateIncident(req.params.id, { timeline });
    res.json(updated);
  });
  app.get("/api/incidents/stats", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getIncidents(req.user!.organizationId);
    const byStatus = { triage: 0, assign: 0, contain: 0, remediate: 0, close: 0 };
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    items.forEach(i => {
      if (i.status in byStatus) (byStatus as any)[i.status]++;
      if (i.severity in bySeverity) (bySeverity as any)[i.severity]++;
    });
    const resolved = items.filter(i => i.status === "close" && i.resolvedAt);
    const avgMttr = resolved.length ? Math.round(resolved.reduce((s, i) => s + (i.mttr || 0), 0) / resolved.length) : 0;
    res.json({ total: items.length, byStatus, bySeverity, avgMttr, active: items.filter(i => i.status !== "close").length });
  });

  // ===== VULNERABILITY LIFECYCLE =====
  app.get("/api/vulnerabilities", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getVulnerabilities(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/vulnerabilities", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const item = await storage.createVulnerability({ ...req.body, organizationId: orgId });
    if (item.severity === "critical" || item.severity === "high") {
      await storage.createNotification({ organizationId: orgId, title: `${item.severity === "critical" ? "Critical" : "High"} Vulnerability Discovered`, message: `${item.title}${item.cve ? ` (${item.cve})` : ""} — CVSS ${item.cvss ?? "N/A"}`, type: "vulnerability", severity: item.severity, resourceType: "vulnerability", resourceId: item.id });
    }
    res.json(item);
  });
  app.put("/api/vulnerabilities/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const data = { ...req.body };
    if (data.status === "verified" && !data.verifiedAt) data.verifiedAt = new Date();
    const item = await storage.updateVulnerability(req.params.id, data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/vulnerabilities/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteVulnerability(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });
  app.get("/api/vulnerabilities/stats", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getVulnerabilities(req.user!.organizationId);
    const byStatus = { open: 0, in_progress: 0, remediated: 0, verified: 0 };
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    items.forEach(v => {
      const s = v.status as string;
      if (s in byStatus) (byStatus as any)[s]++;
      if (v.severity in bySeverity) (bySeverity as any)[v.severity]++;
    });
    res.json({ total: items.length, byStatus, bySeverity, overdue: items.filter(v => v.dueDate && new Date(v.dueDate) < new Date() && v.status !== "verified").length });
  });

  // ===== SBOM / SUPPLY CHAIN =====
  app.get("/api/sbom", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getSbomItems(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/sbom/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const ecosystems = ["npm", "pip", "maven", "gem", "go", "nuget"];
    const packages = [
      { name: "lodash", ver: "4.17.20", eco: "npm", cves: ["CVE-2020-8203"], patched: "4.17.21", risk: 75 },
      { name: "log4j-core", ver: "2.14.1", eco: "maven", cves: ["CVE-2021-44228"], patched: "2.17.0", risk: 100 },
      { name: "axios", ver: "0.21.1", eco: "npm", cves: ["CVE-2021-3749"], patched: "0.21.2", risk: 60 },
      { name: "pillow", ver: "8.1.0", eco: "pip", cves: ["CVE-2021-27921"], patched: "8.2.0", risk: 70 },
      { name: "react", ver: "17.0.1", eco: "npm", cves: [], patched: null, risk: 5 },
      { name: "express", ver: "4.18.2", eco: "npm", cves: [], patched: null, risk: 5 },
      { name: "django", ver: "3.2.0", eco: "pip", cves: ["CVE-2021-35042"], patched: "3.2.5", risk: 65 },
      { name: "spring-core", ver: "5.3.5", eco: "maven", cves: ["CVE-2022-22965"], patched: "5.3.18", risk: 95 },
      { name: "rubygems", ver: "3.0.3", eco: "gem", cves: [], patched: null, risk: 10 },
      { name: "werkzeug", ver: "1.0.0", eco: "pip", cves: ["CVE-2020-28724"], patched: "1.0.1", risk: 55 },
    ];
    for (const p of packages) {
      const existing = (await storage.getSbomItems(orgId)).find(s => s.packageName === p.name);
      if (!existing) {
        await storage.createSbomItem({ organizationId: orgId, packageName: p.name, packageVersion: p.ver, ecosystem: p.eco, isVulnerable: p.cves.length > 0, knownCves: p.cves, patchedVersion: p.patched, riskScore: p.risk, transitive: Math.random() > 0.5 });
      }
    }
    const items = await storage.getSbomItems(orgId);
    res.json({ scanned: items.length, vulnerable: items.filter(i => i.isVulnerable).length, items });
  });
  app.put("/api/sbom/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const item = await storage.updateSbomItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/sbom/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteSbomItem(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ===== SECRETS SCANNING =====
  app.get("/api/secrets", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getSecretsFindings(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/secrets/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const secretTypes = [
      { type: "aws_access_key", masked: "AKIA****EXAMPLE", path: "src/config/aws.js", line: 12, severity: "critical" as const },
      { type: "github_token", masked: "ghp_****example", path: ".env.backup", line: 3, severity: "critical" as const },
      { type: "gcp_api_key", masked: "AIza****example", path: "backend/auth.py", line: 45, severity: "critical" as const },
      { type: "stripe_key", masked: "sk_live_****example", path: "src/payment.ts", line: 8, severity: "critical" as const },
      { type: "private_key", masked: "-----BEGIN RSA PRIVATE KEY-----****", path: "certs/server.key", line: 1, severity: "high" as const },
      { type: "database_url", masked: "postgresql://user:****@host/db", path: "config/database.yml", line: 22, severity: "high" as const },
    ];
    const existing = await storage.getSecretsFindings(orgId);
    const newFindings = secretTypes.slice(0, 2 + Math.floor(Math.random() * 3));
    for (const s of newFindings) {
      if (!existing.find(e => e.secretType === s.type && e.filePath === s.path)) {
        await storage.createSecretsFinding({ organizationId: orgId, secretType: s.type, maskedValue: s.masked, filePath: s.path, lineNumber: s.line, commitHash: `abc${Math.random().toString(36).substr(2, 7)}`, status: "open", severity: s.severity });
      }
    }
    const all = await storage.getSecretsFindings(orgId);
    res.json({ scanned: 847, found: all.length, open: all.filter(s => s.status === "open").length, items: all });
  });
  app.put("/api/secrets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const data = { ...req.body };
    if (data.status === "resolved" && !data.resolvedAt) data.resolvedAt = new Date();
    const item = await storage.updateSecretsFinding(req.params.id, data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/secrets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteSecretsFinding(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ===== RISK REGISTER =====
  app.get("/api/risks", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getRisks(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/risks", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const body = req.body;
    const riskScore = (body.likelihood || 3) * (body.impact || 3);
    const item = await storage.createRisk({ ...body, organizationId: req.user!.organizationId, riskScore });
    res.json(item);
  });
  app.put("/api/risks/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const body = req.body;
    if (body.likelihood && body.impact) body.riskScore = body.likelihood * body.impact;
    const item = await storage.updateRisk(req.params.id, body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/risks/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteRisk(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });
  app.get("/api/risks/matrix", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getRisks(req.user!.organizationId);
    const matrix = items.map(r => ({ id: r.id, title: r.title, likelihood: r.likelihood, impact: r.impact, riskScore: r.riskScore, treatment: r.treatment, status: r.status }));
    const summary = { critical: matrix.filter(r => r.riskScore >= 20).length, high: matrix.filter(r => r.riskScore >= 12 && r.riskScore < 20).length, medium: matrix.filter(r => r.riskScore >= 6 && r.riskScore < 12).length, low: matrix.filter(r => r.riskScore < 6).length };
    res.json({ matrix, summary });
  });

  // ===== ATTACK SURFACE =====
  app.get("/api/attack-surface", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getAttackSurfaceAssets(req.user!.organizationId);
    res.json(items);
  });
  app.post("/api/attack-surface", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const item = await storage.createAttackSurfaceAsset({ ...req.body, organizationId: req.user!.organizationId });
    res.json(item);
  });
  app.post("/api/attack-surface/discover", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const assets = [
      { assetType: "subdomain", host: "api.example.com", port: 443, service: "HTTPS", riskLevel: "medium", technologies: ["nginx", "TLS 1.3"], openPorts: [443, 80], vulnerabilityCount: 2, tlsCertIssuer: "Let's Encrypt" },
      { assetType: "subdomain", host: "admin.example.com", port: 443, service: "HTTPS", riskLevel: "high", technologies: ["Apache", "PHP 7.4"], openPorts: [443, 80, 8080], vulnerabilityCount: 5 },
      { assetType: "subdomain", host: "staging.example.com", port: 8080, service: "HTTP", riskLevel: "critical", technologies: ["Node.js", "Express"], openPorts: [8080, 22, 3306], vulnerabilityCount: 8 },
      { assetType: "ip", host: "203.0.113.10", port: 22, service: "SSH", riskLevel: "high", technologies: ["OpenSSH 7.4"], openPorts: [22, 80], vulnerabilityCount: 3 },
      { assetType: "certificate", host: "example.com", service: "TLS", riskLevel: "low", technologies: ["RSA 2048"], openPorts: [443], vulnerabilityCount: 0, tlsCertIssuer: "DigiCert", tlsCertExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { assetType: "api_endpoint", host: "api.example.com/v1/users", service: "REST API", riskLevel: "medium", technologies: ["JSON", "JWT"], openPorts: [443], vulnerabilityCount: 1 },
    ];
    const existing = await storage.getAttackSurfaceAssets(orgId);
    let newCount = 0;
    for (const a of assets) {
      if (!existing.find(e => e.host === a.host && e.service === a.service)) {
        await storage.createAttackSurfaceAsset({ organizationId: orgId, ...a } as any);
        newCount++;
      }
    }
    const all = await storage.getAttackSurfaceAssets(orgId);
    res.json({ discovered: newCount, total: all.length, assets: all });
  });
  app.put("/api/attack-surface/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const item = await storage.updateAttackSurfaceAsset(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/attack-surface/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAttackSurfaceAsset(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ===== SECURITY POSTURE SCORE TRENDING =====
  app.get("/api/posture", requireAuth, async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 30;
    const items = await storage.getPostureScores(req.user!.organizationId, limit);
    res.json(items.reverse());
  });
  app.get("/api/posture/current", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    let current = await storage.getLatestPostureScore(orgId);
    if (!current) {
      current = await storage.createPostureScore({ organizationId: orgId, date: new Date().toISOString().split("T")[0], overallScore: 72, scanScore: 78, pentestScore: 65, cloudScore: 70, complianceScore: 82, incidentScore: 68, vulnerabilityScore: 71, trend: "stable" });
    }
    res.json(current);
  });
  app.post("/api/posture/snapshot", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const latest = await storage.getLatestPostureScore(orgId);
    const baseScore = latest?.overallScore || 72;
    const delta = Math.floor(Math.random() * 11) - 5;
    const newScore = Math.min(100, Math.max(0, baseScore + delta));
    const trend = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
    const snapshot = await storage.createPostureScore({
      organizationId: orgId, date: new Date().toISOString().split("T")[0],
      overallScore: newScore, scanScore: Math.min(100, Math.max(0, (latest?.scanScore || 78) + Math.floor(Math.random() * 7) - 3)),
      pentestScore: Math.min(100, Math.max(0, (latest?.pentestScore || 65) + Math.floor(Math.random() * 7) - 3)),
      cloudScore: Math.min(100, Math.max(0, (latest?.cloudScore || 70) + Math.floor(Math.random() * 7) - 3)),
      complianceScore: Math.min(100, Math.max(0, (latest?.complianceScore || 82) + Math.floor(Math.random() * 7) - 3)),
      incidentScore: Math.min(100, Math.max(0, (latest?.incidentScore || 68) + Math.floor(Math.random() * 7) - 3)),
      vulnerabilityScore: Math.min(100, Math.max(0, (latest?.vulnerabilityScore || 71) + Math.floor(Math.random() * 7) - 3)),
      trend,
    });
    res.json(snapshot);
  });

  // ===== NOTIFICATIONS =====
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const limit = parseInt(req.query.limit as string) || 30;
    const items = await storage.getNotifications(orgId, limit);
    const unreadCount = await storage.getUnreadCount(orgId);
    res.json({ notifications: items, unreadCount });
  });

  app.post("/api/notifications/read", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { id } = req.body;
    if (id) {
      await storage.markNotificationRead(id, orgId);
    } else {
      await storage.markAllNotificationsRead(orgId);
    }
    res.json({ ok: true });
  });

  // ===== TEAM MANAGEMENT =====
  app.get("/api/team", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const [members, invites] = await Promise.all([
      storage.getTeamMembers(orgId),
      storage.getInviteTokens(orgId),
    ]);
    const safeMembers = members.map(m => ({ id: m.id, username: m.username, email: m.email, fullName: m.fullName, role: m.role, avatarUrl: m.avatarUrl, createdAt: m.createdAt }));
    const pendingInvites = invites.filter(i => !i.acceptedAt && i.expiresAt > new Date());
    res.json({ members: safeMembers, pendingInvites });
  });

  app.post("/api/team/invite", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
      const { email, role = "analyst" } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invite = await storage.createInviteToken({ organizationId: orgId, email, role, token, invitedById: userId, expiresAt });

      await logAudit(orgId, userId, "team.invite_sent", "user", undefined, { email, role }, req.ip);
      await storage.upsertOnboardingStep(orgId, "invite_teammate", true);

      res.json({ invite, inviteLink: `/accept-invite?token=${token}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to send invite" });
    }
  });

  app.patch("/api/team/:userId/role", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const currentUserId = req.user!.userId;
    const { userId } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });
    const validRoles = ["owner", "admin", "analyst", "viewer"];
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (userId === currentUserId) return res.status(400).json({ message: "Cannot change your own role" });
    const updated = await storage.updateUserRole(userId, orgId, role);
    if (!updated) return res.status(404).json({ message: "User not found" });
    await logAudit(orgId, currentUserId, "team.role_changed", "user", userId, { newRole: role }, req.ip);
    res.json({ id: updated.id, username: updated.username, email: updated.email, role: updated.role });
  });

  app.delete("/api/team/:userId", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const currentUserId = req.user!.userId;
    const { userId } = req.params;
    if (userId === currentUserId) return res.status(400).json({ message: "Cannot remove yourself" });
    await storage.removeTeamMember(userId, orgId);
    await logAudit(orgId, currentUserId, "team.member_removed", "user", userId, {}, req.ip);
    res.json({ ok: true });
  });

  app.get("/api/invite/:token", async (req: Request, res: Response) => {
    const invite = await storage.getInviteByToken(req.params.token);
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return res.status(404).json({ message: "Invalid or expired invite" });
    }
    res.json({ email: invite.email, role: invite.role });
  });

  // ===== ONBOARDING =====
  app.get("/api/onboarding", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    await storage.initOnboarding(orgId);
    const rawSteps = await storage.getOnboardingSteps(orgId);

    const stepOrder = ["create_org", "invite_team", "enable_sso", "connect_repo", "add_cloud_account", "run_first_scan", "enable_billing", "generate_api_key"];
    const stepLabels: Record<string, { label: string; description: string; href: string }> = {
      create_org: { label: "Create organization", description: "Your organization has been created and configured.", href: "/settings" },
      invite_team: { label: "Invite team member", description: "Bring in a colleague to collaborate on security operations.", href: "/team" },
      enable_sso: { label: "Enable SSO", description: "Configure Single Sign-On with Okta, Google, or Azure AD.", href: "/enterprise" },
      connect_repo: { label: "Connect repository", description: "Link a GitHub or GitLab repository to enable scanning.", href: "/repositories" },
      add_cloud_account: { label: "Add cloud account", description: "Connect an AWS, GCP, or Azure environment for CSPM.", href: "/cloud-security" },
      run_first_scan: { label: "Run first scan", description: "Execute a security scan on a connected repository.", href: "/scans" },
      enable_billing: { label: "Enable billing", description: "Set up your subscription plan to unlock all features.", href: "/billing" },
      generate_api_key: { label: "Generate API key", description: "Create an API key for programmatic platform access.", href: "/api-keys" },
    };

    const [repos, scans, cloudTargets, teamMembers, invites, apiKeys, subscription] = await Promise.all([
      storage.getRepositories(orgId),
      storage.getScans(orgId),
      storage.getCloudScanTargets(orgId),
      storage.getTeamMembers(orgId),
      storage.getInviteTokens(orgId),
      storage.getApiKeys(orgId),
      storage.getSubscription(orgId),
    ]);

    const autoCompleted: Record<string, boolean> = {
      create_org: true,
      invite_team: teamMembers.length > 1 || invites.some(i => !i.acceptedAt),
      enable_sso: false,
      connect_repo: repos.length > 0,
      add_cloud_account: cloudTargets.length > 0,
      run_first_scan: scans.some(s => s.status === "completed"),
      enable_billing: !!subscription && subscription.plan !== "starter",
      generate_api_key: apiKeys.length > 0,
    };

    for (const [step, completed] of Object.entries(autoCompleted)) {
      if (completed) await storage.upsertOnboardingStep(orgId, step, true);
    }

    const stepsMap = Object.fromEntries(rawSteps.map(s => [s.step, s]));
    const steps = stepOrder.map(key => ({
      step: key,
      label: stepLabels[key]?.label ?? key,
      description: stepLabels[key]?.description ?? "",
      href: stepLabels[key]?.href ?? "/dashboard",
      completed: stepsMap[key]?.completed ?? autoCompleted[key] ?? false,
      completedAt: stepsMap[key]?.completedAt ?? null,
    }));

    const allDone = steps.every(s => s.completed);
    res.json({ steps, allDone, completedCount: steps.filter(s => s.completed).length, totalCount: steps.length });
  });

  app.post("/api/onboarding/:step/complete", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    await storage.upsertOnboardingStep(orgId, req.params.step, true);
    res.json({ ok: true });
  });

  // ── Security Awareness ────────────────────────────────────────────────────
  app.get("/api/security-awareness/training", requireAuth, async (req: Request, res: Response) => {
    const records = await storage.getTrainingRecords(req.user!.organizationId);
    res.json(records);
  });

  app.post("/api/security-awareness/training", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const r = await storage.createTrainingRecord({ ...req.body, organizationId: orgId });
    res.json(r);
  });

  app.put("/api/security-awareness/training/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const r = await storage.updateTrainingRecord(req.params.id, req.body);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });

  app.delete("/api/security-awareness/training/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteTrainingRecord(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/security-awareness/campaigns", requireAuth, async (req: Request, res: Response) => {
    const campaigns = await storage.getPhishingCampaigns(req.user!.organizationId);
    res.json(campaigns);
  });

  app.post("/api/security-awareness/campaigns", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const c = await storage.createPhishingCampaign({ ...req.body, organizationId: orgId });
    res.json(c);
  });

  app.put("/api/security-awareness/campaigns/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const c = await storage.updatePhishingCampaign(req.params.id, req.body);
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  });

  app.post("/api/security-awareness/campaigns/:id/launch", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const existing = await storage.getPhishingCampaigns(orgId);
    const campaign = existing.find(c => c.id === req.params.id);
    if (!campaign) return res.status(404).json({ message: "Not found" });
    const targetCount = campaign.targetCount || Math.floor(Math.random() * 50) + 10;
    const clickedCount = Math.floor(targetCount * (Math.random() * 0.4 + 0.05));
    const reportedCount = Math.floor(targetCount * (Math.random() * 0.2 + 0.05));
    const ignoredCount = targetCount - clickedCount - reportedCount;
    const humanRiskScore = Math.round((clickedCount / targetCount) * 100);
    const updated = await storage.updatePhishingCampaign(req.params.id, {
      status: "completed", targetCount, clickedCount, reportedCount, ignoredCount: Math.max(0, ignoredCount),
      humanRiskScore, launchedAt: new Date(), completedAt: new Date(),
    });
    res.json(updated);
  });

  app.delete("/api/security-awareness/campaigns/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deletePhishingCampaign(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/security-awareness/stats", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const [records, campaigns] = await Promise.all([
      storage.getTrainingRecords(orgId),
      storage.getPhishingCampaigns(orgId),
    ]);
    const completedTraining = records.filter(r => r.completed).length;
    const avgPhishingScore = campaigns.length > 0
      ? Math.round(campaigns.reduce((s, c) => s + c.humanRiskScore, 0) / campaigns.length)
      : 0;
    res.json({ totalEmployees: records.length, completedTraining, completionRate: records.length > 0 ? Math.round((completedTraining / records.length) * 100) : 0, avgPhishingScore, activeCampaigns: campaigns.filter(c => c.status === "active").length });
  });

  // ── Vendor Risk ───────────────────────────────────────────────────────────
  app.get("/api/vendors", requireAuth, async (req: Request, res: Response) => {
    const vendors = await storage.getVendors(req.user!.organizationId);
    res.json(vendors);
  });

  app.post("/api/vendors", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const v = await storage.createVendor({ ...req.body, organizationId: orgId });
    res.json(v);
  });

  app.put("/api/vendors/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const v = await storage.updateVendor(req.params.id, req.body);
    if (!v) return res.status(404).json({ message: "Not found" });
    res.json(v);
  });

  app.post("/api/vendors/:id/assess", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const riskScore = Math.floor(Math.random() * 100);
    const riskRating = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
    const v = await storage.updateVendor(req.params.id, {
      riskScore, riskRating, complianceStatus: Math.random() > 0.3 ? "compliant" : "non-compliant",
      lastAssessedAt: new Date(), status: "assessed",
    });
    res.json(v);
  });

  app.delete("/api/vendors/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteVendor(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/vendors/stats", requireAuth, async (req: Request, res: Response) => {
    const vendors = await storage.getVendors(req.user!.organizationId);
    const high = vendors.filter(v => v.riskRating === "high").length;
    const medium = vendors.filter(v => v.riskRating === "medium").length;
    const low = vendors.filter(v => v.riskRating === "low").length;
    const avgRisk = vendors.length > 0 ? Math.round(vendors.reduce((s, v) => s + v.riskScore, 0) / vendors.length) : 0;
    res.json({ total: vendors.length, high, medium, low, avgRisk });
  });

  // ── Dark Web Monitoring ───────────────────────────────────────────────────
  app.get("/api/dark-web/alerts", requireAuth, async (req: Request, res: Response) => {
    const alerts = await storage.getDarkWebAlerts(req.user!.organizationId);
    res.json(alerts);
  });

  app.post("/api/dark-web/scan", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const domain = req.body.domain || "company.com";
    const alertTypes = ["credential", "api_key", "email", "pii", "source_code"];
    const sources = ["PasteBin", "RaidForums", "BreachDB", "TelegramChannel", "DarkNetForum"];
    const newAlerts = [];
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = alertType === "credential" || alertType === "api_key" ? "critical" : "high";
      const alert = await storage.createDarkWebAlert({
        organizationId: orgId, domain, alertType, severity,
        source: sources[Math.floor(Math.random() * sources.length)],
        maskedValue: alertType === "credential" ? `${domain.split(".")[0]}_user:p***word` : alertType === "api_key" ? "sk-****...****" : `user@${domain}`,
        description: `${alertType === "credential" ? "Employee credentials" : alertType === "api_key" ? "API key" : "Email addresses"} found in ${sources[Math.floor(Math.random() * sources.length)]} breach database`,
        status: "new",
      });
      newAlerts.push(alert);
    }
    res.json({ scanned: domain, alertsFound: newAlerts.length, alerts: newAlerts });
  });

  app.put("/api/dark-web/alerts/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const a = await storage.updateDarkWebAlert(req.params.id, req.body);
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  });

  app.delete("/api/dark-web/alerts/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteDarkWebAlert(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/dark-web/stats", requireAuth, async (req: Request, res: Response) => {
    const alerts = await storage.getDarkWebAlerts(req.user!.organizationId);
    res.json({
      total: alerts.length,
      new: alerts.filter(a => a.status === "new").length,
      critical: alerts.filter(a => a.severity === "critical").length,
      resolved: alerts.filter(a => a.status === "resolved").length,
    });
  });

  // ── Security Roadmap ──────────────────────────────────────────────────────
  app.get("/api/roadmap/tasks", requireAuth, async (req: Request, res: Response) => {
    const tasks = await storage.getRemediationTasks(req.user!.organizationId);
    res.json(tasks);
  });

  app.post("/api/roadmap/tasks", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const t = await storage.createRemediationTask({ ...req.body, organizationId: orgId });
    res.json(t);
  });

  app.put("/api/roadmap/tasks/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const data = { ...req.body };
    if (data.status === "completed" && !data.completedAt) data.completedAt = new Date();
    const t = await storage.updateRemediationTask(req.params.id, data);
    if (!t) return res.status(404).json({ message: "Not found" });
    res.json(t);
  });

  app.delete("/api/roadmap/tasks/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteRemediationTask(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/roadmap/stats", requireAuth, async (req: Request, res: Response) => {
    const tasks = await storage.getRemediationTasks(req.user!.organizationId);
    const open = tasks.filter(t => t.status === "open").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    res.json({ total: tasks.length, open, inProgress, completed, progress });
  });

  // ── Bug Bounty ────────────────────────────────────────────────────────────
  app.get("/api/bounty/reports", requireAuth, async (req: Request, res: Response) => {
    const reports = await storage.getBountyReports(req.user!.organizationId);
    res.json(reports);
  });

  app.post("/api/bounty/report", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const r = await storage.createBountyReport({ ...req.body, organizationId: orgId, status: "new" });
    res.json(r);
  });

  app.put("/api/bounty/reports/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const data = { ...req.body };
    if (data.status === "resolved" && !data.resolvedAt) data.resolvedAt = new Date();
    const r = await storage.updateBountyReport(req.params.id, data);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });

  app.delete("/api/bounty/reports/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteBountyReport(req.params.id, req.user!.organizationId);
    res.json({ ok: true });
  });

  app.get("/api/bounty/stats", requireAuth, async (req: Request, res: Response) => {
    const reports = await storage.getBountyReports(req.user!.organizationId);
    const totalReward = reports.reduce((s, r) => s + (r.reward || 0), 0);
    res.json({
      total: reports.length,
      new: reports.filter(r => r.status === "new").length,
      triaged: reports.filter(r => r.status === "triaged").length,
      resolved: reports.filter(r => r.status === "resolved").length,
      critical: reports.filter(r => r.severity === "critical").length,
      totalReward,
    });
  });

  // ── Container Security ────────────────────────────────────────────────────
  app.get("/api/containers/scans", requireAuth, async (req: Request, res: Response) => {
    const scans = await storage.getContainerScans(req.user!.organizationId);
    res.json(scans);
  });

  app.post("/api/containers/scan", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { imageName, imageTag = "latest", scanType = "image" } = req.body;
    if (!imageName) return res.status(400).json({ message: "imageName is required" });
    const scan = await storage.createContainerScan({ organizationId: orgId, imageName, imageTag, scanType, status: "running" });
    setTimeout(async () => {
      const criticalCount = Math.floor(Math.random() * 5);
      const highCount = Math.floor(Math.random() * 10);
      const mediumCount = Math.floor(Math.random() * 15);
      const lowCount = Math.floor(Math.random() * 20);
      const privilegedContainers = scanType === "kubernetes" ? Math.floor(Math.random() * 3) : 0;
      const weakRbac = scanType === "kubernetes" && Math.random() > 0.5;
      const openDashboards = scanType === "kubernetes" && Math.random() > 0.7;
      const untrustedImages = Math.floor(Math.random() * 3);
      await storage.updateContainerScan(scan.id, {
        status: "completed", criticalCount, highCount, mediumCount, lowCount,
        privilegedContainers, weakRbac, openDashboards, untrustedImages, completedAt: new Date(),
      });
      const findings = [
        { title: "CVE-2023-44487 HTTP/2 Rapid Reset Attack", severity: "critical", findingType: "vulnerability", cveId: "CVE-2023-44487", packageName: "golang.org/x/net", description: "HTTP/2 protocol allows DoS attack via rapid stream resets" },
        { title: "Outdated OpenSSL version", severity: "high", findingType: "vulnerability", cveId: "CVE-2023-0464", packageName: "openssl", description: "Certificate verification vulnerability in OpenSSL 3.0.x" },
        { title: "Container running as root", severity: "high", findingType: "misconfiguration", description: "Container process is running as UID 0 (root), violating least privilege" },
        { title: "Sensitive environment variables exposed", severity: "medium", findingType: "secret", description: "DATABASE_PASSWORD and API_KEY found in container environment" },
        { title: "Missing resource limits", severity: "medium", findingType: "misconfiguration", description: "No CPU or memory limits set, container could consume all node resources" },
      ];
      for (let i = 0; i < Math.min(criticalCount + highCount + mediumCount, findings.length); i++) {
        await storage.createContainerFinding({ ...findings[i], scanId: scan.id, organizationId: orgId, fixedVersion: "latest", remediation: "Update the affected package and rebuild the image", status: "open" });
      }
    }, 3000);
    res.json(scan);
  });

  app.get("/api/containers/scans/:id/findings", requireAuth, async (req: Request, res: Response) => {
    const findings = await storage.getContainerFindings(req.params.id);
    res.json(findings);
  });

  app.get("/api/containers/stats", requireAuth, async (req: Request, res: Response) => {
    const scans = await storage.getContainerScans(req.user!.organizationId);
    const completed = scans.filter(s => s.status === "completed");
    res.json({
      totalScans: scans.length,
      totalCritical: completed.reduce((s, c) => s + c.criticalCount, 0),
      totalHigh: completed.reduce((s, c) => s + c.highCount, 0),
      privilegedContainers: completed.reduce((s, c) => s + c.privilegedContainers, 0),
      weakRbac: completed.filter(c => c.weakRbac).length,
    });
  });

  // ── Asset Inventory ───────────────────────────────────────────────────────
  app.get("/api/assets", requireAuth, async (req: Request, res: Response) => {
    const assets = await storage.getAssets(req.user!.organizationId);
    res.json(assets);
  });

  app.get("/api/assets/stats", requireAuth, async (req: Request, res: Response) => {
    const assets = await storage.getAssets(req.user!.organizationId);
    res.json({
      total: assets.length,
      byType: {
        server: assets.filter(a => a.assetType === "server").length,
        container: assets.filter(a => a.assetType === "container").length,
        domain: assets.filter(a => a.assetType === "domain").length,
        repository: assets.filter(a => a.assetType === "repository").length,
      },
      byEnvironment: {
        production: assets.filter(a => a.environment === "production").length,
        staging: assets.filter(a => a.environment === "staging").length,
        development: assets.filter(a => a.environment === "development").length,
      },
      byCriticality: {
        critical: assets.filter(a => a.criticality === "critical").length,
        high: assets.filter(a => a.criticality === "high").length,
        medium: assets.filter(a => a.criticality === "medium").length,
        low: assets.filter(a => a.criticality === "low").length,
      },
      totalVulnerabilities: assets.reduce((s, a) => s + a.vulnerabilityCount, 0),
      totalCves: assets.reduce((s, a) => s + a.cveCount, 0),
    });
  });

  app.get("/api/assets/:id", requireAuth, async (req: Request, res: Response) => {
    const asset = await storage.getAsset(req.params.id, req.user!.organizationId);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  });

  app.post("/api/assets", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const asset = await storage.createAsset({ ...req.body, organizationId: req.user!.organizationId });
    res.json(asset);
  });

  app.patch("/api/assets/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const updated = await storage.updateAsset(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Asset not found" });
    res.json(updated);
  });

  app.delete("/api/assets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAsset(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ── CVE Intelligence ──────────────────────────────────────────────────────
  app.get("/api/cve/database", requireAuth, async (req: Request, res: Response) => {
    const cves = await fetchCveDatabase(req.user!.organizationId);
    res.json(cves);
  });

  app.get("/api/cve/stats", requireAuth, async (req: Request, res: Response) => {
    const cves = await fetchCveDatabase(req.user!.organizationId);
    res.json({
      total: cves.length,
      critical: cves.filter(c => c.severity === "critical").length,
      high: cves.filter(c => c.severity === "high").length,
      affectedInEnvironment: cves.filter(c => c.affectedInEnvironment).length,
      avgCvss: parseFloat((cves.reduce((s, c) => s + c.cvssScore, 0) / cves.length).toFixed(1)),
    });
  });

  // ── Attack Path Modeling ──────────────────────────────────────────────────
  app.get("/api/attack-paths", requireAuth, async (req: Request, res: Response) => {
    const paths = await storage.getAttackPaths(req.user!.organizationId);
    res.json(paths);
  });

  app.get("/api/attack-paths/stats", requireAuth, async (req: Request, res: Response) => {
    const paths = await storage.getAttackPaths(req.user!.organizationId);
    res.json({
      total: paths.length,
      active: paths.filter(p => !p.mitigated).length,
      mitigated: paths.filter(p => p.mitigated).length,
      critical: paths.filter(p => p.severity === "critical").length,
      high: paths.filter(p => p.severity === "high").length,
      avgRiskScore: paths.length > 0 ? Math.round(paths.reduce((s, p) => s + p.riskScore, 0) / paths.length) : 0,
    });
  });

  {
    const { registerExposureRoutes } = await import("./exposure");
    await registerExposureRoutes(app);
    const { registerExposureManagerRoutes } = await import("./exposure-manager");
    await registerExposureManagerRoutes(app);
  }

  app.get("/api/attack-paths/:id", requireAuth, async (req: Request, res: Response) => {
    const path = await storage.getAttackPath(req.params.id, req.user!.organizationId);
    if (!path) return res.status(404).json({ message: "Attack path not found" });
    res.json(path);
  });

  app.patch("/api/attack-paths/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const existing = await storage.getAttackPath(req.params.id, req.user!.organizationId);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateAttackPath(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/attack-paths/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAttackPath(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ── Threat Hunting ────────────────────────────────────────────────────────
  app.get("/api/hunt", requireAuth, async (req: Request, res: Response) => {
    const query = (req.query.q as string) || "";
    if (!query.trim()) return res.json({ results: [], count: 0, query });
    const results = await runThreatHunt(query, req.user!.organizationId);
    const saved = await storage.createThreatHuntQuery({
      organizationId: req.user!.organizationId,
      query,
      queryType: "general",
      resultsCount: results.length,
      results,
      savedByUserId: req.user!.userId,
    });
    res.json({ results, count: results.length, query, queryId: saved.id });
  });

  app.get("/api/hunt/history", requireAuth, async (req: Request, res: Response) => {
    const history = await storage.getThreatHuntQueries(req.user!.organizationId);
    res.json(history);
  });

  app.delete("/api/hunt/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteThreatHuntQuery(req.params.id, req.user!.organizationId);
    res.json({ success: true });
  });

  // ── Security Copilot ──────────────────────────────────────────────────────
  app.post("/api/copilot/chat", requireAuth, async (req: Request, res: Response) => {
    const { message, conversationId } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

    const existing = await storage.getCopilotConversation(req.user!.organizationId, req.user!.userId);
    const messages: any[] = existing ? (existing.messages as any[]) : [];

    messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

    const response = await runSecurityCopilot(message, req.user!.organizationId);
    messages.push({ role: "assistant", content: response, timestamp: new Date().toISOString() });

    await storage.upsertCopilotConversation(req.user!.organizationId, req.user!.userId, messages);

    res.json({ response, messages });
  });

  app.get("/api/copilot/history", requireAuth, async (req: Request, res: Response) => {
    const conv = await storage.getCopilotConversation(req.user!.organizationId, req.user!.userId);
    res.json({ messages: conv ? (conv.messages as any[]) : [] });
  });

  app.delete("/api/copilot/history", requireAuth, async (req: Request, res: Response) => {
    await storage.upsertCopilotConversation(req.user!.organizationId, req.user!.userId, []);
    res.json({ success: true });
  });

  // ── Intelligence Stats (Dashboard) ───────────────────────────────────────
  app.get("/api/intelligence/stats", requireAuth, async (req: Request, res: Response) => {
    const [cves, assets, paths, queries, convs] = await Promise.all([
      fetchCveDatabase(req.user!.organizationId),
      storage.getAssets(req.user!.organizationId),
      storage.getAttackPaths(req.user!.organizationId),
      storage.getThreatHuntQueries(req.user!.organizationId),
      storage.getCopilotConversation(req.user!.organizationId, req.user!.userId),
    ]);
    res.json({
      assets: assets.length,
      criticalAssets: assets.filter(a => a.criticality === "critical").length,
      cves: cves.length,
      criticalCves: cves.filter(c => c.severity === "critical").length,
      affectedCves: cves.filter(c => c.affectedInEnvironment).length,
      attackPaths: paths.filter(p => !p.mitigated).length,
      criticalPaths: paths.filter(p => p.severity === "critical" && !p.mitigated).length,
      highestRiskPath: paths.sort((a, b) => b.riskScore - a.riskScore)[0] || null,
      huntQueries: queries.length,
      huntHits: queries.reduce((s: number, q: any) => s + (q.hitCount ?? 0), 0),
      copilotConversations: convs ? 1 : 0,
    });
  });

  await registerSoarRoutes(app);
  await registerSecurityEventsRoutes(app);
  await registerGraphRoutes(app);
  await registerMetricsRoutes(app);
  const { registerCaasmRoutes } = await import("./caasm");
  await registerCaasmRoutes(app);
  const { registerTeamOpsRoutes } = await import("./team-ops");
  await registerTeamOpsRoutes(app);
  const { registerEnterpriseRoutes } = await import("./enterprise");
  await registerEnterpriseRoutes(app);

  registerStripeRoutes(app, requireAuth);

  return httpServer;
}

function generatePDFContent(report: any): Buffer {
  const lines = [
    `%PDF-1.4`,
    `ZYRA - SECURITY AUDIT REPORT`,
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

// ── SOAR Routes ─────────────────────────────────────────────────────────────
async function registerSoarRoutes(app: Express) {
  app.get("/api/soar/playbooks", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const playbooks = await storage.getSoarPlaybooks(orgId);
      res.json(playbooks);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/soar/executions", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const executions = await storage.getSoarExecutions(orgId);
      res.json(executions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/soar/execute/:playbookId", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
      const { playbookId } = req.params;
      const result = await executePlaybook(playbookId, orgId, userId, req.body);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/soar/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const playbooks = await storage.getSoarPlaybooks(orgId);
      const executions = await storage.getSoarExecutions(orgId);
      res.json({
        totalPlaybooks: playbooks.length,
        activePlaybooks: playbooks.filter(p => p.isActive).length,
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === "success").length,
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}

// ── Security Events Routes ───────────────────────────────────────────────────
async function registerSecurityEventsRoutes(app: Express) {
  app.get("/api/security-events", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await storage.getSecurityEvents(orgId, limit);
      res.json(events);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/security-events", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const ev = await storage.createSecurityEvent({ ...req.body, organizationId: orgId });
      res.json(ev);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/security-events/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const events = await storage.getSecurityEvents(orgId, 500);
      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      const bySource: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const ev of events) {
        (bySeverity as any)[ev.severity] = ((bySeverity as any)[ev.severity] ?? 0) + 1;
        bySource[ev.source] = (bySource[ev.source] ?? 0) + 1;
        byType[ev.eventType] = (byType[ev.eventType] ?? 0) + 1;
      }
      res.json({ total: events.length, bySeverity, bySource, byType, correlated: events.filter(e => e.isCorrelated).length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/correlate", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const result = await runThreatCorrelation(orgId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}

// ── Graph Routes ─────────────────────────────────────────────────────────────
async function registerGraphRoutes(app: Express) {
  app.get("/api/graph", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const data = await getGraphData(orgId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/graph/nodes", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const { nodeType, externalId, label, properties, riskScore } = req.body;
      const node = await addGraphNode(orgId, nodeType, externalId, label, properties, riskScore);
      res.json(node);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/graph/edges", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const { sourceNodeId, targetNodeId, edgeType, weight } = req.body;
      const edge = await addGraphEdge(orgId, sourceNodeId, targetNodeId, edgeType, weight);
      res.json(edge);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}

// ── Metrics Routes ────────────────────────────────────────────────────────────
async function registerMetricsRoutes(app: Express) {
  app.get("/metrics", (req: Request, res: Response) => {
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(getPrometheusMetrics());
  });

  app.get("/api/metrics", requireAuth, (req: Request, res: Response) => {
    res.json(getMetrics());
  });

  app.get("/api/dashboard/security-score", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const [scans, incidents, risks, events] = await Promise.all([
        storage.getScans(orgId),
        storage.getIncidents(orgId),
        storage.getRisks(orgId),
        storage.getSecurityEvents(orgId, 200).catch(() => []),
      ]);

      const criticalScans = scans.filter(s => s.criticalCount > 0).length;
      const openIncidents = incidents.filter(i => i.status !== "resolved").length;
      const criticalRisks = risks.filter(r => r.severity === "critical" && r.status !== "accepted").length;
      const criticalEvents = events.filter((e: any) => e.severity === "critical").length;

      const scanScore = Math.max(0, 100 - criticalScans * 8);
      const incidentScore = Math.max(0, 100 - openIncidents * 10 - criticalEvents * 5);
      const riskScore = Math.max(0, 100 - criticalRisks * 12);
      const overallScore = Math.round((scanScore * 0.4 + incidentScore * 0.35 + riskScore * 0.25));

      res.json({
        overall_score: overallScore,
        breakdown: { scans: scanScore, incidents: incidentScore, risks: riskScore },
        risk_trend: overallScore >= 70 ? "improving" : overallScore >= 50 ? "stable" : "degrading",
        critical_findings: criticalScans + openIncidents + criticalRisks,
        last_updated: new Date().toISOString(),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks(req.user!.organizationId);
      res.json(tasks);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/tasks/stats/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks(req.user!.organizationId);
      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === "pending").length,
        running: tasks.filter(t => t.status === "running").length,
        completed: tasks.filter(t => t.status === "completed").length,
        failed: tasks.filter(t => t.status === "failed").length,
        cancelled: tasks.filter(t => t.status === "cancelled").length,
      };
      res.json(stats);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id, req.user!.organizationId);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/tasks", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const parsed = insertTaskSchema.parse({ ...req.body, organizationId: req.user!.organizationId, createdById: req.user!.userId });
      const task = await storage.createTask(parsed);
      await logAudit(req.user!.organizationId, req.user!.userId, "task.created", "task", task.id, { title: task.title }, req.ip);
      res.status(201).json(task);
    } catch (e: any) {
      if (e.name === "ZodError") return res.status(400).json({ message: "Validation error", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tasks/execute-pending", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const count = await processPendingTasks(req.user!.organizationId);
      res.json({ executed: count });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/tasks/execution-history", requireAuth, async (req: Request, res: Response) => {
    try {
      const history = await getTaskExecutionHistory(req.user!.organizationId);
      res.json(history);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/tasks/:id/execute", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const result = await executeTask(req.params.id, req.user!.organizationId);
      if (!result) return res.status(404).json({ message: "Task not found or not pending" });
      await logAudit(req.user!.organizationId, req.user!.userId, "task.executed", "task", req.params.id, { status: result.status }, req.ip);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/tasks/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    try {
      const existing = await storage.getTask(req.params.id, req.user!.organizationId);
      if (!existing) return res.status(404).json({ message: "Task not found" });
      const updates: any = { ...req.body };
      if (updates.status === "running" && existing.status === "pending") updates.startedAt = new Date();
      if ((updates.status === "completed" || updates.status === "failed") && existing.status !== "completed" && existing.status !== "failed") updates.completedAt = new Date();
      const task = await storage.updateTask(req.params.id, updates);
      await logAudit(req.user!.organizationId, req.user!.userId, "task.updated", "task", req.params.id, { status: updates.status }, req.ip);
      res.json(task);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/tasks/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      await storage.deleteTask(req.params.id, req.user!.organizationId);
      await logAudit(req.user!.organizationId, req.user!.userId, "task.deleted", "task", req.params.id, {}, req.ip);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/admin/overview", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const [users, tasks, auditLogs, scans, incidents, subscription] = await Promise.all([
        storage.getOrganizationUsers(orgId),
        storage.getTasks(orgId),
        storage.getAuditLogs(orgId, 50),
        storage.getScans(orgId),
        storage.getIncidents(orgId),
        storage.getSubscription(orgId),
      ]);
      const roleCounts = users.reduce((acc: any, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
      res.json({
        userCount: users.length,
        roleCounts,
        taskStats: { total: tasks.length, pending: tasks.filter(t => t.status === "pending").length, running: tasks.filter(t => t.status === "running").length, completed: tasks.filter(t => t.status === "completed").length, failed: tasks.filter(t => t.status === "failed").length },
        scanCount: scans.length,
        incidentCount: incidents.length,
        recentActivity: auditLogs.slice(0, 20),
        subscription: subscription ? { plan: subscription.plan, status: subscription.status, maxUsers: subscription.maxUsers, maxScansPerMonth: subscription.maxScansPerMonth } : null,
        users: users.map(u => ({ id: u.id, username: u.username, email: u.email, fullName: u.fullName, role: u.role, createdAt: u.createdAt, emailVerified: u.emailVerified })),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch("/api/admin/users/:id/role", requireAuth, requireRole("owner"), async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      if (!["owner", "admin", "analyst", "viewer"].includes(role)) return res.status(400).json({ message: "Invalid role" });
      if (req.params.id === req.user!.userId) return res.status(400).json({ message: "Cannot change your own role" });
      const updated = await storage.updateUserRole(req.params.id, req.user!.organizationId, role);
      if (!updated) return res.status(404).json({ message: "User not found" });
      await logAudit(req.user!.organizationId, req.user!.userId, "admin.role_changed", "user", req.params.id, { newRole: role }, req.ip);
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/admin/env-status", requireAuth, requireRole("owner", "admin"), async (_req: Request, res: Response) => {
    res.json({
      JWT_SECRET: !!process.env.JWT_SECRET,
      DATABASE_URL: !!process.env.DATABASE_URL,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    });
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole("owner"), async (req: Request, res: Response) => {
    try {
      if (req.params.id === req.user!.userId) return res.status(400).json({ message: "Cannot remove yourself" });
      await storage.removeTeamMember(req.params.id, req.user!.organizationId);
      await logAudit(req.user!.organizationId, req.user!.userId, "admin.user_removed", "user", req.params.id, {}, req.ip);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
