# NXYZ Microsoft Open Source Layer

<p align="center">
  <img src="assets/nxyz-microsoft-layer.svg" width="100%" alt="NXYZ Microsoft Open Source Layer architecture" />
</p>

## Beginner explanation

This layer lets ZYRA use selected **Microsoft open-source projects as optional building blocks** without turning the ecosystem into an Azure-only stack.

Think of it as three specialized doors:

```text
DOCUMENTS
   ↓
Microsoft MarkItDown adapter
   ↓
clean structured Markdown
   ↓
NXYZ provenance + explicit embedding work order
   ↓
optional graph context
   ↓
Microsoft Agent Framework adapter
   ↓
ZYRA Ontology / Evidence
   ↓
ContractOps • GPT-DOUG-LLM • optional Foundry actions
   ↓
HUMAN POLICY GATE
```

The repository does **not** vendor Microsoft source code, does not silently install packages, does not select Azure by default, and does not imply Microsoft endorsement.

## Why these Microsoft projects?

### 1. Microsoft Agent Framework

Source: <https://github.com/microsoft/agent-framework>

Microsoft describes Agent Framework as an open, multi-language framework for production-grade AI agents and multi-agent workflows. Its upstream README highlights graph-based workflows, checkpointing, streaming, human-in-the-loop control, observability, middleware, provider flexibility, and Foundry-hosted agent patterns.

NXYZ role:

```text
AGENT ORCHESTRATION ADAPTER
```

For new Microsoft-oriented agent integrations, NXYZ treats Agent Framework as the preferred orchestration target rather than starting new work on Semantic Kernel or AutoGen-specific abstractions.

### 2. Microsoft MarkItDown

Source: <https://github.com/microsoft/markitdown>

MarkItDown converts files such as PDF, PowerPoint, Word, Excel, HTML, text formats, images, audio, ZIP archives, and other supported sources into Markdown intended for LLM/text-analysis pipelines.

NXYZ role:

```text
DOCUMENT NORMALIZATION ADAPTER
```

That makes it useful for ContractOps solicitation ingestion, documentation execution, evidence extraction, and future knowledge indexing.

Security boundary: MarkItDown performs I/O with the privileges of its process, so NXYZ treats every external document as untrusted and requires the narrowest conversion path appropriate to the source.

### 3. Microsoft GraphRAG

Source: <https://github.com/microsoft/graphrag>

GraphRAG explores graph-based context construction from unstructured text. Microsoft currently labels the repository as a research project in maintenance mode.

NXYZ role:

```text
OPTIONAL GRAPH / RETRIEVAL REFERENCE
```

It is **not a required core dependency**. NXYZ can borrow the graph-memory pattern while keeping the actual retrieval and embedding implementation provider-independent.

## What "embed layer" means in NXYZ

The layer separates **embedding intent** from a specific paid provider.

Supported work-order provider labels:

```text
NOT_SELECTED
LOCAL
AZURE_OPENAI
OPENAI_COMPATIBLE
CUSTOM
```

NXYZ never silently chooses Azure OpenAI. A graph/vector indexing request with no provider selected receives a blocker instead of pretending an embedding operation happened.

## Current implementation

Implemented now:

```text
shared/nxyz-microsoft-layer.ts
shared/ontology/nxyz-microsoft-oss-layer.yaml
server/nxyz-microsoft-layer.ts
server/nxyz-microsoft-layer.test.ts
```

API:

```text
GET  /api/nxyz/microsoft-layer/status
POST /api/nxyz/microsoft-layer/plan
```

The API is authenticated and **plan-only** in this version. It builds deterministic integration stages and policy blockers but does not install Microsoft packages or call an external provider.

Example request:

```json
{
  "inputKind": "CONTRACT_OPPORTUNITY",
  "needsGraphContext": true,
  "needsAgents": true,
  "embeddingProvider": "LOCAL"
}
```

Conceptual output:

```text
CAPTURE_PROVENANCE
→ NORMALIZE_DOCUMENT / MarkItDown adapter
→ BUILD_EMBEDDING_WORK_ORDER
→ optional GRAPH_CONTEXT_REFERENCE
→ Agent Framework adapter
→ BIND_ZYRA_ONTOLOGY
→ HUMAN_POLICY_GATE
```

## Ecosystem bindings

### NXYZ ContractOps

```text
Solicitation PDF / DOCX / XLSX
→ MarkItDown normalization
→ source hash + provenance
→ requirements / evidence candidates
→ optional embedding + graph context
→ Agent Framework workflow adapter
→ ContractOps human review
```

The Microsoft layer can become the ingestion engine for the existing ContractOps Opportunity Source Ingestion target.

### GPT-DOUG-LLM

```text
Mission
→ NXYZ Microsoft plan
→ optional Microsoft Agent Framework adapter
→ governed tool/workflow proposal
→ ZYRA policy gate
→ evidence + audit
```

### ZYRA / Palantir Foundry

Microsoft components can prepare normalized context and agent plans, but Foundry access remains independently authenticated and governed. Microsoft open-source code does not grant Palantir permissions.

## Trust boundaries

- Microsoft repositories are open-source integration sources, not evidence of sponsorship, partnership, endorsement, Azure credits, tenant access, or authorization.
- Microsoft Agent Framework and MarkItDown are MIT-licensed upstream projects; any future vendoring or redistribution must preserve applicable license notices.
- GraphRAG stays optional because upstream identifies it as maintenance-mode research.
- No provider credential belongs in Git.
- No Azure/OpenAI provider is selected implicitly.
- Every normalized artifact must keep its source identity and provenance.
- High-impact external actions remain human-gated.
- NXYZ capability tiers never override Microsoft, Azure, Palantir, government, or other external permissions.

## Next runtime adapters

The safe implementation order is:

```text
1. MarkItDown local adapter
2. explicit embedding provider adapter
3. NXYZ retrieval/index store
4. Agent Framework adapter
5. ContractOps source-ingestion UI
6. optional Foundry ontology binding
```

This keeps the system useful even when Azure, GraphRAG, or another external provider is not configured.
