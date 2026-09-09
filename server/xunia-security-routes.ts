import type { Express, Request, Response } from "express";
import { requireAuth, requireRole } from "./auth";
import { extractRouteEvidence } from "../packages/mission-contract/index.mjs";
import {
  SECURITY_TOOL_CATALOG,
  buildSecurityPlan,
  type SecurityEngagementManifest,
} from "./xunia-security-platform";

export function registerXuniaSecurityRoutes(app: Express): void {
  app.post("/api/xunia/security/route-receipt", requireAuth, (req: Request, res: Response) => {
    try {
      const receipt = extractRouteEvidence(req.body);
      return res.json({ receipt, authenticatedSource: false, executionVerified: false });
    } catch {
      return res.status(400).json({ message: "ROUTE_EVIDENCE_REJECTED" });
    }
  });
  app.get("/api/xunia/security/catalog", requireAuth, (_req: Request, res: Response) => {
    return res.json({
      platform: "XUNIA_SECURITY_PLATFORM_V1",
      modes: ["ASSESS", "PENTEST", "SIMULATE"],
      destructiveActions: "DENIED",
      schemaVersion: "xunia.security.engagement/v1",
      tools: SECURITY_TOOL_CATALOG,
    });
  });

  app.post("/api/xunia/security/plan", requireAuth, requireRole("owner", "admin"), (req: Request, res: Response) => {
    try {
      const manifest = req.body as SecurityEngagementManifest;
      const plan = buildSecurityPlan(manifest);
      return res.status(201).json({
        platform: "XUNIA_SECURITY_PLATFORM_V1",
        plan,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SECURITY_PLAN_REJECTED";
      const status = message.includes("WINDOW") ? 403 : 400;
      return res.status(status).json({
        message,
        platform: "XUNIA_SECURITY_PLATFORM_V1",
        decision: "DENIED",
      });
    }
  });
}
