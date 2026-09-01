import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { parseVirginia, type VirginiaStep } from "./src/virginia.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

const baseUrl = () => (process.env.FOUNDRY_BASE_URL || "").replace(/\/$/, "");
const token = () => process.env.FOUNDRY_TOKEN || "";
const eyerisBaseUrl = () => (process.env.EYERIS_BASE_URL || "").replace(/\/$/, "");
const eyerisOntology = () => process.env.EYERIS_ONTOLOGY || "";
const watchDogToken = () => process.env.WATCH_DOG_PIPELINE_TOKEN || "";
let shuttingDown = false;
let server: ReturnType<typeof app.listen>;

type WatchDogPipelineEvent = {
  id: string;
  receivedAt: string;
  schema: string;
  source: string;
  evidenceState: string;
  privacy: {
    publicCctv: "BLOCKED";
    identityRecognition: "DISABLED";
    authorizedCameraOnly: true;
  };
  detection: Record<string, unknown>;
  palantir: {
    disposition: "PENDING_HUMAN_APPROVAL";
    suggestedObjectType: string;
    suggestedAction: string;
  };
};

const watchDogEvents: WatchDogPipelineEvent[] = [];
const WATCH_DOG_EVENT_LIMIT = 500;

function requireWatchDogAuth(req: express.Request) {
  const required = watchDogToken();
  if (!required) return;
  const supplied = req.header("authorization") || "";
  if (supplied !== `Bearer ${required}`) throw new Error("WATCH_DOG_PIPELINE_UNAUTHORIZED");
}

function beginShutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[RICHMONDVA3LM] Zyra shutdown started: ${reason}`);

  server.close((error) => {
    if (error) {
      console.error("[RICHMONDVA3LM] HTTP shutdown error", error);
      process.exitCode = 1;
      return;
    }
    console.log("[RICHMONDVA3LM] Zyra HTTP server stopped. Foundry gateway is offline with this process.");
  });

  const forceClose = setTimeout(() => {
    server.closeAllConnections?.();
  }, 5000);
  forceClose.unref();
}

async function foundry(pathname: string, init: RequestInit = {}) {
  if (!baseUrl() || !token()) throw new Error("FOUNDRY_BASE_URL and FOUNDRY_TOKEN are required");
  const response = await fetch(`${baseUrl()}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) throw new Error(`Foundry ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

async function eyeris(pathname: string) {
  if (!eyerisBaseUrl()) throw new Error("EYERIS_BASE_URL is required for live detector health");
  const response = await fetch(`${eyerisBaseUrl()}${pathname}`, { headers: { Accept: "application/json" } });
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) throw new Error(`EYERIS ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

function requireGeoVisionOntology(explicit?: string) {
  const ontology = explicit || eyerisOntology();
  if (!ontology) throw new Error("EYERIS_ONTOLOGY or an explicit ontology API name is required");
  return ontology;
}

async function geoVisionStatus() {
  let detector: unknown = { configured: Boolean(eyerisBaseUrl()), reachable: false };
  if (eyerisBaseUrl()) {
    try {
      detector = { configured: true, reachable: true, health: await eyeris("/health") };
    } catch (error) {
      detector = { configured: true, reachable: false, error: String(error) };
    }
  }

  return {
    mode: "VA3LM",
    profile: "PALANTIRVABRAIN3LM / GPT-DOUG-LLM / ZYRA / XUNA / SONOXO ECOSYSTEM",
    capability: "NON_IDENTIFYING_OBJECT_SCENE_RECOGNITION",
    foundryConfigured: Boolean(baseUrl() && token()),
    ontology: eyerisOntology() || null,
    detector,
    watchDog: {
      pipeline: "ONLINE",
      bufferedEvents: watchDogEvents.length,
      palantirDisposition: "PENDING_HUMAN_APPROVAL",
      publicCctv: "BLOCKED",
      identityRecognition: "DISABLED",
    },
    evidenceFlow: [
      "AUTHORIZED_PRIVATE_CAMERA",
      "OBJECT_SCENE_INFERENCE",
      "WATCH_DOG_EVENT",
      "ZYRA_GEOVISION_INGEST",
      "PALANTIR_READY_ONTOLOGY_ENVELOPE",
      "HUMAN_APPROVAL_GATE",
      "REVIEWABLE_EVIDENCE",
    ],
    prohibitedIdentityModes: [
      "PUBLIC_CCTV_INGEST",
      "FACE_RECOGNITION",
      "BIOMETRIC_EMBEDDINGS",
      "NAMED_PERSON_LOOKUP",
      "PERSISTENT_INDIVIDUAL_TRACKING",
    ],
  };
}

async function executeStep(step: VirginiaStep) {
  switch (step.op) {
    case "LIST_ONTOLOGIES":
      return foundry("/api/v2/ontologies");
    case "LIST_OBJECT_TYPES":
      return foundry(`/api/v2/ontologies/${encodeURIComponent(step.ontology || "")}/objectTypes`);
    case "LIST_OBJECTS":
      return foundry(`/api/v2/ontologies/${encodeURIComponent(step.ontology || "")}/objects/${encodeURIComponent(step.objectType || "")}`);
    case "APPLY_ACTION":
      return foundry(`/api/v2/ontologies/${encodeURIComponent(step.ontology || "")}/actions/${encodeURIComponent(step.action || "")}/apply`, {
        method: "POST",
        body: JSON.stringify({ parameters: step.parameters || {} }),
      });
    case "GEOVISION_STATUS":
      return geoVisionStatus();
    case "GEOVISION_CAMERAS": {
      const ontology = requireGeoVisionOntology(step.ontology);
      return foundry(`/api/v2/ontologies/${encodeURIComponent(ontology)}/objects/Camera`);
    }
    case "GEOVISION_DETECTIONS": {
      const ontology = requireGeoVisionOntology(step.ontology);
      return foundry(`/api/v2/ontologies/${encodeURIComponent(ontology)}/objects/Detection`);
    }
    case "SHUTDOWN_ZYRA":
      return {
        command: "/RICHMONDVA3LM",
        state: "shutdown-requested",
        profile: "GPT-DOUG-3LM / XUNIABOT / ZYRA / PALANTIR BRIDGE",
        effect: "Stop this Zyra Live Implement process after the response is delivered. Its Foundry gateway closes with it.",
      };
    default:
      return { note: step.text || "" };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: !shuttingDown,
    status: shuttingDown ? "SHUTTING_DOWN" : "ONLINE",
    app: "zyra-live-implement",
    mode: "VAL3M+VA3LM",
    foundryConfigured: Boolean(baseUrl() && token()),
    eyerisConfigured: Boolean(eyerisBaseUrl()),
    eyerisOntology: eyerisOntology() || null,
    watchDogBufferedEvents: watchDogEvents.length,
    publicCctv: "BLOCKED",
  });
});

