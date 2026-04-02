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
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
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

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull().default("medium"),
  status: text("status").notNull().default("triage"),
  assignedTo: text("assigned_to"),
  affectedSystems: text("affected_systems").array().notNull().default(sql`'{}'`),
  timeline: jsonb("timeline").notNull().default(sql`'[]'`),
  mttr: integer("mttr"),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  vulnerabilityId: varchar("vulnerability_id"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  source: text("source").notNull().default("manual"),
  cve: text("cve"),
  cvss: real("cvss"),
  affectedComponent: text("affected_component"),
  remediationSteps: text("remediation_steps"),
  dueDate: timestamp("due_date"),
  verifiedAt: timestamp("verified_at"),
  incidentId: varchar("incident_id"),
  riskId: varchar("risk_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sbomItems = pgTable("sbom_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  repositoryId: varchar("repository_id"),
  packageName: text("package_name").notNull(),
  packageVersion: text("package_version").notNull(),
  ecosystem: text("ecosystem").notNull().default("npm"),
  license: text("license"),
  isVulnerable: boolean("is_vulnerable").notNull().default(false),
  knownCves: text("known_cves").array().notNull().default(sql`'{}'`),
  patchedVersion: text("patched_version"),
  riskScore: integer("risk_score").notNull().default(0),
  transitive: boolean("transitive").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const secretsFindings = pgTable("secrets_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  repositoryId: varchar("repository_id"),
  secretType: text("secret_type").notNull(),
  maskedValue: text("masked_value"),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  commitHash: text("commit_hash"),
  status: text("status").notNull().default("open"),
  severity: severityEnum("severity").notNull().default("critical"),
  suppressedReason: text("suppressed_reason"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const risks = pgTable("risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("technical"),
  likelihood: integer("likelihood").notNull().default(3),
  impact: integer("impact").notNull().default(3),
  riskScore: integer("risk_score").notNull().default(9),
  owner: text("owner"),
  treatment: text("treatment").notNull().default("mitigate"),
  mitigationPlan: text("mitigation_plan"),
  residualRisk: integer("residual_risk"),
  status: text("status").notNull().default("open"),
  dueDate: timestamp("due_date"),
  vulnerabilityId: varchar("vulnerability_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attackSurfaceAssets = pgTable("attack_surface_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  assetType: text("asset_type").notNull(),
  host: text("host").notNull(),
  port: integer("port"),
  service: text("service"),
  status: text("status").notNull().default("active"),
  riskLevel: text("risk_level").notNull().default("low"),
  tlsCertExpiry: timestamp("tls_cert_expiry"),
  tlsCertIssuer: text("tls_cert_issuer"),
  openPorts: integer("open_ports").array().notNull().default(sql`'{}'`),
  technologies: text("technologies").array().notNull().default(sql`'{}'`),
  vulnerabilityCount: integer("vulnerability_count").notNull().default(0),
  firstDiscoveredAt: timestamp("first_discovered_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postureScores = pgTable("posture_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  date: text("date").notNull(),
  overallScore: integer("overall_score").notNull(),
  scanScore: integer("scan_score").notNull().default(100),
  pentestScore: integer("pentest_score").notNull().default(100),
  cloudScore: integer("cloud_score").notNull().default(100),
  complianceScore: integer("compliance_score").notNull().default(100),
  incidentScore: integer("incident_score").notNull().default(100),
  vulnerabilityScore: integer("vulnerability_score").notNull().default(100),
  trend: text("trend").notNull().default("stable"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  severity: text("severity").notNull().default("info"),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteTokens = pgTable("invite_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default("analyst"),
  token: text("token").notNull().unique(),
  invitedById: varchar("invited_by_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onboardingSteps = pgTable("onboarding_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  step: text("step").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Security Awareness & Phishing ──────────────────────────────────────────
export const trainingRecords = pgTable("training_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userEmail: text("user_email").notNull(),
  course: text("course").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  phishingScore: integer("phishing_score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const phishingCampaigns = pgTable("phishing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  templateType: text("template_type").notNull().default("credential_harvest"),
  targetCount: integer("target_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  reportedCount: integer("reported_count").notNull().default(0),
  ignoredCount: integer("ignored_count").notNull().default(0),
  humanRiskScore: integer("human_risk_score").notNull().default(0),
  launchedAt: timestamp("launched_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Vendor Risk Management ──────────────────────────────────────────────────
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  website: text("website"),
  riskScore: integer("risk_score").notNull().default(50),
  riskRating: text("risk_rating").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  complianceStatus: text("compliance_status").notNull().default("unknown"),
  questionnaireSent: boolean("questionnaire_sent").notNull().default(false),
  questionnaireCompleted: boolean("questionnaire_completed").notNull().default(false),
  category: text("category").notNull().default("saas"),
  notes: text("notes"),
  lastAssessedAt: timestamp("last_assessed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Dark Web Monitoring ─────────────────────────────────────────────────────
export const darkWebAlerts = pgTable("dark_web_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  domain: text("domain").notNull(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull().default("high"),
  source: text("source").notNull().default("simulated"),
  maskedValue: text("masked_value"),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Security Roadmap / Remediation ─────────────────────────────────────────
export const remediationTasks = pgTable("remediation_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  owner: text("owner"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  category: text("category").notNull().default("vulnerability"),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Bug Bounty ──────────────────────────────────────────────────────────────
export const bountyReports = pgTable("bounty_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  researcherEmail: text("researcher_email").notNull(),
  title: text("title").notNull(),
  vulnerability: text("vulnerability").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("new"),
  reward: integer("reward"),
  cvss: real("cvss"),
  reproducible: boolean("reproducible").notNull().default(false),
  stepsToReproduce: text("steps_to_reproduce"),
  assignedTo: text("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Asset Inventory ─────────────────────────────────────────────────────────
export const assetInventory = pgTable("asset_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  hostname: text("hostname").notNull(),
  ip: text("ip"),
  cloudProvider: text("cloud_provider"),
  assetType: text("asset_type").notNull().default("server"),
  environment: text("environment").notNull().default("production"),
  region: text("region"),
  os: text("os"),
  criticality: text("criticality").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  owner: text("owner"),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  linkedRepositoryId: varchar("linked_repository_id"),
  linkedContainerScanId: varchar("linked_container_scan_id"),
  vulnerabilityCount: integer("vulnerability_count").notNull().default(0),
  cveCount: integer("cve_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Attack Path Modeling ─────────────────────────────────────────────────────
export const attackPaths = pgTable("attack_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  entryPoint: text("entry_point").notNull(),
  targetAsset: text("target_asset").notNull(),
  riskScore: integer("risk_score").notNull().default(50),
  severity: text("severity").notNull().default("high"),
  steps: jsonb("steps").notNull().default(sql`'[]'`),
  status: text("status").notNull().default("active"),
  mitigated: boolean("mitigated").notNull().default(false),
  mitigationNotes: text("mitigation_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Threat Hunt Queries ──────────────────────────────────────────────────────
export const threatHuntQueries = pgTable("threat_hunt_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  query: text("query").notNull(),
  queryType: text("query_type").notNull().default("general"),
  resultsCount: integer("results_count").notNull().default(0),
  results: jsonb("results").notNull().default(sql`'[]'`),
  savedByUserId: varchar("saved_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── AI Copilot Conversations ─────────────────────────────────────────────────
export const copilotConversations = pgTable("copilot_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id),
  messages: jsonb("messages").notNull().default(sql`'[]'`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Container / Kubernetes Security ────────────────────────────────────────
export const containerScans = pgTable("container_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  imageName: text("image_name").notNull(),
  imageTag: text("image_tag").notNull().default("latest"),
  scanType: text("scan_type").notNull().default("image"),
  status: text("status").notNull().default("pending"),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  privilegedContainers: integer("privileged_containers").notNull().default(0),
  weakRbac: boolean("weak_rbac").notNull().default(false),
  openDashboards: boolean("open_dashboards").notNull().default(false),
  untrustedImages: integer("untrusted_images").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const containerFindings = pgTable("container_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scanId: varchar("scan_id").notNull().references(() => containerScans.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  cveId: text("cve_id"),
  packageName: text("package_name"),
  fixedVersion: text("fixed_version"),
  remediation: text("remediation"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetInventorySchema = createInsertSchema(assetInventory).omit({ id: true, createdAt: true, lastSeenAt: true });
export const insertAttackPathSchema = createInsertSchema(attackPaths).omit({ id: true, createdAt: true });
export const insertThreatHuntQuerySchema = createInsertSchema(threatHuntQueries).omit({ id: true, createdAt: true });
export const insertCopilotConversationSchema = createInsertSchema(copilotConversations).omit({ id: true, createdAt: true, updatedAt: true });

export type AssetInventoryItem = typeof assetInventory.$inferSelect;
export type InsertAssetInventoryItem = z.infer<typeof insertAssetInventorySchema>;
export type AttackPath = typeof attackPaths.$inferSelect;
export type InsertAttackPath = z.infer<typeof insertAttackPathSchema>;
export type ThreatHuntQuery = typeof threatHuntQueries.$inferSelect;
export type InsertThreatHuntQuery = z.infer<typeof insertThreatHuntQuerySchema>;
export type CopilotConversation = typeof copilotConversations.$inferSelect;
export type InsertCopilotConversation = z.infer<typeof insertCopilotConversationSchema>;

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertRepositorySchema = createInsertSchema(repositories).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertScanSchema = createInsertSchema(scans).omit({ id: true, createdAt: true });
export const insertScanFindingSchema = createInsertSchema(scanFindings).omit({ id: true, createdAt: true });
export const insertComplianceMappingSchema = createInsertSchema(complianceMappings).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });

// ── Security Data Lake ──────────────────────────────────────────────────────
export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  eventType: text("event_type").notNull(),
  source: text("source").notNull(),
  assetId: text("asset_id"),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  correlatedEventIds: text("correlated_event_ids").array(),
  isCorrelated: boolean("is_correlated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── SOAR Playbooks ──────────────────────────────────────────────────────────
export const soarPlaybooks = pgTable("soar_playbooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  trigger: text("trigger").notNull(),
  category: text("category").notNull().default("response"),
  actions: jsonb("actions").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const soarExecutions = pgTable("soar_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  playbookId: varchar("playbook_id").notNull(),
  playbookName: text("playbook_name").notNull(),
  triggeredBy: text("triggered_by").notNull(),
  status: text("status").notNull().default("running"),
  steps: jsonb("steps").notNull(),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  duration: integer("duration"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ── Security Graph ──────────────────────────────────────────────────────────
export const graphNodes = pgTable("graph_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  nodeType: text("node_type").notNull(),
  externalId: text("external_id").notNull(),
  label: text("label").notNull(),
  properties: jsonb("properties"),
  riskScore: integer("risk_score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const graphEdges = pgTable("graph_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  sourceNodeId: varchar("source_node_id").notNull().references(() => graphNodes.id),
  targetNodeId: varchar("target_node_id").notNull().references(() => graphNodes.id),
  edgeType: text("edge_type").notNull(),
  weight: real("weight").notNull().default(1),
  properties: jsonb("properties"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({ id: true, createdAt: true });
export const insertSbomItemSchema = createInsertSchema(sbomItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSecretsFindingSchema = createInsertSchema(secretsFindings).omit({ id: true, createdAt: true });
export const insertRiskSchema = createInsertSchema(risks).omit({ id: true, createdAt: true });
export const insertAttackSurfaceAssetSchema = createInsertSchema(attackSurfaceAssets).omit({ id: true, createdAt: true });
export const insertPostureScoreSchema = createInsertSchema(postureScores).omit({ id: true, createdAt: true });

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type SbomItem = typeof sbomItems.$inferSelect;
export type InsertSbomItem = z.infer<typeof insertSbomItemSchema>;
export type SecretsFinding = typeof secretsFindings.$inferSelect;
export type InsertSecretsFinding = z.infer<typeof insertSecretsFindingSchema>;
export type Risk = typeof risks.$inferSelect;
export type InsertRisk = z.infer<typeof insertRiskSchema>;
export type AttackSurfaceAsset = typeof attackSurfaceAssets.$inferSelect;
export type InsertAttackSurfaceAsset = z.infer<typeof insertAttackSurfaceAssetSchema>;
export type PostureScore = typeof postureScores.$inferSelect;
export type InsertPostureScore = z.infer<typeof insertPostureScoreSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertInviteTokenSchema = createInsertSchema(inviteTokens).omit({ id: true, createdAt: true });
export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({ id: true, createdAt: true });

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = z.infer<typeof insertInviteTokenSchema>;
export type OnboardingStep = typeof onboardingSteps.$inferSelect;
export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;

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

export const insertTrainingRecordSchema = createInsertSchema(trainingRecords).omit({ id: true, createdAt: true });
export const insertPhishingCampaignSchema = createInsertSchema(phishingCampaigns).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertDarkWebAlertSchema = createInsertSchema(darkWebAlerts).omit({ id: true, createdAt: true });
export const insertRemediationTaskSchema = createInsertSchema(remediationTasks).omit({ id: true, createdAt: true });
export const insertBountyReportSchema = createInsertSchema(bountyReports).omit({ id: true, createdAt: true });
export const insertContainerScanSchema = createInsertSchema(containerScans).omit({ id: true, createdAt: true });
export const insertContainerFindingSchema = createInsertSchema(containerFindings).omit({ id: true, createdAt: true });

export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type InsertTrainingRecord = z.infer<typeof insertTrainingRecordSchema>;
export type PhishingCampaign = typeof phishingCampaigns.$inferSelect;
export type InsertPhishingCampaign = z.infer<typeof insertPhishingCampaignSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type DarkWebAlert = typeof darkWebAlerts.$inferSelect;
export type InsertDarkWebAlert = z.infer<typeof insertDarkWebAlertSchema>;
export type RemediationTask = typeof remediationTasks.$inferSelect;
export type InsertRemediationTask = z.infer<typeof insertRemediationTaskSchema>;
export type BountyReport = typeof bountyReports.$inferSelect;
export type InsertBountyReport = z.infer<typeof insertBountyReportSchema>;
export type ContainerScan = typeof containerScans.$inferSelect;
export type InsertContainerScan = z.infer<typeof insertContainerScanSchema>;
export type ContainerFinding = typeof containerFindings.$inferSelect;
export type InsertContainerFinding = z.infer<typeof insertContainerFindingSchema>;

// ── CAASM Identities ─────────────────────────────────────────────────────────
export const caasmIdentities = pgTable("caasm_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  identityType: text("identity_type").notNull().default("user"),
  name: text("name").notNull(),
  email: text("email"),
  permissions: text("permissions").array().notNull().default(sql`'{}'`),
  privilegeLevel: text("privilege_level").notNull().default("standard"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  lastActivity: timestamp("last_activity"),
  source: text("source").notNull().default("manual"),
  riskScore: integer("risk_score").notNull().default(0),
  linkedAssetIds: text("linked_asset_ids").array().notNull().default(sql`'{}'`),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({ id: true, createdAt: true });
export const insertSoarPlaybookSchema = createInsertSchema(soarPlaybooks).omit({ id: true, createdAt: true });
export const insertSoarExecutionSchema = createInsertSchema(soarExecutions).omit({ id: true });
export const insertGraphNodeSchema = createInsertSchema(graphNodes).omit({ id: true, createdAt: true });
export const insertGraphEdgeSchema = createInsertSchema(graphEdges).omit({ id: true, createdAt: true });

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SoarPlaybook = typeof soarPlaybooks.$inferSelect;
export type InsertSoarPlaybook = z.infer<typeof insertSoarPlaybookSchema>;
export type SoarExecution = typeof soarExecutions.$inferSelect;
export type InsertSoarExecution = z.infer<typeof insertSoarExecutionSchema>;
export type GraphNode = typeof graphNodes.$inferSelect;
export type InsertGraphNode = z.infer<typeof insertGraphNodeSchema>;
export type GraphEdge = typeof graphEdges.$inferSelect;
export type InsertGraphEdge = z.infer<typeof insertGraphEdgeSchema>;

export const insertCaasmIdentitySchema = createInsertSchema(caasmIdentities).omit({ id: true, createdAt: true });
export type CaasmIdentity = typeof caasmIdentities.$inferSelect;
export type InsertCaasmIdentity = z.infer<typeof insertCaasmIdentitySchema>;

// ── Security Team Operations ──────────────────────────────────────────────────

export const incidentComments = pgTable("incident_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  incidentId: varchar("incident_id").notNull(),
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  parentId: varchar("parent_id"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamActivities = pgTable("team_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  userId: varchar("user_id"),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oncallSchedules = pgTable("oncall_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  label: text("label").notNull().default("Primary On-Call"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const escalationPolicies = pgTable("escalation_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(),
  actions: jsonb("actions").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  requesterId: varchar("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  approverId: varchar("approver_id"),
  approverName: text("approver_name"),
  actionType: text("action_type").notNull(),
  actionDetails: jsonb("action_details").notNull(),
  status: text("status").notNull().default("pending"),
  reason: text("reason"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Exposure Management ──────────────────────────────────────────────────────
export const exposureAlerts = pgTable("exposure_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  trigger: text("trigger").notNull(),
  severity: text("severity").notNull().default("medium"),
  title: text("title").notNull(),
  description: text("description"),
  assetId: varchar("asset_id"),
  assetName: text("asset_name"),
  riskScore: integer("risk_score").notNull().default(0),
  status: text("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const remediationActions = pgTable("remediation_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  alertId: varchar("alert_id"),
  actionType: text("action_type").notNull(),
  target: text("target").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  executedAt: timestamp("executed_at"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExposureAlertSchema = createInsertSchema(exposureAlerts).omit({ id: true, createdAt: true, resolvedAt: true });
export const insertRemediationActionSchema = createInsertSchema(remediationActions).omit({ id: true, createdAt: true, executedAt: true });

export type ExposureAlert = typeof exposureAlerts.$inferSelect;
export type InsertExposureAlert = z.infer<typeof insertExposureAlertSchema>;
export type RemediationAction = typeof remediationActions.$inferSelect;
export type InsertRemediationAction = z.infer<typeof insertRemediationActionSchema>;

// ── Enterprise Readiness ─────────────────────────────────────────────────────
export const siemConfigs = pgTable("siem_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  provider: text("provider").notNull(),
  endpoint: text("endpoint").notNull(),
  apiKey: text("api_key"),
  index: text("index"),
  enabled: boolean("enabled").notNull().default(true),
  lastExportAt: timestamp("last_export_at"),
  eventsExported: integer("events_exported").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const retentionPolicies = pgTable("retention_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  dataType: text("data_type").notNull(),
  retentionDays: integer("retention_days").notNull(),
  lastPurgedAt: timestamp("last_purged_at"),
  purgedCount: integer("purged_count").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#6366f1"),
  assetCount: integer("asset_count").notNull().default(0),
  memberCount: integer("member_count").notNull().default(0),
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSiemConfigSchema = createInsertSchema(siemConfigs).omit({ id: true, createdAt: true, lastExportAt: true, eventsExported: true });
export const insertRetentionPolicySchema = createInsertSchema(retentionPolicies).omit({ id: true, createdAt: true, lastPurgedAt: true, purgedCount: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true, assetCount: true, memberCount: true });

export type SiemConfig = typeof siemConfigs.$inferSelect;
export type InsertSiemConfig = z.infer<typeof insertSiemConfigSchema>;
export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type InsertRetentionPolicy = z.infer<typeof insertRetentionPolicySchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export const insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({ id: true, createdAt: true });
export const insertTeamActivitySchema = createInsertSchema(teamActivities).omit({ id: true, createdAt: true });
export const insertOncallScheduleSchema = createInsertSchema(oncallSchedules).omit({ id: true, createdAt: true });
export const insertEscalationPolicySchema = createInsertSchema(escalationPolicies).omit({ id: true, createdAt: true });
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({ id: true, createdAt: true });

export type IncidentComment = typeof incidentComments.$inferSelect;
export type InsertIncidentComment = z.infer<typeof insertIncidentCommentSchema>;
export type TeamActivity = typeof teamActivities.$inferSelect;
export type InsertTeamActivity = z.infer<typeof insertTeamActivitySchema>;
export type OncallSchedule = typeof oncallSchedules.$inferSelect;
export type InsertOncallSchedule = z.infer<typeof insertOncallScheduleSchema>;
export type EscalationPolicy = typeof escalationPolicies.$inferSelect;
export type InsertEscalationPolicy = z.infer<typeof insertEscalationPolicySchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
