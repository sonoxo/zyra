import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";
import {
  buildNxyzMicrosoftLayerPlan,
  NXYZ_MICROSOFT_COMPONENTS,
} from "@shared/nxyz-microsoft-layer";

const planSchema = z.object({
  inputKind: z.enum(["DOCUMENT", "KNOWLEDGE_QUERY", "AGENT_WORKFLOW", "CONTRACT_OPPORTUNITY"]),
  needsGraphContext: z.boolean().optional().default(false),
  needsAgents: z.boolean().optional().default(false),
  embeddingProvider: z.enum(["NOT_SELECTED", "LOCAL", "AZURE_OPENAI", "OPENAI_COMPATIBLE", "CUSTOM"]).optional().default("NOT_SELECTED"),
});

export function registerNxyzMicrosoftLayerRoutes(app: Express): void {
  app.get("/api/nxyz/microsoft-layer/status", requireAuth, (_req: Request, res: Response) => {
    return res.json({
      layer: "NXYZ_MICROSOFT_OSS_LAYER",
      schema: "nxyz-microsoft-layer/1.0",
      mode: "PLAN_ONLY_ADAPTER_READY",
      components: NXYZ_MICROSOFT_COMPONENTS,
      boundaries: {
        microsoftEndorsementImplied: false,
        azureDependencyRequired: false,
        graphRagCoreDependency: false,
        externalExecutionPerformed: false,
        humanApprovalRequiredForExternalActions: true,
      },
    });
  });

  app.post("/api/nxyz/microsoft-layer/plan", requireAuth, (req: Request, res: Response) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
    }

    return res.json({
      plan: buildNxyzMicrosoftLayerPlan(parsed.data),
      note: "This endpoint produces a governed integration plan only. It does not install Microsoft packages, call Azure, execute GraphRAG indexing, or start external agents.",
    });
  });
}
