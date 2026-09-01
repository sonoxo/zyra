export const ENGINEERING_GUIDE_SOURCES = [
  "https://learn.palantir.com/data-engineer-guide/1388785",
  "https://learn.palantir.com/application-developer-guide/1481796",
  "https://www.palantir.com/docs/foundry/ai-fde/overview/",
  "https://www.palantir.com/docs/foundry/ai-fde/modes-capabilities/",
  "https://www.youtube.com/watch?v=e90qUUh8_us",
] as const;

export const ENGINEERING_STACK_STAGES = [
  "SOURCE/INTAKE",
  "PIPELINE",
  "QUALITY",
  "ONTOLOGY",
  "APPLICATION",
  "AIP/LLM",
  "SECURITY",
  "RELEASE",
  "AUDIT",
] as const;

export const ENGINEERING_DECISION_LOOP = [
  "INSPECT",
  "MODEL",
  "PLAN",
  "DECOMPOSE",
  "EXECUTE",
  "VALIDATE",
  "OBSERVE",
  "REPAIR",
  "APPROVE",
  "RELEASE",
  "AUDIT",
] as const;

export const ENGINEERING_FLEET = [
  { id: "intake", mission: "Inspect sources, provenance, constraints, ownership, and outcomes." },
  { id: "pipeline", mission: "Design ingestion, normalization, transforms, publication, and freshness contracts." },
  { id: "quality", mission: "Define tests, expectations, integrity checks, and fail-closed invariants." },
  { id: "ontology", mission: "Model canonical objects, properties, links, actions, and semantic contracts." },
  { id: "application", mission: "Build the lowest-complexity workflow, UI, or API surface that meets the need." },
  { id: "security", mission: "Check least privilege, data boundaries, write controls, secrets, and abuse cases." },
  { id: "release", mission: "Verify CI, health, downstream impact, rollback, and promotion evidence." },
  { id: "observer", mission: "Track lineage, evidence, unresolved risk, status, and claimed completion." },
] as const;

export const AI_FDE_MIGRATION_STAGES = [
  "PLAN",
  "CONNECT",
  "INTERPRET",
  "ENHANCE",
  "STANDARDIZE",
  "VERIFY",
  "DEPLOY",
] as const;

export const AI_FDE_VALIDATION_LOOP = [
  "VERIFY",
  "DIAGNOSE",
  "REPAIR_PROPOSAL",
  "RE_RUN",
  "VERIFY",
] as const;

export const AI_FDE_DEFAULT_MAX_REPAIR_CYCLES = 3;

export const AI_FDE_MIGRATION_FLEET = [
  {
    id: "source-scout",
    mission: "Discover source assets, owners, provenance, constraints, and required outcomes without mutating them.",
    authority: "read-only",
  },
  {
    id: "schema-cartographer",
    mission: "Profile schemas, keys, relationships, nullability, distributions, and lineage.",
    authority: "read-only",
  },
  {
    id: "code-interpreter",
    mission: "Interpret source code, business logic, dependencies, and transformation behavior.",
    authority: "read-only",
  },
  {
    id: "mapping-engineer",
    mission: "Map source concepts into canonical ontology, contracts, standards, and target semantics.",
    authority: "proposal-only",
  },
  {
    id: "transform-builder",
    mission: "Generate versioned migration transforms and artifacts inside branch/local write boundaries.",
    authority: "branch-local-write",
  },
  {
    id: "verifier",
    mission: "Run reconciliation, quality checks, evaluations, lineage checks, and policy checks.",
    authority: "test-execution",
  },
  {
    id: "diagnostician",
    mission: "Root-cause failed verification and generate bounded repair proposals.",
    authority: "proposal-only",
  },
  {
    id: "sme-gateway",
    mission: "Record authorized human decisions for ambiguous, sensitive, or high-impact mappings.",
    authority: "human-decision-recording",
  },
  {
    id: "release-controller",
    mission: "Verify rollback, downstream impact, approvals, and evidence before promotion.",
    authority: "approval-gated-write",
  },
  {
    id: "auditor",
    mission: "Append provenance, tool-use evidence, decisions, unresolved risk, and completion proof.",
    authority: "append-evidence",
  },
] as const;

