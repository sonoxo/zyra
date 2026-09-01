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

test("parses short VA3LM geovision command", () => {
  const mission = parseVirginia(`/VA3LM`);
  assert.equal(mission.mode, "VA3LM");
  assert.match(mission.profile || "", /PALANTIRVABRAIN3LM/);
  assert.deepEqual(mission.steps.map((s) => s.op), ["GEOVISION_STATUS"]);
});

test("parses canonical VA3LM ecosystem signature", () => {
  const mission = parseVirginia(`/VA3LM-PALANTIRVABRAIN3LM-GPT-DOUG-LLM-ZYRA-XUNA-SONOXO-ECOSYSTEM`);
  assert.equal(mission.mode, "VA3LM");
  assert.equal(mission.steps[0]?.op, "GEOVISION_STATUS");
});

test("parses explicit GeoVision camera and detection reads", () => {
  const mission = parseVirginia(`/VA3LM\nGEOVISION CAMERAS eyeris\nGEOVISION DETECTIONS eyeris\nSTOP WHEN evidence-returned`);
  assert.deepEqual(mission.steps.map((s) => s.op), ["GEOVISION_STATUS", "GEOVISION_CAMERAS", "GEOVISION_DETECTIONS"]);
  assert.equal(mission.steps[1]?.ontology, "eyeris");
  assert.equal(mission.stopWhen, "evidence-returned");
});

test("parses mission telemetry twin read commands", () => {
  const mission = parseVirginia(`MISSION TWIN STATUS\nSPACEX LATEST\nSPACEX LAUNCHES\nFPRIME TELEMETRY simulation`);
  assert.deepEqual(mission.steps.map((s) => s.op), [
    "MISSION_TWIN_STATUS",
    "SPACEX_LAUNCH_LATEST",
    "SPACEX_LAUNCHES",
    "FPRIME_TELEMETRY",
  ]);
});

test("treats triple slash URLs as brain update sources", () => {
  const mission = parseVirginia(`https://github.com/sonoxo/fprimeXUNIA- /// https://github.com/sonoxo/SpaceX-APIxunia`);
  assert.deepEqual(mission.steps.map((s) => s.op), ["BRAIN_UPDATE_SOURCE", "BRAIN_UPDATE_SOURCE"]);
  assert.match(mission.steps[0]?.text || "", /fprimeXUNIA/);
  assert.match(mission.steps[1]?.text || "", /SpaceX-APIxunia/);
});

test("parses explicit brain update command", () => {
  const mission = parseVirginia(`BRAIN UPDATE https://example.com/spec`);
  assert.equal(mission.steps[0]?.op, "BRAIN_UPDATE_SOURCE");
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
