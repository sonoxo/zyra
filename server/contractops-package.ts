import type { Express, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./db";
import { requireAuth, requireRole } from "./auth";
import { auditLogs } from "@shared/schema";
import {
  contractopsOpportunities,
  contractopsProposalSections,
  contractopsProposals,
  contractopsRegistrations,
} from "@shared/contractops-schema";
import { buildSubmissionPackage, renderSubmissionPackageMarkdown } from "@shared/contractops-package";

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function writeAudit(req: Request, proposalId: string, details: Record<string, unknown>) {
  await db.insert(auditLogs).values({
    organizationId: req.user!.organizationId,
    userId: req.user!.userId,
    action: "contractops.submission_package.generated",
    resourceType: "federal_proposal",
    resourceId: proposalId,
    details,
    ipAddress: req.ip,
  });
}

export function registerContractOpsPackageRoutes(app: Express): void {
  app.post(
    "/api/contractops/proposals/:id/package",
    requireAuth,
    requireRole("owner", "admin", "analyst"),
    async (req: Request, res: Response) => {
      const [proposal] = await db
        .select()
        .from(contractopsProposals)
        .where(and(
          eq(contractopsProposals.id, req.params.id),
          eq(contractopsProposals.organizationId, req.user!.organizationId),
        ))
        .limit(1);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      if (proposal.status !== "SUBMISSION_READY" || proposal.reviewDecision !== "APPROVED") {
        return res.status(409).json({ message: "Only an internally approved SUBMISSION_READY proposal can be exported" });
      }

      const [[opportunity], sections, registrations] = await Promise.all([
        db
          .select()
          .from(contractopsOpportunities)
          .where(and(
            eq(contractopsOpportunities.id, proposal.opportunityId),
            eq(contractopsOpportunities.organizationId, req.user!.organizationId),
          ))
          .limit(1),
        db
          .select()
          .from(contractopsProposalSections)
          .where(and(
            eq(contractopsProposalSections.proposalId, proposal.id),
            eq(contractopsProposalSections.organizationId, req.user!.organizationId),
          ))
          .orderBy(asc(contractopsProposalSections.ordinal)),
        db
          .select()
          .from(contractopsRegistrations)
          .where(eq(contractopsRegistrations.organizationId, req.user!.organizationId)),
      ]);
      if (!opportunity) return res.status(409).json({ message: "Proposal opportunity record is missing" });

      try {
        const manifest = buildSubmissionPackage({
          proposal: {
            id: proposal.id,
            title: proposal.title,
            status: proposal.status,
            reviewDecision: proposal.reviewDecision,
            reviewNotes: proposal.reviewNotes,
            reviewedAt: proposal.reviewedAt,
          },
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            agency: opportunity.agency,
            solicitationNumber: opportunity.solicitationNumber,
            sourceUrl: opportunity.sourceUrl,
            deadline: opportunity.deadline,
            naics: opportunity.naics,
            psc: opportunity.psc,
            setAside: opportunity.setAside,
          },
          sections: sections.map((section) => ({
            key: section.key,
            title: section.title,
            content: section.content,
            status: section.status,
            requirementRefs: jsonStringArray(section.requirementRefs),
            evidenceRefs: jsonStringArray(section.evidenceRefs),
          })),
          readiness: jsonRecord(proposal.readiness),
          registrations: registrations.map((row) => ({
            system: row.system,
            status: row.status,
            identifier: row.identifier,
            verificationSource: row.verificationSource,
          })),
        });
        const markdown = renderSubmissionPackageMarkdown(manifest);
        await writeAudit(req, proposal.id, {
          packageId: manifest.packageId,
          generatedAt: manifest.generatedAt,
          sectionCount: manifest.sections.length,
          evidenceRefCount: manifest.evidenceIndex.length,
          externalSubmissionPerformed: false,
        });
        return res.json({ manifest, markdown });
      } catch (error) {
        return res.status(409).json({ message: error instanceof Error ? error.message : "PACKAGE_BUILD_FAILED" });
      }
    },
  );
}
