import type { Express, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { requireAuth, requireRole } from "./auth";
import { auditLogs } from "@shared/schema";
import {
  contractopsOpportunities,
  contractopsProposalSections,
  contractopsProposals,
  contractopsRegistrations,
} from "@shared/contractops-schema";
import { buildOpportunityEvidenceMatrix } from "@shared/contractops-evidence";
import {
  buildProposalSeed,
  computeProposalReadiness,
  type ProposalEvidenceMatchInput,
} from "@shared/contractops-proposal";

const sectionUpdateSchema = z.object({
  content: z.string().max(30000),
  status: z.enum(["DRAFT", "EVIDENCE_NEEDED", "READY"]),
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  notes: z.string().trim().min(3).max(10000),
});

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function evidenceMatchArray(value: unknown): ProposalEvidenceMatchInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.requirement !== "string") return [];
    if (row.state !== "SUPPORTED_CANDIDATE" && row.state !== "GAP") return [];
    const candidates = Array.isArray(row.candidates)
      ? row.candidates.flatMap((candidate) => {
          if (!candidate || typeof candidate !== "object") return [];
          const c = candidate as Record<string, unknown>;
          if (typeof c.id !== "string" || typeof c.label !== "string" || typeof c.domain !== "string") return [];
          return [{
            id: c.id,
            label: c.label,
            domain: c.domain,
            score: typeof c.score === "number" ? c.score : 0,
            verificationUrl: typeof c.verificationUrl === "string" ? c.verificationUrl : undefined,
            repositoryPath: typeof c.repositoryPath === "string" ? c.repositoryPath : undefined,
          }];
        })
      : [];
    return [{
      requirement: row.requirement,
      state: row.state,
      topScore: typeof row.topScore === "number" ? row.topScore : 0,
      candidates,
    }];
  });
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

async function loadProposal(proposalId: string, organizationId: string) {
  const [proposal] = await db
    .select()
    .from(contractopsProposals)
    .where(and(
      eq(contractopsProposals.id, proposalId),
      eq(contractopsProposals.organizationId, organizationId),
    ))
    .limit(1);
  if (!proposal) return null;
  const sections = await db
    .select()
    .from(contractopsProposalSections)
    .where(and(
      eq(contractopsProposalSections.proposalId, proposal.id),
      eq(contractopsProposalSections.organizationId, organizationId),
    ))
    .orderBy(asc(contractopsProposalSections.ordinal));
  return { ...proposal, sections };
}

async function refreshProposalReadiness(proposalId: string, organizationId: string) {
  const proposal = await loadProposal(proposalId, organizationId);
  if (!proposal) return null;
  const [[opportunity], registrations] = await Promise.all([
    db
      .select()
      .from(contractopsOpportunities)
      .where(and(
        eq(contractopsOpportunities.id, proposal.opportunityId),
        eq(contractopsOpportunities.organizationId, organizationId),
      ))
      .limit(1),
    db
      .select()
      .from(contractopsRegistrations)
      .where(eq(contractopsRegistrations.organizationId, organizationId)),
  ]);
  if (!opportunity) return null;

  const readiness = computeProposalReadiness({
    bidDecision: opportunity.bidDecision,
    evidenceMatches: evidenceMatchArray(opportunity.evidenceMatches),
    registrations: registrations.map((row) => ({
      system: row.system,
      status: row.status,
      verificationSource: row.verificationSource,
    })),
    sections: proposal.sections.map((section) => ({
      key: section.key,
      title: section.title,
      status: section.status,
      content: section.content,
    })),
  });

  const [updated] = await db
    .update(contractopsProposals)
    .set({
      blockers: readiness.blockers,
      readiness,
      status: proposal.status === "SUBMISSION_READY" && !readiness.ready ? "REVIEW" : proposal.status,
      updatedAt: new Date(),
    })
    .where(eq(contractopsProposals.id, proposal.id))
    .returning();
  return { ...updated, sections: proposal.sections, readiness };
}

