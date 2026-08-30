import type { Express, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { requireAuth, requireRole } from "./auth";
import { auditLogs } from "@shared/schema";
import {
  contractopsOpportunities,
  contractopsRegistrations,
} from "@shared/contractops-schema";

const REGISTRATION_SYSTEMS = ["SAM", "UEI", "CAGE", "SBIR_STTR", "DSIP", "GRANTS_GOV"] as const;
const REGISTRATION_STATES = ["PENDING", "ACTIVE", "ACTION_REQUIRED", "EXPIRED", "NOT_STARTED"] as const;

const registrationSchema = z.object({
  status: z.enum(REGISTRATION_STATES),
  identifier: z.string().trim().max(200).optional().nullable(),
  verificationSource: z.string().url().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const opportunitySchema = z.object({
  title: z.string().trim().min(2).max(300),
  agency: z.string().trim().min(2).max(300),
  sourceUrl: z.string().url().max(3000),
  solicitationNumber: z.string().trim().max(200).optional(),
  deadline: z.string().datetime().optional(),
  naics: z.string().trim().regex(/^\d{6}$/).optional().or(z.literal("")),
  psc: z.string().trim().max(20).optional(),
  setAside: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(10000).optional(),
  requirementsText: z.string().max(30000).optional(),
});

function normalizeRequirements(input?: string): string[] {
  if (!input) return [];
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 100);
}

async function writeAudit(req: Request, action: string, resourceType: string, resourceId?: string, details?: Record<string, unknown>) {
  if (!req.user) return;
  await db.insert(auditLogs).values({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    action,
    resourceType,
    resourceId,
    details: details || {},
    ipAddress: req.ip,
  });
}

function virtualRegistrationRows(rows: Array<typeof contractopsRegistrations.$inferSelect>) {
  const bySystem = new Map(rows.map((row) => [row.system, row]));
  return REGISTRATION_SYSTEMS.map((system) => bySystem.get(system) || {
    id: `virtual-${system}`,
    organizationId: "",
    system,
    identifier: null,
    status: system === "CAGE" ? "PENDING" : "NOT_STARTED",
    verificationSource: null,
    verifiedAt: null,
    notes: null,
    updatedById: null,
    createdAt: null,
    updatedAt: null,
  });
}

export function registerContractOpsRoutes(app: Express): void {
  app.get("/api/contractops/registrations", requireAuth, async (req: Request, res: Response) => {
    const rows = await db
      .select()
      .from(contractopsRegistrations)
      .where(eq(contractopsRegistrations.organizationId, req.user!.organizationId));
    return res.json({ registrations: virtualRegistrationRows(rows) });
  });

  app.put(
    "/api/contractops/registrations/:system",
    requireAuth,
    requireRole("owner", "admin"),
    async (req: Request, res: Response) => {
      const system = String(req.params.system || "").toUpperCase();
      if (!REGISTRATION_SYSTEMS.includes(system as (typeof REGISTRATION_SYSTEMS)[number])) {
        return res.status(400).json({ message: "Unsupported registration system" });
      }
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
      if (parsed.data.status === "ACTIVE" && !parsed.data.verificationSource) {
        return res.status(400).json({ message: "ACTIVE registration state requires a verification source" });
      }

      const existing = await db
        .select()
        .from(contractopsRegistrations)
        .where(and(
          eq(contractopsRegistrations.organizationId, req.user!.organizationId),
          eq(contractopsRegistrations.system, system),
        ))
        .limit(1);

      const values = {
        organizationId: req.user!.organizationId,
        system,
        status: parsed.data.status,
        identifier: parsed.data.identifier || null,
        verificationSource: parsed.data.verificationSource || null,
        verifiedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
        notes: parsed.data.notes || null,
        updatedById: req.user!.userId,
        updatedAt: new Date(),
      };

      const [saved] = existing.length
        ? await db.update(contractopsRegistrations).set(values).where(eq(contractopsRegistrations.id, existing[0].id)).returning()
        : await db.insert(contractopsRegistrations).values(values).returning();

      await writeAudit(req, "contractops.registration.updated", "federal_registration", saved.id, {
        system,
        status: saved.status,
        hasIdentifier: Boolean(saved.identifier),
        hasVerificationSource: Boolean(saved.verificationSource),
      });
      return res.json({ registration: saved });
    },
  );

  app.get("/api/contractops/opportunities", requireAuth, async (req: Request, res: Response) => {
    const opportunities = await db
      .select()
      .from(contractopsOpportunities)
      .where(eq(contractopsOpportunities.organizationId, req.user!.organizationId))
      .orderBy(desc(contractopsOpportunities.createdAt));
    return res.json({ opportunities });
  });

  app.post("/api/contractops/opportunities", requireAuth, async (req: Request, res: Response) => {
    const parsed = opportunitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });

    const requirements = normalizeRequirements(parsed.data.requirementsText);
    const [opportunity] = await db.insert(contractopsOpportunities).values({
      organizationId: req.user!.organizationId,
      title: parsed.data.title,
      agency: parsed.data.agency,
      sourceUrl: parsed.data.sourceUrl,
      solicitationNumber: parsed.data.solicitationNumber || null,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      naics: parsed.data.naics || null,
      psc: parsed.data.psc || null,
      setAside: parsed.data.setAside || null,
      summary: parsed.data.summary || null,
      requirements,
      status: "CAPTURED",
      bidDecision: "UNDER_REVIEW",
      evidenceCoverageReady: false,
      createdById: req.user!.userId,
    }).returning();

    await writeAudit(req, "contractops.opportunity.captured", "federal_opportunity", opportunity.id, {
      agency: opportunity.agency,
      solicitationNumber: opportunity.solicitationNumber,
      requirementCount: requirements.length,
      sourceUrl: opportunity.sourceUrl,
    });
    return res.status(201).json({ opportunity });
  });

  app.get("/api/contractops/summary", requireAuth, async (req: Request, res: Response) => {
    const [registrationRows, opportunities] = await Promise.all([
      db.select().from(contractopsRegistrations).where(eq(contractopsRegistrations.organizationId, req.user!.organizationId)),
      db.select().from(contractopsOpportunities).where(eq(contractopsOpportunities.organizationId, req.user!.organizationId)),
    ]);
    const registrations = virtualRegistrationRows(registrationRows);
    const cage = registrations.find((row) => row.system === "CAGE");
    return res.json({
      cage: cage ? { status: cage.status, identifier: cage.identifier, verificationSource: cage.verificationSource } : { status: "PENDING", identifier: null, verificationSource: null },
      opportunityCount: opportunities.length,
      submissionReadyCount: opportunities.filter((row) => row.status === "SUBMISSION_READY").length,
      bidCount: opportunities.filter((row) => row.bidDecision === "BID").length,
      noBidCount: opportunities.filter((row) => row.bidDecision === "NO_BID").length,
      evidenceRule: true,
    });
  });
}
