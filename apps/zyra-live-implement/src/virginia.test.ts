import assert from "node:assert/strict";
import test from "node:test";
import { parseVirginia } from "./virginia.js";

test("parses VAL3M ontology mission", () => {
  const mission = parseVirginia(`/VAL3M\nAGENTS 99\nLIST ONTOLOGIES\nLIST OBJECT_TYPES company\nSTOP WHEN green`);
  assert.equal(mission.mode, "VAL3M");
  assert.equal(mission.agents, 24);
  assert.equal(mission.stopWhen, "green");
  assert.deepEqual(mission.steps.map((s) => s.op), ["LIST_ONTOLOGIES", "LIST_OBJECT_TYPES"]);
});

test("parses action parameters", () => {
  const mission = parseVirginia(`APPLY company rename-employee {"id":80060,"newName":"Anna"}`);
  assert.equal(mission.steps[0]?.op, "APPLY_ACTION");
  assert.deepEqual(mission.steps[0]?.parameters, { id: 80060, newName: "Anna" });
});

test("parses short RICHMONDVA3LM shutdown command", () => {
  const mission = parseVirginia(`/RICHMONDVA3LM`);
  assert.equal(mission.mode, "RICHMONDVA3LM");
  assert.equal(mission.agents, 0);
  assert.equal(mission.stopWhen, "offline");
  assert.deepEqual(mission.steps.map((s) => s.op), ["SHUTDOWN_ZYRA"]);
});

test("parses canonical RICHMONDVA3LM stack signature", () => {
  const mission = parseVirginia(`/RICHMONDVA3LM - GPT - DOUG - 3LM - XUNIABOT - ZYRA - PALANTIR`);
  assert.equal(mission.mode, "RICHMONDVA3LM");
  assert.equal(mission.steps[0]?.op, "SHUTDOWN_ZYRA");
});