app.get("/api/va3lm/geovision/status", async (_req, res) => {
  res.json(await geoVisionStatus());
});

app.post("/api/va3lm/geovision/watch-dog/events", (req, res) => {
  try {
    requireWatchDogAuth(req);
    const body = req.body || {};

    if (body?.privacy?.publicCctv !== "BLOCKED" || body?.privacy?.authorizedCameraOnly !== true) {
      return res.status(403).json({
        accepted: false,
        error: "PUBLIC_CCTV_BLOCKED",
        requiredPrivacy: {
          publicCctv: "BLOCKED",
          identityRecognition: "DISABLED",
          authorizedCameraOnly: true,
        },
      });
    }

    if (body?.source !== "gpt-doug-lllm-watch-dog") {
      return res.status(400).json({ accepted: false, error: "UNTRUSTED_WATCH_DOG_SOURCE" });
    }

    const event: WatchDogPipelineEvent = {
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      schema: String(body.schema || "zyra.geovision.watchdog.v1"),
      source: body.source,
      evidenceState: String(body.evidenceState || "LIVE"),
      privacy: {
        publicCctv: "BLOCKED",
        identityRecognition: "DISABLED",
        authorizedCameraOnly: true,
      },
      detection: typeof body.detection === "object" && body.detection ? body.detection : {},
      palantir: {
        disposition: "PENDING_HUMAN_APPROVAL",
        suggestedObjectType: String(body?.palantir?.suggestedObjectType || "Detection"),
        suggestedAction: String(body?.palantir?.suggestedAction || "upsertWatchDogDetection"),
      },
    };

    watchDogEvents.unshift(event);
    if (watchDogEvents.length > WATCH_DOG_EVENT_LIMIT) watchDogEvents.length = WATCH_DOG_EVENT_LIMIT;

    res.status(202).json({
      accepted: true,
      id: event.id,
      evidenceState: event.evidenceState,
      zyra: "GEOVISION_INGESTED",
      palantir: event.palantir,
      publicCctv: "BLOCKED",
    });
  } catch (error) {
    const message = String(error);
    const status = message.includes("UNAUTHORIZED") ? 401 : 400;
    res.status(status).json({ accepted: false, error: message });
  }
});

