export type MissionDoorId = "protect" | "see" | "investigate" | "build" | "federal" | "operate";

export interface MissionRouteSuggestion {
  id: MissionDoorId;
  label: string;
  route: string;
  reason: string;
  confidence: "high" | "medium" | "default";
}

const RULES: Array<{
  id: MissionDoorId;
  label: string;
  route: string;
  keywords: string[];
  reason: string;
}> = [
  {
    id: "protect",
    label: "Protect Something",
    route: "/scans",
    keywords: ["protect", "scan", "vulnerability", "vulnerabilities", "security", "secure", "pentest", "secret", "exposure", "attack surface"],
    reason: "Security and exposure language maps to ZYRA's defensive assessment surfaces.",
  },
  {
    id: "investigate",
    label: "Investigate Something",
    route: "/threat-intel",
    keywords: ["investigate", "intel", "intelligence", "threat", "cve", "research", "evidence", "analyze", "trace", "indicator"],
    reason: "Investigation language maps to NXYZ evidence and threat-intelligence workflows.",
  },
  {
    id: "see",
    label: "See With ZYRA",
    route: "/zyra-eyes",
    keywords: ["see", "eyes", "visual", "screen", "computer", "desktop", "perception", "observe"],
    reason: "Perception and visual-computing language maps to the ZYRA Eyes governed demo surface.",
  },
  {
    id: "build",
    label: "Build Something",
    route: "/repositories",
    keywords: ["build", "code", "repo", "repository", "app", "software", "integration", "integrate", "agent", "deploy"],
    reason: "Build and integration language maps to repositories and connected engineering assets.",
  },
  {
    id: "federal",
    label: "Government / Contracting",
    route: "/contractops",
    keywords: ["contract", "proposal", "federal", "government", "sam", "sbir", "sttr", "solicitation", "rfp", "rfi", "space force", "ussf"],
    reason: "Government acquisition language maps to NXYZ ContractOps and evidence-backed readiness workflows.",
  },
  {
    id: "operate",
    label: "Run an Operation",
    route: "/command-center",
    keywords: ["operate", "operation", "incident", "respond", "response", "task", "mission", "coordinate", "monitor", "status"],
    reason: "Operational coordination language maps to the command center and governed task surfaces.",
  },
];

export function routeMission(input: string): MissionRouteSuggestion {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return {
      id: "operate",
      label: "Run an Operation",
      route: "/command-center",
      reason: "Start from the command center when no mission detail is available yet.",
      confidence: "default",
    };
  }

  let bestRule = RULES[5];
  let bestScore = 0;

  for (const rule of RULES) {
    const score = rule.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return {
    id: bestRule.id,
    label: bestRule.label,
    route: bestRule.route,
    reason: bestScore > 0 ? bestRule.reason : "No specialized signal dominated, so ZYRA recommends the governed command center as the safest starting point.",
    confidence: bestScore >= 2 ? "high" : bestScore === 1 ? "medium" : "default",
  };
}
