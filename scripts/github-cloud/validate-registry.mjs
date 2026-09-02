#!/usr/bin/env node

import fs from "node:fs";

const registry = JSON.parse(fs.readFileSync("cloud/github/registry.json", "utf8"));
const errors = [];

if (registry.controlPlane !== "ZYRA_GITHUB_CLOUD_V1") {
  errors.push("controlPlane must be ZYRA_GITHUB_CLOUD_V1");
}

if (!Array.isArray(registry.services) || registry.services.length === 0) {
  errors.push("services must be a non-empty array");
}

const ids = new Set();
for (const service of registry.services ?? []) {
  if (!service.id) errors.push("every service requires id");
  if (!service.name) errors.push(`service ${service.id ?? "<unknown>"} requires name`);
  if (!service.kind) errors.push(`service ${service.id ?? "<unknown>"} requires kind`);
  if (!Array.isArray(service.capabilities)) errors.push(`service ${service.id ?? "<unknown>"} requires capabilities array`);
  if (ids.has(service.id)) errors.push(`duplicate service id: ${service.id}`);
  ids.add(service.id);
}

if (registry.policy?.humanApprovalRequiredForConsequentialActions !== true) {
  errors.push("consequential actions must require human approval");
}

if (registry.policy?.godModeBypassesPolicy !== false) {
  errors.push("godModeBypassesPolicy must remain false");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`registry validation error: ${error}`);
  process.exit(1);
}

console.log(`registry valid: ${registry.services.length} services registered`);
