export type NxyzHorizonsEntityType =
  | "PERSON"
  | "COMPANY"
  | "VESSEL"
  | "ADDRESS"
  | "PROPERTY"
  | "ORGANIZATION"
  | "OTHER";

export type NxyzHorizonsVerificationState = "UNVERIFIED_MATCH" | "CORROBORATED";
export type NxyzHorizonsEvidenceClass = "PUBLIC_REFERENCE" | "USER_PROVIDED" | "MIXED";

export interface NxyzHorizonsScreeningSeed {
  seedId: string;
  entityType: NxyzHorizonsEntityType;
  primaryTerm: string;
  qualifiers?: string[];
  notes?: string;
}

export interface NxyzHorizonsScreeningManifestRow {
  rowNumber: number;
  seedId: string;
  entityType: NxyzHorizonsEntityType;
  primaryTerm: string;
  qualifiers: string[];
  notes?: string;
}

export interface NxyzHorizonsScreeningManifest {
  format: "NXYZ_HORIZONS_SCREENING_V1";
  generatedAt: string;
  sourceSystem: "NXYZ";
  destinationSystem: "C4ADS_HORIZONS";
  querySemantics: "ROW_VALUES_COMBINED_WITH_AND";
  rows: NxyzHorizonsScreeningManifestRow[];
}

export interface NxyzHorizonsIdentifier {
  kind: string;
  value: string;
}

export interface NxyzHorizonsEvidenceRecord {
  recordId?: string;
  sourceFile: string;
  datasetName?: string;
  sourceUrl?: string;
  jurisdiction?: string;
  matchedTerms: string[];
  identifiers?: NxyzHorizonsIdentifier[];
  evidenceClass?: NxyzHorizonsEvidenceClass;
  corroborated?: boolean;
  sourceHash?: string;
  analystNotes?: string;
}

export interface NxyzHorizonsIntelligenceSignal {
  signalId: string;
  sourceSystem: "C4ADS_HORIZONS";
  investigationName: string;
  sourceFile: string;
  datasetName?: string;
  sourceUrl?: string;
  jurisdiction?: string;
  matchedTerms: string[];
  identifiers: NxyzHorizonsIdentifier[];
  evidenceClass: NxyzHorizonsEvidenceClass;
  verificationState: NxyzHorizonsVerificationState;
  retrievedAt: string;
  sourceHash?: string;
  envelopeHash: string;
  analystNotes?: string;
}

export interface NxyzHorizonsNormalizationResult {
  format: "NXYZ_HORIZONS_EVIDENCE_V1";
  investigationName: string;
  generatedAt: string;
  signalCount: number;
  unverifiedMatchCount: number;
  corroboratedCount: number;
  signals: NxyzHorizonsIntelligenceSignal[];
}
