import { createServer } from "node:http";
import { ZyraSunoOntology } from "./ontology.js";
import { BatchPlanner } from "./planner.js";
import type { BatchSpec, SongDraft } from "./domain.js";

const ontology = new ZyraSunoOntology();
const planner = new BatchPlanner();

const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
};

const readBody = async (req: import("node:http").IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, service: "zyraXSuno", ontology: "online" });
    }
    if (req.method === "GET" && url.pathname === "/ontology") {
      return json(res, 200, ontology.snapshot());
    }
    if (req.method === "POST" && url.pathname === "/batches/plan") {
      const spec = (await readBody(req)) as BatchSpec;
      ontology.registerBatch(spec);
      return json(res, 200, { jobs: planner.plan(spec), ontology: ontology.snapshot() });
    }
    if (req.method === "POST" && url.pathname === "/songs/validate") {
      const body = (await readBody(req)) as { batch: BatchSpec; song: SongDraft };
      return json(res, 200, ontology.validateSong(body.batch, body.song));
    }
    if (req.method === "POST" && url.pathname === "/songs/register") {
      const body = (await readBody(req)) as { batch: BatchSpec; song: SongDraft };
      return json(res, 200, ontology.registerSong(body.batch, body.song));
    }
    return json(res, 404, { error: "not_found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "unknown_error" });
  }
});

const port = Number(process.env.PORT ?? 4317);
server.listen(port, () => console.log(`zyraXSuno listening on http://localhost:${port}`));
