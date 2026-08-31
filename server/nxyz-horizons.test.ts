import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHorizonsBulkCsv,
  buildHorizonsScreeningManifest,
  normalizeHorizonsEvidence,
} from "./nxyz-horizons";

test("NXYZ Horizons bulk CSV keeps each seed on one row and combines qualifiers", () => {
  const csv = buildHorizonsBulkCsv([
    {
      seedId: "vendor-1",
      entityType: "COMPANY",
      primaryTerm: "Acme Technologies LLC",
      qualifiers: ["Virginia", "123 Main Street"],
    },
    {
      seedId: "person-1",
      entityType: "PERSON",
      primaryTerm: "Jane Example",
    },
  ]);

  assert.equal(csv, "Acme Technologies LLC,Virginia,123 Main Street\nJane Example");
});

test("NXYZ Horizons bulk CSV escapes commas and quotes without adding metadata columns", () => {
  const csv = buildHorizonsBulkCsv([
    {
      seedId: "company-quoted",
      entityType: "COMPANY",
      primaryTerm: "Example, Inc.",
      qualifiers: ['Director "A"'],
    },
  ]);

  assert.equal(csv, '"Example, Inc.","Director ""A"""');
});

test("NXYZ Horizons screening manifest preserves entity metadata outside search CSV", () => {
  const manifest = buildHorizonsScreeningManifest([
    {
      seedId: "vessel-7",
      entityType: "VESSEL",
      primaryTerm: "IMO 1234567",
      notes: "Analyst seed",
    },
  ], "2026-08-31T20:00:00.000Z");

  assert.equal(manifest.format, "NXYZ_HORIZONS_SCREENING_V1");
  assert.equal(manifest.querySemantics, "ROW_VALUES_COMBINED_WITH_AND");
  assert.equal(manifest.rows[0].entityType, "VESSEL");
  assert.equal(manifest.rows[0].rowNumber, 1);
});

test("NXYZ normalizes Horizons evidence as unverified until corroborated", () => {
  const result = normalizeHorizonsEvidence(
    "Vendor screening",
    [
      {
        sourceFile: "registry-record.pdf",
        datasetName: "Corporate registry",
        jurisdiction: "Virginia, USA",
        matchedTerms: ["Acme Technologies LLC"],
        identifiers: [{ kind: "address", value: "123 Main Street" }],
      },
      {
        sourceFile: "trade-record.csv",
        matchedTerms: ["Acme Technologies LLC"],
        corroborated: true,
        evidenceClass: "MIXED",
      },
    ],
    "2026-08-31T20:05:00.000Z",
  );

  assert.equal(result.signalCount, 2);
  assert.equal(result.unverifiedMatchCount, 1);
  assert.equal(result.corroboratedCount, 1);
  assert.equal(result.signals[0].verificationState, "UNVERIFIED_MATCH");
  assert.equal(result.signals[1].verificationState, "CORROBORATED");
  assert.match(result.signals[0].envelopeHash, /^[a-f0-9]{64}$/);
  assert.match(result.signals[0].signalId, /^hzn_[a-f0-9]{20}$/);
});

test("NXYZ Horizons evidence envelope is deterministic for the same normalized input", () => {
  const records = [{
    sourceFile: "result.pdf",
    matchedTerms: ["Beta LLC", "Richmond"],
    identifiers: [
      { kind: "registration", value: "ABC-123" },
      { kind: "address", value: "10 Broad Street" },
    ],
  }];

  const first = normalizeHorizonsEvidence("Investigation A", records, "2026-08-31T20:10:00.000Z");
  const second = normalizeHorizonsEvidence("Investigation A", records, "2026-08-31T20:10:00.000Z");
  assert.equal(first.signals[0].envelopeHash, second.signals[0].envelopeHash);
});
