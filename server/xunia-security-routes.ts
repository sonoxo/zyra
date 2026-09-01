import type { Express, Request, Response } from "express";
import { requireAuth } from "./auth";
import {
  SECURITY_TOOL_CATALOG,
  buildSecurityPlan,
  type SecurityEngagementManifest,
} from "./xunia-security-platform";

const DEFAULT_RUNTIME_URL = "http://127.0.0.1:8765";

function runtimeBaseUrl(): string {
  const raw = process.env.XUNIA_RUNTIME_URL || DEFAULT_RUNTIME_URL;
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('XUNIA_RUNTIME_URL_PROTOCOL_DENIED');
  const loopback = ['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname);
  if (!loopback && process.env.XUNIA_RUNTIME_ALLOW_REMOTE_PROXY !== '1') {
    throw new Error('XUNIA_RUNTIME_REMOTE_PROXY_DENIED');
  }
  return parsed.toString().replace(/\/$/, '');
}

function runtimeHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = process.env.XUNIA_LOCAL_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function runtimeFetch(path: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(`${runtimeBaseUrl()}${path}`, {
      ...init,
      headers: { ...runtimeHeaders(Boolean(init.body)), ...(init.headers || {}) },
      signal: init.signal || controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function relayJson(res: Response, upstream: globalThis.Response): Promise<void> {
  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Cache-Control', 'no-store');
  if (!text) {
    res.end();
    return;
  }
  try {
    res.json(JSON.parse(text));
  } catch {
    res.json({ message: text, runtimeStatus: upstream.status });
  }
}

function runtimeUnavailable(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'XUNIA_RUNTIME_UNAVAILABLE';
  res.status(503).json({
    message,
    runtime: 'offline',
    localOnly: true,
    startCommand: 'python xunia_realtime_runtime.py',
  });
}

export function registerXuniaSecurityRoutes(app: Express): void {
  app.get("/api/xunia/security/catalog", requireAuth, (_req: Request, res: Response) => {
    return res.json({
      platform: "XUNIA_SECURITY_PLATFORM_V1",
      modes: ["ASSESS", "PENTEST", "SIMULATE"],
      destructiveActions: "DENIED",
      schemaVersion: "xunia.security.engagement/v1",
      tools: SECURITY_TOOL_CATALOG,
    });
  });

  app.post("/api/xunia/security/plan", requireAuth, (req: Request, res: Response) => {
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

  app.get('/api/xunia/security/runtime/health', requireAuth, async (_req: Request, res: Response) => {
    try {
      await relayJson(res, await runtimeFetch('/health'));
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.get('/api/xunia/security/runtime/jobs', requireAuth, async (_req: Request, res: Response) => {
    try {
      await relayJson(res, await runtimeFetch('/v1/jobs'));
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.get('/api/xunia/security/runtime/jobs/:jobId', requireAuth, async (req: Request, res: Response) => {
    try {
      const jobId = encodeURIComponent(req.params.jobId);
      await relayJson(res, await runtimeFetch(`/v1/jobs/${jobId}`));
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.post('/api/xunia/security/runtime/jobs', requireAuth, async (req: Request, res: Response) => {
    try {
      const manifest = req.body as SecurityEngagementManifest;
      buildSecurityPlan(manifest);
      const upstream = await runtimeFetch('/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({ manifest }),
      });
      await relayJson(res, upstream);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'XUNIA_RUNTIME_JOB_REJECTED';
      if (message.includes('fetch') || message.includes('abort') || message.includes('RUNTIME_URL')) {
        runtimeUnavailable(res, error);
      } else {
        res.status(400).json({ message, decision: 'DENIED' });
      }
    }
  });

  app.post('/api/xunia/security/runtime/jobs/:jobId/cancel', requireAuth, async (req: Request, res: Response) => {
    try {
      const jobId = encodeURIComponent(req.params.jobId);
      await relayJson(res, await runtimeFetch(`/v1/jobs/${jobId}/cancel`, { method: 'POST', body: '{}' }));
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.post('/api/xunia/security/runtime/jobs/:jobId/retest', requireAuth, async (req: Request, res: Response) => {
    try {
      const jobId = encodeURIComponent(req.params.jobId);
      await relayJson(res, await runtimeFetch(`/v1/jobs/${jobId}/retest`, { method: 'POST', body: '{}' }));
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.post('/api/xunia/security/runtime/schedules', requireAuth, async (req: Request, res: Response) => {
    try {
      const manifest = req.body?.manifest as SecurityEngagementManifest;
      buildSecurityPlan(manifest);
      const intervalSeconds = Number(req.body?.intervalSeconds);
      if (!Number.isInteger(intervalSeconds) || intervalSeconds < 60) {
        return res.status(400).json({ message: 'SCHEDULE_INTERVAL_MINIMUM_60_SECONDS' });
      }
      const upstream = await runtimeFetch('/v1/schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: String(req.body?.name || 'Zyra realtime schedule'),
          intervalSeconds,
          manifest,
        }),
      });
      await relayJson(res, upstream);
    } catch (error) {
      runtimeUnavailable(res, error);
    }
  });

  app.get('/api/xunia/security/runtime/events', requireAuth, async (req: Request, res: Response) => {
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    try {
      const upstream = await fetch(`${runtimeBaseUrl()}/v1/events`, {
        headers: runtimeHeaders(),
        signal: controller.signal,
      });
      if (!upstream.ok || !upstream.body) {
        await relayJson(res, upstream);
        return;
      }
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      const reader = (upstream.body as any).getReader();
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } catch (error) {
      if (!res.headersSent) runtimeUnavailable(res, error);
    } finally {
      if (!res.writableEnded) res.end();
    }
  });
}