export function registerContractOpsProposalRoutes(app: Express): void {
  app.get("/api/contractops/proposals", requireAuth, async (req: Request, res: Response) => {
    const proposals = await db
      .select()
      .from(contractopsProposals)
      .where(eq(contractopsProposals.organizationId, req.user!.organizationId))
      .orderBy(asc(contractopsProposals.createdAt));
    const data = await Promise.all(proposals.map((proposal) => loadProposal(proposal.id, req.user!.organizationId)));
    return res.json({ proposals: data.filter(Boolean) });
  });

  app.get("/api/contractops/proposals/:id", requireAuth, async (req: Request, res: Response) => {
    const proposal = await loadProposal(req.params.id, req.user!.organizationId);
    if (!proposal) return res.status(404).json({ message: "Proposal not found" });
    return res.json({ proposal });
  });

  app.post("/api/contractops/opportunities/:id/proposal", requireAuth, async (req: Request, res: Response) => {
    const [opportunity] = await db
      .select()
      .from(contractopsOpportunities)
      .where(and(
        eq(contractopsOpportunities.id, req.params.id),
        eq(contractopsOpportunities.organizationId, req.user!.organizationId),
      ))
      .limit(1);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });
    if (opportunity.bidDecision !== "BID") {
      return res.status(400).json({ message: "A human BID decision is required before creating a proposal workspace" });
    }

    const [existing] = await db
      .select()
      .from(contractopsProposals)
      .where(and(
        eq(contractopsProposals.organizationId, req.user!.organizationId),
        eq(contractopsProposals.opportunityId, opportunity.id),
      ))
      .limit(1);
    if (existing) {
      const current = await refreshProposalReadiness(existing.id, req.user!.organizationId);
      return res.json({ proposal: current, created: false });
    }

    const requirements = stringArray(opportunity.requirements);
    let evidenceMatches = evidenceMatchArray(opportunity.evidenceMatches);
    if (evidenceMatches.length !== requirements.length && requirements.length > 0) {
      const matrix = buildOpportunityEvidenceMatrix(requirements);
      evidenceMatches = matrix.matches;
      await db
        .update(contractopsOpportunities)
        .set({ evidenceMatches: matrix.matches, evidenceCoverageReady: matrix.ready, updatedAt: new Date() })
        .where(eq(contractopsOpportunities.id, opportunity.id));
    }

    const seedSections = buildProposalSeed({
      title: opportunity.title,
      agency: opportunity.agency,
      solicitationNumber: opportunity.solicitationNumber,
      summary: opportunity.summary,
      requirements,
      evidenceMatches,
    });

    const [proposal] = await db
      .insert(contractopsProposals)
      .values({
        organizationId: req.user!.organizationId,
        opportunityId: opportunity.id,
        title: `${opportunity.title} — Proposal Workspace`,
        status: "DRAFTING",
        reviewDecision: "PENDING",
        blockers: [],
        readiness: {},
        createdById: req.user!.userId,
      })
      .returning();

    await db.insert(contractopsProposalSections).values(seedSections.map((section) => ({
      organizationId: req.user!.organizationId,
      proposalId: proposal.id,
      key: section.key,
      title: section.title,
      ordinal: section.ordinal,
      content: section.content,
      status: section.status,
      requirementRefs: section.requirementRefs,
      evidenceRefs: section.evidenceRefs,
      updatedById: req.user!.userId,
    })));

    const refreshed = await refreshProposalReadiness(proposal.id, req.user!.organizationId);
    await writeAudit(req, "contractops.proposal.created", "federal_proposal", proposal.id, {
      opportunityId: opportunity.id,
      sectionCount: seedSections.length,
      evidenceGapCount: evidenceMatches.filter((match) => match.state === "GAP").length,
      externalSubmissionPerformed: false,
    });
    return res.status(201).json({ proposal: refreshed, created: true });
  });

  app.put(
    "/api/contractops/proposals/:id/sections/:sectionId",
    requireAuth,
    requireRole("owner", "admin", "analyst"),
    async (req: Request, res: Response) => {
      const parsed = sectionUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
      if (parsed.data.status === "READY" && parsed.data.content.trim().length < 30) {
        return res.status(400).json({ message: "READY sections require substantive content before review" });
      }

      const proposal = await loadProposal(req.params.id, req.user!.organizationId);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      const section = proposal.sections.find((candidate) => candidate.id === req.params.sectionId);
      if (!section) return res.status(404).json({ message: "Proposal section not found" });
      if (proposal.status === "SUBMISSION_READY") return res.status(409).json({ message: "Approved proposal is locked; request changes before editing" });

      const [updatedSection] = await db
        .update(contractopsProposalSections)
        .set({
          content: parsed.data.content,
          status: parsed.data.status,
          updatedById: req.user!.userId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(contractopsProposalSections.id, section.id),
          eq(contractopsProposalSections.organizationId, req.user!.organizationId),
        ))
        .returning();

      const refreshed = await refreshProposalReadiness(proposal.id, req.user!.organizationId);
      await writeAudit(req, "contractops.proposal.section.updated", "federal_proposal_section", section.id, {
        proposalId: proposal.id,
        status: updatedSection.status,
        contentLength: updatedSection.content.length,
      });
      return res.json({ section: updatedSection, proposal: refreshed });
    },
  );

  app.post("/api/contractops/proposals/:id/refresh-readiness", requireAuth, async (req: Request, res: Response) => {
    const proposal = await refreshProposalReadiness(req.params.id, req.user!.organizationId);
    if (!proposal) return res.status(404).json({ message: "Proposal not found" });
    return res.json({ proposal, readiness: proposal.readiness });
  });

  app.put(
    "/api/contractops/proposals/:id/review",
    requireAuth,
    requireRole("owner", "admin"),
    async (req: Request, res: Response) => {
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });

      const current = await refreshProposalReadiness(req.params.id, req.user!.organizationId);
      if (!current) return res.status(404).json({ message: "Proposal not found" });
      if (parsed.data.decision === "APPROVED" && !current.readiness.ready) {
        return res.status(409).json({
          message: "Proposal cannot be approved while readiness blockers remain",
          blockers: current.readiness.blockers,
          registrationFlags: current.readiness.registrationFlags,
        });
      }

      const status = parsed.data.decision === "APPROVED"
        ? "SUBMISSION_READY"
        : parsed.data.decision === "CHANGES_REQUESTED"
          ? "REVIEW_CHANGES"
          : "REJECTED";
      const [updated] = await db
        .update(contractopsProposals)
        .set({
          status,
          reviewDecision: parsed.data.decision,
          reviewNotes: parsed.data.notes,
          reviewedById: req.user!.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contractopsProposals.id, current.id))
        .returning();

      if (parsed.data.decision === "APPROVED") {
        await db
          .update(contractopsOpportunities)
          .set({ status: "SUBMISSION_READY", updatedAt: new Date() })
          .where(and(
            eq(contractopsOpportunities.id, current.opportunityId),
            eq(contractopsOpportunities.organizationId, req.user!.organizationId),
          ));
      }

      await writeAudit(req, "contractops.proposal.reviewed", "federal_proposal", current.id, {
        decision: parsed.data.decision,
        submissionReady: parsed.data.decision === "APPROVED",
        externalSubmissionPerformed: false,
        notes: parsed.data.notes,
      });
      const finalProposal = await loadProposal(updated.id, req.user!.organizationId);
      return res.json({ proposal: finalProposal, externalSubmissionPerformed: false });
    },
  );
}
