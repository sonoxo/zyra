import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";

const REQUESTED_SPACETRACKER_URL =
  process.env.SPACETRACKER_LIVE_URL || "https://live.spacetracker.org/";
const VERIFIED_SPACETRACKER_REFERENCE_URL = "https://spacetracker.live/";
const CELESTRAK_GP_API_URL =
  process.env.SPACETRACKER_ORBITAL_API_URL ||
  "https://celestrak.org/NORAD/elements/gp.php";

const CACHE_TTL_MS = Number.parseInt(
  process.env.SPACETRACKER_CACHE_TTL_MS || String(2 * 60 * 60 * 1000),
  10,
);
const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.SPACETRACKER_REQUEST_TIMEOUT_MS || "15000",
  10,
);

const noradSchema = z.coerce.number().int().positive().max(999999);
const groupSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
const pageSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const cache = new Map<string, CacheEntry>();

export function parseNorad(value: unknown): number {
  return noradSchema.parse(value);
}

export function normalizeSpaceTrackerGroup(value: unknown): string {
  return groupSchema.parse(value).toUpperCase();
}

function cacheTtlMs(): number {
  if (!Number.isFinite(CACHE_TTL_MS) || CACHE_TTL_MS < 60_000) {
    return 2 * 60 * 60 * 1000;
  }
  return CACHE_TTL_MS;
}

async function fetchJson(url: string): Promise<unknown> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Zyra-SpaceTracker-Live/1.0 (+https://github.com/sonoxo/zyra)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Orbital upstream returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    cache.set(url, {
      expiresAt: now + cacheTtlMs(),
      value: payload,
    });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function buildCelesTrakUrl(params: Record<string, string>): string {
  const url = new URL(CELESTRAK_GP_API_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("FORMAT", "JSON");
  return url.toString();
}

async function getSatelliteRecord(norad: number): Promise<Record<string, unknown> | null> {
  const payload = await fetchJson(
    buildCelesTrakUrl({ CATNR: String(norad) }),
  );

  if (!Array.isArray(payload)) {
    throw new Error("Orbital upstream returned an unexpected payload");
  }

  const record = payload[0];
  if (!record || typeof record !== "object") {
    return null;
  }
  return record as Record<string, unknown>;
}

async function getGroupRecords(group: string): Promise<Record<string, unknown>[]> {
  const payload = await fetchJson(buildCelesTrakUrl({ GROUP: group }));
  if (!Array.isArray(payload)) {
    throw new Error("Orbital upstream returned an unexpected payload");
  }
  return payload.filter(
    (record): record is Record<string, unknown> =>
      Boolean(record) && typeof record === "object" && !Array.isArray(record),
  );
}

function sourceEnvelope() {
  return {
    integration: "SPACETRACKER_LIVE",
    ecosystemReference: REQUESTED_SPACETRACKER_URL,
    verifiedPublicReference: VERIFIED_SPACETRACKER_REFERENCE_URL,
    upstreamProvider: "CelesTrak",
    upstreamApi: CELESTRAK_GP_API_URL,
    dataClass: "CURRENT_GP_OMM_ORBITAL_ELEMENTS",
    directSpacecraftTelemetry: false,
    propagationCompatibility: "SGP4_SDP4",
    informationalUseOnly: true,
  };
}

function upstreamError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown orbital upstream error";
  return res.status(502).json({
    message: "SpaceTracker live orbital feed unavailable",
    detail: message,
    source: sourceEnvelope(),
  });
}

export function registerSpaceTrackerLiveRoutes(app: Express): void {
  app.get(
    "/api/spacetracker/capabilities",
    requireAuth,
    (_req: Request, res: Response) => {
      return res.json({
        ...sourceEnvelope(),
        status: "LIVE_ORBITAL_DATA_READY",
        routes: [
          "GET /api/spacetracker/live/:norad",
          "GET /api/spacetracker/live/group/:group?offset=0&limit=100",
          "GET /api/spacetracker/health",
        ],
        note:
          "SpaceTracker.live documents CelesTrak GP/OMM plus SGP4/SDP4 for Earth-orbit tracking. This adapter uses that documented machine-readable upstream rather than scraping the tracker UI.",
      });
    },
  );

  app.get(
    "/api/spacetracker/live/group/:group",
    requireAuth,
    async (req: Request, res: Response) => {
      const parsedGroup = groupSchema.safeParse(req.params.group);
      const parsedPage = pageSchema.safeParse(req.query);
      if (!parsedGroup.success || !parsedPage.success) {
        return res.status(400).json({ message: "Invalid SpaceTracker group request" });
      }

      const group = parsedGroup.data.toUpperCase();
      const { offset, limit } = parsedPage.data;

      try {
        const records = await getGroupRecords(group);
        return res.json({
          source: sourceEnvelope(),
          fetchedAt: new Date().toISOString(),
          group,
          total: records.length,
          offset,
          limit,
          records: records.slice(offset, offset + limit),
        });
      } catch (error) {
        return upstreamError(res, error);
      }
    },
  );

  app.get(
    "/api/spacetracker/live/:norad",
    requireAuth,
    async (req: Request, res: Response) => {
      const parsed = noradSchema.safeParse(req.params.norad);
      if (!parsed.success) {
        return res.status(400).json({ message: "NORAD catalog ID must be a positive integer" });
      }

      try {
        const record = await getSatelliteRecord(parsed.data);
        if (!record) {
          return res.status(404).json({
            message: "Satellite not found in current orbital feed",
            norad: parsed.data,
          });
        }

        return res.json({
          source: sourceEnvelope(),
          fetchedAt: new Date().toISOString(),
          norad: parsed.data,
          record,
        });
      } catch (error) {
        return upstreamError(res, error);
      }
    },
  );

  app.get(
    "/api/spacetracker/health",
    requireAuth,
    async (_req: Request, res: Response) => {
      try {
        const iss = await getSatelliteRecord(25544);
        return res.status(iss ? 200 : 503).json({
          status: iss ? "ok" : "degraded",
          source: sourceEnvelope(),
          probe: "NORAD 25544",
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        return upstreamError(res, error);
      }
    },
  );
}
