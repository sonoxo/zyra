export type VirginiaStep = {
  op:
    | "LIST_ONTOLOGIES"
    | "LIST_OBJECT_TYPES"
    | "LIST_OBJECTS"
    | "APPLY_ACTION"
    | "GEOVISION_STATUS"
    | "GEOVISION_CAMERAS"
    | "GEOVISION_DETECTIONS"
    | "MISSION_TWIN_STATUS"
    | "SPACEX_LAUNCH_LATEST"
    | "SPACEX_LAUNCHES"
    | "FPRIME_TELEMETRY"
    | "BRAIN_UPDATE_SOURCE"
    | "SHUTDOWN_ZYRA"
    | "NOTE";
  ontology?: string;
  objectType?: string;
  action?: string;
  parameters?: Record<string, unknown>;
  text?: string;
};

export type VirginiaMission = {
  mode: "VIRGINIA" | "VAL3M" | "VA3LM" | "RICHMONDVA3LM";
  agents: number;
  stopWhen: string;
  profile?: string;
  steps: VirginiaStep[];
};

const RICHMONDVA3LM = /^\/RICHMONDVA3LM(?:\s*-\s*GPT\s*-\s*DOUG\s*-\s*3LM\s*-\s*XUNIABOT\s*-\s*ZYRA\s*-\s*PALANTIR)?$/i;
const VA3LM = /^\/VA3LM(?:\s*-\s*PALANTIRVABRAIN3LM\s*-\s*GPT\s*-\s*DOUG\s*-\s*LLM\s*-\s*ZYRA\s*-\s*XUNA\s*-\s*SONOXO\s*-\s*ECOSYSTEM)?$/i;
const VA3LM_PROFILE = "PALANTIRVABRAIN3LM / GPT-DOUG-LLM / ZYRA / XUNA / SONOXO ECOSYSTEM";
const URL_PATTERN = /^https?:\/\/\S+$/i;

export function parseVirginia(input: string): VirginiaMission {
  const rawSegments = input.includes("///") ? input.split(/\s*\/\/\/\s*/) : [input];
  const brainSources = rawSegments.length > 1
    ? rawSegments.map((segment) => segment.trim()).filter((segment) => URL_PATTERN.test(segment))
    : [];
  const commandInput = rawSegments.length > 1
    ? rawSegments.filter((segment) => !URL_PATTERN.test(segment.trim())).join("\n")
    : input;
  const lines = commandInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let mode: VirginiaMission["mode"] = "VIRGINIA";
  let agents = 24;
  let stopWhen = "green";
  let profile: string | undefined;
  const steps: VirginiaStep[] = brainSources.map((source) => ({ op: "BRAIN_UPDATE_SOURCE", text: source }));

  for (const line of lines) {
    if (RICHMONDVA3LM.test(line)) {
      return {
        mode: "RICHMONDVA3LM",
        agents: 0,
        stopWhen: "offline",
        profile: "GPT-DOUG-3LM / XUNIABOT / ZYRA / PALANTIR BRIDGE",
        steps: [{
          op: "SHUTDOWN_ZYRA",
          text: "GPT-DOUG-3LM / XUNIABOT / ZYRA / PALANTIR BRIDGE",
        }],
      };
    }
    if (VA3LM.test(line)) {
      mode = "VA3LM";
      profile = VA3LM_PROFILE;
      steps.push({ op: "GEOVISION_STATUS", text: "EYERIS non-identifying geospatial object/scene recognition" });
      continue;
    }
    if (/^\/VAL3M$/i.test(line) || /^VAL3M:?$/i.test(line)) {
      mode = "VAL3M";
      continue;
    }
    const brainUpdate = line.match(/^BRAIN\s+UPDATE\s+(https?:\/\/\S+)$/i);
    if (brainUpdate) {
      steps.push({ op: "BRAIN_UPDATE_SOURCE", text: brainUpdate[1] });
      continue;
    }
    const agentMatch = line.match(/^AGENTS\s+(\d+)$/i);
    if (agentMatch) {
      agents = Math.max(1, Math.min(24, Number(agentMatch[1])));
      continue;
    }
    const stopMatch = line.match(/^STOP\s+WHEN\s+(.+)$/i);
    if (stopMatch) {
      stopWhen = stopMatch[1].trim();
      continue;
    }
    if (/^MISSION\s+TWIN\s+STATUS$/i.test(line)) {
      steps.push({ op: "MISSION_TWIN_STATUS" });
      continue;
    }
    if (/^SPACEX\s+LATEST$/i.test(line)) {
      steps.push({ op: "SPACEX_LAUNCH_LATEST", text: "read-only public SpaceX API data" });
      continue;
    }
    if (/^SPACEX\s+LAUNCHES$/i.test(line)) {
      steps.push({ op: "SPACEX_LAUNCHES", text: "read-only public SpaceX API data" });
      continue;
    }
    const fprimeTelemetry = line.match(/^FPRIME\s+TELEMETRY(?:\s+(.+))?$/i);
    if (fprimeTelemetry) {
      steps.push({ op: "FPRIME_TELEMETRY", text: fprimeTelemetry[1]?.trim() || "simulation" });
      continue;
    }
    if (/^GEOVISION\s+STATUS$/i.test(line)) {
      steps.push({ op: "GEOVISION_STATUS" });
      continue;
    }
    const cameras = line.match(/^GEOVISION\s+CAMERAS(?:\s+(\S+))?$/i);
    if (cameras) {
      steps.push({ op: "GEOVISION_CAMERAS", ontology: cameras[1] });
      continue;
    }
    const detections = line.match(/^GEOVISION\s+DETECTIONS(?:\s+(\S+))?$/i);
    if (detections) {
      steps.push({ op: "GEOVISION_DETECTIONS", ontology: detections[1] });
      continue;
    }
    if (/^LIST\s+ONTOLOGIES$/i.test(line)) {
      steps.push({ op: "LIST_ONTOLOGIES" });
      continue;
    }
    const types = line.match(/^LIST\s+OBJECT_TYPES\s+(.+)$/i);
    if (types) {
      steps.push({ op: "LIST_OBJECT_TYPES", ontology: types[1].trim() });
      continue;
    }
    const objects = line.match(/^LIST\s+OBJECTS\s+(\S+)\s+(\S+)$/i);
    if (objects) {
      steps.push({ op: "LIST_OBJECTS", ontology: objects[1], objectType: objects[2] });
      continue;
    }
    const action = line.match(/^APPLY\s+(\S+)\s+(\S+)\s+(.+)$/i);
    if (action) {
      let parameters: Record<string, unknown> = {};
      try { parameters = JSON.parse(action[3]); } catch { parameters = { value: action[3] }; }
      steps.push({ op: "APPLY_ACTION", ontology: action[1], action: action[2], parameters });
      continue;
    }
    if (!/^VIRGINIA:?$/i.test(line)) steps.push({ op: "NOTE", text: line });
  }

  return { mode, agents, stopWhen, profile, steps };
}
