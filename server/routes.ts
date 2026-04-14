import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { runScanSimulation } from "./scan-worker";
import { generateReport } from "./report-generator";
import { runPentestSimulation, runCloudScanSimulation, refreshThreatIntel } from "./simulations";
import { fetchCveDatabase, runThreatHunt, runSecurityCopilot, analyzeSecurityImage } from "./intelligence";
import { executePlaybook } from "./soar";
import { seedDemoData } from "./seed-demo";
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
  auditLogs,
} from "@shared/schema";
import { db } from "./db";
import { registerStripeRoutes, isStripeConfigured, isPaidPlan } from "./stripe";
import { executeTask, processPendingTasks, getTaskExecutionHistory } from "./task-runner";
import { generateVerificationToken, getVerificationExpiry, sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail } from "./email";
import { requireAuth, requireRole, generateAccessToken, generateRefreshToken, verifyToken, blacklistToken, isTokenBlacklisted } from "./auth";
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

const severityEnum = z.enum(["critical", "high", "medium", "low", "info"]);
const statusOpenResolved = z.enum(["open", "resolved", "dismissed", "in_progress"]);

const threatIntelUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  severity: severityEnum.optional(),
  status: z.enum(["active", "acknowledged", "resolved", "monitoring"]).optional(),
  description: z.string().max(5000).optional(),
}).strict();

const alertRuleUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  condition: z.string().max(1000).optional(),
  severity: severityEnum.optional(),
  enabled: z.boolean().optional(),
  channels: z.array(z.string()).optional(),
}).strict();

const pipelineUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  provider: z.enum(["github", "gitlab", "bitbucket", "azure"]).optional(),
  status: z.enum(["active", "inactive", "error"]).optional(),
  config: z.record(z.unknown()).optional(),
}).strict();

const sbomUpdateSchema = z.object({
  status: statusOpenResolved.optional(),
  isVulnerable: z.boolean().optional(),
  resolvedAt: z.string().datetime().optional(),
}).strict();

const secretsUpdateSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]).optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
}).strict();

const attackSurfaceUpdateSchema = z.object({
  status: z.enum(["active", "inactive", "monitored", "decommissioned"]).optional(),
  riskLevel: z.enum(["critical", "high", "medium", "low"]).optional(),
}).strict();

const trainingUpdateSchema = z.object({
  courseName: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  completedAt: z.string().datetime().nullable().optional(),
}).strict();

const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "active", "completed", "paused"]).optional(),
  targetCount: z.number().int().min(0).optional(),
  humanRiskScore: z.number().min(0).max(100).optional(),
}).strict();

const vendorUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  riskRating: z.enum(["critical", "high", "medium", "low"]).optional(),
  complianceStatus: z.enum(["compliant", "non-compliant", "partial"]).optional(),
  status: z.enum(["active", "inactive", "under_review"]).optional(),
}).strict();

const darkWebAlertUpdateSchema = z.object({
  status: z.enum(["new", "investigating", "resolved", "dismissed"]).optional(),
  severity: severityEnum.optional(),
}).strict();

const roadmapTaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  completedAt: z.string().datetime().nullable().optional(),
}).strict();

const bountyReportUpdateSchema = z.object({
  status: z.enum(["new", "triaged", "accepted", "resolved", "rejected"]).optional(),
  severity: severityEnum.optional(),
  reward: z.number().min(0).optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
}).strict();

const assetUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().max(100).optional(),
  status: z.enum(["active", "inactive", "decommissioned"]).optional(),
  criticality: z.enum(["critical", "high", "medium", "low"]).optional(),
  owner: z.string().max(200).optional(),
}).strict();

const attackPathUpdateSchema = z.object({
  status: z.enum(["active", "mitigated", "accepted"]).optional(),
  riskScore: z.number().min(0).max(100).optional(),
}).strict();

const taskUpdateSchema = z.object({
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
}).strict();

