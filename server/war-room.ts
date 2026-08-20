import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";
import {
  checkWarRoomCapability,
  connectorFailure,
  summarizeConnectorStates,
  type WarRoomConnector,
} from "./war-room-core";

const capabilitySchema = z.object({ request: z.string().min(1).max(500) }).strict();

async function fetchJson(url: string, timeoutMs = 3500): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "XRAYCLOUD-AEGIS/1.0 (defensive decision support)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function weatherConnector(): Promise<WarRoomConnector> {
  const source = "https://api.weather.gov/alerts/active";
  try {
    const payload = await fetchJson(source) as { features?: unknown[]; updated?: string };
    return {
      id: "public-weather",
      label: "National Weather Service public alerts",
      category: "PUBLIC_WEATHER",
      state: "CONNECTED",
      source,
      observedAt: new Date().toISOString(),
      detail: {
        activeAlerts: Array.isArray(payload.features) ? payload.features.length : 0,
        sourceUpdatedAt: typeof payload.updated === "string" ? payload.updated : null,
      },
    };
  } catch (error) {
    return connectorFailure("public-weather", "National Weather Service public alerts", "PUBLIC_WEATHER", source, error);
  }
}

async function orbitalConnector(): Promise<WarRoomConnector> {
  const source = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json";
  try {
    const payload = await fetchJson(source) as unknown[];
    return {
      id: "public-orbital",
      label: "CelesTrak public orbital catalog (stations group)",
      category: "PUBLIC_ORBITAL",
      state: "CONNECTED",
      source,
      observedAt: new Date().toISOString(),
      detail: {
        publicObjects: Array.isArray(payload) ? payload.length : 0,
        mode: "AGGREGATE_ONLY",
      },
    };
  } catch (error) {
    return connectorFailure("public-orbital", "CelesTrak public orbital catalog (stations group)", "PUBLIC_ORBITAL", source, error);
  }
}

async function antarcticaConnector(): Promise<WarRoomConnector> {
  const source = "https://api.open-meteo.com/v1/forecast?latitude=-77.8419&longitude=166.6863&current=temperature_2m,wind_speed_10m&timezone=UTC";
  try {
    const payload = await fetchJson(source) as {
      current?: { temperature_2m?: number; wind_speed_10m?: number; time?: string };
    };
    return {
      id: "antarctica-public-weather",
      label: "Antarctica public weather context (McMurdo region)",
      category: "PUBLIC_RESEARCH",
      state: "CONNECTED",
      source,
      observedAt: new Date().toISOString(),
      detail: {
        temperatureC: typeof payload.current?.temperature_2m === "number" ? payload.current.temperature_2m : null,
        windKph: typeof payload.current?.wind_speed_10m === "number" ? payload.current.wind_speed_10m : null,
        sourceTime: typeof payload.current?.time === "string" ? payload.current.time : null,
      },
    };
  } catch (error) {
    return connectorFailure("antarctica-public-weather", "Antarctica public weather context (McMurdo region)", "PUBLIC_RESEARCH", source, error);
  }
}

function localConnector(): WarRoomConnector {
  return {
    id: "zyra-local",
    label: "Zyra local control-plane heartbeat",
    category: "LOCAL",
    state: "CONNECTED",
    source: "local://zyra",
    observedAt: new Date().toISOString(),
    detail: { authenticatedApi: true, executionPath: "DISPLAY_ONLY" },
  };
}

export function registerWarRoomRoutes(app: Express) {
  app.get("/api/war-room/status", requireAuth, async (_req: Request, res: Response) => {
    const connectors = await Promise.all([
      Promise.resolve(localConnector()),
      weatherConnector(),
      orbitalConnector(),
      antarcticaConnector(),
    ]);

    return res.json({
      mode: "DEFENSIVE_DECISION_SUPPORT",
      execution: "DISPLAY_ONLY",
      observedAt: new Date().toISOString(),
      connectors,
      summary: summarizeConnectorStates(connectors),
      components: {
        warRoomUi: "CONNECTED",
        livePublicData: connectors.some(c => c.category !== "LOCAL" && c.state === "CONNECTED") ? "CONNECTED" : "DEGRADED",
        goldenShieldExecution: "NOT_CONNECTED",
        missionTwinExecution: "NOT_CONNECTED",
        mitoExecution: "DISABLED",
        etherPersistence: "NOT_CONNECTED",
      },
      allowedDecisionSupport: [
        "defensive readiness",
        "maintenance readiness",
        "public geospatial awareness",
        "public orbital awareness",
        "continuity planning",
        "critical-infrastructure resilience",
        "drone maintenance/readiness telemetry",
        "weapon-system maintenance/readiness telemetry",
      ],
      blockedControlFunctions: [
        "target selection",
        "weapon release",
        "fire control",
        "strike planning",
        "direct drone flight control",
        "drone payload control",
        "autonomous lethal action",
        "offensive cyber execution",
      ],
    });
  });

  app.post("/api/war-room/capability-check", requireAuth, (req: Request, res: Response) => {
    const parsed = capabilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid capability request" });

    const result = checkWarRoomCapability(parsed.data.request);
    return res.status(result.allowed ? 200 : 403).json({
      ...result,
      request: parsed.data.request,
      mode: "POLICY_CHECK_ONLY",
      executesAnything: false,
    });
  });
}
