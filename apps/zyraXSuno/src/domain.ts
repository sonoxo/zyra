export type NodeKind =
  | "Artist"
  | "Batch"
  | "Song"
  | "Theme"
  | "Title"
  | "Hook"
  | "FlowProfile"
  | "RhymeFamily"
  | "ConstraintSet"
  | "GenerationJob"
  | "Provider"
  | "Checkpoint"
  | "ExportArtifact";

export type RelationKind =
  | "CREATED_BY"
  | "BELONGS_TO_BATCH"
  | "USES_THEME"
  | "USES_FLOW"
  | "USES_RHYME"
  | "HAS_CONSTRAINTS"
  | "GENERATED_BY"
  | "DERIVED_FROM"
  | "CHECKPOINT_OF"
  | "EXPORTED_TO";

export interface OntologyNode<T = Record<string, unknown>> {
  id: string;
  kind: NodeKind;
  label: string;
  data: T;
  createdAt: string;
}

export interface OntologyEdge {
  id: string;
  from: string;
  to: string;
  relation: RelationKind;
  createdAt: string;
}

export interface ConstraintSet {
  maxCharacters: number;
  dissFirst: boolean;
  requireFreshTitle: boolean;
  requireFreshTheme: boolean;
  requirePunchlines: boolean;
  sunoSectionTags: boolean;
}

export interface FlowProfile {
  name: string;
  energy: string[];
  pacing: string[];
  structure: string[];
}

export interface SongDraft {
  id: string;
  title: string;
  theme: string;
  lyrics: string;
  vibePrompt: string;
  hook?: string;
  rhymeFamily?: string;
  flowProfile?: string;
  punchlineCount?: number;
  tags?: string[];
}

export interface BatchSpec {
  id: string;
  artist: string;
  count: number;
  model: string;
  constraints: ConstraintSet;
  flow: FlowProfile;
  usedTitles: string[];
  usedThemes: string[];
  conceptSeeds: string[];
}

export interface GenerationJob {
  id: string;
  batchId: string;
  ordinal: number;
  artist: string;
  model: string;
  prompt: string;
  titleSeed: string;
  themeSeed: string;
  status: "queued" | "generated" | "rejected" | "exported";
}

export interface Checkpoint {
  batchId: string;
  lastCompletedOrdinal: number;
  usedTitles: string[];
  usedThemes: string[];
  acceptedSongIds: string[];
  rejectedSongIds: string[];
  updatedAt: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  characterCount: number;
  issues: ValidationIssue[];
}
