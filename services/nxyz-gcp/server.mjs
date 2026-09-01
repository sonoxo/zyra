import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const PORT = Number(process.env.PORT || 8080);
const ENV = process.env.NXYZ_ENV || "development";
const REGION = process.env.NXYZ_REGION || "us-east4";
const API_KEY = process.env.NXYZ_API_KEY || "";
const MAX_BODY_BYTES = 1_000_000;

const db = new Firestore();

const collections = {
  registry: "nxyz_registry",
  evidence: "nxyz_evidence",
  runs: "nxyz_runs",
};

const builtInRegistry = [
  {
    id: "nxyz-horizons",
    name: "NXYZ Horizons Evidence Gateway",
    kind: "evidence-gateway",
    source: "server/nxyz-horizons.ts",
    verificationState: "REGISTERED",
    capabilities: [
      "evidence-normalization",
      "identifier-normalization",
      "provenance",
      "verification-state",
      "stable-hashing",
    ],
    restrictions: [
      "NO_HORIZONS_WEB_SCRAPING",
      "NO_CREDENTIAL_AUTOMATION",
      "NO_AUTOMATIC_CRIMINALITY_ASSERTIONS",
      "NAME_MATCHES_REMAIN_UNVERIFIED_UNTIL_CORROBORATED",
    ],
  },
  {
    id: "zyra-core",
    name: "ZYRA Core",
    kind: "platform",
    verificationState: "REGISTERED",
    capabilities: ["agent-orchestration", "tool-routing", "evidence-linking"],
  },
  {
    id: "xunia",
    name: "XUNIA",
    kind: "builder-runtime",
    verificationState: "REGISTERED",
    capabilities: ["application-building", "workflow-execution"],
  },
  {
    id: "gpt-doug",
    name: "GPT-Doug",
    kind: "agent-runtime",
    verificationState: "REGISTERED",
    capabilities: ["reasoning", "planning", "tool-use"],
  },
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  const data = typeof value === "string" ? value : JSON.stringify(canonicalize(value));
  return createHash("sha256").update(data).digest("hex");
}

function isAuthorized(req) {
  if (!API_KEY) return false;
  const supplied = req.headers["x-nxyz-api-key"];
  if (typeof supplied !== "string") return false;
  const expectedBuffer = Buffer.from(API_KEY);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("invalid JSON body");
    error.statusCode = 400;
    throw error;
  }
}

