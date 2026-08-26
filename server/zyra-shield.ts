import type { Express } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "./auth";
import { storage } from "./storage";
import {
  SHIELD_CAPABILITIES,
  ZYRA_SHIELD_POLICY_VERSION,
  createEvidenceHash,
  createHumanApproval,
  evaluateShieldRequest,
  scanAgentManifest,
} from "./zyra-shield-core";

const evaluationSchema = z.object({
  agentId: z.string().min(1).max(160),
  action: z.string().min(1).max(240),
  capability: z.enum(SHIELD_CAPABILITIES),
  purpose: z.string().min(1).max(1000),
  requestedScopes: z.array(z.string().min(1).max(240)).max(100),
  dataClass: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
  networkDestinations: z.array(z.string().url().max(2048)).max(25).default([]),
  confirmRestrictedEgress: z.boolean().default(false),
  confirmHighImpact: z.boolean().default(false),
});

const scanSchema = z.object({
  manifest: z.string().min(1).max(1_000_000),
  source: z.string().min(1).max(500).default("inline"),
});

interface TrustedAgentGrant {
  organizationId: string;
  agentId: string;
  scopes: string[];
}

function resolveTrustedAgentScopes(
  organizationId: string,
  agentId: string,
): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(process.env.ZYRA_SHIELD_AGENT_GRANTS ?? "[]");
    if (!Array.isArray(parsed)) return undefined;
    const grant = parsed.find((entry): entry is TrustedAgentGrant => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Record<string, unknown>;
      return candidate.organizationId === organizationId
        && candidate.agentId === agentId
        && Array.isArray(candidate.scopes)
        && candidate.scopes.every((scope) => typeof scope === "string");
    });
    return grant ? [...new Set(grant.scopes)] : undefined;
  } catch {
    return undefined;
  }
}

export function registerZyraShieldRoutes(app: Express): void {
  app.get("/api/shield/status", requireAuth, (_req, res) => {
    res.json({
      service: "Zyra Shield",
      status: "ready",
      mode: "deny-by-default admission control",
      policyVersion: ZYRA_SHIELD_POLICY_VERSION,
      capabilities: SHIELD_CAPABILITIES,
      boundary: "Defensive cybersecurity and AI-agent governance only",
    });
  });

  app.post("/api/shield/evaluate", requireAuth, async (req, res, next) => {
    try {
      const parsed = evaluationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid Zyra Shield evaluation request",
          errors: parsed.error.flatten(),
        });
      }

      const {
        confirmHighImpact,
        confirmRestrictedEgress,
        ...request
      } = parsed.data;
      const declaredScopes = resolveTrustedAgentScopes(
        req.user!.organizationId,
        request.agentId,
      );
      const evaluatedRequest = {
        ...request,
        declaredScopes: declaredScopes ?? [],
        agentRegistered: declaredScopes !== undefined,
        egressApproved: Boolean(createHumanApproval(
          confirmRestrictedEgress,
          req.user!.userId,
          req.user!.role,
        )),
        humanApproval: createHumanApproval(
          confirmHighImpact,
          req.user!.userId,
          req.user!.role,
        ),
      };
      const decision = evaluateShieldRequest(evaluatedRequest);
      const evidenceHash = createEvidenceHash({ request: evaluatedRequest, decision });

      await storage.createAuditLog({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        action: `shield.${decision.action}`,
        resourceType: "agent_tool_request",
        resourceId: parsed.data.agentId,
        ipAddress: req.ip,
        details: {
          capability: evaluatedRequest.capability,
          requestedScopes: evaluatedRequest.requestedScopes,
          approvedBy: evaluatedRequest.humanApproval?.approvedBy,
          decision,
          integrity: { algorithm: "sha256", evidenceHash },
        },
      });

      const status = decision.action === "deny" ? 403 : decision.action === "review" ? 202 : 200;
      return res.status(status).json({ decision, evidenceHash });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/shield/scan",
    requireAuth,
    requireRole("owner", "admin", "analyst"),
    async (req, res, next) => {
      try {
        const parsed = scanSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "Invalid agent manifest",
            errors: parsed.error.flatten(),
          });
        }

        const result = scanAgentManifest(parsed.data.manifest);
        const manifestHash = createEvidenceHash(parsed.data.manifest);
        const evidenceHash = createEvidenceHash({
          source: parsed.data.source,
          manifestHash,
          result,
        });

        await storage.createAuditLog({
          organizationId: req.user!.organizationId,
          userId: req.user!.userId,
          action: result.blocked ? "shield.scan_blocked" : "shield.scan_passed",
          resourceType: "agent_manifest",
          resourceId: evidenceHash,
          ipAddress: req.ip,
          details: {
            source: parsed.data.source,
            manifestHash,
            findingCount: result.findings.length,
            maximumSeverity: result.maximumSeverity,
            integrity: { algorithm: "sha256", evidenceHash },
          },
        });

        return res.status(result.blocked ? 422 : 200).json({ ...result, evidenceHash });
      } catch (error) {
        next(error);
      }
    },
  );
}