app.get("/api/va3lm/geovision/watch-dog/events", (req, res) => {
  try {
    requireWatchDogAuth(req);
    const limit = Math.max(1, Math.min(Number(req.query.limit || 50), 500));
    res.json({
      source: "ZYRA_GEOVISION",
      publicCctv: "BLOCKED",
      count: Math.min(limit, watchDogEvents.length),
      events: watchDogEvents.slice(0, limit),
    });
  } catch (error) {
    res.status(401).json({ error: String(error) });
  }
});

app.get("/api/va3lm/geovision/watch-dog/palantir-pending", (req, res) => {
  try {
    requireWatchDogAuth(req);
    res.json({
      writePolicy: "HUMAN_APPROVAL_REQUIRED",
      foundryConfigured: Boolean(baseUrl() && token()),
      pending: watchDogEvents.map((event) => ({
        eventId: event.id,
        objectType: event.palantir.suggestedObjectType,
        action: event.palantir.suggestedAction,
        parameters: {
          eventId: event.id,
          receivedAt: event.receivedAt,
          evidenceState: event.evidenceState,
          source: event.source,
          detection: event.detection,
          privacy: event.privacy,
        },
      })),
    });
  } catch (error) {
    res.status(401).json({ error: String(error) });
  }
});

app.get("/api/foundry/ontologies", async (_req, res) => {
  try { res.json(await foundry("/api/v2/ontologies")); }
  catch (error) { res.status(502).json({ error: String(error) }); }
});

app.get("/api/foundry/ontologies/:ontology/object-types", async (req, res) => {
  try { res.json(await foundry(`/api/v2/ontologies/${encodeURIComponent(req.params.ontology)}/objectTypes`)); }
  catch (error) { res.status(502).json({ error: String(error) }); }
});

app.get("/api/foundry/ontologies/:ontology/objects/:objectType", async (req, res) => {
  try { res.json(await foundry(`/api/v2/ontologies/${encodeURIComponent(req.params.ontology)}/objects/${encodeURIComponent(req.params.objectType)}`)); }
  catch (error) { res.status(502).json({ error: String(error) }); }
});

app.post("/api/foundry/ontologies/:ontology/actions/:action/apply", async (req, res) => {
  try {
    res.json(await foundry(`/api/v2/ontologies/${encodeURIComponent(req.params.ontology)}/actions/${encodeURIComponent(req.params.action)}/apply`, {
      method: "POST",
      body: JSON.stringify({ parameters: req.body?.parameters || {} }),
    }));
  } catch (error) { res.status(502).json({ error: String(error) }); }
});

app.post("/api/virginia/plan", (req, res) => {
  res.json(parseVirginia(String(req.body?.mission || "")));
});

app.post("/api/virginia/execute", async (req, res) => {
  try {
    const mission = parseVirginia(String(req.body?.mission || ""));
    const results = [] as unknown[];
    let shutdownRequested = false;

    for (const step of mission.steps) {
      results.push({ step, result: await executeStep(step) });
      if (step.op === "SHUTDOWN_ZYRA") shutdownRequested = true;
    }

    res.json({ mission, results, completed: true, stopWhen: mission.stopWhen });
    if (shutdownRequested) res.once("finish", () => beginShutdown("/RICHMONDVA3LM"));
  } catch (error) {
    res.status(502).json({ completed: false, error: String(error) });
  }
});

app.use((_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const port = Number(process.env.PORT || 5050);
server = app.listen(port, () => console.log(`Zyra Live Implement listening on :${port}`));

process.once("SIGTERM", () => beginShutdown("SIGTERM"));
process.once("SIGINT", () => beginShutdown("SIGINT"));