async function bootstrapRegistry() {
  const batch = db.batch();
  for (const record of builtInRegistry) {
    const ref = db.collection(collections.registry).doc(record.id);
    batch.set(
      ref,
      {
        ...record,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/") {
    return send(res, 200, {
      service: "nxyz-control",
      platform: "google-cloud",
      runtime: "cloud-run",
      environment: ENV,
      region: REGION,
      governance: "human-policy-gated",
      status: "online",
    });
  }

  if (req.method === "GET" && path === "/healthz") {
    return send(res, 200, {
      ok: true,
      service: "nxyz-control",
      environment: ENV,
      region: REGION,
      timestamp: new Date().toISOString(),
    });
  }

  if (!isAuthorized(req)) {
    return send(res, 401, {
      error: "unauthorized",
      message: "Missing or invalid x-nxyz-api-key",
    });
  }

  if (req.method === "GET" && path === "/v1/capabilities") {
    return send(res, 200, {
      controlPlane: "NXYZ_GCP_CONTROL_PLANE_V1",
      storage: "firestore",
      runtime: "cloud-run",
      registry: collections.registry,
      evidence: collections.evidence,
      runs: collections.runs,
      supportedFlows: [
        "REGISTRY_MANAGEMENT",
        "PROVENANCE_EVIDENCE_INGEST",
        "POLICY_GATED_ORCHESTRATION",
        "HUMAN_APPROVAL",
      ],
      safetyModel: [
        "NO_AUTOMATIC_EXECUTION_ON_ORCHESTRATE",
        "HUMAN_APPROVAL_REQUIRED",
        "EVIDENCE_HASHING_ENABLED",
        "AUDITABLE_RUN_STATE",
      ],
    });
  }

  if (req.method === "POST" && path === "/v1/registry/bootstrap") {
    await bootstrapRegistry();
    return send(res, 200, {
      ok: true,
      registered: builtInRegistry.map(({ id, name, kind }) => ({ id, name, kind })),
    });
  }

  if (req.method === "POST" && path === "/v1/registry") {
    const body = await readJson(req);
    if (!body.name || !body.kind) {
      return send(res, 400, { error: "name and kind are required" });
    }
    const id = body.id || sha256(`${body.kind}:${body.name}`).slice(0, 24);
    const record = {
      ...body,
      id,
      verificationState: body.verificationState || "UNVERIFIED",
      updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection(collections.registry).doc(id).set(record, { merge: true });
    return send(res, 201, { ok: true, id });
  }

  if (req.method === "GET" && path === "/v1/registry") {
    const snapshot = await db.collection(collections.registry).limit(100).get();
    return send(res, 200, {
      count: snapshot.size,
      entries: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  }

  if (req.method === "POST" && path === "/v1/evidence") {
    const body = await readJson(req);
    if (!body.source) return send(res, 400, { error: "source is required" });
    const digest = sha256(body);
    await db.collection(collections.evidence).doc(digest).set({
      ...body,
      sha256: digest,
      verificationState: body.verificationState || "UNVERIFIED",
      createdAt: FieldValue.serverTimestamp(),
    });
    return send(res, 201, { ok: true, evidenceId: digest, sha256: digest });
  }

  if (req.method === "POST" && path === "/v1/orchestrate") {
    const body = await readJson(req);
    if (!body.adapter || !body.action) {
      return send(res, 400, { error: "adapter and action are required" });
    }
    const ref = db.collection(collections.runs).doc();
    await ref.set({
      adapter: body.adapter,
      action: body.action,
      payload: body.payload || {},
      evidenceRefs: Array.isArray(body.evidenceRefs) ? body.evidenceRefs : [],
      requestedBy: body.requestedBy || "unknown",
      status: "PENDING_HUMAN_APPROVAL",
      policy: {
        humanApprovalRequired: true,
        approved: false,
      },
      requestHash: sha256(body),
      createdAt: FieldValue.serverTimestamp(),
    });
    return send(res, 202, {
      ok: true,
      runId: ref.id,
      status: "PENDING_HUMAN_APPROVAL",
    });
  }

  const approveMatch = path.match(/^\/v1\/runs\/([^/]+)\/approve$/);
  if (req.method === "POST" && approveMatch) {
    const runId = approveMatch[1];
    const body = await readJson(req);
    const ref = db.collection(collections.runs).doc(runId);
    const existing = await ref.get();
    if (!existing.exists) return send(res, 404, { error: "run_not_found" });
    await ref.set(
      {
        status: "APPROVED",
        policy: {
          humanApprovalRequired: true,
          approved: true,
        },
        approvedBy: body.approvedBy || "authorized-operator",
        approvedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return send(res, 200, { ok: true, runId, status: "APPROVED" });
  }

  const runMatch = path.match(/^\/v1\/runs\/([^/]+)$/);
  if (req.method === "GET" && runMatch) {
    const runId = runMatch[1];
    const snapshot = await db.collection(collections.runs).doc(runId).get();
    if (!snapshot.exists) return send(res, 404, { error: "run_not_found" });
    return send(res, 200, { id: snapshot.id, ...snapshot.data() });
  }

  return send(res, 404, { error: "not_found" });
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch((error) => {
    console.error(JSON.stringify({
      level: "error",
      message: error?.message || "unhandled error",
      stack: error?.stack,
    }));
    if (!res.headersSent) {
      send(res, error?.statusCode || 500, {
        error: error?.statusCode ? "request_error" : "internal_error",
        message: error?.statusCode ? error.message : "Internal server error",
      });
    } else {
      res.end();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({
    level: "info",
    message: "NXYZ GCP control plane listening",
    port: PORT,
    environment: ENV,
    region: REGION,
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: "info", message: "shutdown requested", signal }));
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
