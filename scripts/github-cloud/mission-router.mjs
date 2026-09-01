#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const value = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const mission = value("mission", "Inspect ZYRA cloud status").trim();
const requestedTarget = value("target", "auto").trim();
const requestedAction = value("action", "route").trim();
const outputPath = value("out", ".zyra-cloud/mission.json");

const registryPath = path.resolve("cloud/github/registry.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const serviceIds = new Set(registry.services.map((service) => service.id));
const normalized = mission.toLowerCase();

const routes = [
  {
    id: "protect",
    target: "zyra-core",
    match: ["protect", "security", "scan", "vulnerability", "pentest", "secret", "attack surface"]
  },
  {
    id: "investigate",
    target: "nxyz-control",
    match: ["investigate", "evidence", "intel", "intelligence", "provenance", "horizon", "cve"]
  },
  {
    id: "build",
    target: "xunia",
    match: ["build", "create", "app", "agent", "integration", "software"]
  },
  {
    id: "reason",
    target: "gpt-doug",
    match: ["plan", "reason", "strategy", "decompose", "analyze"]
  }
];

const inferred = routes.find((route) => route.match.some((keyword) => normalized.includes(keyword))) ?? {
  id: "mission",
  target: "zyra-core"
};

const target = requestedTarget !== "auto" && serviceIds.has(requestedTarget)
  ? requestedTarget
  : inferred.target;

const consequentialWords = [
  "deploy",
  "publish",
  "submit",
  "send",
  "delete",
  "destroy",
  "purchase",
  "pay",
  "transfer",
  "approve"
];

const buildWords = ["build", "package", "container", "image", "compile"];
const isConsequential = consequentialWords.some((word) => normalized.includes(word)) ||
  ["deploy", "publish", "external"].includes(requestedAction);
const isBuild = buildWords.some((word) => normalized.includes(word)) || requestedAction === "build";

const riskClass = isConsequential ? "consequential" : isBuild ? "build" : "advisory";
const requiresApproval = riskClass === "consequential";
const executionAllowed = !requiresApproval;

const timestamp = new Date().toISOString();
const seed = JSON.stringify({ mission, requestedTarget, requestedAction, target, timestamp });
const missionId = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 20);
const selectedService = registry.services.find((service) => service.id === target);

const result = {
  schemaVersion: "1.0.0",
  controlPlane: registry.controlPlane,
  missionId,
  createdAt: timestamp,
  source: {
    provider: "github-actions",
    repository: process.env.GITHUB_REPOSITORY ?? "local",
    ref: process.env.GITHUB_REF ?? "local",
    sha: process.env.GITHUB_SHA ?? "local"
  },
  request: {
    mission,
    action: requestedAction,
    requestedTarget
  },
  route: {
    door: inferred.id,
    target,
    service: selectedService?.name ?? target,
    capabilities: selectedService?.capabilities ?? []
  },
  policy: {
    riskClass,
    requiresHumanApproval: requiresApproval,
    executionAllowed,
    externalSideEffects: executionAllowed ? "none" : "blocked"
  },
  status: executionAllowed ? "ROUTED" : "PENDING_HUMAN_APPROVAL"
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
