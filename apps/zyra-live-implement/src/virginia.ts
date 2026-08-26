export type VirginiaStep = {
  op: "LIST_ONTOLOGIES" | "LIST_OBJECT_TYPES" | "LIST_OBJECTS" | "APPLY_ACTION" | "NOTE";
  ontology?: string;
  objectType?: string;
  action?: string;
  parameters?: Record<string, unknown>;
  text?: string;
};

export type VirginiaMission = {
  mode: "VIRGINIA" | "VAL3M";
  agents: number;
  stopWhen: string;
  steps: VirginiaStep[];
};

export function parseVirginia(input: string): VirginiaMission {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let mode: VirginiaMission["mode"] = "VIRGINIA";
  let agents = 24;
  let stopWhen = "green";
  const steps: VirginiaStep[] = [];

  for (const line of lines) {
    if (/^\/VAL3M$/i.test(line) || /^VAL3M:?$/i.test(line)) {
      mode = "VAL3M";
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

  return { mode, agents, stopWhen, steps };
}