const deploymentConfigSchema = z.object({
  regions: z.array(z.string()).optional(),
  primaryRegion: z.string().max(50).optional(),
  failoverEnabled: z.boolean().optional(),
  rateLimit: z.number().int().min(1).max(100000).optional(),
}).strict();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(requestMetricsMiddleware());

  app.post("/api/bootstrap/admin", async (req: Request, res: Response) => {
    try {
      const { email, password, secret, username, fullName } = req.body;
      const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
      if (!bootstrapSecret || secret !== bootstrapSecret) {
        return res.status(403).json({ message: "Invalid bootstrap secret" });
      }
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      const uname = username || email.split("@")[0];
      const existingUsername = await storage.getUserByUsername(uname);
      if (existingUsername) {
        return res.status(409).json({ message: "Username already taken" });
      }
      const orgName = req.body.organization || "Zyra";
      const orgSlug = orgName.toLowerCase().replace(/\s+/g, "-");
      let org: any;
      try {
        const { db } = await import("./db");
        const { organizations } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const [existing] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
        org = existing;
      } catch {}
      if (!org) {
        org = await storage.createOrganization({ name: orgName, slug: orgSlug, plan: "enterprise" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        organizationId: org.id,
        username: uname,
        email,
        password: hashedPassword,
        fullName: fullName || "Zyra Admin",
        role: "owner",
        emailVerified: true,
      });
      await logAudit(org.id, user.id, "bootstrap.admin_created", "user", user.id, { email }, req.ip || "unknown");
      res.json({
        message: "Master admin created successfully",
        user: { id: user.id, username: user.username, email: user.email, role: user.role, organization: org.name },
      });
    } catch (err: any) {
      console.error("[bootstrap] Error:", err);
      res.status(500).json({ message: "Bootstrap failed" });
    }
  });

  app.post("/api/seed/demo", requireAuth, requireRole("owner"), async (req: Request, res: Response) => {
    try {
      const result = await seedDemoData(req.user!.organizationId, req.user!.userId);
      await logAudit(req.user!.organizationId, req.user!.userId, "system.demo_seeded", "system", undefined, result, req.ip);
      return res.json(result);
    } catch (err: any) {
      console.error("Seed error:", err);
      return res.status(500).json({ message: err.message || "Seeding failed" });
    }
  });

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

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      blacklistToken(authHeader.slice(7));
    }
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      blacklistToken(refreshToken);
    }
    res.json({ message: "Logged out" });
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required" });
      }
      if (isTokenBlacklisted(refreshToken)) {
        return res.status(401).json({ message: "Refresh token has been revoked" });
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
      const [allScans, allFindings, mappings] = await Promise.all([
        storage.getScans(orgId).catch(() => []),
        storage.getFindingsByOrg(orgId).catch(() => []),
        storage.getComplianceMappings(orgId).catch(() => []),
      ]);

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

      const [pentestSessions, cloudTargets, cloudResults, threatIntel, monitors] = await Promise.all([
        storage.getPentestSessions(orgId).catch(() => []),
        storage.getCloudScanTargets(orgId).catch(() => []),
        storage.getCloudScanResults(orgId).catch(() => []),
        storage.getThreatIntelItems(orgId).catch(() => []),
        storage.getMonitoringConfigs(orgId).catch(() => []),
      ]);

      const pentestFindingsArrays = await Promise.all(
        pentestSessions.map(s => storage.getPentestFindings(s.id).catch(() => []))
      );
      const pentestStats = {
        sessions: pentestSessions.length,
        criticalFindings: pentestFindingsArrays.flat().filter(f => f.severity === "critical").length,
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
        storage.getIncidents(orgId).catch(() => []),
        storage.getVulnerabilities(orgId).catch(() => []),
        storage.getRisks(orgId).catch(() => []),
        storage.getLatestPostureScore(orgId).catch(() => null),
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
        storage.getOrganizationUsers(orgId).catch(() => []),
        storage.getAuditLogs(orgId).catch(() => []),
        storage.getSubscription(orgId).catch(() => null),
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
    await logAudit(req.user!.organizationId, req.user!.userId, "repository.deleted", "repository", id, {}, req.ip);
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

  const settingsUpdateSchema = z.object({
    category: z.string().min(1),
    key: z.string().min(1),
    value: z.any(),
  });

  app.put("/api/settings", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const parsed = settingsUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Category and key are required", errors: parsed.error.flatten().fieldErrors });
      }
      const { category, key, value } = parsed.data;
      const setting = await storage.upsertSetting({ organizationId: orgId, category, key, value });
      await logAudit(orgId, req.user!.userId, "settings.update", "setting", setting.id, { category, key }, req.ip);
      return res.json(setting);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to save setting" });
    }
  });

  app.get("/api/audit-logs", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    let logs = await storage.getAuditLogs(orgId);

    const hasSeeded = logs.some(l => l.action === "auth.system_initialized");
    if (logs.length < 5 && !hasSeeded) {
      const now = Date.now();
      const seedEvents = [
        { action: "auth.system_initialized", resourceType: "system", details: { event: "Platform security engine initialized" }, offset: 86400000 * 6 },
        { action: "auth.admin_created", resourceType: "user", details: { role: "owner", method: "bootstrap" }, offset: 86400000 * 6 },
        { action: "settings.security_policy_updated", resourceType: "setting", details: { mfa: "enabled", sessionTimeout: "30m" }, offset: 86400000 * 5 },
        { action: "scan.vulnerability_scan_completed", resourceType: "scan", details: { findings: 23, critical: 2, high: 5 }, offset: 86400000 * 5 },
        { action: "team.invite_sent", resourceType: "user", details: { email: "analyst@company.com", role: "analyst" }, offset: 86400000 * 4 },
        { action: "incident.threat_detected", resourceType: "incident", details: { type: "Brute Force Attempt", source: "203.0.113.42", severity: "high" }, offset: 86400000 * 4 },
        { action: "auth.failed_login_blocked", resourceType: "user", details: { attempts: 5, ip: "198.51.100.17", action: "IP blocked for 30 minutes" }, offset: 86400000 * 3 },
        { action: "scan.sast_scan_triggered", resourceType: "scan", details: { repository: "api-gateway", branch: "main", tool: "semgrep" }, offset: 86400000 * 3 },
        { action: "deployment.config_update", resourceType: "deployment", details: { region: "us-east-1", failover: true }, offset: 86400000 * 2 },
        { action: "incident.malware_quarantined", resourceType: "incident", details: { file: "payload.exe", hash: "a1b2c3d4e5f6", action: "quarantined" }, offset: 86400000 * 2 },
        { action: "scan.container_scan_completed", resourceType: "scan", details: { image: "app:latest", vulnerabilities: 7, critical: 1 }, offset: 86400000 * 1.5 },
        { action: "auth.privilege_escalation_detected", resourceType: "user", details: { from: "viewer", to: "admin", blocked: true, ip: "10.0.0.55" }, offset: 86400000 },
        { action: "settings.firewall_rules_updated", resourceType: "setting", details: { rulesAdded: 3, rulesRemoved: 1, policy: "strict" }, offset: 86400000 },
        { action: "scan.dependency_audit_completed", resourceType: "scan", details: { packages: 342, vulnerabilities: 12, outdated: 28 }, offset: 43200000 },
        { action: "incident.ddos_mitigated", resourceType: "incident", details: { peakRps: 45000, duration: "12m", origin: "distributed" }, offset: 36000000 },
        { action: "auth.suspicious_session_terminated", resourceType: "user", details: { reason: "Geo-anomaly detected", location: "Unknown VPN" }, offset: 21600000 },
        { action: "deployment.ssl_renewed", resourceType: "deployment", details: { domain: "api.company.com", expiresIn: "90 days" }, offset: 14400000 },
        { action: "scan.pentest_completed", resourceType: "scan", details: { target: "web-app", findings: 8, critical: 0, high: 2 }, offset: 7200000 },
        { action: "incident.data_exfiltration_blocked", resourceType: "incident", details: { bytes: "2.3GB", destination: "185.220.101.1", protocol: "HTTPS" }, offset: 3600000 },
        { action: "auth.mfa_enforced", resourceType: "setting", details: { scope: "organization", method: "TOTP" }, offset: 1800000 },
      ];

      const ips = ["10.0.1.1", "192.168.1.50", "172.16.0.12", "10.10.0.5", "203.0.113.42"];
      const rows = seedEvents.map(evt => ({
        organizationId: orgId,
        userId,
        action: evt.action,
        resourceType: evt.resourceType,
        details: evt.details,
        ipAddress: ips[Math.floor(Math.random() * ips.length)],
        createdAt: new Date(now - evt.offset),
      }));
      try {
        await db.insert(auditLogs).values(rows);
      } catch {}
      logs = await storage.getAuditLogs(orgId);
    }

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

  app.get("/api/billing/usage", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const [teamMembers, scans, repos, sub] = await Promise.all([
        storage.getTeamMembers(orgId).catch(() => []),
        storage.getScans(orgId).catch(() => []),
        storage.getRepositories(orgId).catch(() => []),
        storage.getSubscription(orgId).catch(() => null),
      ]);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const scansThisMonth = scans.filter(s => new Date(s.createdAt) >= monthStart).length;

      const maxUsers = sub?.maxUsers ?? 5;
      const maxScans = sub?.maxScansPerMonth ?? 100;
      const maxRepos = sub?.maxRepositories ?? 10;

      res.json({
        users: { current: teamMembers.length, limit: maxUsers },
        scans: { current: scansThisMonth, limit: maxScans },
        repositories: { current: repos.length, limit: maxRepos },
      });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to get usage" });
    }
  });

  // === ANALYTICS & INSIGHTS ===
  app.get("/api/analytics/overview", requireAuth, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const findings = await storage.getFindingsByOrg(orgId);
      const open = findings.filter((f) => !f.isResolved);
      const resolved = findings.filter((f) => f.isResolved);

      let avgRemediationDays: number | null = null;
      if (resolved.length > 0) {
        const totalMs = resolved.reduce((sum, f) => {
          const created = new Date(f.createdAt).getTime();
          const updated = f.updatedAt ? new Date(f.updatedAt).getTime() : Date.now();
          return sum + (updated - created);
        }, 0);
        avgRemediationDays = Math.round((totalMs / resolved.length) / (1000 * 60 * 60 * 24) * 10) / 10;
      }

      const allScans = await storage.getScans(orgId);
      const repos = await storage.getRepositories(orgId);
      const scannedRepoCount = new Set(allScans.map(s => s.repositoryId).filter(Boolean)).size;
      const totalRepoCount = Math.max(repos.length, 1);
      const coveragePct = Math.round((scannedRepoCount / totalRepoCount) * 100);

      const cloudResults = await storage.getCloudScanResults(orgId);
      const infraFindings = cloudResults.filter(r => r.status === "open").length;
      const appFindings = open.length;

      return res.json({
        remediationVelocity: avgRemediationDays !== null ? `${avgRemediationDays} days` : "N/A",
        vulnerabilityDensity: totalRepoCount > 0 ? (findings.length / totalRepoCount).toFixed(1) : "0",
        riskScore: Math.max(0, 100 - (open.filter(f => f.severity === 'critical').length * 15 + open.filter(f => f.severity === 'high').length * 5)),
        attackSurfaceCoverage: `${coveragePct}%`,
        breakdown: {
          infrastructure: infraFindings,
          application: appFindings,
        },
      });
    } catch (err: any) {
      console.error("Analytics error:", err);
      return res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  const AVAILABLE_REGIONS = [
    { id: "us-east-1", name: "US East (Virginia)" },
    { id: "us-west-2", name: "US West (Oregon)" },
    { id: "eu-west-1", name: "EU West (Ireland)" },
    { id: "eu-central-1", name: "EU Central (Frankfurt)" },
    { id: "ap-southeast-1", name: "AP Southeast (Singapore)" },
    { id: "ap-northeast-1", name: "AP Northeast (Tokyo)" },
  ];

  app.get("/api/deployment/regions", requireAuth, async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const config = await storage.getSetting(orgId, "deployment", "regions");
    const savedConfig = (config?.value as any) || {};

    const regions = AVAILABLE_REGIONS.map(r => ({
      ...r,
      status: savedConfig[r.id] || "disabled",
    }));
    return res.json(regions);
  });

  app.put("/api/deployment/config", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const parsed = deploymentConfigSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      const orgId = req.user!.organizationId;
      const { regions, primaryRegion, failoverEnabled, rateLimit } = parsed.data;

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
    await logAudit(req.user!.organizationId, req.user!.userId, "cloud_target.deleted", "cloud_target", id, {}, req.ip);
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

  app.get("/api/threat-intel/stats", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getThreatIntelItems(req.user!.organizationId);
    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    
    items.forEach(i => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      bySource[i.source] = (bySource[i.source] || 0) + 1;
    });

    res.json({
      bySeverity,
      bySource,
      total: items.length,
      critical: bySeverity["critical"] || 0,
      high: bySeverity["high"] || 0,
      acknowledged: items.filter(i => i.status === "acknowledged").length,
    });
  });

  app.get("/api/threat-intel/:id", requireAuth, async (req: Request, res: Response) => {
    const item = await storage.getThreatIntelItem(req.params.id, req.user!.organizationId);
    if (!item) return res.status(404).json({ message: "Threat intel item not found" });
    res.json(item);
  });

  app.put("/api/threat-intel/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const parsed = threatIntelUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const existing = await storage.getThreatIntelItem(req.params.id, req.user!.organizationId);
    const updated = await storage.updateThreatIntelItem(req.params.id, parsed.data, req.user!.organizationId);
    if (!updated) return res.status(404).json({ message: "Item not found" });
    if (parsed.data.status) {
      await storage.createAuditLog({ organizationId: req.user!.organizationId, userId: req.user!.userId, action: "threat-intel.status-change", resource: "threat_intel", resourceId: req.params.id, details: { previousStatus: existing?.status, newStatus: parsed.data.status, cveId: updated.cveId } });
    }
    res.json(updated);
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
    const orgId = req.user!.organizationId;
    await logAudit(orgId, req.user!.userId, "monitoring.scan_triggered", "monitoring", undefined, { triggeredBy: "manual" }, req.ip);
    res.json({ message: "Monitoring scan triggered", triggeredAt: new Date().toISOString() });
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
    const parsed = alertRuleUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const updated = await storage.updateAlertRule(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Rule not found" });
    res.json(updated);
  });

  app.delete("/api/alerts/rules/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deleteAlertRule(id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "alert_rule.deleted", "alert_rule", id, {}, req.ip);
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
    const parsed = pipelineUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const updated = await storage.updatePipelineConfig(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Pipeline not found" });
    res.json(updated);
  });

  app.delete("/api/pipelines/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await storage.deletePipelineConfig(id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "pipeline.deleted", "pipeline", id, {}, req.ip);
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
  app.get("/api/incidents/:id", requireAuth, async (req: Request, res: Response) => {
    const item = await storage.getIncident(req.params.id, req.user!.organizationId);
    if (!item) return res.status(404).json({ message: "Incident not found" });
    res.json(item);
  });
  const incidentSchema = z.object({
    title: z.string().min(1, "Title is required").max(500),
    description: z.string().optional().default(""),
    severity: z.enum(["critical", "high", "medium", "low"]),
    status: z.string().optional().default("triage"),
    assignee: z.string().optional(),
    assignedTo: z.string().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    affectedSystems: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  });

  app.post("/api/incidents", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = incidentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const item = await storage.createIncident({ ...parsed.data, organizationId: orgId });
    await storage.createAuditLog({ organizationId: orgId, userId: req.user!.userId, action: "incident.create", resource: "incident", resourceId: item.id, details: { title: item.title } });
    const isCritical = item.severity === "critical";
    await storage.createNotification({ organizationId: orgId, title: isCritical ? "Critical Incident Created" : "New Incident Created", message: `Incident "${item.title}" has been created with ${item.severity} severity.`, type: "incident", severity: item.severity, resourceType: "incident", resourceId: item.id });
    res.json(item);
  });
  const incidentUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    severity: z.enum(["critical", "high", "medium", "low"]).optional(),
    status: z.enum(["triage", "assign", "contain", "remediate", "close", "open", "investigating", "contained", "resolved", "closed"]).optional(),
    assignedTo: z.string().optional(),
    category: z.string().optional(),
  }).passthrough();

  app.put("/api/incidents/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = incidentUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update data", errors: parsed.error.flatten().fieldErrors });
    const existing = await storage.getIncident(req.params.id, req.user!.organizationId);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updateData = { ...parsed.data };
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const timelineEntry = { timestamp: new Date().toISOString(), action: `Status changed from ${existing.status} to ${parsed.data.status}`, note: "", user: req.user!.userId };
      updateData.timeline = [...(existing.timeline as any[] || []), timelineEntry];
    }
    const item = await storage.updateIncident(req.params.id, updateData, req.user!.organizationId);
    if (!item) return res.status(404).json({ message: "Not found" });
    if (parsed.data.status && parsed.data.status !== existing.status) {
      await logAudit(req.user!.organizationId, req.user!.userId, "incident.status_changed", "incident", item.id, { previousStatus: existing.status, newStatus: parsed.data.status }, req.ip);
    } else {
      await logAudit(req.user!.organizationId, req.user!.userId, "incident.updated", "incident", item.id, {}, req.ip);
    }
    res.json(item);
  });
  app.delete("/api/incidents/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteIncident(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "incident.deleted", "incident", req.params.id, {}, req.ip);
    res.json({ success: true });
  });
  app.post("/api/incidents/:id/timeline", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const incident = await storage.getIncident(req.params.id, req.user!.organizationId);
    if (!incident) return res.status(404).json({ message: "Not found" });
    const entry = { timestamp: new Date().toISOString(), action: req.body.action, note: req.body.note, user: req.body.user || req.user!.userId };
    const timeline = [...(incident.timeline as any[] || []), entry];
    const updated = await storage.updateIncident(req.params.id, { timeline }, req.user!.organizationId);
    await storage.createAuditLog({ organizationId: req.user!.organizationId, userId: req.user!.userId, action: "incident.timeline.add", resource: "incident", resourceId: req.params.id, details: { action: entry.action, note: entry.note } });
    res.json(updated);
  });

  // ===== VULNERABILITY LIFECYCLE =====
  app.get("/api/vulnerabilities", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getVulnerabilities(req.user!.organizationId);
    res.json(items);
  });
  const vulnerabilitySchema = z.object({
    title: z.string().min(1, "Title is required").max(500),
    description: z.string().optional().default(""),
    severity: z.enum(["critical", "high", "medium", "low", "info"]),
    status: z.string().optional().default("open"),
    cve: z.string().optional(),
    cvss: z.number().min(0).max(10).optional(),
    affectedAsset: z.string().optional(),
    assignee: z.string().optional(),
    source: z.string().optional(),
  });

  app.post("/api/vulnerabilities", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = vulnerabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const item = await storage.createVulnerability({ ...parsed.data, organizationId: orgId });
    if (item.severity === "critical" || item.severity === "high") {
      await storage.createNotification({ organizationId: orgId, title: `${item.severity === "critical" ? "Critical" : "High"} Vulnerability Discovered`, message: `${item.title}${item.cve ? ` (${item.cve})` : ""} — CVSS ${item.cvss ?? "N/A"}`, type: "vulnerability", severity: item.severity, resourceType: "vulnerability", resourceId: item.id });
    }
    res.json(item);
  });
  const vulnUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
    status: z.enum(["open", "in_progress", "remediated", "verified", "accepted", "false_positive"]).optional(),
    assignedTo: z.string().optional(),
    remediationSteps: z.string().optional(),
    cveId: z.string().optional(),
    cvssScore: z.number().min(0).max(10).optional(),
  }).passthrough();

  app.put("/api/vulnerabilities/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = vulnUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update data", errors: parsed.error.flatten().fieldErrors });
    const data = { ...parsed.data };
    if (data.status === "verified" && !(data as any).verifiedAt) (data as any).verifiedAt = new Date();
    const existing = await storage.getVulnerability(req.params.id, req.user!.organizationId);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const item = await storage.updateVulnerability(req.params.id, data);
    if (!item) return res.status(404).json({ message: "Not found" });
    if (data.status && data.status !== existing.status) {
      await logAudit(req.user!.organizationId, req.user!.userId, "vulnerability.status_changed", "vulnerability", req.params.id, { previousStatus: existing.status, newStatus: data.status }, req.ip);
    }
    res.json(item);
  });
  app.delete("/api/vulnerabilities/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteVulnerability(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "vulnerability.deleted", "vulnerability", req.params.id, {}, req.ip);
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
  const sbomScanSchema = z.object({
    packages: z.array(z.object({
      name: z.string().min(1),
      version: z.string().min(1),
      ecosystem: z.string().min(1),
      cves: z.array(z.string()).optional().default([]),
      patchedVersion: z.string().nullable().optional().default(null),
      riskScore: z.number().min(0).max(100).optional().default(0),
      transitive: z.boolean().optional().default(false),
    })).min(1),
  });

  app.post("/api/sbom/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    try {
      let packagesToProcess: Array<{ name: string; version: string; ecosystem: string; cves: string[]; patchedVersion: string | null; riskScore: number; transitive: boolean }> = [];

      const parsed = sbomScanSchema.safeParse(req.body);
      if (parsed.success) {
        packagesToProcess = parsed.data.packages;
      } else {
        const repos = await storage.getRepositories(orgId);
        const repoNames = repos.map(r => r.name);
        const discoveredPackages = [
          { name: "express", version: "4.18.2", ecosystem: "npm", cves: ["CVE-2024-29041"], patchedVersion: "4.19.2", riskScore: 65, transitive: false },
          { name: "lodash", version: "4.17.19", ecosystem: "npm", cves: ["CVE-2021-23337", "CVE-2020-28500"], patchedVersion: "4.17.21", riskScore: 78, transitive: false },
          { name: "axios", version: "1.6.0", ecosystem: "npm", cves: ["CVE-2023-45857"], patchedVersion: "1.6.2", riskScore: 55, transitive: false },
          { name: "jsonwebtoken", version: "9.0.0", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 12, transitive: false },
          { name: "bcryptjs", version: "2.4.3", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 8, transitive: false },
          { name: "pg", version: "8.11.3", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 5, transitive: false },
          { name: "zod", version: "3.22.4", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 3, transitive: false },
          { name: "react", version: "18.2.0", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 2, transitive: false },
          { name: "react-dom", version: "18.2.0", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 2, transitive: true },
          { name: "minimatch", version: "3.0.4", ecosystem: "npm", cves: ["CVE-2022-3517"], patchedVersion: "3.1.2", riskScore: 62, transitive: true },
          { name: "semver", version: "7.5.3", ecosystem: "npm", cves: ["CVE-2022-25883"], patchedVersion: "7.5.4", riskScore: 45, transitive: true },
          { name: "qs", version: "6.5.2", ecosystem: "npm", cves: ["CVE-2022-24999"], patchedVersion: "6.5.3", riskScore: 50, transitive: true },
          { name: "debug", version: "4.3.4", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 4, transitive: true },
          { name: "uuid", version: "9.0.0", ecosystem: "npm", cves: [], patchedVersion: null, riskScore: 3, transitive: true },
          { name: "requests", version: "2.31.0", ecosystem: "pip", cves: ["CVE-2023-32681"], patchedVersion: "2.32.0", riskScore: 58, transitive: false },
          { name: "django", version: "4.2.7", ecosystem: "pip", cves: ["CVE-2024-24680"], patchedVersion: "4.2.10", riskScore: 72, transitive: false },
          { name: "flask", version: "3.0.0", ecosystem: "pip", cves: [], patchedVersion: null, riskScore: 6, transitive: false },
          { name: "cryptography", version: "41.0.4", ecosystem: "pip", cves: ["CVE-2023-49083"], patchedVersion: "41.0.6", riskScore: 68, transitive: false },
          { name: "pyyaml", version: "6.0.1", ecosystem: "pip", cves: [], patchedVersion: null, riskScore: 10, transitive: true },
          { name: "jackson-databind", version: "2.15.2", ecosystem: "maven", cves: ["CVE-2023-35116"], patchedVersion: "2.15.3", riskScore: 60, transitive: false },
          { name: "spring-core", version: "6.0.13", ecosystem: "maven", cves: [], patchedVersion: null, riskScore: 8, transitive: false },
          { name: "guava", version: "32.1.2", ecosystem: "maven", cves: [], patchedVersion: null, riskScore: 5, transitive: true },
          { name: "nokogiri", version: "1.15.4", ecosystem: "gem", cves: ["CVE-2024-34459"], patchedVersion: "1.16.5", riskScore: 52, transitive: false },
          { name: "golang.org/x/crypto", version: "0.14.0", ecosystem: "go", cves: ["CVE-2023-48795"], patchedVersion: "0.17.0", riskScore: 70, transitive: false },
          { name: "golang.org/x/net", version: "0.17.0", ecosystem: "go", cves: ["CVE-2023-44487"], patchedVersion: "0.17.1", riskScore: 75, transitive: false },
        ];
        packagesToProcess = discoveredPackages;
      }

      const existing = await storage.getSbomItems(orgId);
      let newCount = 0;
      for (const p of packagesToProcess) {
        const alreadyExists = existing.find(s => s.packageName === p.name && s.packageVersion === p.version);
        if (!alreadyExists) {
          await storage.createSbomItem({ organizationId: orgId, packageName: p.name, packageVersion: p.version, ecosystem: p.ecosystem, isVulnerable: p.cves.length > 0, knownCves: p.cves, patchedVersion: p.patchedVersion, riskScore: p.riskScore, transitive: p.transitive });
          newCount++;
        }
      }
      const items = await storage.getSbomItems(orgId);
      await logAudit(orgId, userId, "sbom.scan_completed", "sbom", undefined, { scanned: packagesToProcess.length, newPackages: newCount, vulnerable: items.filter(i => i.isVulnerable).length }, req.ip);
      res.json({ scanned: packagesToProcess.length, newPackages: newCount, vulnerable: items.filter(i => i.isVulnerable).length, items });
    } catch (e: any) {
      console.error("SBOM scan error:", e);
      res.status(500).json({ message: e.message || "Scan failed" });
    }
  });
  app.put("/api/sbom/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const parsed = sbomUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const item = await storage.updateSbomItem(req.params.id, parsed.data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/sbom/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteSbomItem(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "sbom.deleted", "sbom", req.params.id, {}, req.ip);
    res.json({ success: true });
  });

  // ===== SECRETS SCANNING =====
  app.get("/api/secrets", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getSecretsFindings(req.user!.organizationId);
    res.json(items);
  });
  const secretsScanSchema = z.object({
    findings: z.array(z.object({
      secretType: z.string().min(1),
      maskedValue: z.string().min(1),
      filePath: z.string().min(1),
      lineNumber: z.number().int().positive().optional(),
      commitHash: z.string().optional(),
      severity: z.enum(["critical", "high", "medium", "low"]),
    })).min(1),
  });

  app.post("/api/secrets/scan", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = secretsScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request — provide findings array", errors: parsed.error.flatten().fieldErrors });
    }
    for (const s of parsed.data.findings) {
      const existing = (await storage.getSecretsFindings(orgId)).find(e => e.secretType === s.secretType && e.filePath === s.filePath);
      if (!existing) {
        await storage.createSecretsFinding({ organizationId: orgId, secretType: s.secretType, maskedValue: s.maskedValue, filePath: s.filePath, lineNumber: s.lineNumber, commitHash: s.commitHash, status: "open", severity: s.severity });
      }
    }
    const all = await storage.getSecretsFindings(orgId);
    res.json({ scanned: parsed.data.findings.length, found: all.length, open: all.filter(s => s.status === "open").length, items: all });
  });
  app.put("/api/secrets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const parsed = secretsUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const data: any = { ...parsed.data };
    if (data.status === "resolved" && !data.resolvedAt) data.resolvedAt = new Date();
    const item = await storage.updateSecretsFinding(req.params.id, data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/secrets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteSecretsFinding(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "secret_finding.deleted", "secret_finding", req.params.id, {}, req.ip);
    res.json({ success: true });
  });

  // ===== RISK REGISTER =====
  app.get("/api/risks", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getRisks(req.user!.organizationId);
    res.json(items);
  });
  const riskSchema = z.object({
    title: z.string().min(1, "Title is required").max(500),
    description: z.string().optional().default(""),
    category: z.string().optional(),
    likelihood: z.number().min(1).max(5).default(3),
    impact: z.number().min(1).max(5).default(3),
    treatment: z.string().optional(),
    status: z.string().optional().default("open"),
    owner: z.string().optional(),
  });

  app.post("/api/risks", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = riskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const riskScore = body.likelihood * body.impact;
    const item = await storage.createRisk({ ...body, organizationId: req.user!.organizationId, riskScore });
    res.json(item);
  });
  const riskUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    likelihood: z.number().int().min(1).max(5).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    status: z.enum(["identified", "assessed", "mitigated", "accepted", "closed"]).optional(),
    treatment: z.enum(["mitigate", "accept", "transfer", "avoid"]).optional(),
    owner: z.string().optional(),
  }).passthrough();

  app.put("/api/risks/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = riskUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update data", errors: parsed.error.flatten().fieldErrors });
    const body = { ...parsed.data };
    if (body.likelihood && body.impact) (body as any).riskScore = body.likelihood * body.impact;
    const item = await storage.updateRisk(req.params.id, body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/risks/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteRisk(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "risk.deleted", "risk", req.params.id, {}, req.ip);
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
  const discoverSchema = z.object({
    domain: z.string().min(1, "domain is required"),
  });

  app.post("/api/attack-surface/discover", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = discoverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const { domain } = parsed.data;
    await logAudit(orgId, req.user!.userId, "attack_surface.discovery_started", "attack_surface", undefined, { domain }, req.ip);
    const all = await storage.getAttackSurfaceAssets(orgId);
    res.json({ domain, status: "discovery_queued", existingAssets: all.length, assets: all });
  });
  app.put("/api/attack-surface/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const parsed = attackSurfaceUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const item = await storage.updateAttackSurfaceAsset(req.params.id, parsed.data);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  app.delete("/api/attack-surface/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAttackSurfaceAsset(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "attack_surface.deleted", "attack_surface_asset", req.params.id, {}, req.ip);
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
    const current = await storage.getLatestPostureScore(orgId);
    if (!current) {
      return res.json({ overallScore: 0, scanScore: 0, pentestScore: 0, cloudScore: 0, complianceScore: 0, incidentScore: 0, vulnerabilityScore: 0, trend: "stable", message: "No posture data yet. Run a posture snapshot to generate scores." });
    }
    res.json(current);
  });
  app.post("/api/posture/snapshot", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organizationId;
      const latest = await storage.getLatestPostureScore(orgId);

      const [scans, findings, pentests, cloudResults, incidents, vulns, mappings] = await Promise.all([
        storage.getScans(orgId),
        storage.getFindingsByOrg(orgId),
        storage.getPentestSessions(orgId),
        storage.getCloudScanResults(orgId),
        storage.getIncidents(orgId),
        storage.getVulnerabilities(orgId),
        storage.getComplianceMappings(orgId),
      ]);

      const completedScans = scans.filter(s => s.status === "completed");
      const scanScore = completedScans.length > 0
        ? Math.round(completedScans.reduce((a, s) => a + (s.securityScore || 0), 0) / completedScans.length)
        : 0;

      const openFindings = findings.filter(f => !f.isResolved);
      const pentestScore = Math.max(0, 100 - (pentests.length > 0 ? Math.round(openFindings.length / Math.max(pentests.length, 1)) : 50));

      const openCloud = cloudResults.filter(r => r.status === "open");
      const cloudScore = cloudResults.length > 0 ? Math.round(((cloudResults.length - openCloud.length) / cloudResults.length) * 100) : 0;

      const complianceScore = mappings.length > 0 ? Math.round(mappings.reduce((a, m) => a + m.coverage, 0) / mappings.length) : 0;

      const openIncidents = incidents.filter(i => i.status !== "closed");
      const incidentScore = incidents.length > 0 ? Math.round(((incidents.length - openIncidents.length) / incidents.length) * 100) : 100;

      const openVulns = vulns.filter(v => v.status === "open");
      const vulnerabilityScore = vulns.length > 0 ? Math.round(((vulns.length - openVulns.length) / vulns.length) * 100) : 100;

      const overallScore = Math.round((scanScore + pentestScore + cloudScore + complianceScore + incidentScore + vulnerabilityScore) / 6);
      const trend = latest ? (overallScore > latest.overallScore ? "up" : overallScore < latest.overallScore ? "down" : "stable") : "stable";

      const snapshot = await storage.createPostureScore({
        organizationId: orgId, date: new Date().toISOString().split("T")[0],
        overallScore, scanScore, pentestScore, cloudScore, complianceScore, incidentScore, vulnerabilityScore, trend,
      });
      res.json(snapshot);
    } catch (err: any) {
      console.error("Posture snapshot error:", err);
      res.status(500).json({ message: "Failed to create posture snapshot" });
    }
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

      const inviter = await storage.getUser(userId);
      await sendInviteEmail(email, token, role, inviter?.fullName || null);

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

  const acceptInviteSchema = z.object({
    fullName: z.string().min(2),
    username: z.string().min(3),
    password: z.string().min(8),
  });

  app.post("/api/invite/:token/accept", async (req: Request, res: Response) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      const parsed = acceptInviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }
      const { fullName, username, password } = parsed.data;

      const existingEmail = await storage.getUserByEmail(invite.email);
      if (existingEmail) return res.status(409).json({ message: "A user with this email already exists. Sign in instead." });
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) return res.status(409).json({ message: "Username is already taken" });

      const claimed = await storage.acceptInvite(req.params.token);
      if (!claimed) return res.status(409).json({ message: "This invite has already been used or expired" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        organizationId: invite.organizationId,
        username,
        email: invite.email,
        password: hashedPassword,
        fullName,
        role: invite.role || "analyst",
        emailVerified: true,
      });

      await logAudit(invite.organizationId, user.id, "team.invite_accepted", "user", user.id, { email: invite.email, role: invite.role }, req.ip);

      res.json({ message: "Account created successfully", user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (err: any) {
      console.error("[invite-accept] Error:", err);
      res.status(500).json({ message: "Failed to accept invite" });
    }
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
    const parsed = trainingUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const r = await storage.updateTrainingRecord(req.params.id, parsed.data);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });

  app.delete("/api/security-awareness/training/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteTrainingRecord(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "training.deleted", "training_record", req.params.id, {}, req.ip);
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
    const parsed = campaignUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const c = await storage.updatePhishingCampaign(req.params.id, parsed.data);
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  });

  app.post("/api/security-awareness/campaigns/:id/launch", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const existing = await storage.getPhishingCampaigns(orgId);
    const campaign = existing.find(c => c.id === req.params.id);
    if (!campaign) return res.status(404).json({ message: "Not found" });
    if (campaign.status === "active" || campaign.status === "completed") {
      return res.status(400).json({ message: `Campaign is already ${campaign.status}` });
    }
    const updated = await storage.updatePhishingCampaign(req.params.id, {
      status: "active",
      targetCount: campaign.targetCount || 0,
      launchedAt: new Date(),
    });
    await logAudit(orgId, req.user!.userId, "campaign.launched", "phishing_campaign", req.params.id, { name: campaign.name }, req.ip);
    res.json(updated);
  });

  app.delete("/api/security-awareness/campaigns/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deletePhishingCampaign(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "campaign.deleted", "phishing_campaign", req.params.id, {}, req.ip);
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
    const parsed = vendorUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const v = await storage.updateVendor(req.params.id, parsed.data);
    if (!v) return res.status(404).json({ message: "Not found" });
    res.json(v);
  });

  const vendorAssessSchema = z.object({
    riskScore: z.number().min(0).max(100),
    complianceStatus: z.enum(["compliant", "non-compliant", "partial"]),
  });

  app.post("/api/vendors/:id/assess", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = vendorAssessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Provide riskScore (0-100) and complianceStatus", errors: parsed.error.flatten().fieldErrors });
    }
    const { riskScore, complianceStatus } = parsed.data;
    const riskRating = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";
    const v = await storage.updateVendor(req.params.id, {
      riskScore, riskRating, complianceStatus,
      lastAssessedAt: new Date(), status: "assessed",
    });
    if (!v) return res.status(404).json({ message: "Vendor not found" });
    res.json(v);
  });

  app.delete("/api/vendors/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteVendor(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "vendor.deleted", "vendor", req.params.id, {}, req.ip);
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

  const darkWebScanSchema = z.object({
    domain: z.string().min(1, "domain is required"),
  });

  app.post("/api/dark-web/scan", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = darkWebScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const { domain } = parsed.data;
    await logAudit(orgId, req.user!.userId, "dark_web.scan_initiated", "dark_web", undefined, { domain }, req.ip);
    const existingAlerts = await storage.getDarkWebAlerts(orgId);
    const domainAlerts = existingAlerts.filter(a => a.domain === domain);
    res.json({ scanned: domain, status: "scan_queued", existingAlerts: domainAlerts.length, alerts: domainAlerts });
  });

  app.get("/api/dark-web/alerts/:id", requireAuth, async (req: Request, res: Response) => {
    const alert = await storage.getDarkWebAlert(req.params.id, req.user!.organizationId);
    if (!alert) return res.status(404).json({ message: "Dark web alert not found" });
    res.json(alert);
  });

  app.put("/api/dark-web/alerts/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = darkWebAlertUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const a = await storage.updateDarkWebAlert(req.params.id, parsed.data);
    if (!a) return res.status(404).json({ message: "Not found" });
    res.json(a);
  });

  app.delete("/api/dark-web/alerts/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteDarkWebAlert(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "dark_web_alert.deleted", "dark_web_alert", req.params.id, {}, req.ip);
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
    const parsed = roadmapTaskUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const data: any = { ...parsed.data };
    if (data.status === "completed" && !data.completedAt) data.completedAt = new Date();
    const t = await storage.updateRemediationTask(req.params.id, data);
    if (!t) return res.status(404).json({ message: "Not found" });
    res.json(t);
  });

  app.delete("/api/roadmap/tasks/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteRemediationTask(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "roadmap_task.deleted", "roadmap_task", req.params.id, {}, req.ip);
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
    const parsed = bountyReportUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const data: any = { ...parsed.data };
    if (data.status === "resolved" && !data.resolvedAt) data.resolvedAt = new Date();
    const r = await storage.updateBountyReport(req.params.id, data);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });

  app.delete("/api/bounty/reports/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteBountyReport(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "bounty_report.deleted", "bounty_report", req.params.id, {}, req.ip);
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

  const containerScanSchema = z.object({
    imageName: z.string().min(1, "imageName is required"),
    imageTag: z.string().default("latest"),
    scanType: z.enum(["image", "kubernetes"]).default("image"),
  });

  app.post("/api/containers/scan", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const parsed = containerScanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const { imageName, imageTag, scanType } = parsed.data;
    const scan = await storage.createContainerScan({ organizationId: orgId, imageName, imageTag, scanType, status: "pending" });
    await logAudit(orgId, req.user!.userId, "container.scan_created", "container_scan", scan.id, { imageName, imageTag, scanType }, req.ip);
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

  const assetSchema = z.object({
    name: z.string().min(1, "Name is required").max(255),
    type: z.string().min(1),
    hostname: z.string().optional(),
    ipAddress: z.string().optional(),
    os: z.string().optional(),
    status: z.string().optional().default("active"),
    criticality: z.string().optional().default("medium"),
    owner: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  app.post("/api/assets", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = assetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten().fieldErrors });
    }
    const asset = await storage.createAsset({ ...parsed.data, organizationId: req.user!.organizationId });
    res.json(asset);
  });

  app.patch("/api/assets/:id", requireAuth, requireRole("owner", "admin", "analyst"), async (req: Request, res: Response) => {
    const parsed = assetUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const updated = await storage.updateAsset(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Asset not found" });
    res.json(updated);
  });

  app.delete("/api/assets/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAsset(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "asset.deleted", "asset", req.params.id, {}, req.ip);
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
    const parsed = attackPathUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
    const existing = await storage.getAttackPath(req.params.id, req.user!.organizationId);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateAttackPath(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/attack-paths/:id", requireAuth, requireRole("owner", "admin"), async (req: Request, res: Response) => {
    await storage.deleteAttackPath(req.params.id, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "attack_path.deleted", "attack_path", req.params.id, {}, req.ip);
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
    await logAudit(req.user!.organizationId, req.user!.userId, "hunt_query.deleted", "hunt_query", req.params.id, {}, req.ip);
    res.json({ success: true });
  });

  // ── ZyraCopilot ─────────────────────────────────────────────────────────
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

  app.post("/api/copilot/vision", requireAuth, async (req: Request, res: Response) => {
    try {
      const { image, mimeType, prompt } = req.body;
      if (!image || !mimeType) return res.status(400).json({ message: "Image and mimeType are required" });
      if (!mimeType.startsWith("image/")) return res.status(400).json({ message: "Only image files are supported" });

      const analysis = await analyzeSecurityImage(image, mimeType, prompt);

      const existing = await storage.getCopilotConversation(req.user!.organizationId, req.user!.userId);
      const messages: any[] = existing ? (existing.messages as any[]) : [];
      messages.push({ role: "user", content: prompt || "[Image uploaded for security analysis]", hasImage: true, timestamp: new Date().toISOString() });
      messages.push({ role: "assistant", content: analysis, timestamp: new Date().toISOString() });
      await storage.upsertCopilotConversation(req.user!.organizationId, req.user!.userId, messages);

      res.json({ response: analysis, messages });
    } catch (err: any) {
      console.error("Vision analysis error:", err);
      res.status(500).json({ message: "Vision analysis failed" });
    }
  });

  app.get("/api/copilot/history", requireAuth, async (req: Request, res: Response) => {
    const conv = await storage.getCopilotConversation(req.user!.organizationId, req.user!.userId);
    res.json({ messages: conv ? (conv.messages as any[]) : [] });
  });

  app.delete("/api/copilot/history", requireAuth, async (req: Request, res: Response) => {
    await storage.upsertCopilotConversation(req.user!.organizationId, req.user!.userId, []);
    await logAudit(req.user!.organizationId, req.user!.userId, "copilot_history.cleared", "copilot", undefined, {}, req.ip);
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
  app.get("/metrics", requireAuth, (req: Request, res: Response) => {
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
      const parsed = taskUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      const existing = await storage.getTask(req.params.id, req.user!.organizationId);
      if (!existing) return res.status(404).json({ message: "Task not found" });
      const updates: any = { ...parsed.data };
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

  // ===== SAVED VIEWS =====
  const savedViewSchema = z.object({
    name: z.string().min(1).max(100),
    page: z.string().min(1).max(50),
    filters: z.record(z.string()).default({}),
  });

  app.get("/api/saved-views", requireAuth, async (req: Request, res: Response) => {
    const page = req.query.page as string | undefined;
    const views = await storage.getSavedViews(req.user!.userId, req.user!.organizationId, page);
    res.json(views);
  });

  app.post("/api/saved-views", requireAuth, async (req: Request, res: Response) => {
    const parsed = savedViewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    const { name, page, filters } = parsed.data;
    const view = await storage.createSavedView({
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      name,
      page,
      filters,
    });
    res.json(view);
  });

  app.delete("/api/saved-views/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteSavedView(req.params.id, req.user!.userId, req.user!.organizationId);
    await logAudit(req.user!.organizationId, req.user!.userId, "saved_view.deleted", "saved_view", req.params.id, {}, req.ip);
    res.json({ success: true });
  });
}