const DATA_TERMS = ["data", "dataset", "pipeline", "ingestion", "transform", "etl", "streaming", "batch", "schema"];
const APP_TERMS = ["app", "application", "frontend", "backend", "ui", "widget", "workflow", "react", "api"];
const ONTOLOGY_TERMS = ["ontology", "object", "objects", "link", "links", "semantic", "action"];
const HIGH_IMPACT_TERMS = ["production", "deploy", "release", "delete", "migrate", "migration", "payment", "credential", "external action"];

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAny(input: string, terms: readonly string[]): boolean {
  const lower = input.toLowerCase();
  return terms.some(term => {
    if (term.includes(" ")) return lower.includes(term);
    return new RegExp(`(?<![a-z0-9])${escapeRegex(term)}(?![a-z0-9])`).test(lower);
  });
}

export function selectEngineeringFleet(objective: string) {
  const selected = new Set<string>(["intake"]);
  const isData = includesAny(objective, DATA_TERMS);
  const isApp = includesAny(objective, APP_TERMS);
  const isOntology = includesAny(objective, ONTOLOGY_TERMS);

  if (isData) {
    selected.add("pipeline");
    selected.add("quality");
  }
  if (isData || isApp || isOntology) selected.add("ontology");
  if (isApp) selected.add("application");
  selected.add("security");
  selected.add("release");
  selected.add("observer");

  return ENGINEERING_FLEET.filter(role => selected.has(role.id));
}

export function engineeringMissionPlan(objective: string) {
  return {
    objective: objective.trim(),
    stages: [...ENGINEERING_STACK_STAGES],
    decisionLoop: [...ENGINEERING_DECISION_LOOP],
    roles: selectEngineeringFleet(objective),
    approvalRequired: includesAny(objective, HIGH_IMPACT_TERMS),
    completionGates: [
      "source and provenance known",
      "contracts and ontology reviewed",
      "tests and data expectations pass",
      "security checks pass",
      "downstream impact reviewed",
      "rollback path exists",
      "execution evidence recorded",
    ],
  };
}

export function aiFdeMigrationMissionPlan(objective: string) {
  return {
    objective: objective.trim(),
    implementation: "clean-room" as const,
    stages: [...AI_FDE_MIGRATION_STAGES],
    validationLoop: [...AI_FDE_VALIDATION_LOOP],
    maxRepairCycles: AI_FDE_DEFAULT_MAX_REPAIR_CYCLES,
    roles: [...AI_FDE_MIGRATION_FLEET],
    branchRequired: true,
    approvalRequired: true,
    contextPolicy: {
      strategy: "minimum-viable-context" as const,
      typedContextRequired: true,
      implicitBroadAccess: false,
      credentialMaterialInPrompt: false,
    },
    phaseGates: [
      "discovery inventory reviewed",
      "schema and source logic interpreted",
      "canonical mappings reviewed",
      "transforms versioned",
      "reconciliation and evaluations pass",
      "sensitive-data and permission controls pass",
      "unresolved ambiguity resolved or explicitly accepted by an authorized human",
      "rollback and downstream impact reviewed",
      "deployment evidence recorded",
    ],
  };
}

export function buildEngineeringSystemContext(scope = "general engineering"): string {
  return [
    "Use the Zyra/XUNIA clean-room Palantir Engineering Stack for relevant engineering work.",
    `Scope: ${scope}.`,
    `Stages: ${ENGINEERING_STACK_STAGES.join(" -> ")}.`,
    `Decision loop: ${ENGINEERING_DECISION_LOOP.join(" -> ")}.`,
    `Bounded specialist fleet: ${ENGINEERING_FLEET.map(role => role.id).join(", ")}.`,
    `For migration work use the AI FDE migration stages: ${AI_FDE_MIGRATION_STAGES.join(" -> ")}.`,
    `Migration verification is closed-loop but bounded: ${AI_FDE_VALIDATION_LOOP.join(" -> ")}; maximum default repair cycles ${AI_FDE_DEFAULT_MAX_REPAIR_CYCLES}.`,
    "Give each agent minimum viable context and only the tools/capabilities required by its current role; do not infer broad access.",
    "Ground work in explicit data/schema/ontology/action/tool/UI contracts, lineage, quality gates, evaluations, and evidence.",
    "Distinguish read, proposal, branch-local write, approval-gated write, and external-effect authority.",
    "Consequential writes and releases stay approval-gated, reversible, and auditable.",
    "Prefer branch proposals, checkpointed phase gates, evaluation-driven repair, and human/SME escalation over silent authority expansion.",
    "Prefer the lowest-complexity application surface that satisfies the workflow.",
    "Do not claim Palantir affiliation, certification, tenant access, proprietary source code, model weights, or private implementation details.",
  ].join(" ");
}
