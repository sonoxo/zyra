import { Router, type Request, type Response } from "express";

const router = Router();
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const usage = new Map<string, number[]>();

const N2YO_BASE = "https://api.n2yo.com/rest/v1/satellite";

const upstreamProxy = () => (process.env.XUNIA_N2YO_PROXY_URL || "").replace(/\/$/, "");
const apiKey = () => process.env.N2YO_API_KEY || "";

const limits: Record<string, number> = {
  tle: 950,
  positions: 950,
  visualpasses: 90,
  radiopasses: 90,
  above: 90,
};

const ttlMs: Record<string, number> = {
  tle: 6 * 60 * 60 * 1000,
  positions: 20 * 1000,
  visualpasses: 15 * 60 * 1000,
  radiopasses: 15 * 60 * 1000,
  above: 30 * 1000,
};

function n(name: string, value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function i(name: string, value: unknown, min: number, max: number) {
  const parsed = n(name, value, min, max);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

function observer(req: Request) {
  return {
    lat: n("lat", req.query.lat, -90, 90),
    lng: n("lng", req.query.lng, -180, 180),
    alt: n("alt", req.query.alt ?? 0, -500, 100000),
  };
}

function consume(type: string) {
  const now = Date.now();
  const recent = (usage.get(type) || []).filter((ts) => ts > now - 3600000);
  if (recent.length >= (limits[type] || 90)) {
    const error = new Error(`N2YO ${type} local hourly safety budget exhausted`);
    Object.assign(error, { statusCode: 429 });
    throw error;
  }
  recent.push(now);
  usage.set(type, recent);
}

async function json(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "ZYRA-LIVE-N2YO/1.0" },
    signal: AbortSignal.timeout(Number(process.env.N2YO_TIMEOUT_MS || 10000)),
  });
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) throw new Error(`N2YO ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

async function upstream(type: string, path: string, proxyPath: string) {
  const proxy = upstreamProxy();
  if (proxy) return json(`${proxy}${proxyPath}`);
  if (!apiKey()) throw new Error("Set XUNIA_N2YO_PROXY_URL (preferred) or N2YO_API_KEY");

  const key = `${type}:${path}`;
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value;

  consume(type);
  const separator = path.startsWith("tle/") ? "&" : "/&";
  const value = await json(`${N2YO_BASE}/${path}${separator}apiKey=${encodeURIComponent(apiKey())}`);
  cache.set(key, { expiresAt: Date.now() + (ttlMs[type] || 30000), value });
  return value;
}

function unwrap(body: any) {
  return body?.status === "success" && body?.body ? body.body : body;
}

function positionsGeoJSON(body: any) {
  const data = unwrap(body);
  const positions = data?.positions || [];
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      id: String(data?.info?.satid || "satellite"),
      geometry: {
        type: "LineString",
        coordinates: positions.map((p: any) => [p.satlongitude, p.satlatitude, Number(p.sataltitude || 0) * 1000]),
      },
      properties: {
        provider: "n2yo",
        domain: "orbital",
        noradId: data?.info?.satid,
        name: data?.info?.satname,
        timestamps: positions.map((p: any) => p.timestamp),
      },
    }],
  };
}

function aboveGeoJSON(body: any) {
  const data = unwrap(body);
  return {
    type: "FeatureCollection",
    features: (data?.above || []).map((sat: any) => ({
      type: "Feature",
      id: String(sat.satid),
      geometry: { type: "Point", coordinates: [sat.satlng, sat.satlat, Number(sat.satalt || 0) * 1000] },
      properties: {
        provider: "n2yo",
        domain: "orbital",
        noradId: sat.satid,
        name: sat.satname,
        internationalDesignator: sat.intDesignator,
        launchDate: sat.launchDate,
        altitudeKm: sat.satalt,
      },
    })),
  };
}

function fail(res: Response, error: unknown) {
  const status = Number((error as any)?.statusCode || 502);
  res.status(status).json({ ok: false, provider: "n2yo", error: String(error) });
}

router.get("/health", (_req, res) => {
  const now = Date.now();
  const quotas = Object.fromEntries(Object.keys(limits).map((type) => {
    const used = (usage.get(type) || []).filter((ts) => ts > now - 3600000).length;
    return [type, { used, localLimit: limits[type], remaining: Math.max(0, limits[type] - used) }];
  }));
  res.json({
    ok: Boolean(upstreamProxy() || apiKey()),
    provider: "n2yo",
    domain: "orbital",
    mode: upstreamProxy() ? "xunia-proxy" : apiKey() ? "direct-n2yo" : "unconfigured",
    cacheEntries: cache.size,
    quotas,
  });
});

router.get("/tle/:id", async (req, res) => {
  try {
    const id = i("id", req.params.id, 1, 999999999);
    res.json(unwrap(await upstream("tle", `tle/${id}`, `/tle/${id}`)));
  } catch (error) { fail(res, error); }
});

router.get("/positions/:id", async (req, res) => {
  try {
    const id = i("id", req.params.id, 1, 999999999);
    const o = observer(req);
    const seconds = i("seconds", req.query.seconds ?? 300, 1, 300);
    const query = new URLSearchParams({ lat: String(o.lat), lng: String(o.lng), alt: String(o.alt), seconds: String(seconds) });
    res.json(unwrap(await upstream("positions", `positions/${id}/${o.lat}/${o.lng}/${o.alt}/${seconds}`, `/positions/${id}?${query}`)));
  } catch (error) { fail(res, error); }
});

router.get("/positions/:id/geojson", async (req, res) => {
  try {
    const id = i("id", req.params.id, 1, 999999999);
    const o = observer(req);
    const seconds = i("seconds", req.query.seconds ?? 300, 1, 300);
    const query = new URLSearchParams({ lat: String(o.lat), lng: String(o.lng), alt: String(o.alt), seconds: String(seconds) });
    if (upstreamProxy()) return res.json(await json(`${upstreamProxy()}/positions/${id}/geojson?${query}`));
    const data = await upstream("positions", `positions/${id}/${o.lat}/${o.lng}/${o.alt}/${seconds}`, `/positions/${id}?${query}`);
    res.json(positionsGeoJSON(data));
  } catch (error) { fail(res, error); }
});

router.get("/above/geojson", async (req, res) => {
  try {
    const o = observer(req);
    const radius = i("radius", req.query.radius ?? 90, 0, 90);
    const category = i("category", req.query.category ?? 0, 0, 9999);
    const query = new URLSearchParams({ lat: String(o.lat), lng: String(o.lng), alt: String(o.alt), radius: String(radius), category: String(category) });
    if (upstreamProxy()) return res.json(await json(`${upstreamProxy()}/above/geojson?${query}`));
    const data = await upstream("above", `above/${o.lat}/${o.lng}/${o.alt}/${radius}/${category}`, `/above?${query}`);
    res.json(aboveGeoJSON(data));
  } catch (error) { fail(res, error); }
});

router.get("/stream/:id", async (req, res) => {
  try {
    if (!upstreamProxy()) throw new Error("Live SSE fanout requires XUNIA_N2YO_PROXY_URL");
    const id = i("id", req.params.id, 1, 999999999);
    const o = observer(req);
    const seconds = i("seconds", req.query.seconds ?? 300, 30, 300);
    const query = new URLSearchParams({ lat: String(o.lat), lng: String(o.lng), alt: String(o.alt), seconds: String(seconds) });
    const target = `${upstreamProxy()}/stream/${id}?${query}`;
    const response = await fetch(target, { headers: { Accept: "text/event-stream" } });
    if (!response.ok || !response.body) throw new Error(`XUNIA N2YO stream failed (${response.status})`);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    const reader = response.body.getReader();
    req.on("close", () => reader.cancel().catch(() => {}));
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) { fail(res, error); }
});

export default router;
