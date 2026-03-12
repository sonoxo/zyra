import {
  type User, type InsertUser,
  type Organization, type InsertOrganization,
  type Repository, type InsertRepository,
  type Document, type InsertDocument,
  type Scan, type InsertScan,
  type ScanFinding, type InsertScanFinding,
  type ComplianceMapping, type InsertComplianceMapping,
  type Report, type InsertReport,
  type Setting, type InsertSetting,
  type AuditLog, type InsertAuditLog,
  type ApiKey, type InsertApiKey,
  type Subscription, type InsertSubscription,
  type PentestSession, type InsertPentestSession,
  type PentestFinding, type InsertPentestFinding,
  type CloudScanTarget, type InsertCloudScanTarget,
  type CloudScanResult, type InsertCloudScanResult,
  type ThreatIntelItem, type InsertThreatIntelItem,
  type MonitoringConfig, type InsertMonitoringConfig,
  type AlertRule, type InsertAlertRule,
  type PipelineConfig, type InsertPipelineConfig,
  type Incident, type InsertIncident,
  type Vulnerability, type InsertVulnerability,
  type SbomItem, type InsertSbomItem,
  type SecretsFinding, type InsertSecretsFinding,
  type Risk, type InsertRisk,
  type AttackSurfaceAsset, type InsertAttackSurfaceAsset,
  type PostureScore, type InsertPostureScore,
  type Notification, type InsertNotification,
  type InviteToken, type InsertInviteToken,
  type OnboardingStep, type InsertOnboardingStep,
  type TrainingRecord, type InsertTrainingRecord,
  type PhishingCampaign, type InsertPhishingCampaign,
  type Vendor, type InsertVendor,
  type DarkWebAlert, type InsertDarkWebAlert,
  type RemediationTask, type InsertRemediationTask,
  type BountyReport, type InsertBountyReport,
  type ContainerScan, type InsertContainerScan,
  type ContainerFinding, type InsertContainerFinding,
  type AssetInventoryItem, type InsertAssetInventoryItem,
  type AttackPath, type InsertAttackPath,
  type ThreatHuntQuery, type InsertThreatHuntQuery,
  type CopilotConversation, type InsertCopilotConversation,
  type SecurityEvent, type InsertSecurityEvent,
  type SoarPlaybook, type InsertSoarPlaybook,
  type SoarExecution, type InsertSoarExecution,
  type GraphNode, type InsertGraphNode,
  type GraphEdge, type InsertGraphEdge,
  type CaasmIdentity, type InsertCaasmIdentity,
  type IncidentComment, type InsertIncidentComment,
  type TeamActivity, type InsertTeamActivity,
  type OncallSchedule, type InsertOncallSchedule,
  type EscalationPolicy, type InsertEscalationPolicy,
  type ApprovalRequest, type InsertApprovalRequest,
  type SiemConfig, type InsertSiemConfig,
  type RetentionPolicy, type InsertRetentionPolicy,
  type Workspace, type InsertWorkspace,
  organizations, users, repositories, documents,
  scans, scanFindings, complianceMappings, reports,
  settings, auditLogs, apiKeys, subscriptions,
  pentestSessions, pentestFindings, cloudScanTargets, cloudScanResults,
  threatIntelItems, monitoringConfigs, alertRules, pipelineConfigs,
  incidents, vulnerabilities, sbomItems, secretsFindings,
  risks, attackSurfaceAssets, postureScores,
  notifications, inviteTokens, onboardingSteps,
  trainingRecords, phishingCampaigns, vendors, darkWebAlerts,
  remediationTasks, bountyReports, containerScans, containerFindings,
  assetInventory, attackPaths, threatHuntQueries, copilotConversations,
  securityEvents, soarPlaybooks, soarExecutions, graphNodes, graphEdges,
  caasmIdentities,
  incidentComments, teamActivities, oncallSchedules, escalationPolicies, approvalRequests,
  siemConfigs, retentionPolicies, workspaces,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;

  getRepositories(orgId: string): Promise<Repository[]>;
  createRepository(repo: InsertRepository): Promise<Repository>;
  deleteRepository(id: string, orgId: string): Promise<void>;

  getDocuments(orgId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string, orgId: string): Promise<void>;

  getScans(orgId: string): Promise<Scan[]>;
  getScan(id: string, orgId: string): Promise<Scan | undefined>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: string, data: Partial<Scan>): Promise<Scan | undefined>;

  getScanFindings(scanId: string): Promise<ScanFinding[]>;
  createScanFinding(finding: InsertScanFinding): Promise<ScanFinding>;
  getFindingsByOrg(orgId: string): Promise<ScanFinding[]>;

  getComplianceMappings(orgId: string): Promise<ComplianceMapping[]>;
  createComplianceMapping(mapping: InsertComplianceMapping): Promise<ComplianceMapping>;

  getReports(orgId: string): Promise<Report[]>;
  getReport(id: string, orgId: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<Report>): Promise<Report | undefined>;

  getSettings(orgId: string, category?: string): Promise<Setting[]>;
  getSetting(orgId: string, category: string, key: string): Promise<Setting | undefined>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(orgId: string, limit?: number): Promise<AuditLog[]>;

  getApiKeys(orgId: string): Promise<ApiKey[]>;
  getApiKey(id: string, orgId: string): Promise<ApiKey | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(key: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string, orgId: string): Promise<void>;

  getSubscription(orgId: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(orgId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;

  getPentestSessions(orgId: string): Promise<PentestSession[]>;
  getPentestSession(id: string, orgId: string): Promise<PentestSession | undefined>;
  createPentestSession(s: InsertPentestSession): Promise<PentestSession>;
  updatePentestSession(id: string, data: Partial<PentestSession>): Promise<PentestSession | undefined>;
  getPentestFindings(sessionId: string): Promise<PentestFinding[]>;
  createPentestFinding(f: InsertPentestFinding): Promise<PentestFinding>;
  updatePentestFinding(id: string, data: Partial<PentestFinding>): Promise<PentestFinding | undefined>;

  getCloudScanTargets(orgId: string): Promise<CloudScanTarget[]>;
  createCloudScanTarget(t: InsertCloudScanTarget): Promise<CloudScanTarget>;
  updateCloudScanTarget(id: string, data: Partial<CloudScanTarget>): Promise<CloudScanTarget | undefined>;
  deleteCloudScanTarget(id: string, orgId: string): Promise<void>;
  getCloudScanResults(orgId: string, targetId?: string): Promise<CloudScanResult[]>;
  createCloudScanResult(r: InsertCloudScanResult): Promise<CloudScanResult>;

  getThreatIntelItems(orgId: string): Promise<ThreatIntelItem[]>;
  createThreatIntelItem(i: InsertThreatIntelItem): Promise<ThreatIntelItem>;
  updateThreatIntelItem(id: string, data: Partial<ThreatIntelItem>): Promise<ThreatIntelItem | undefined>;

  getMonitoringConfigs(orgId: string): Promise<MonitoringConfig[]>;
  upsertMonitoringConfig(c: InsertMonitoringConfig): Promise<MonitoringConfig>;
  updateMonitoringConfig(id: string, data: Partial<MonitoringConfig>): Promise<MonitoringConfig | undefined>;

  getAlertRules(orgId: string): Promise<AlertRule[]>;
  createAlertRule(r: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, data: Partial<AlertRule>): Promise<AlertRule | undefined>;
  deleteAlertRule(id: string, orgId: string): Promise<void>;

  getPipelineConfigs(orgId: string): Promise<PipelineConfig[]>;
  createPipelineConfig(p: InsertPipelineConfig): Promise<PipelineConfig>;
  updatePipelineConfig(id: string, data: Partial<PipelineConfig>): Promise<PipelineConfig | undefined>;
  deletePipelineConfig(id: string, orgId: string): Promise<void>;

  getIncidents(orgId: string): Promise<Incident[]>;
  getIncident(id: string, orgId: string): Promise<Incident | undefined>;
  createIncident(i: InsertIncident): Promise<Incident>;
  updateIncident(id: string, data: Partial<Incident>): Promise<Incident | undefined>;
  deleteIncident(id: string, orgId: string): Promise<void>;

  getVulnerabilities(orgId: string): Promise<Vulnerability[]>;
  getVulnerability(id: string, orgId: string): Promise<Vulnerability | undefined>;
  createVulnerability(v: InsertVulnerability): Promise<Vulnerability>;
  updateVulnerability(id: string, data: Partial<Vulnerability>): Promise<Vulnerability | undefined>;
  deleteVulnerability(id: string, orgId: string): Promise<void>;

  getSbomItems(orgId: string): Promise<SbomItem[]>;
  createSbomItem(i: InsertSbomItem): Promise<SbomItem>;
  updateSbomItem(id: string, data: Partial<SbomItem>): Promise<SbomItem | undefined>;
  deleteSbomItem(id: string, orgId: string): Promise<void>;

  getSecretsFindings(orgId: string): Promise<SecretsFinding[]>;
  createSecretsFinding(f: InsertSecretsFinding): Promise<SecretsFinding>;
  updateSecretsFinding(id: string, data: Partial<SecretsFinding>): Promise<SecretsFinding | undefined>;
  deleteSecretsFinding(id: string, orgId: string): Promise<void>;

  getRisks(orgId: string): Promise<Risk[]>;
  getRisk(id: string, orgId: string): Promise<Risk | undefined>;
  createRisk(r: InsertRisk): Promise<Risk>;
  updateRisk(id: string, data: Partial<Risk>): Promise<Risk | undefined>;
  deleteRisk(id: string, orgId: string): Promise<void>;

  getAttackSurfaceAssets(orgId: string): Promise<AttackSurfaceAsset[]>;
  createAttackSurfaceAsset(a: InsertAttackSurfaceAsset): Promise<AttackSurfaceAsset>;
  updateAttackSurfaceAsset(id: string, data: Partial<AttackSurfaceAsset>): Promise<AttackSurfaceAsset | undefined>;
  deleteAttackSurfaceAsset(id: string, orgId: string): Promise<void>;

  getPostureScores(orgId: string, limit?: number): Promise<PostureScore[]>;
  createPostureScore(s: InsertPostureScore): Promise<PostureScore>;
  getLatestPostureScore(orgId: string): Promise<PostureScore | undefined>;

  // Notifications
  getNotifications(orgId: string, limit?: number): Promise<Notification[]>;
  getUnreadCount(orgId: string): Promise<number>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, orgId: string): Promise<void>;
  markAllNotificationsRead(orgId: string): Promise<void>;

  // Team / Invite tokens
  getTeamMembers(orgId: string): Promise<User[]>;
  updateUserRole(id: string, orgId: string, role: string): Promise<User | undefined>;
  removeTeamMember(id: string, orgId: string): Promise<void>;
  getInviteTokens(orgId: string): Promise<InviteToken[]>;
  createInviteToken(t: InsertInviteToken): Promise<InviteToken>;
  getInviteByToken(token: string): Promise<InviteToken | undefined>;
  acceptInvite(token: string): Promise<InviteToken | undefined>;

  // Onboarding
  getOnboardingSteps(orgId: string): Promise<OnboardingStep[]>;
  upsertOnboardingStep(orgId: string, step: string, completed: boolean): Promise<OnboardingStep>;
  initOnboarding(orgId: string): Promise<void>;

  // Security Awareness
  getTrainingRecords(orgId: string): Promise<TrainingRecord[]>;
  createTrainingRecord(t: InsertTrainingRecord): Promise<TrainingRecord>;
  updateTrainingRecord(id: string, data: Partial<TrainingRecord>): Promise<TrainingRecord | undefined>;
  deleteTrainingRecord(id: string, orgId: string): Promise<void>;
  getPhishingCampaigns(orgId: string): Promise<PhishingCampaign[]>;
  createPhishingCampaign(c: InsertPhishingCampaign): Promise<PhishingCampaign>;
  updatePhishingCampaign(id: string, data: Partial<PhishingCampaign>): Promise<PhishingCampaign | undefined>;
  deletePhishingCampaign(id: string, orgId: string): Promise<void>;

  // Vendor Risk
  getVendors(orgId: string): Promise<Vendor[]>;
  getVendor(id: string, orgId: string): Promise<Vendor | undefined>;
  createVendor(v: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string, orgId: string): Promise<void>;

  // Dark Web Monitoring
  getDarkWebAlerts(orgId: string): Promise<DarkWebAlert[]>;
  createDarkWebAlert(a: InsertDarkWebAlert): Promise<DarkWebAlert>;
  updateDarkWebAlert(id: string, data: Partial<DarkWebAlert>): Promise<DarkWebAlert | undefined>;
  deleteDarkWebAlert(id: string, orgId: string): Promise<void>;

  // Remediation Tasks
  getRemediationTasks(orgId: string): Promise<RemediationTask[]>;
  getRemediationTask(id: string, orgId: string): Promise<RemediationTask | undefined>;
  createRemediationTask(t: InsertRemediationTask): Promise<RemediationTask>;
  updateRemediationTask(id: string, data: Partial<RemediationTask>): Promise<RemediationTask | undefined>;
  deleteRemediationTask(id: string, orgId: string): Promise<void>;

  // Bug Bounty
  getBountyReports(orgId: string): Promise<BountyReport[]>;
  getBountyReport(id: string, orgId: string): Promise<BountyReport | undefined>;
  createBountyReport(r: InsertBountyReport): Promise<BountyReport>;
  updateBountyReport(id: string, data: Partial<BountyReport>): Promise<BountyReport | undefined>;
  deleteBountyReport(id: string, orgId: string): Promise<void>;

  // Container Security
  getContainerScans(orgId: string): Promise<ContainerScan[]>;
  getContainerScan(id: string, orgId: string): Promise<ContainerScan | undefined>;
  createContainerScan(s: InsertContainerScan): Promise<ContainerScan>;
  updateContainerScan(id: string, data: Partial<ContainerScan>): Promise<ContainerScan | undefined>;
  getContainerFindings(scanId: string): Promise<ContainerFinding[]>;
  createContainerFinding(f: InsertContainerFinding): Promise<ContainerFinding>;

  // Asset Inventory
  getAssets(orgId: string): Promise<AssetInventoryItem[]>;
  getAsset(id: string, orgId: string): Promise<AssetInventoryItem | undefined>;
  createAsset(a: InsertAssetInventoryItem): Promise<AssetInventoryItem>;
  updateAsset(id: string, data: Partial<AssetInventoryItem>): Promise<AssetInventoryItem | undefined>;
  deleteAsset(id: string, orgId: string): Promise<void>;

  // CAASM Identities
  getCaasmIdentities(orgId: string): Promise<CaasmIdentity[]>;
  getCaasmIdentity(id: string, orgId: string): Promise<CaasmIdentity | undefined>;
  createCaasmIdentity(i: InsertCaasmIdentity): Promise<CaasmIdentity>;
  updateCaasmIdentity(id: string, data: Partial<CaasmIdentity>): Promise<CaasmIdentity | undefined>;
  deleteCaasmIdentity(id: string, orgId: string): Promise<void>;

  // Team Operations
  getIncidentComments(orgId: string, incidentId: string): Promise<IncidentComment[]>;
  createIncidentComment(c: InsertIncidentComment): Promise<IncidentComment>;
  deleteIncidentComment(id: string, orgId: string): Promise<void>;
  getTeamActivities(orgId: string, limit?: number): Promise<TeamActivity[]>;
  createTeamActivity(a: InsertTeamActivity): Promise<TeamActivity>;
  getOncallSchedules(orgId: string): Promise<OncallSchedule[]>;
  createOncallSchedule(s: InsertOncallSchedule): Promise<OncallSchedule>;
  deleteOncallSchedule(id: string, orgId: string): Promise<void>;
  getEscalationPolicies(orgId: string): Promise<EscalationPolicy[]>;
  createEscalationPolicy(p: InsertEscalationPolicy): Promise<EscalationPolicy>;
  updateEscalationPolicy(id: string, data: Partial<EscalationPolicy>): Promise<EscalationPolicy | undefined>;
  deleteEscalationPolicy(id: string, orgId: string): Promise<void>;
  getApprovalRequests(orgId: string): Promise<ApprovalRequest[]>;
  createApprovalRequest(r: InsertApprovalRequest): Promise<ApprovalRequest>;
  updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined>;

  // Attack Paths
  getAttackPaths(orgId: string): Promise<AttackPath[]>;
  getAttackPath(id: string, orgId: string): Promise<AttackPath | undefined>;
  createAttackPath(p: InsertAttackPath): Promise<AttackPath>;
  updateAttackPath(id: string, data: Partial<AttackPath>): Promise<AttackPath | undefined>;
  deleteAttackPath(id: string, orgId: string): Promise<void>;

  // Threat Hunt Queries
  getThreatHuntQueries(orgId: string): Promise<ThreatHuntQuery[]>;
  createThreatHuntQuery(q: InsertThreatHuntQuery): Promise<ThreatHuntQuery>;
  deleteThreatHuntQuery(id: string, orgId: string): Promise<void>;

  // Copilot Conversations
  getCopilotConversation(orgId: string, userId: string): Promise<CopilotConversation | undefined>;
  upsertCopilotConversation(orgId: string, userId: string, messages: any[]): Promise<CopilotConversation>;

  // Security Events (Data Lake)
  getSecurityEvents(orgId: string, limit?: number): Promise<SecurityEvent[]>;
  createSecurityEvent(e: InsertSecurityEvent): Promise<SecurityEvent>;

  // SOAR
  getSoarPlaybooks(orgId: string): Promise<SoarPlaybook[]>;
  getSoarPlaybook(id: string, orgId: string): Promise<SoarPlaybook | undefined>;
  createSoarPlaybook(p: InsertSoarPlaybook): Promise<SoarPlaybook>;
  updateSoarPlaybook(id: string, data: Partial<SoarPlaybook>): Promise<SoarPlaybook | undefined>;
  getSoarExecutions(orgId: string): Promise<SoarExecution[]>;
  getSoarExecution(id: string): Promise<SoarExecution | undefined>;
  createSoarExecution(e: InsertSoarExecution): Promise<SoarExecution>;
  updateSoarExecution(id: string, data: Partial<SoarExecution>): Promise<SoarExecution | undefined>;

  // Graph
  getGraphNodes(orgId: string): Promise<GraphNode[]>;
  createGraphNode(n: InsertGraphNode): Promise<GraphNode>;
  updateGraphNode(id: string, data: Partial<GraphNode>): Promise<GraphNode | undefined>;
  getGraphEdges(orgId: string): Promise<GraphEdge[]>;
  createGraphEdge(e: InsertGraphEdge): Promise<GraphEdge>;

  // SIEM
  getSiemConfigs(orgId: string): Promise<SiemConfig[]>;
  getSiemConfig(id: string, orgId: string): Promise<SiemConfig | undefined>;
  createSiemConfig(c: InsertSiemConfig): Promise<SiemConfig>;
  updateSiemConfig(id: string, data: Partial<SiemConfig>): Promise<SiemConfig | undefined>;
  deleteSiemConfig(id: string, orgId: string): Promise<void>;

  // Retention Policies
  getRetentionPolicies(orgId: string): Promise<RetentionPolicy[]>;
  createRetentionPolicy(p: InsertRetentionPolicy): Promise<RetentionPolicy>;
  updateRetentionPolicy(id: string, data: Partial<RetentionPolicy>): Promise<RetentionPolicy | undefined>;
  deleteRetentionPolicy(id: string, orgId: string): Promise<void>;

  // Workspaces
  getWorkspaces(orgId: string): Promise<Workspace[]>;
  getWorkspace(id: string, orgId: string): Promise<Workspace | undefined>;
  createWorkspace(w: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: string, orgId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return org;
  }

  async getRepositories(orgId: string): Promise<Repository[]> {
    return db.select().from(repositories).where(eq(repositories.organizationId, orgId)).orderBy(desc(repositories.createdAt));
  }

  async createRepository(repo: InsertRepository): Promise<Repository> {
    const [created] = await db.insert(repositories).values(repo).returning();
    return created;
  }

  async deleteRepository(id: string, orgId: string): Promise<void> {
    await db.delete(repositories).where(and(eq(repositories.id, id), eq(repositories.organizationId, orgId)));
  }

  async getDocuments(orgId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.organizationId, orgId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async deleteDocument(id: string, orgId: string): Promise<void> {
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.organizationId, orgId)));
  }

  async getScans(orgId: string): Promise<Scan[]> {
    return db.select().from(scans).where(eq(scans.organizationId, orgId)).orderBy(desc(scans.createdAt));
  }

  async getScan(id: string, orgId: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(and(eq(scans.id, id), eq(scans.organizationId, orgId))).limit(1);
    return scan;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [created] = await db.insert(scans).values(scan).returning();
    return created;
  }

  async updateScan(id: string, data: Partial<Scan>): Promise<Scan | undefined> {
    const [updated] = await db.update(scans).set(data).where(eq(scans.id, id)).returning();
    return updated;
  }

  async getScanFindings(scanId: string): Promise<ScanFinding[]> {
    return db.select().from(scanFindings).where(eq(scanFindings.scanId, scanId)).orderBy(desc(scanFindings.createdAt));
  }

  async createScanFinding(finding: InsertScanFinding): Promise<ScanFinding> {
    const [created] = await db.insert(scanFindings).values(finding).returning();
    return created;
  }

  async getFindingsByOrg(orgId: string): Promise<ScanFinding[]> {
    return db.select().from(scanFindings).where(eq(scanFindings.organizationId, orgId)).orderBy(desc(scanFindings.createdAt));
  }

  async getComplianceMappings(orgId: string): Promise<ComplianceMapping[]> {
    return db.select().from(complianceMappings).where(eq(complianceMappings.organizationId, orgId));
  }

  async createComplianceMapping(mapping: InsertComplianceMapping): Promise<ComplianceMapping> {
    const [created] = await db.insert(complianceMappings).values(mapping).returning();
    return created;
  }

  async getReports(orgId: string): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.organizationId, orgId)).orderBy(desc(reports.createdAt));
  }

  async getReport(id: string, orgId: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(and(eq(reports.id, id), eq(reports.organizationId, orgId))).limit(1);
    return report;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async updateReport(id: string, data: Partial<Report>): Promise<Report | undefined> {
    const [updated] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getSettings(orgId: string, category?: string): Promise<Setting[]> {
    if (category) {
      return db.select().from(settings).where(and(eq(settings.organizationId, orgId), eq(settings.category, category)));
    }
    return db.select().from(settings).where(eq(settings.organizationId, orgId));
  }

  async getSetting(orgId: string, category: string, key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings)
      .where(and(eq(settings.organizationId, orgId), eq(settings.category, category), eq(settings.key, key)))
      .limit(1);
    return setting;
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.organizationId, setting.category, setting.key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value: setting.value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings).values(setting).returning();
    return created;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(orgId: string, limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.organizationId, orgId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getApiKeys(orgId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.organizationId, orgId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: string, orgId: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, orgId))).limit(1);
    return key;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
    return key;
  }

  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(key).returning();
    return created;
  }

  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const [updated] = await db.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning();
    return updated;
  }

  async deleteApiKey(id: string, orgId: string): Promise<void> {
    await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, orgId)));
  }

  async getSubscription(orgId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, orgId)).limit(1);
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async updateSubscription(orgId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.organizationId, orgId)).returning();
    return updated;
  }

  async getPentestSessions(orgId: string): Promise<PentestSession[]> {
    return db.select().from(pentestSessions).where(eq(pentestSessions.organizationId, orgId)).orderBy(desc(pentestSessions.createdAt));
  }
  async getPentestSession(id: string, orgId: string): Promise<PentestSession | undefined> {
    const [s] = await db.select().from(pentestSessions).where(and(eq(pentestSessions.id, id), eq(pentestSessions.organizationId, orgId))).limit(1);
    return s;
  }
  async createPentestSession(s: InsertPentestSession): Promise<PentestSession> {
    const [created] = await db.insert(pentestSessions).values(s).returning();
    return created;
  }
  async updatePentestSession(id: string, data: Partial<PentestSession>): Promise<PentestSession | undefined> {
    const [updated] = await db.update(pentestSessions).set(data).where(eq(pentestSessions.id, id)).returning();
    return updated;
  }
  async getPentestFindings(sessionId: string): Promise<PentestFinding[]> {
    return db.select().from(pentestFindings).where(eq(pentestFindings.sessionId, sessionId)).orderBy(desc(pentestFindings.createdAt));
  }
  async createPentestFinding(f: InsertPentestFinding): Promise<PentestFinding> {
    const [created] = await db.insert(pentestFindings).values(f).returning();
    return created;
  }
  async updatePentestFinding(id: string, data: Partial<PentestFinding>): Promise<PentestFinding | undefined> {
    const [updated] = await db.update(pentestFindings).set(data).where(eq(pentestFindings.id, id)).returning();
    return updated;
  }

  async getCloudScanTargets(orgId: string): Promise<CloudScanTarget[]> {
    return db.select().from(cloudScanTargets).where(eq(cloudScanTargets.organizationId, orgId)).orderBy(desc(cloudScanTargets.createdAt));
  }
  async createCloudScanTarget(t: InsertCloudScanTarget): Promise<CloudScanTarget> {
    const [created] = await db.insert(cloudScanTargets).values(t).returning();
    return created;
  }
  async updateCloudScanTarget(id: string, data: Partial<CloudScanTarget>): Promise<CloudScanTarget | undefined> {
    const [updated] = await db.update(cloudScanTargets).set(data).where(eq(cloudScanTargets.id, id)).returning();
    return updated;
  }
  async deleteCloudScanTarget(id: string, orgId: string): Promise<void> {
    await db.delete(cloudScanResults).where(eq(cloudScanResults.targetId, id));
    await db.delete(cloudScanTargets).where(and(eq(cloudScanTargets.id, id), eq(cloudScanTargets.organizationId, orgId)));
  }
  async getCloudScanResults(orgId: string, targetId?: string): Promise<CloudScanResult[]> {
    const conditions = targetId
      ? and(eq(cloudScanResults.organizationId, orgId), eq(cloudScanResults.targetId, targetId))
      : eq(cloudScanResults.organizationId, orgId);
    return db.select().from(cloudScanResults).where(conditions).orderBy(desc(cloudScanResults.createdAt));
  }
  async createCloudScanResult(r: InsertCloudScanResult): Promise<CloudScanResult> {
    const [created] = await db.insert(cloudScanResults).values(r).returning();
    return created;
  }

  async getThreatIntelItems(orgId: string): Promise<ThreatIntelItem[]> {
    return db.select().from(threatIntelItems).where(eq(threatIntelItems.organizationId, orgId)).orderBy(desc(threatIntelItems.createdAt));
  }
  async createThreatIntelItem(i: InsertThreatIntelItem): Promise<ThreatIntelItem> {
    const [created] = await db.insert(threatIntelItems).values(i).returning();
    return created;
  }
  async updateThreatIntelItem(id: string, data: Partial<ThreatIntelItem>): Promise<ThreatIntelItem | undefined> {
    const [updated] = await db.update(threatIntelItems).set(data).where(eq(threatIntelItems.id, id)).returning();
    return updated;
  }

  async getMonitoringConfigs(orgId: string): Promise<MonitoringConfig[]> {
    return db.select().from(monitoringConfigs).where(eq(monitoringConfigs.organizationId, orgId)).orderBy(monitoringConfigs.createdAt);
  }
  async upsertMonitoringConfig(c: InsertMonitoringConfig): Promise<MonitoringConfig> {
    const existing = await db.select().from(monitoringConfigs)
      .where(and(eq(monitoringConfigs.organizationId, c.organizationId), eq(monitoringConfigs.type, c.type))).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(monitoringConfigs).set(c).where(eq(monitoringConfigs.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(monitoringConfigs).values(c).returning();
    return created;
  }
  async updateMonitoringConfig(id: string, data: Partial<MonitoringConfig>): Promise<MonitoringConfig | undefined> {
    const [updated] = await db.update(monitoringConfigs).set(data).where(eq(monitoringConfigs.id, id)).returning();
    return updated;
  }

  async getAlertRules(orgId: string): Promise<AlertRule[]> {
    return db.select().from(alertRules).where(eq(alertRules.organizationId, orgId)).orderBy(desc(alertRules.createdAt));
  }
  async createAlertRule(r: InsertAlertRule): Promise<AlertRule> {
    const [created] = await db.insert(alertRules).values(r).returning();
    return created;
  }
  async updateAlertRule(id: string, data: Partial<AlertRule>): Promise<AlertRule | undefined> {
    const [updated] = await db.update(alertRules).set(data).where(eq(alertRules.id, id)).returning();
    return updated;
  }
  async deleteAlertRule(id: string, orgId: string): Promise<void> {
    await db.delete(alertRules).where(and(eq(alertRules.id, id), eq(alertRules.organizationId, orgId)));
  }

  async getPipelineConfigs(orgId: string): Promise<PipelineConfig[]> {
    return db.select().from(pipelineConfigs).where(eq(pipelineConfigs.organizationId, orgId)).orderBy(desc(pipelineConfigs.createdAt));
  }
  async createPipelineConfig(p: InsertPipelineConfig): Promise<PipelineConfig> {
    const [created] = await db.insert(pipelineConfigs).values(p).returning();
    return created;
  }
  async updatePipelineConfig(id: string, data: Partial<PipelineConfig>): Promise<PipelineConfig | undefined> {
    const [updated] = await db.update(pipelineConfigs).set(data).where(eq(pipelineConfigs.id, id)).returning();
    return updated;
  }
  async deletePipelineConfig(id: string, orgId: string): Promise<void> {
    await db.delete(pipelineConfigs).where(and(eq(pipelineConfigs.id, id), eq(pipelineConfigs.organizationId, orgId)));
  }

  async getIncidents(orgId: string): Promise<Incident[]> {
    return db.select().from(incidents).where(eq(incidents.organizationId, orgId)).orderBy(desc(incidents.createdAt));
  }
  async getIncident(id: string, orgId: string): Promise<Incident | undefined> {
    const [r] = await db.select().from(incidents).where(and(eq(incidents.id, id), eq(incidents.organizationId, orgId))).limit(1);
    return r;
  }
  async createIncident(i: InsertIncident): Promise<Incident> {
    const [r] = await db.insert(incidents).values(i).returning();
    return r;
  }
  async updateIncident(id: string, data: Partial<Incident>): Promise<Incident | undefined> {
    const [r] = await db.update(incidents).set(data).where(eq(incidents.id, id)).returning();
    return r;
  }
  async deleteIncident(id: string, orgId: string): Promise<void> {
    await db.delete(incidents).where(and(eq(incidents.id, id), eq(incidents.organizationId, orgId)));
  }

  async getVulnerabilities(orgId: string): Promise<Vulnerability[]> {
    return db.select().from(vulnerabilities).where(eq(vulnerabilities.organizationId, orgId)).orderBy(desc(vulnerabilities.createdAt));
  }
  async getVulnerability(id: string, orgId: string): Promise<Vulnerability | undefined> {
    const [r] = await db.select().from(vulnerabilities).where(and(eq(vulnerabilities.id, id), eq(vulnerabilities.organizationId, orgId))).limit(1);
    return r;
  }
  async createVulnerability(v: InsertVulnerability): Promise<Vulnerability> {
    const [r] = await db.insert(vulnerabilities).values(v).returning();
    return r;
  }
  async updateVulnerability(id: string, data: Partial<Vulnerability>): Promise<Vulnerability | undefined> {
    const [r] = await db.update(vulnerabilities).set(data).where(eq(vulnerabilities.id, id)).returning();
    return r;
  }
  async deleteVulnerability(id: string, orgId: string): Promise<void> {
    await db.delete(vulnerabilities).where(and(eq(vulnerabilities.id, id), eq(vulnerabilities.organizationId, orgId)));
  }

  async getSbomItems(orgId: string): Promise<SbomItem[]> {
    return db.select().from(sbomItems).where(eq(sbomItems.organizationId, orgId)).orderBy(desc(sbomItems.createdAt));
  }
  async createSbomItem(i: InsertSbomItem): Promise<SbomItem> {
    const [r] = await db.insert(sbomItems).values(i).returning();
    return r;
  }
  async updateSbomItem(id: string, data: Partial<SbomItem>): Promise<SbomItem | undefined> {
    const [r] = await db.update(sbomItems).set(data).where(eq(sbomItems.id, id)).returning();
    return r;
  }
  async deleteSbomItem(id: string, orgId: string): Promise<void> {
    await db.delete(sbomItems).where(and(eq(sbomItems.id, id), eq(sbomItems.organizationId, orgId)));
  }

  async getSecretsFindings(orgId: string): Promise<SecretsFinding[]> {
    return db.select().from(secretsFindings).where(eq(secretsFindings.organizationId, orgId)).orderBy(desc(secretsFindings.createdAt));
  }
  async createSecretsFinding(f: InsertSecretsFinding): Promise<SecretsFinding> {
    const [r] = await db.insert(secretsFindings).values(f).returning();
    return r;
  }
  async updateSecretsFinding(id: string, data: Partial<SecretsFinding>): Promise<SecretsFinding | undefined> {
    const [r] = await db.update(secretsFindings).set(data).where(eq(secretsFindings.id, id)).returning();
    return r;
  }
  async deleteSecretsFinding(id: string, orgId: string): Promise<void> {
    await db.delete(secretsFindings).where(and(eq(secretsFindings.id, id), eq(secretsFindings.organizationId, orgId)));
  }

  async getRisks(orgId: string): Promise<Risk[]> {
    return db.select().from(risks).where(eq(risks.organizationId, orgId)).orderBy(desc(risks.createdAt));
  }
  async getRisk(id: string, orgId: string): Promise<Risk | undefined> {
    const [r] = await db.select().from(risks).where(and(eq(risks.id, id), eq(risks.organizationId, orgId))).limit(1);
    return r;
  }
  async createRisk(r: InsertRisk): Promise<Risk> {
    const [created] = await db.insert(risks).values(r).returning();
    return created;
  }
  async updateRisk(id: string, data: Partial<Risk>): Promise<Risk | undefined> {
    const [r] = await db.update(risks).set(data).where(eq(risks.id, id)).returning();
    return r;
  }
  async deleteRisk(id: string, orgId: string): Promise<void> {
    await db.delete(risks).where(and(eq(risks.id, id), eq(risks.organizationId, orgId)));
  }

  async getAttackSurfaceAssets(orgId: string): Promise<AttackSurfaceAsset[]> {
    return db.select().from(attackSurfaceAssets).where(eq(attackSurfaceAssets.organizationId, orgId)).orderBy(desc(attackSurfaceAssets.createdAt));
  }
  async createAttackSurfaceAsset(a: InsertAttackSurfaceAsset): Promise<AttackSurfaceAsset> {
    const [r] = await db.insert(attackSurfaceAssets).values(a).returning();
    return r;
  }
  async updateAttackSurfaceAsset(id: string, data: Partial<AttackSurfaceAsset>): Promise<AttackSurfaceAsset | undefined> {
    const [r] = await db.update(attackSurfaceAssets).set(data).where(eq(attackSurfaceAssets.id, id)).returning();
    return r;
  }
  async deleteAttackSurfaceAsset(id: string, orgId: string): Promise<void> {
    await db.delete(attackSurfaceAssets).where(and(eq(attackSurfaceAssets.id, id), eq(attackSurfaceAssets.organizationId, orgId)));
  }

  async getPostureScores(orgId: string, limit = 30): Promise<PostureScore[]> {
    return db.select().from(postureScores).where(eq(postureScores.organizationId, orgId)).orderBy(desc(postureScores.createdAt)).limit(limit);
  }
  async createPostureScore(s: InsertPostureScore): Promise<PostureScore> {
    const [r] = await db.insert(postureScores).values(s).returning();
    return r;
  }
  async getLatestPostureScore(orgId: string): Promise<PostureScore | undefined> {
    const [r] = await db.select().from(postureScores).where(eq(postureScores.organizationId, orgId)).orderBy(desc(postureScores.createdAt)).limit(1);
    return r;
  }

  async getNotifications(orgId: string, limit = 50): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.organizationId, orgId)).orderBy(desc(notifications.createdAt)).limit(limit);
  }
  async getUnreadCount(orgId: string): Promise<number> {
    const res = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.organizationId, orgId), eq(notifications.read, false)));
    return Number(res[0]?.count ?? 0);
  }
  async createNotification(n: InsertNotification): Promise<Notification> {
    const [r] = await db.insert(notifications).values(n).returning();
    return r;
  }
  async markNotificationRead(id: string, orgId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.organizationId, orgId)));
  }
  async markAllNotificationsRead(orgId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.organizationId, orgId), eq(notifications.read, false)));
  }

  async getTeamMembers(orgId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, orgId)).orderBy(users.createdAt);
  }
  async updateUserRole(id: string, orgId: string, role: string): Promise<User | undefined> {
    const [r] = await db.update(users).set({ role: role as any }).where(and(eq(users.id, id), eq(users.organizationId, orgId))).returning();
    return r;
  }
  async removeTeamMember(id: string, orgId: string): Promise<void> {
    await db.delete(users).where(and(eq(users.id, id), eq(users.organizationId, orgId)));
  }
  async getInviteTokens(orgId: string): Promise<InviteToken[]> {
    return db.select().from(inviteTokens).where(eq(inviteTokens.organizationId, orgId)).orderBy(desc(inviteTokens.createdAt));
  }
  async createInviteToken(t: InsertInviteToken): Promise<InviteToken> {
    const [r] = await db.insert(inviteTokens).values(t).returning();
    return r;
  }
  async getInviteByToken(token: string): Promise<InviteToken | undefined> {
    const [r] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token)).limit(1);
    return r;
  }
  async acceptInvite(token: string): Promise<InviteToken | undefined> {
    const [r] = await db.update(inviteTokens).set({ acceptedAt: new Date() }).where(eq(inviteTokens.token, token)).returning();
    return r;
  }

  async getOnboardingSteps(orgId: string): Promise<OnboardingStep[]> {
    return db.select().from(onboardingSteps).where(eq(onboardingSteps.organizationId, orgId)).orderBy(onboardingSteps.createdAt);
  }
  async upsertOnboardingStep(orgId: string, step: string, completed: boolean): Promise<OnboardingStep> {
    const existing = await db.select().from(onboardingSteps).where(and(eq(onboardingSteps.organizationId, orgId), eq(onboardingSteps.step, step))).limit(1);
    if (existing.length > 0) {
      const [r] = await db.update(onboardingSteps).set({ completed, completedAt: completed ? new Date() : null }).where(and(eq(onboardingSteps.organizationId, orgId), eq(onboardingSteps.step, step))).returning();
      return r;
    }
    const [r] = await db.insert(onboardingSteps).values({ organizationId: orgId, step, completed, completedAt: completed ? new Date() : undefined }).returning();
    return r;
  }
  async initOnboarding(orgId: string): Promise<void> {
    const steps = ["create_org", "invite_team", "enable_sso", "connect_repo", "add_cloud_account", "run_first_scan", "enable_billing", "generate_api_key"];
    for (const step of steps) {
      const existing = await db.select().from(onboardingSteps).where(and(eq(onboardingSteps.organizationId, orgId), eq(onboardingSteps.step, step))).limit(1);
      if (existing.length === 0) {
        await db.insert(onboardingSteps).values({ organizationId: orgId, step, completed: false });
      }
    }
  }

  // ── Security Awareness ───────────────────────────────────────────────────
  async getTrainingRecords(orgId: string): Promise<TrainingRecord[]> {
    return db.select().from(trainingRecords).where(eq(trainingRecords.organizationId, orgId)).orderBy(desc(trainingRecords.createdAt));
  }
  async createTrainingRecord(t: InsertTrainingRecord): Promise<TrainingRecord> {
    const [r] = await db.insert(trainingRecords).values(t).returning();
    return r;
  }
  async updateTrainingRecord(id: string, data: Partial<TrainingRecord>): Promise<TrainingRecord | undefined> {
    const [r] = await db.update(trainingRecords).set(data).where(eq(trainingRecords.id, id)).returning();
    return r;
  }
  async deleteTrainingRecord(id: string, orgId: string): Promise<void> {
    await db.delete(trainingRecords).where(and(eq(trainingRecords.id, id), eq(trainingRecords.organizationId, orgId)));
  }
  async getPhishingCampaigns(orgId: string): Promise<PhishingCampaign[]> {
    return db.select().from(phishingCampaigns).where(eq(phishingCampaigns.organizationId, orgId)).orderBy(desc(phishingCampaigns.createdAt));
  }
  async createPhishingCampaign(c: InsertPhishingCampaign): Promise<PhishingCampaign> {
    const [r] = await db.insert(phishingCampaigns).values(c).returning();
    return r;
  }
  async updatePhishingCampaign(id: string, data: Partial<PhishingCampaign>): Promise<PhishingCampaign | undefined> {
    const [r] = await db.update(phishingCampaigns).set(data).where(eq(phishingCampaigns.id, id)).returning();
    return r;
  }
  async deletePhishingCampaign(id: string, orgId: string): Promise<void> {
    await db.delete(phishingCampaigns).where(and(eq(phishingCampaigns.id, id), eq(phishingCampaigns.organizationId, orgId)));
  }

  // ── Vendor Risk ──────────────────────────────────────────────────────────
  async getVendors(orgId: string): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.organizationId, orgId)).orderBy(desc(vendors.createdAt));
  }
  async getVendor(id: string, orgId: string): Promise<Vendor | undefined> {
    const [r] = await db.select().from(vendors).where(and(eq(vendors.id, id), eq(vendors.organizationId, orgId))).limit(1);
    return r;
  }
  async createVendor(v: InsertVendor): Promise<Vendor> {
    const [r] = await db.insert(vendors).values(v).returning();
    return r;
  }
  async updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | undefined> {
    const [r] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return r;
  }
  async deleteVendor(id: string, orgId: string): Promise<void> {
    await db.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.organizationId, orgId)));
  }

  // ── Dark Web Monitoring ──────────────────────────────────────────────────
  async getDarkWebAlerts(orgId: string): Promise<DarkWebAlert[]> {
    return db.select().from(darkWebAlerts).where(eq(darkWebAlerts.organizationId, orgId)).orderBy(desc(darkWebAlerts.createdAt));
  }
  async createDarkWebAlert(a: InsertDarkWebAlert): Promise<DarkWebAlert> {
    const [r] = await db.insert(darkWebAlerts).values(a).returning();
    return r;
  }
  async updateDarkWebAlert(id: string, data: Partial<DarkWebAlert>): Promise<DarkWebAlert | undefined> {
    const [r] = await db.update(darkWebAlerts).set(data).where(eq(darkWebAlerts.id, id)).returning();
    return r;
  }
  async deleteDarkWebAlert(id: string, orgId: string): Promise<void> {
    await db.delete(darkWebAlerts).where(and(eq(darkWebAlerts.id, id), eq(darkWebAlerts.organizationId, orgId)));
  }

  // ── Remediation Tasks ────────────────────────────────────────────────────
  async getRemediationTasks(orgId: string): Promise<RemediationTask[]> {
    return db.select().from(remediationTasks).where(eq(remediationTasks.organizationId, orgId)).orderBy(desc(remediationTasks.createdAt));
  }
  async getRemediationTask(id: string, orgId: string): Promise<RemediationTask | undefined> {
    const [r] = await db.select().from(remediationTasks).where(and(eq(remediationTasks.id, id), eq(remediationTasks.organizationId, orgId))).limit(1);
    return r;
  }
  async createRemediationTask(t: InsertRemediationTask): Promise<RemediationTask> {
    const [r] = await db.insert(remediationTasks).values(t).returning();
    return r;
  }
  async updateRemediationTask(id: string, data: Partial<RemediationTask>): Promise<RemediationTask | undefined> {
    const [r] = await db.update(remediationTasks).set(data).where(eq(remediationTasks.id, id)).returning();
    return r;
  }
  async deleteRemediationTask(id: string, orgId: string): Promise<void> {
    await db.delete(remediationTasks).where(and(eq(remediationTasks.id, id), eq(remediationTasks.organizationId, orgId)));
  }

  // ── Bug Bounty ───────────────────────────────────────────────────────────
  async getBountyReports(orgId: string): Promise<BountyReport[]> {
    return db.select().from(bountyReports).where(eq(bountyReports.organizationId, orgId)).orderBy(desc(bountyReports.createdAt));
  }
  async getBountyReport(id: string, orgId: string): Promise<BountyReport | undefined> {
    const [r] = await db.select().from(bountyReports).where(and(eq(bountyReports.id, id), eq(bountyReports.organizationId, orgId))).limit(1);
    return r;
  }
  async createBountyReport(r: InsertBountyReport): Promise<BountyReport> {
    const [row] = await db.insert(bountyReports).values(r).returning();
    return row;
  }
  async updateBountyReport(id: string, data: Partial<BountyReport>): Promise<BountyReport | undefined> {
    const [r] = await db.update(bountyReports).set(data).where(eq(bountyReports.id, id)).returning();
    return r;
  }
  async deleteBountyReport(id: string, orgId: string): Promise<void> {
    await db.delete(bountyReports).where(and(eq(bountyReports.id, id), eq(bountyReports.organizationId, orgId)));
  }

  // ── Container Security ───────────────────────────────────────────────────
  async getContainerScans(orgId: string): Promise<ContainerScan[]> {
    return db.select().from(containerScans).where(eq(containerScans.organizationId, orgId)).orderBy(desc(containerScans.createdAt));
  }
  async getContainerScan(id: string, orgId: string): Promise<ContainerScan | undefined> {
    const [r] = await db.select().from(containerScans).where(and(eq(containerScans.id, id), eq(containerScans.organizationId, orgId))).limit(1);
    return r;
  }
  async createContainerScan(s: InsertContainerScan): Promise<ContainerScan> {
    const [r] = await db.insert(containerScans).values(s).returning();
    return r;
  }
  async updateContainerScan(id: string, data: Partial<ContainerScan>): Promise<ContainerScan | undefined> {
    const [r] = await db.update(containerScans).set(data).where(eq(containerScans.id, id)).returning();
    return r;
  }
  async getContainerFindings(scanId: string): Promise<ContainerFinding[]> {
    return db.select().from(containerFindings).where(eq(containerFindings.scanId, scanId)).orderBy(desc(containerFindings.createdAt));
  }
  async createContainerFinding(f: InsertContainerFinding): Promise<ContainerFinding> {
    const [r] = await db.insert(containerFindings).values(f).returning();
    return r;
  }

  // ── Asset Inventory ────────────────────────────────────────────────────────
  async getAssets(orgId: string): Promise<AssetInventoryItem[]> {
    return db.select().from(assetInventory).where(eq(assetInventory.organizationId, orgId)).orderBy(desc(assetInventory.createdAt));
  }
  async getAsset(id: string, orgId: string): Promise<AssetInventoryItem | undefined> {
    const [r] = await db.select().from(assetInventory).where(and(eq(assetInventory.id, id), eq(assetInventory.organizationId, orgId))).limit(1);
    return r;
  }
  async createAsset(a: InsertAssetInventoryItem): Promise<AssetInventoryItem> {
    const [r] = await db.insert(assetInventory).values(a).returning();
    return r;
  }
  async updateAsset(id: string, data: Partial<AssetInventoryItem>): Promise<AssetInventoryItem | undefined> {
    const [r] = await db.update(assetInventory).set(data).where(eq(assetInventory.id, id)).returning();
    return r;
  }
  async deleteAsset(id: string, orgId: string): Promise<void> {
    await db.delete(assetInventory).where(and(eq(assetInventory.id, id), eq(assetInventory.organizationId, orgId)));
  }

  // ── Attack Paths ───────────────────────────────────────────────────────────
  async getAttackPaths(orgId: string): Promise<AttackPath[]> {
    return db.select().from(attackPaths).where(eq(attackPaths.organizationId, orgId)).orderBy(desc(attackPaths.createdAt));
  }
  async getAttackPath(id: string, orgId: string): Promise<AttackPath | undefined> {
    const [r] = await db.select().from(attackPaths).where(and(eq(attackPaths.id, id), eq(attackPaths.organizationId, orgId))).limit(1);
    return r;
  }
  async createAttackPath(p: InsertAttackPath): Promise<AttackPath> {
    const [r] = await db.insert(attackPaths).values(p).returning();
    return r;
  }
  async updateAttackPath(id: string, data: Partial<AttackPath>): Promise<AttackPath | undefined> {
    const [r] = await db.update(attackPaths).set(data).where(eq(attackPaths.id, id)).returning();
    return r;
  }
  async deleteAttackPath(id: string, orgId: string): Promise<void> {
    await db.delete(attackPaths).where(and(eq(attackPaths.id, id), eq(attackPaths.organizationId, orgId)));
  }

  // ── Threat Hunt Queries ────────────────────────────────────────────────────
  async getThreatHuntQueries(orgId: string): Promise<ThreatHuntQuery[]> {
    return db.select().from(threatHuntQueries).where(eq(threatHuntQueries.organizationId, orgId)).orderBy(desc(threatHuntQueries.createdAt));
  }
  async createThreatHuntQuery(q: InsertThreatHuntQuery): Promise<ThreatHuntQuery> {
    const [r] = await db.insert(threatHuntQueries).values(q).returning();
    return r;
  }
  async deleteThreatHuntQuery(id: string, orgId: string): Promise<void> {
    await db.delete(threatHuntQueries).where(and(eq(threatHuntQueries.id, id), eq(threatHuntQueries.organizationId, orgId)));
  }

  // ── Copilot Conversations ──────────────────────────────────────────────────
  async getCopilotConversation(orgId: string, userId: string): Promise<CopilotConversation | undefined> {
    const [r] = await db.select().from(copilotConversations)
      .where(and(eq(copilotConversations.organizationId, orgId), eq(copilotConversations.userId, userId)))
      .orderBy(desc(copilotConversations.updatedAt)).limit(1);
    return r;
  }
  async upsertCopilotConversation(orgId: string, userId: string, messages: any[]): Promise<CopilotConversation> {
    const existing = await this.getCopilotConversation(orgId, userId);
    if (existing) {
      const [r] = await db.update(copilotConversations)
        .set({ messages, updatedAt: new Date() })
        .where(eq(copilotConversations.id, existing.id))
        .returning();
      return r;
    }
    const [r] = await db.insert(copilotConversations).values({ organizationId: orgId, userId, messages }).returning();
    return r;
  }

  // ── Security Events ────────────────────────────────────────────────────────
  async getSecurityEvents(orgId: string, limit = 100): Promise<SecurityEvent[]> {
    return db.select().from(securityEvents)
      .where(eq(securityEvents.organizationId, orgId))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }
  async createSecurityEvent(e: InsertSecurityEvent): Promise<SecurityEvent> {
    const [r] = await db.insert(securityEvents).values(e).returning();
    return r;
  }

  // ── SOAR ───────────────────────────────────────────────────────────────────
  async getSoarPlaybooks(orgId: string): Promise<SoarPlaybook[]> {
    return db.select().from(soarPlaybooks)
      .where(eq(soarPlaybooks.organizationId, orgId))
      .orderBy(desc(soarPlaybooks.createdAt));
  }
  async getSoarPlaybook(id: string, orgId: string): Promise<SoarPlaybook | undefined> {
    const [r] = await db.select().from(soarPlaybooks)
      .where(and(eq(soarPlaybooks.id, id), eq(soarPlaybooks.organizationId, orgId))).limit(1);
    return r;
  }
  async createSoarPlaybook(p: InsertSoarPlaybook): Promise<SoarPlaybook> {
    const [r] = await db.insert(soarPlaybooks).values(p).returning();
    return r;
  }
  async updateSoarPlaybook(id: string, data: Partial<SoarPlaybook>): Promise<SoarPlaybook | undefined> {
    const [r] = await db.update(soarPlaybooks).set(data).where(eq(soarPlaybooks.id, id)).returning();
    return r;
  }
  async getSoarExecutions(orgId: string): Promise<SoarExecution[]> {
    return db.select().from(soarExecutions)
      .where(eq(soarExecutions.organizationId, orgId))
      .orderBy(desc(soarExecutions.startedAt))
      .limit(50);
  }
  async getSoarExecution(id: string): Promise<SoarExecution | undefined> {
    const [r] = await db.select().from(soarExecutions).where(eq(soarExecutions.id, id)).limit(1);
    return r;
  }
  async createSoarExecution(e: InsertSoarExecution): Promise<SoarExecution> {
    const [r] = await db.insert(soarExecutions).values(e).returning();
    return r;
  }
  async updateSoarExecution(id: string, data: Partial<SoarExecution>): Promise<SoarExecution | undefined> {
    const [r] = await db.update(soarExecutions).set(data).where(eq(soarExecutions.id, id)).returning();
    return r;
  }

  // ── Graph ──────────────────────────────────────────────────────────────────
  async getGraphNodes(orgId: string): Promise<GraphNode[]> {
    return db.select().from(graphNodes)
      .where(eq(graphNodes.organizationId, orgId))
      .orderBy(desc(graphNodes.riskScore));
  }
  async createGraphNode(n: InsertGraphNode): Promise<GraphNode> {
    const [r] = await db.insert(graphNodes).values(n).returning();
    return r;
  }
  async updateGraphNode(id: string, data: Partial<GraphNode>): Promise<GraphNode | undefined> {
    const [r] = await db.update(graphNodes).set(data).where(eq(graphNodes.id, id)).returning();
    return r;
  }
  async getGraphEdges(orgId: string): Promise<GraphEdge[]> {
    const nodes = await this.getGraphNodes(orgId);
    const nodeIds = nodes.map(n => n.id);
    if (nodeIds.length === 0) return [];
    return db.select().from(graphEdges)
      .where(eq(graphEdges.organizationId, orgId));
  }
  async createGraphEdge(e: InsertGraphEdge): Promise<GraphEdge> {
    const [r] = await db.insert(graphEdges).values(e).returning();
    return r;
  }

  async getCaasmIdentities(orgId: string): Promise<CaasmIdentity[]> {
    return db.select().from(caasmIdentities).where(eq(caasmIdentities.organizationId, orgId)).orderBy(desc(caasmIdentities.riskScore));
  }
  async getCaasmIdentity(id: string, orgId: string): Promise<CaasmIdentity | undefined> {
    const [r] = await db.select().from(caasmIdentities).where(and(eq(caasmIdentities.id, id), eq(caasmIdentities.organizationId, orgId))).limit(1);
    return r;
  }
  async createCaasmIdentity(i: InsertCaasmIdentity): Promise<CaasmIdentity> {
    const [r] = await db.insert(caasmIdentities).values(i).returning();
    return r;
  }
  async updateCaasmIdentity(id: string, data: Partial<CaasmIdentity>): Promise<CaasmIdentity | undefined> {
    const [r] = await db.update(caasmIdentities).set(data).where(eq(caasmIdentities.id, id)).returning();
    return r;
  }
  async deleteCaasmIdentity(id: string, orgId: string): Promise<void> {
    await db.delete(caasmIdentities).where(and(eq(caasmIdentities.id, id), eq(caasmIdentities.organizationId, orgId)));
  }

  async getIncidentComments(orgId: string, incidentId: string): Promise<IncidentComment[]> {
    return db.select().from(incidentComments).where(and(eq(incidentComments.organizationId, orgId), eq(incidentComments.incidentId, incidentId))).orderBy(incidentComments.createdAt);
  }
  async createIncidentComment(c: InsertIncidentComment): Promise<IncidentComment> {
    const [r] = await db.insert(incidentComments).values(c).returning();
    return r;
  }
  async deleteIncidentComment(id: string, orgId: string): Promise<void> {
    await db.delete(incidentComments).where(and(eq(incidentComments.id, id), eq(incidentComments.organizationId, orgId)));
  }

  async getTeamActivities(orgId: string, limit = 100): Promise<TeamActivity[]> {
    return db.select().from(teamActivities).where(eq(teamActivities.organizationId, orgId)).orderBy(desc(teamActivities.createdAt)).limit(limit);
  }
  async createTeamActivity(a: InsertTeamActivity): Promise<TeamActivity> {
    const [r] = await db.insert(teamActivities).values(a).returning();
    return r;
  }

  async getOncallSchedules(orgId: string): Promise<OncallSchedule[]> {
    return db.select().from(oncallSchedules).where(eq(oncallSchedules.organizationId, orgId)).orderBy(oncallSchedules.startTime);
  }
  async createOncallSchedule(s: InsertOncallSchedule): Promise<OncallSchedule> {
    const [r] = await db.insert(oncallSchedules).values(s).returning();
    return r;
  }
  async deleteOncallSchedule(id: string, orgId: string): Promise<void> {
    await db.delete(oncallSchedules).where(and(eq(oncallSchedules.id, id), eq(oncallSchedules.organizationId, orgId)));
  }

  async getEscalationPolicies(orgId: string): Promise<EscalationPolicy[]> {
    return db.select().from(escalationPolicies).where(eq(escalationPolicies.organizationId, orgId)).orderBy(desc(escalationPolicies.createdAt));
  }
  async createEscalationPolicy(p: InsertEscalationPolicy): Promise<EscalationPolicy> {
    const [r] = await db.insert(escalationPolicies).values(p).returning();
    return r;
  }
  async updateEscalationPolicy(id: string, data: Partial<EscalationPolicy>): Promise<EscalationPolicy | undefined> {
    const [r] = await db.update(escalationPolicies).set(data).where(eq(escalationPolicies.id, id)).returning();
    return r;
  }
  async deleteEscalationPolicy(id: string, orgId: string): Promise<void> {
    await db.delete(escalationPolicies).where(and(eq(escalationPolicies.id, id), eq(escalationPolicies.organizationId, orgId)));
  }

  async getApprovalRequests(orgId: string): Promise<ApprovalRequest[]> {
    return db.select().from(approvalRequests).where(eq(approvalRequests.organizationId, orgId)).orderBy(desc(approvalRequests.createdAt));
  }
  async createApprovalRequest(r: InsertApprovalRequest): Promise<ApprovalRequest> {
    const [row] = await db.insert(approvalRequests).values(r).returning();
    return row;
  }
  async updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const [r] = await db.update(approvalRequests).set(data).where(eq(approvalRequests.id, id)).returning();
    return r;
  }

  // SIEM
  async getSiemConfigs(orgId: string): Promise<SiemConfig[]> {
    return db.select().from(siemConfigs).where(eq(siemConfigs.organizationId, orgId)).orderBy(desc(siemConfigs.createdAt));
  }
  async getSiemConfig(id: string, orgId: string): Promise<SiemConfig | undefined> {
    const [r] = await db.select().from(siemConfigs).where(and(eq(siemConfigs.id, id), eq(siemConfigs.organizationId, orgId))).limit(1);
    return r;
  }
  async createSiemConfig(c: InsertSiemConfig): Promise<SiemConfig> {
    const [r] = await db.insert(siemConfigs).values(c).returning();
    return r;
  }
  async updateSiemConfig(id: string, data: Partial<SiemConfig>, orgId?: string): Promise<SiemConfig | undefined> {
    const cond = orgId ? and(eq(siemConfigs.id, id), eq(siemConfigs.organizationId, orgId)) : eq(siemConfigs.id, id);
    const [r] = await db.update(siemConfigs).set(data).where(cond).returning();
    return r;
  }
  async deleteSiemConfig(id: string, orgId: string): Promise<void> {
    await db.delete(siemConfigs).where(and(eq(siemConfigs.id, id), eq(siemConfigs.organizationId, orgId)));
  }

  // Retention Policies
  async getRetentionPolicies(orgId: string): Promise<RetentionPolicy[]> {
    return db.select().from(retentionPolicies).where(eq(retentionPolicies.organizationId, orgId)).orderBy(desc(retentionPolicies.createdAt));
  }
  async createRetentionPolicy(p: InsertRetentionPolicy): Promise<RetentionPolicy> {
    const [r] = await db.insert(retentionPolicies).values(p).returning();
    return r;
  }
  async updateRetentionPolicy(id: string, data: Partial<RetentionPolicy>, orgId?: string): Promise<RetentionPolicy | undefined> {
    const cond = orgId ? and(eq(retentionPolicies.id, id), eq(retentionPolicies.organizationId, orgId)) : eq(retentionPolicies.id, id);
    const [r] = await db.update(retentionPolicies).set(data).where(cond).returning();
    return r;
  }
  async deleteRetentionPolicy(id: string, orgId: string): Promise<void> {
    await db.delete(retentionPolicies).where(and(eq(retentionPolicies.id, id), eq(retentionPolicies.organizationId, orgId)));
  }

  // Workspaces
  async getWorkspaces(orgId: string): Promise<Workspace[]> {
    return db.select().from(workspaces).where(eq(workspaces.organizationId, orgId)).orderBy(desc(workspaces.createdAt));
  }
  async getWorkspace(id: string, orgId: string): Promise<Workspace | undefined> {
    const [r] = await db.select().from(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.organizationId, orgId))).limit(1);
    return r;
  }
  async createWorkspace(w: InsertWorkspace): Promise<Workspace> {
    const [r] = await db.insert(workspaces).values(w).returning();
    return r;
  }
  async updateWorkspace(id: string, data: Partial<Workspace>, orgId?: string): Promise<Workspace | undefined> {
    const cond = orgId ? and(eq(workspaces.id, id), eq(workspaces.organizationId, orgId)) : eq(workspaces.id, id);
    const [r] = await db.update(workspaces).set(data).where(cond).returning();
    return r;
  }
  async deleteWorkspace(id: string, orgId: string): Promise<void> {
    await db.delete(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.organizationId, orgId)));
  }
}

export const storage = new DatabaseStorage();
