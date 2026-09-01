import type { Express, Request, Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { requireAuth } from "./auth";

export const ZYRA_EYES_POLICY = {
  id: "rvia:zyra-eyes",
  language: "VA",
  runtime: "RVIA",
  profileName: "GOD_MODE",
  profileMeaning: "maximum owner-authorized capability; never bypasses law, platform controls, or US-CZ policy",
  localOnly: true,
  simulationDefault: true,
  nativeExecutionDefault: false,
  nativeExecutionEnv: "ZYRA_EYES_NATIVE_CONTROL",
  humanApprovalRequired: true,
  noStealth: true,
  noCredentialExtraction: true,
  noRawScreenshotLogging: true,
  noSecretTextLogging: true,
  maxFrameCells: 16384,
  approvalTtlMs: 60_000,
} as const;

const frameSchema = z.object({
  width: z.number().int().min(2).max(128),
  height: z.number().int().min(2).max(128),
  pixels: z.array(z.number().int().min(0).max(255)),
  threshold: z.number().int().min(0).max(255).default(128),
});

const planSchema = frameSchema.extend({
  goal: z.enum(["BRIGHTEST_REGION", "DARKEST_REGION", "CENTER_OF_MASS"]).default("BRIGHTEST_REGION"),
  screenWidth: z.number().int().positive().max(16384).default(1920),
  screenHeight: z.number().int().positive().max(16384).default(1080),
  action: z.enum(["MOVE", "LEFT_CLICK"]).default("MOVE"),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MOVE"), x: z.number().int().nonnegative(), y: z.number().int().nonnegative() }),
  z.object({ type: z.literal("LEFT_CLICK"), x: z.number().int().nonnegative(), y: z.number().int().nonnegative() }),
  z.object({ type: z.literal("KEY_PRESS"), key: z.enum(["enter", "escape", "tab", "space", "up", "down", "left", "right"]) }),
  z.object({ type: z.literal("TYPE_TEXT"), text: z.string().min(1).max(200) }),
]);

const executeSchema = z.object({
  action: actionSchema,
  approvalToken: z.string().uuid(),
  mode: z.enum(["SIMULATE", "NATIVE"]).default("SIMULATE"),
});

export type ZyraEyesAction = z.infer<typeof actionSchema>;
export type ZyraEyesFrame = z.infer<typeof frameSchema>;

export type BinaryVision = {
  width: number;
  height: number;
  threshold: number;
  bits: number[];
  rows: string[];
  density: number;
  transitions: number;
  centroid: { x: number; y: number } | null;
  brightest: { x: number; y: number; value: number };
  darkest: { x: number; y: number; value: number };
  frameHash: string;
};

type Approval = {
  token: string;
  actionHash: string;
  userId: string;
  expiresAt: number;
  consumed: boolean;
};

const approvals = new Map<string, Approval>();
const auditPath = process.env.ZYRA_EYES_AUDIT_LOG || join(homedir(), ".zyra", "eyes", "api-audit.jsonl");

function canonicalAction(action: ZyraEyesAction): string {
  if (action.type === "TYPE_TEXT") {
    return JSON.stringify({ type: action.type, textHash: createHash("sha256").update(action.text).digest("hex"), length: action.text.length });
  }
  return JSON.stringify(action);
}

function actionHash(action: ZyraEyesAction): string {
  return createHash("sha256").update(canonicalAction(action)).digest("hex");
}

function validateFrameShape(frame: ZyraEyesFrame): void {
  const expected = frame.width * frame.height;
  if (expected > ZYRA_EYES_POLICY.maxFrameCells) throw new Error("FRAME_TOO_LARGE");
  if (frame.pixels.length !== expected) throw new Error(`PIXEL_COUNT_MISMATCH_EXPECTED_${expected}`);
}

export function encodeBinaryVision(frameInput: ZyraEyesFrame): BinaryVision {
  const frame = frameSchema.parse(frameInput);
  validateFrameShape(frame);
  const bits = frame.pixels.map((value) => value >= frame.threshold ? 1 : 0);
  const rows: string[] = [];
  let transitions = 0;
  let ones = 0;
  let weightedX = 0;
  let weightedY = 0;
  let brightest = { x: 0, y: 0, value: -1 };
  let darkest = { x: 0, y: 0, value: 256 };

  for (let y = 0; y < frame.height; y += 1) {
    let row = "";
    for (let x = 0; x < frame.width; x += 1) {
      const index = y * frame.width + x;
      const bit = bits[index];
      const value = frame.pixels[index];
      row += String(bit);
      if (bit === 1) {
        ones += 1;
        weightedX += x;
        weightedY += y;
      }
      if (x > 0 && bits[index - 1] !== bit) transitions += 1;
      if (y > 0 && bits[index - frame.width] !== bit) transitions += 1;
      if (value > brightest.value) brightest = { x, y, value };
      if (value < darkest.value) darkest = { x, y, value };
    }
    rows.push(row);
  }

  return {
    width: frame.width,
    height: frame.height,
    threshold: frame.threshold,
    bits,
    rows,
    density: Number((ones / bits.length).toFixed(4)),
    transitions,
    centroid: ones ? { x: Number((weightedX / ones).toFixed(2)), y: Number((weightedY / ones).toFixed(2)) } : null,
    brightest,
    darkest,
    frameHash: createHash("sha256").update(Buffer.from(frame.pixels)).digest("hex"),
  };
}

export function planVisionAction(input: z.infer<typeof planSchema>): { vision: BinaryVision; action: ZyraEyesAction; rationale: string } {
  const parsed = planSchema.parse(input);
  const vision = encodeBinaryVision(parsed);
  let target = vision.brightest;
  let rationale = "Move toward the brightest observed cell.";

  if (parsed.goal === "DARKEST_REGION") {
    target = vision.darkest;
    rationale = "Move toward the darkest observed cell.";
  } else if (parsed.goal === "CENTER_OF_MASS" && vision.centroid) {
    target = { x: vision.centroid.x, y: vision.centroid.y, value: 255 };
    rationale = "Move toward the centroid of active binary cells.";
  }

  const x = Math.min(parsed.screenWidth - 1, Math.max(0, Math.round((target.x + 0.5) / parsed.width * parsed.screenWidth)));
  const y = Math.min(parsed.screenHeight - 1, Math.max(0, Math.round((target.y + 0.5) / parsed.height * parsed.screenHeight)));
  const action: ZyraEyesAction = parsed.action === "LEFT_CLICK" ? { type: "LEFT_CLICK", x, y } : { type: "MOVE", x, y };
  return { vision, action, rationale };
}

export function issueActionApproval(userId: string, action: ZyraEyesAction): Approval {
  const token = randomUUID();
  const approval: Approval = {
    token,
    actionHash: actionHash(action),
    userId,
    expiresAt: Date.now() + ZYRA_EYES_POLICY.approvalTtlMs,
    consumed: false,
  };
  approvals.set(token, approval);
  return approval;
}

export function consumeActionApproval(userId: string, token: string, action: ZyraEyesAction): boolean {
  const approval = approvals.get(token);
  if (!approval || approval.consumed || approval.expiresAt < Date.now()) return false;
  if (approval.userId !== userId || approval.actionHash !== actionHash(action)) return false;
  approval.consumed = true;
  approvals.set(token, approval);
  return true;
}

async function appendAudit(event: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(auditPath, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf8");
}

export function sanitizeActionForAudit(action: ZyraEyesAction): Record<string, unknown> {
  if (action.type === "TYPE_TEXT") {
    return { type: action.type, length: action.text.length, textHash: createHash("sha256").update(action.text).digest("hex") };
  }
  return action;
}

export function registerZyraEyesRoutes(app: Express): void {
  app.get("/api/zyra-eyes/status", requireAuth, (_req: Request, res: Response) => {
    res.json({
      policy: ZYRA_EYES_POLICY,
      nativeEnabled: process.env.ZYRA_EYES_NATIVE_CONTROL === "I_OWN_AND_AUTHORIZE_THIS_MACHINE",
      auditPath,
      architecture: ["PIXELS", "VA_BINARY_VISION", "RVIA_REASONING", "US_CZ_POLICY_GATE", "HUMAN_APPROVAL", "LOCAL_ACTION", "AUDIT"],
    });
  });

  app.post("/api/zyra-eyes/analyze", requireAuth, async (req: Request, res: Response) => {
    const parsed = frameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    try {
      const vision = encodeBinaryVision(parsed.data);
      await appendAudit({ event: "FRAME_ANALYZED", userId: req.user?.userId, frameHash: vision.frameHash, width: vision.width, height: vision.height, density: vision.density });
      return res.json({ vision });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "VISION_ANALYSIS_FAILED" });
    }
  });

  app.post("/api/zyra-eyes/plan", requireAuth, async (req: Request, res: Response) => {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    try {
      const result = planVisionAction(parsed.data);
      await appendAudit({ event: "ACTION_PLANNED", userId: req.user?.userId, frameHash: result.vision.frameHash, action: sanitizeActionForAudit(result.action), rationale: result.rationale });
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : "VISION_PLAN_FAILED" });
    }
  });

  app.post("/api/zyra-eyes/approve", requireAuth, async (req: Request, res: Response) => {
    const parsed = actionSchema.safeParse(req.body?.action);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    const approval = issueActionApproval(req.user!.userId, parsed.data);
    await appendAudit({ event: "ACTION_APPROVED", userId: req.user!.userId, action: sanitizeActionForAudit(parsed.data), expiresAt: new Date(approval.expiresAt).toISOString() });
    return res.json({ approvalToken: approval.token, expiresAt: approval.expiresAt, oneTime: true });
  });

  app.post("/api/zyra-eyes/execute", requireAuth, async (req: Request, res: Response) => {
    const parsed = executeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((i) => i.message).join(", ") });
    if (!consumeActionApproval(req.user!.userId, parsed.data.approvalToken, parsed.data.action)) {
      return res.status(403).json({ message: "APPROVAL_REQUIRED_OR_EXPIRED" });
    }

    if (parsed.data.mode === "NATIVE") {
      await appendAudit({ event: "NATIVE_EXECUTION_DELEGATED", userId: req.user!.userId, action: sanitizeActionForAudit(parsed.data.action), state: "LOCAL_PLUGIN_REQUIRED" });
      return res.status(409).json({
        message: "NATIVE_CONTROL_REQUIRES_LOCAL_PLUGIN",
        localPlugin: "apps/zyra-eyes-plugin/zyra_eyes.py",
        note: "Native execution is intentionally isolated from the web server. Run the local plugin on a machine you own and authorize.",
      });
    }

    await appendAudit({ event: "ACTION_SIMULATED", userId: req.user!.userId, action: sanitizeActionForAudit(parsed.data.action), state: "SIMULATED" });
    return res.json({ executed: false, simulated: true, action: sanitizeActionForAudit(parsed.data.action), policyState: "US_CZ_GREEN_SIMULATION" });
  });
}
