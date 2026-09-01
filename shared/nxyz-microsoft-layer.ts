export type NxyzMicrosoftComponentId =
  | "MICROSOFT_AGENT_FRAMEWORK"
  | "MICROSOFT_MARKITDOWN"
  | "MICROSOFT_GRAPHRAG_REFERENCE";

export type NxyzMicrosoftLayerInputKind =
  | "DOCUMENT"
  | "KNOWLEDGE_QUERY"
  | "AGENT_WORKFLOW"
  | "CONTRACT_OPPORTUNITY";

export type NxyzEmbeddingProvider =
  | "NOT_SELECTED"
  | "LOCAL"
  | "AZURE_OPENAI"
  | "OPENAI_COMPATIBLE"
  | "CUSTOM";

export interface NxyzMicrosoftComponent {
  id: NxyzMicrosoftComponentId;
  repository: string;
  role: string;
  upstreamState: "PRODUCTION_READY" | "ACTIVE" | "MAINTENANCE_MODE_RESEARCH";
  integrationState: "ADAPTER_READY" | "OPTIONAL_REFERENCE_ONLY";
  required: boolean;
  notes: string;
}

export interface NxyzMicrosoftLayerPlanInput {
  inputKind: NxyzMicrosoftLayerInputKind;
  needsGraphContext?: boolean;
  needsAgents?: boolean;
  embeddingProvider?: NxyzEmbeddingProvider;
}

export interface NxyzMicrosoftLayerStage {
  id: string;
  component?: NxyzMicrosoftComponentId;
  purpose: string;
  execution: "NXYZ_NATIVE" | "ADAPTER_REQUIRED" | "REFERENCE_ONLY" | "HUMAN_GATE";
}

export interface NxyzMicrosoftLayerPlan {
  schema: "nxyz-microsoft-layer/1.0";
  inputKind: NxyzMicrosoftLayerInputKind;
  embeddingProvider: NxyzEmbeddingProvider;
  stages: NxyzMicrosoftLayerStage[];
  blockers: string[];
  externalExecutionPerformed: false;
  microsoftEndorsementImplied: false;
  graphRagCoreDependency: false;
  policy: {
    preserveProvenance: true;
    requireExplicitProviderSelection: true;
    requireHumanApprovalForExternalActions: true;
    neverCommitSecrets: true;
  };
}

export const NXYZ_MICROSOFT_COMPONENTS: readonly NxyzMicrosoftComponent[] = [
  {
    id: "MICROSOFT_AGENT_FRAMEWORK",
    repository: "microsoft/agent-framework",
    role: "Production-grade agent and multi-agent workflow orchestration",
    upstreamState: "PRODUCTION_READY",
    integrationState: "ADAPTER_READY",
    required: false,
    notes: "Preferred Microsoft orchestration reference for new NXYZ agent integrations.",
  },
  {
    id: "MICROSOFT_MARKITDOWN",
    repository: "microsoft/markitdown",
    role: "Document-to-Markdown normalization for downstream LLM and evidence pipelines",
    upstreamState: "ACTIVE",
    integrationState: "ADAPTER_READY",
    required: false,
    notes: "Use the narrowest conversion path available and treat untrusted inputs as untrusted.",
  },
  {
    id: "MICROSOFT_GRAPHRAG_REFERENCE",
    repository: "microsoft/graphrag",
    role: "Optional graph-based retrieval and structured-context reference pattern",
    upstreamState: "MAINTENANCE_MODE_RESEARCH",
    integrationState: "OPTIONAL_REFERENCE_ONLY",
    required: false,
    notes: "Never make GraphRAG a mandatory core dependency; upstream identifies it as maintenance-mode research.",
  },
] as const;

export function buildNxyzMicrosoftLayerPlan(input: NxyzMicrosoftLayerPlanInput): NxyzMicrosoftLayerPlan {
  const embeddingProvider = input.embeddingProvider || "NOT_SELECTED";
  const stages: NxyzMicrosoftLayerStage[] = [
    {
      id: "CAPTURE_PROVENANCE",
      purpose: "Record source, repository/document identity, timestamps, hashes, and authorization context before transformation.",
      execution: "NXYZ_NATIVE",
    },
  ];

  if (input.inputKind === "DOCUMENT" || input.inputKind === "CONTRACT_OPPORTUNITY") {
    stages.push({
      id: "NORMALIZE_DOCUMENT",
      component: "MICROSOFT_MARKITDOWN",
      purpose: "Normalize supported files into structured Markdown while preserving source provenance.",
      execution: "ADAPTER_REQUIRED",
    });
  }

  const blockers: string[] = [];
  if (input.needsGraphContext) {
    stages.push({
      id: "BUILD_EMBEDDING_WORK_ORDER",
      purpose: "Create an explicit embedding/indexing work order without selecting or calling a provider implicitly.",
      execution: "NXYZ_NATIVE",
    });
    if (embeddingProvider === "NOT_SELECTED") {
      blockers.push("Select an embedding provider before graph/vector indexing is executed.");
    }
    stages.push({
      id: "GRAPH_CONTEXT_REFERENCE",
      component: "MICROSOFT_GRAPHRAG_REFERENCE",
      purpose: "Use graph-based retrieval concepts as an optional context-building pattern, not as a mandatory runtime dependency.",
      execution: "REFERENCE_ONLY",
    });
  }

  if (input.needsAgents || input.inputKind === "AGENT_WORKFLOW") {
    stages.push({
      id: "ORCHESTRATE_AGENT_WORKFLOW",
      component: "MICROSOFT_AGENT_FRAMEWORK",
      purpose: "Map the governed NXYZ mission into an Agent Framework-compatible orchestration adapter.",
      execution: "ADAPTER_REQUIRED",
    });
  }

  stages.push(
    {
      id: "BIND_ZYRA_ONTOLOGY",
      purpose: "Attach normalized content, retrieval context, agent results, and provenance to ZYRA ontology/evidence objects.",
      execution: "NXYZ_NATIVE",
    },
    {
      id: "HUMAN_POLICY_GATE",
      purpose: "Require human authorization before any external write, deployment, submission, permission change, or other high-impact action.",
      execution: "HUMAN_GATE",
    },
  );

  return {
    schema: "nxyz-microsoft-layer/1.0",
    inputKind: input.inputKind,
    embeddingProvider,
    stages,
    blockers,
    externalExecutionPerformed: false,
    microsoftEndorsementImplied: false,
    graphRagCoreDependency: false,
    policy: {
      preserveProvenance: true,
      requireExplicitProviderSelection: true,
      requireHumanApprovalForExternalActions: true,
      neverCommitSecrets: true,
    },
  };
}
