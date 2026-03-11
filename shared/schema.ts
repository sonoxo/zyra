import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "analyst", "viewer"]);
export const scanStatusEnum = pgEnum("scan_status", ["pending", "running", "completed", "failed"]);
export const scanTypeEnum = pgEnum("scan_type", ["semgrep", "trivy", "bandit", "zap"]);
export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low", "info"]);
export const frameworkEnum = pgEnum("framework", ["SOC2", "HIPAA", "ISO27001", "PCI-DSS", "FedRAMP", "GDPR"]);
export const repoProviderEnum = pgEnum("repo_provider", ["github", "gitlab"]);
export const reportStatusEnum = pgEnum("report_status", ["generating", "ready", "failed"]);

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("starter"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  role: userRoleEnum("role").notNull().default("analyst"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  provider: repoProviderEnum("provider").notNull(),
  url: text("url").notNull(),
  branch: text("branch").notNull().default("main"),
  isActive: boolean("is_active").notNull().default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  scanType: scanTypeEnum("scan_type").notNull(),
  status: scanStatusEnum("status").notNull().default("pending"),
  targetType: text("target_type").notNull().default("repository"),
  targetId: varchar("target_id"),
  targetName: text("target_name"),
  progress: integer("progress").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  totalFindings: integer("total_findings").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  infoCount: integer("info_count").notNull().default(0),
  securityScore: integer("security_score"),
  initiatedById: varchar("initiated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scanFindings = pgTable("scan_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull().references(() => scans.id),
  organizationId: varchar("organization_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: severityEnum("severity").notNull(),
  scanTool: text("scan_tool").notNull(),
  category: text("category"),
  cveId: text("cve_id"),
  filePath: text("file_path"),
  lineNumber: integer("line_number"),
  remediation: text("remediation"),
  impact: text("impact"),
  complianceFrameworks: text("compliance_frameworks").array().notNull().default(sql`'{}'`),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const complianceMappings = pgTable("compliance_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  framework: frameworkEnum("framework").notNull(),
  controlId: text("control_id").notNull(),
  controlName: text("control_name").notNull(),
  status: text("status").notNull().default("unknown"),
  coverage: integer("coverage").notNull().default(0),
  notes: text("notes"),
  lastAssessedAt: timestamp("last_assessed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  status: reportStatusEnum("status").notNull().default("generating"),
  frameworks: text("frameworks").array().notNull().default(sql`'{}'`),
  executiveSummary: text("executive_summary"),
  securityScore: integer("security_score"),
  totalVulnerabilities: integer("total_vulnerabilities").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  recommendations: jsonb("recommendations"),
  complianceSummary: jsonb("compliance_summary"),
  generatedById: varchar("generated_by_id").references(() => users.id),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: text("permissions").array().notNull().default(sql`'{}'`),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id).unique(),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  features: jsonb("features"),
  maxUsers: integer("max_users").notNull().default(5),
  maxScansPerMonth: integer("max_scans_per_month").notNull().default(50),
  maxRepositories: integer("max_repositories").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pentestSessions = pgTable("pentest_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  targetDescription: text("target_description"),
  status: text("status").notNull().default("pending"),
  testTypes: text("test_types").array().notNull().default(sql`'{}'`),
  authorizedBy: text("authorized_by").notNull(),
  authorizationNote: text("authorization_note"),
  summary: jsonb("summary"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pentestFindings = pgTable("pentest_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => pentestSessions.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  testType: text("test_type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  payload: text("payload"),
  responseSnippet: text("response_snippet"),
  evidence: text("evidence"),
  cvssScore: real("cvss_score"),
  remediationSteps: text("remediation_steps"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cloudScanTargets = pgTable("cloud_scan_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  region: text("region").notNull().default("us-east-1"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  lastScannedAt: timestamp("last_scanned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cloudScanResults = pgTable("cloud_scan_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetId: varchar("target_id").notNull().references(() => cloudScanTargets.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  checkName: text("check_name").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  resourceId: text("resource_id"),
  resourceType: text("resource_type"),
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const threatIntelItems = pgTable("threat_intel_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  cveId: text("cve_id").notNull(),
  title: text("title").notNull(),
  severity: text("severity").notNull(),
  cvssScore: real("cvss_score"),
  description: text("description").notNull(),
  affectedPackages: text("affected_packages").array().notNull().default(sql`'{}'`),
  affectedVersions: text("affected_versions").array().notNull().default(sql`'{}'`),
  patchedVersions: text("patched_versions").array().notNull().default(sql`'{}'`),
  publishedAt: timestamp("published_at"),
  source: text("source").notNull().default("nvd"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const monitoringConfigs = pgTable("monitoring_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  targetType: text("target_type").notNull().default("all"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  schedule: text("schedule"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  channels: text("channels").array().notNull().default(sql`'{}'`),
  webhookUrl: text("webhook_url"),
  slackChannel: text("slack_channel"),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pipelineConfigs = pgTable("pipeline_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  repositoryUrl: text("repository_url"),
  branch: text("branch").notNull().default("main"),
  scanTypes: text("scan_types").array().notNull().default(sql`'{}'`),
  failOnCritical: boolean("fail_on_critical").notNull().default(true),
  failOnHigh: boolean("fail_on_high").notNull().default(false),
  webhookSecret: text("webhook_secret"),
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertRepositorySchema = createInsertSchema(repositories).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertScanSchema = createInsertSchema(scans).omit({ id: true, createdAt: true });
export const insertScanFindingSchema = createInsertSchema(scanFindings).omit({ id: true, createdAt: true });
export const insertComplianceMappingSchema = createInsertSchema(complianceMappings).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Scan = typeof scans.$inferSelect;
export type InsertScan = z.infer<typeof insertScanSchema>;
export type ScanFinding = typeof scanFindings.$inferSelect;
export type InsertScanFinding = z.infer<typeof insertScanFindingSchema>;
export type ComplianceMapping = typeof complianceMappings.$inferSelect;
export type InsertComplianceMapping = z.infer<typeof insertComplianceMappingSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export const insertPentestSessionSchema = createInsertSchema(pentestSessions).omit({ id: true, createdAt: true });
export const insertPentestFindingSchema = createInsertSchema(pentestFindings).omit({ id: true, createdAt: true });
export const insertCloudScanTargetSchema = createInsertSchema(cloudScanTargets).omit({ id: true, createdAt: true });
export const insertCloudScanResultSchema = createInsertSchema(cloudScanResults).omit({ id: true, createdAt: true });
export const insertThreatIntelItemSchema = createInsertSchema(threatIntelItems).omit({ id: true, createdAt: true });
export const insertMonitoringConfigSchema = createInsertSchema(monitoringConfigs).omit({ id: true, createdAt: true });
export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({ id: true, createdAt: true });
export const insertPipelineConfigSchema = createInsertSchema(pipelineConfigs).omit({ id: true, createdAt: true });

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type PentestSession = typeof pentestSessions.$inferSelect;
export type InsertPentestSession = z.infer<typeof insertPentestSessionSchema>;
export type PentestFinding = typeof pentestFindings.$inferSelect;
export type InsertPentestFinding = z.infer<typeof insertPentestFindingSchema>;
export type CloudScanTarget = typeof cloudScanTargets.$inferSelect;
export type InsertCloudScanTarget = z.infer<typeof insertCloudScanTargetSchema>;
export type CloudScanResult = typeof cloudScanResults.$inferSelect;
export type InsertCloudScanResult = z.infer<typeof insertCloudScanResultSchema>;
export type ThreatIntelItem = typeof threatIntelItems.$inferSelect;
export type InsertThreatIntelItem = z.infer<typeof insertThreatIntelItemSchema>;
export type MonitoringConfig = typeof monitoringConfigs.$inferSelect;
export type InsertMonitoringConfig = z.infer<typeof insertMonitoringConfigSchema>;
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type PipelineConfig = typeof pipelineConfigs.$inferSelect;
export type InsertPipelineConfig = z.infer<typeof insertPipelineConfigSchema>;
