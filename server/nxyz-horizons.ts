import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "./auth";
import type {
  NxyzHorizonsEvidenceRecord,
  NxyzHorizonsNormalizationResult,
  NxyzHorizonsScreeningManifest,
  NxyzHorizonsScreeningSeed,
} from "@shared/types/nxyz-horizons";

const entityTypes = [
  "PERSON",
  "COMPANY",
  "VESSEL",
  "ADDRESS",
  "PROPERTY",
  "ORGANIZATION",
  "OTHER",
] as const;

const seedSchema = z.object({
  seedId: z.string().trim().min(1).max(200),
  entityType: z.enum(entityTypes),
  primaryTerm: z.string().trim().min(1).max(500),
  qualifiers: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const bulkExportSchema = z.object({
  seeds: z.array(seedSchema).min(1).max(1000),
});

const identifierSchema = z.object({
  kind: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(1000),
});

const evidenceRecordSchema = z.object({
  recordId: z.string().trim().max(500).optional(),
  sourceFile: z.string().trim().min(1).max(2000),
  datasetName: z.string().trim().max(500).optional(),
  sourceUrl: z.string().url().max(3000).optional(),
  jurisdiction: z.string().trim().max(300).optional(),
  matchedTerms: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
  identifiers: z.array(identifierSchema).max(100).optional(),
  evidenceClass: z.enum(["PUBLIC_REFERENCE", "USER_PROVIDED", "MIXED"]).optional(),
  corroborated: z.boolean().optional(),
  sourceHash: z.string().trim().regex(/^[a-fA-F0-9]{64}$/).optional(),
  analystNotes: z.string().trim().max(5000).optional(),
});

const normalizeSchema = z.object({
  investigationName: z.string().trim().min(1).max(500),
  retrievedAt: z.string().datetime().optional(),
  records: z.array(evidenceRecordSchema).min(1).max(5000),
});

function normalizeCell(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function csvCell(value: string): string {
  const normalized = normalizeCell(value);
  return /[",\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export function buildHorizonsBulkCsv(seeds: NxyzHorizonsScreeningSeed[]): string {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error("At least one screening seed is required");
  }

  return seeds
    .map((seed) => {
      const values = [seed.primaryTerm, ...(seed.qualifiers || [])]
        .map(normalizeCell)
        .filter(Boolean);
      if (values.length === 0) throw new Error(`Seed ${seed.seedId || "unknown"} has no searchable terms`);
      return values.map(csvCell).join(",");
    })
    .join("\n");
}

export function buildHorizonsScreeningManifest(
  seeds: NxyzHorizonsScreeningSeed[],
  generatedAt = new Date().toISOString(),
): NxyzHorizonsScreeningManifest {
  return {
    format: "NXYZ_HORIZONS_SCREENING_V1",
    generatedAt,
    sourceSystem: "NXYZ",
    destinationSystem: "C4ADS_HORIZONS",
    querySemantics: "ROW_VALUES_COMBINED_WITH_AND",
    rows: seeds.map((seed, index) => ({
      rowNumber: index + 1,
      seedId: seed.seedId,
      entityType: seed.entityType,
      primaryTerm: normalizeCell(seed.primaryTerm),
      qualifiers: (seed.qualifiers || []).map(normalizeCell).filter(Boolean),
      notes: seed.notes?.trim() || undefined,
    })),
  };
}

function stableEnvelopeHash(record: NxyzHorizonsEvidenceRecord, investigationName: string, retrievedAt: string): string {
  const canonical = JSON.stringify({
    investigationName,
    retrievedAt,
    recordId: record.recordId || null,
    sourceFile: record.sourceFile,
    datasetName: record.datasetName || null,
    sourceUrl: record.sourceUrl || null,
    jurisdiction: record.jurisdiction || null,
    matchedTerms: [...record.matchedTerms].sort(),
    identifiers: [...(record.identifiers || [])]
      .map((identifier) => ({ kind: identifier.kind, value: identifier.value }))
      .sort((a, b) => `${a.kind}:${a.value}`.localeCompare(`${b.kind}:${b.value}`)),
    evidenceClass: record.evidenceClass || "PUBLIC_REFERENCE",
    corroborated: record.corroborated === true,
    sourceHash: record.sourceHash || null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function normalizeHorizonsEvidence(
  investigationName: string,
  records: NxyzHorizonsEvidenceRecord[],
  retrievedAt = new Date().toISOString(),
): NxyzHorizonsNormalizationResult {
  const signals = records.map((record) => {
    const envelopeHash = stableEnvelopeHash(record, investigationName, retrievedAt);
    return {
      signalId: `hzn_${envelopeHash.slice(0, 20)}`,
      sourceSystem: "C4ADS_HORIZONS" as const,
      investigationName,
      sourceFile: record.sourceFile,
      datasetName: record.datasetName,
      sourceUrl: record.sourceUrl,
      jurisdiction: record.jurisdiction,
      matchedTerms: record.matchedTerms.map(normalizeCell).filter(Boolean),
      identifiers: (record.identifiers || []).map((identifier) => ({
        kind: normalizeCell(identifier.kind),
        value: normalizeCell(identifier.value),
      })),
      evidenceClass: record.evidenceClass || "PUBLIC_REFERENCE",
      verificationState: record.corroborated ? "CORROBORATED" as const : "UNVERIFIED_MATCH" as const,
      retrievedAt,
      sourceHash: record.sourceHash?.toLowerCase(),
      envelopeHash,
      analystNotes: record.analystNotes?.trim() || undefined,
    };
  });

  return {
    format: "NXYZ_HORIZONS_EVIDENCE_V1",
    investigationName,
    generatedAt: new Date().toISOString(),
    signalCount: signals.length,
    unverifiedMatchCount: signals.filter((signal) => signal.verificationState === "UNVERIFIED_MATCH").length,
    corroboratedCount: signals.filter((signal) => signal.verificationState === "CORROBORATED").length,
    signals,
  };
}

export function registerNxyzHorizonsRoutes(app: Express): void {
  app.get("/api/nxyz/horizons/capabilities", requireAuth, (_req: Request, res: Response) => {
    return res.json({
      integration: "NXYZ_HORIZONS_INTEL_GATEWAY",
      status: "FILE_EXCHANGE_READY",
      machineToMachineApi: "NOT_CONFIGURED",
      supportedFlows: [
        "NXYZ_SCREENING_SEEDS_TO_HORIZONS_BULK_CSV",
        "HORIZONS_INVESTIGATION_EXPORT_METADATA_TO_NXYZ_SIGNALS",
        "NXYZ_PROVENANCE_AND_VERIFICATION_ENVELOPE",
      ],
      restrictions: [
        "NO_HORIZONS_WEB_SCRAPING",
        "NO_CREDENTIAL_AUTOMATION",
        "NO_AUTOMATIC_CRIMINALITY_ASSERTIONS",
        "NAME_MATCHES_REMAIN_UNVERIFIED_UNTIL_CORROBORATED",
      ],
    });
  });

  app.post("/api/nxyz/horizons/bulk-export", requireAuth, (req: Request, res: Response) => {
    const parsed = bulkExportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid screening seed payload", errors: parsed.error.flatten() });
    }

    const generatedAt = new Date().toISOString();
    const csv = buildHorizonsBulkCsv(parsed.data.seeds);
    const manifest = buildHorizonsScreeningManifest(parsed.data.seeds, generatedAt);
    return res.json({
      fileName: `nxyz-horizons-screening-${generatedAt.slice(0, 10)}.csv`,
      contentType: "text/csv",
      csv,
      manifest,
    });
  });

  app.post("/api/nxyz/horizons/normalize", requireAuth, (req: Request, res: Response) => {
    const parsed = normalizeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid Horizons evidence payload", errors: parsed.error.flatten() });
    }

    return res.json(normalizeHorizonsEvidence(
      parsed.data.investigationName,
      parsed.data.records,
      parsed.data.retrievedAt || new Date().toISOString(),
    ));
  });
}
