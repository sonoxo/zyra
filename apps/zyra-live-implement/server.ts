import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
let shuttingDown = false;
let server: ReturnType<typeof app.listen>;

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
    evidenceFlow: [
      "AUTHORIZED_MEDIA",
      "OBJECT_SCENE_INFERENCE",
      "WGS84_GEOSPATIAL_ENRICHMENT",
      "CAMERA_DETECTION_ONTOLOGY",
      "MAP_WORKSHOP_OSDK",
      "REVIEWABLE_EVIDENCE",
    ],
    prohibitedIdentityModes: [
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
  });
});

app.get("/api/va3lm/geovision/status", async (_req, res) => {
  res.json(await geoVisionStatus());
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
