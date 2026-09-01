# zyraXSuno

Ontology-driven music generation orchestration for the Zyra ecosystem.

## Goal

zyraXSuno turns a large song-generation mission into a graph of explicit entities, relationships, constraints, checkpoints, and provider exports. The first use case is Almighty Sonoxo batch generation with strict title/theme novelty, hard character limits, diss-first constraints, and Suno-ready prompt export.

## Core ontology

Entities: `Artist`, `Batch`, `Song`, `Theme`, `Title`, `Hook`, `FlowProfile`, `RhymeFamily`, `ConstraintSet`, `GenerationJob`, `Provider`, `Checkpoint`, `ExportArtifact`.

Relations: `CREATED_BY`, `BELONGS_TO_BATCH`, `USES_THEME`, `USES_FLOW`, `USES_RHYME`, `HAS_CONSTRAINTS`, `GENERATED_BY`, `DERIVED_FROM`, `CHECKPOINT_OF`, `EXPORTED_TO`.

The ontology is not just documentation: validation walks the graph before a song is accepted. It rejects reused titles, reused core themes, over-limit lyrics, and missing diss/punchline requirements.

## What is implemented

- TypeScript ontology graph and validators.
- Batch planner with checkpoint/resume state.
- Provider abstraction for GPT-Doug/Zyra/local or future official provider adapters.
- Suno-ready JSONL exporter. No browser scraping, credential bypass, or undocumented API dependency is required.
- Small HTTP service for planning, validating, inspecting ontology state, and exporting batches.
- CLI for local batch planning/export.

## Run

```bash
cd apps/zyraXSuno
npm install
npm run dev
```

CLI example:

```bash
npm run cli -- plan examples/batch.json
npm run cli -- export examples/batch.json ./out/suno-ready.jsonl
```

API defaults to `http://localhost:4317`.

## Design rule

Suno is treated as a generation destination, not as the source of truth. Zyra owns the ontology, constraints, titles, themes, versions, checkpoints, and provenance. A provider adapter can be added when an authorized/official integration is available without changing the domain model.

## Next milestones

1. Persist ontology/checkpoints in Postgres/Drizzle.
2. Add Zyra UI graph explorer and batch dashboard.
3. Add GPT-Doug-LLM provider adapter.
4. Add provider job queue, retries, backoff, and result ingestion.
5. Add audio/artwork metadata entities and DistroPrep handoff.
