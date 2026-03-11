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
  organizations, users, repositories, documents,
  scans, scanFindings, complianceMappings, reports,
  settings, auditLogs, apiKeys, subscriptions,
  pentestSessions, pentestFindings, cloudScanTargets, cloudScanResults,
  threatIntelItems, monitoringConfigs, alertRules, pipelineConfigs,
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
}

export const storage = new DatabaseStorage();
