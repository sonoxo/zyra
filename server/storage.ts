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
  organizations, users, repositories, documents,
  scans, scanFindings, complianceMappings, reports,
  settings, auditLogs,
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
}

export const storage = new DatabaseStorage();
