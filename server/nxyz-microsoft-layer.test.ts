import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNxyzMicrosoftLayerPlan,
  NXYZ_MICROSOFT_COMPONENTS,
} from "@shared/nxyz-microsoft-layer";

test("Microsoft layer keeps GraphRAG optional by default", () => {
  const plan = buildNxyzMicrosoftLayerPlan({ inputKind: "KNOWLEDGE_QUERY" });
  assert.equal(plan.graphRagCoreDependency, false);
  assert.equal(plan.stages.some((stage) => stage.component === "MICROSOFT_GRAPHRAG_REFERENCE"), false);
  assert.deepEqual(plan.blockers, []);
});

test("document + agent workflow selects MarkItDown and Agent Framework adapters", () => {
  const plan = buildNxyzMicrosoftLayerPlan({
    inputKind: "DOCUMENT",
    needsAgents: true,
  });
  assert.equal(plan.stages.some((stage) => stage.component === "MICROSOFT_MARKITDOWN"), true);
  assert.equal(plan.stages.some((stage) => stage.component === "MICROSOFT_AGENT_FRAMEWORK"), true);
  assert.equal(plan.externalExecutionPerformed, false);
});

test("graph context requires explicit embedding provider selection", () => {
  const blocked = buildNxyzMicrosoftLayerPlan({
    inputKind: "CONTRACT_OPPORTUNITY",
    needsGraphContext: true,
  });
  assert.equal(blocked.embeddingProvider, "NOT_SELECTED");
  assert.equal(blocked.blockers.length, 1);

  const ready = buildNxyzMicrosoftLayerPlan({
    inputKind: "CONTRACT_OPPORTUNITY",
    needsGraphContext: true,
    embeddingProvider: "LOCAL",
  });
  assert.equal(ready.blockers.length, 0);
});

test("component registry reflects upstream role boundaries", () => {
  const agentFramework = NXYZ_MICROSOFT_COMPONENTS.find((component) => component.id === "MICROSOFT_AGENT_FRAMEWORK");
  const graphRag = NXYZ_MICROSOFT_COMPONENTS.find((component) => component.id === "MICROSOFT_GRAPHRAG_REFERENCE");
  assert.equal(agentFramework?.upstreamState, "PRODUCTION_READY");
  assert.equal(graphRag?.integrationState, "OPTIONAL_REFERENCE_ONLY");
});
