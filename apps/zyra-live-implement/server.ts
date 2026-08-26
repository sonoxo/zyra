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
    default:
      return { note: step.text || "" };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "zyra-live-implement", mode: "VAL3M", foundryConfigured: Boolean(baseUrl() && token()) });
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
    for (const step of mission.steps) results.push({ step, result: await executeStep(step) });
    res.json({ mission, results, completed: true, stopWhen: mission.stopWhen });
  } catch (error) {
    res.status(502).json({ completed: false, error: String(error) });
  }
});

app.use((_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const port = Number(process.env.PORT || 5050);
app.listen(port, () => console.log(`Zyra Live Implement listening on :${port}`));
