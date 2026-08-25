export const ENGINEERING_GUIDE_SOURCES = [
  "https://learn.palantir.com/data-engineer-guide/1388785",
  "https://learn.palantir.com/application-developer-guide/1481796",
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

const DATA_TERMS = ["data", "dataset", "pipeline", "ingestion", "transform", "etl", "streaming", "batch", "schema"];
const APP_TERMS = ["app", "application", "frontend", "backend", "ui", "widget", "workflow", "react", "api"];
const ONTOLOGY_TERMS = ["ontology", "object", "objects", "link", "links", "semantic", "action"];
const HIGH_IMPACT_TERMS = ["production", "deploy", "release", "delete", "migrate", "payment", "credential", "external action"];

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

export function buildEngineeringSystemContext(scope = "general engineering"): string {
  return [
    "Use the Zyra/XUNIA clean-room Palantir Engineering Stack for relevant engineering work.",
    `Scope: ${scope}.`,
    `Stages: ${ENGINEERING_STACK_STAGES.join(" -> ")}.`,
    `Decision loop: ${ENGINEERING_DECISION_LOOP.join(" -> ")}.`,
    `Bounded specialist fleet: ${ENGINEERING_FLEET.map(role => role.id).join(", ")}.`,
    "Ground work in explicit data/schema/ontology/action/tool/UI contracts, lineage, quality gates, and evidence.",
    "Give LLMs only the context and tools required for the workflow; distinguish read from write access.",
    "Consequential writes and releases stay approval-gated, reversible, and auditable.",
    "Prefer the lowest-complexity application surface that satisfies the workflow.",
    "Do not claim Palantir affiliation, certification, tenant access, or proprietary implementation details.",
  ].join(" ");
}
