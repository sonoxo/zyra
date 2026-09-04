#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell !== ""));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0];
  return nonEmpty.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export function loadRecords(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const ext = path.extname(filePath).toLowerCase();
  const records = ext === ".csv" ? parseCsv(raw) : JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error(`Expected an array of records in ${filePath}`);
  return { raw, records };
}

export function validateRecords(sourceRecords, targetRecords, { key = "id", threshold = 99 } = {}) {
  const source = new Map();
  const target = new Map();

  for (const record of sourceRecords) {
    if (record?.[key] === undefined || record?.[key] === null || String(record[key]).trim() === "") {
      throw new Error(`Source record missing key '${key}'`);
    }
    const id = String(record[key]);
    if (source.has(id)) throw new Error(`Duplicate source key '${id}'`);
    source.set(id, record);
  }

  for (const record of targetRecords) {
    if (record?.[key] === undefined || record?.[key] === null || String(record[key]).trim() === "") {
      throw new Error(`Target record missing key '${key}'`);
    }
    const id = String(record[key]);
    if (target.has(id)) throw new Error(`Duplicate target key '${id}'`);
    target.set(id, record);
  }

  const exact = [];
  const changed = [];
  const missing = [];
  const unexpected = [];

  for (const [id, sourceRecord] of source) {
    if (!target.has(id)) {
      missing.push(id);
      continue;
    }
    const targetRecord = target.get(id);
    if (stableStringify(sourceRecord) === stableStringify(targetRecord)) exact.push(id);
    else changed.push({ id, source: sourceRecord, target: targetRecord });
  }

  for (const id of target.keys()) {
    if (!source.has(id)) unexpected.push(id);
  }

  const denominator = source.size || 1;
  const accuracy = Number(((exact.length / denominator) * 100).toFixed(4));
  const pass = accuracy >= threshold;

  return {
    verdict: pass ? "PASS" : "FAIL",
    threshold,
    key,
    metrics: {
      sourceRecords: source.size,
      targetRecords: target.size,
      exactMatches: exact.length,
      changedRecords: changed.length,
      missingRecords: missing.length,
      unexpectedRecords: unexpected.length,
      validationAccuracyPct: accuracy,
    },
    deltas: {
      changed: changed.slice(0, 50),
      missing: missing.slice(0, 50),
      unexpected: unexpected.slice(0, 50),
      truncated: changed.length > 50 || missing.length > 50 || unexpected.length > 50,
    },
  };
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const sourcePath = arg("source");
  const targetPath = arg("target");
  const key = arg("key", "id");
  const threshold = Number(arg("threshold", "99"));
  const outPath = arg("out", ".black-house/evidence/continuous-validation.json");

  if (!sourcePath || !targetPath) {
    console.error("Usage: node scripts/black-house/continuous-validator.mjs --source <json|csv> --target <json|csv> [--key id] [--threshold 99] [--out path]");
    process.exit(64);
  }
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("threshold must be between 0 and 100");
  }

  const source = loadRecords(sourcePath);
  const target = loadRecords(targetPath);
  const validation = validateRecords(source.records, target.records, { key, threshold });

  const evidence = {
    schemaVersion: "1.0.0",
    objectType: "ValidationRun",
    controlPlane: "THE_BLACK_HOUSE_V1",
    engine: "BLACK_HOUSE_CONTINUOUS_VALIDATION_V1",
    generatedAt: new Date().toISOString(),
    source: { path: sourcePath, sha256: sha256(source.raw) },
    target: { path: targetPath, sha256: sha256(target.raw) },
    ...validation,
    policy: {
      externalApiRequired: false,
      paidServiceRequired: false,
      humanReviewRequiredForConsequentialPromotion: true,
    },
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(`BLACK HOUSE CONTINUOUS VALIDATION: ${evidence.verdict}`);
  console.log(`accuracy=${evidence.metrics.validationAccuracyPct}% threshold=${threshold}% exact=${evidence.metrics.exactMatches} changed=${evidence.metrics.changedRecords} missing=${evidence.metrics.missingRecords} unexpected=${evidence.metrics.unexpectedRecords}`);
  console.log(`evidence=${outPath}`);

  if (evidence.verdict !== "PASS") process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`BLACK HOUSE CONTINUOUS VALIDATION ERROR: ${error.message}`);
    process.exit(1);
  });
}
