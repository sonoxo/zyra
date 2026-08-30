export type ContractOpsEvidenceAuthority = "SUPPORTING_EVIDENCE_ONLY";

export interface ContractOpsEvidenceCandidate {
  id: string;
  domain: string;
  label: string;
  evidenceType: "ISSUER_CREDENTIAL" | "SUPPLIED_ISSUER_EVIDENCE" | "REPOSITORY_CREDENTIAL" | "REPOSITORY_ARTIFACT";
  verificationUrl?: string;
  repositoryPath?: string;
  keywords: string[];
  authority: ContractOpsEvidenceAuthority;
}

export interface ContractOpsEvidenceMatch {
  requirement: string;
  state: "SUPPORTED_CANDIDATE" | "GAP";
  topScore: number;
  candidates: Array<ContractOpsEvidenceCandidate & { score: number; matchedKeywords: string[] }>;
}

export const ZYRA_CONTRACTOPS_EVIDENCE_CATALOG: ContractOpsEvidenceCandidate[] = [
  {
    id: "palantir-foundry-aware",
    domain: "Palantir Foundry / AIP",
    label: "Palantir Foundry Aware",
    evidenceType: "ISSUER_CREDENTIAL",
    verificationUrl: "https://verify.skilljar.com/c/iyatkacnyv87",
    keywords: ["palantir", "foundry", "ontology", "aip", "data", "platform", "governance"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "palantir-data-protection",
    domain: "Palantir Foundry Security",
    label: "Deep Dive: Data Protection Tools in Foundry",
    evidenceType: "ISSUER_CREDENTIAL",
    verificationUrl: "https://verify.skilljar.com/c/gdirvobazx2y",
    keywords: ["palantir", "foundry", "security", "protection", "governance", "access", "data"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "palantir-aip-enterprise",
    domain: "Palantir Foundry / AIP",
    label: "Introduction to Foundry & AIP for Enterprise Organizations",
    evidenceType: "ISSUER_CREDENTIAL",
    verificationUrl: "https://verify.skilljar.com/c/7ogvo4qo4aad",
    keywords: ["palantir", "foundry", "aip", "enterprise", "ai", "automation", "ontology"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "palantir-data-science",
    domain: "Data Science",
    label: "Speedrun: Data Science Fundamentals",
    evidenceType: "ISSUER_CREDENTIAL",
    verificationUrl: "https://verify.skilljar.com/c/tt9ue6hsm96y",
    keywords: ["data", "science", "analytics", "model", "machine", "learning", "ml", "analysis"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "google-cybersecurity-professional",
    domain: "Cybersecurity",
    label: "Google Cybersecurity Professional Certificate",
    evidenceType: "SUPPLIED_ISSUER_EVIDENCE",
    verificationUrl: "https://coursera.org/verify/professional-cert/JGOZ2VZJ1VJX",
    keywords: ["cybersecurity", "security", "network", "linux", "sql", "threat", "vulnerability", "incident", "python", "detection", "response"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "google-ai-professional",
    domain: "Artificial Intelligence",
    label: "Google AI Professional Certificate",
    evidenceType: "SUPPLIED_ISSUER_EVIDENCE",
    verificationUrl: "https://coursera.org/verify/professional-cert/QBUP5I6Q063G",
    keywords: ["ai", "artificial", "intelligence", "research", "insights", "content", "application", "app", "automation", "analysis"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "google-business-intelligence",
    domain: "Business Intelligence",
    label: "Foundations of Business Intelligence",
    evidenceType: "ISSUER_CREDENTIAL",
    verificationUrl: "https://coursera.org/verify/JY87E17F8Y0S",
    keywords: ["business", "intelligence", "analytics", "dashboard", "reporting", "data", "insights", "metrics"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "ibm-quantum-ml",
    domain: "Quantum / Machine Learning",
    label: "IBM Quantum Machine Learning",
    evidenceType: "SUPPLIED_ISSUER_EVIDENCE",
    verificationUrl: "https://www.credly.com/badges/a5b99d3e-5945-471a-8d75-df75251887ad",
    keywords: ["machine", "learning", "ml", "quantum", "model", "algorithm", "ai"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "rvia-ontology-architect",
    domain: "ZYRA Repository Credential",
    label: "RVIA Ontology Architect",
    evidenceType: "REPOSITORY_CREDENTIAL",
    repositoryPath: "docs/credentials/RVIA-BADGES.md",
    keywords: ["ontology", "schema", "architecture", "relationship", "action", "provenance", "governance"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "rvia-governance-compliance",
    domain: "ZYRA Repository Credential",
    label: "RVIA Governance & Compliance Certified",
    evidenceType: "REPOSITORY_CREDENTIAL",
    repositoryPath: "docs/credentials/RVIA-BADGES.md",
    keywords: ["governance", "compliance", "authorization", "security", "audit", "policy", "provenance"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
  {
    id: "zyra-platform-source",
    domain: "ZYRA Product Evidence",
    label: "ZYRA repository implementation evidence",
    evidenceType: "REPOSITORY_ARTIFACT",
    repositoryPath: "README.md",
    keywords: ["typescript", "react", "express", "postgresql", "drizzle", "api", "software", "application", "platform", "security", "automation"],
    authority: "SUPPORTING_EVIDENCE_ONLY",
  },
];

function tokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function matchRequirementToZyraEvidence(requirement: string): ContractOpsEvidenceMatch {
  const requirementTokens = new Set(tokens(requirement));
  const candidates = ZYRA_CONTRACTOPS_EVIDENCE_CATALOG
    .map((candidate) => {
      const matchedKeywords = candidate.keywords.filter((keyword) => requirementTokens.has(keyword.toLowerCase()));
      const score = Math.min(100, matchedKeywords.length * 25);
      return { ...candidate, score, matchedKeywords };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    requirement,
    state: candidates.length ? "SUPPORTED_CANDIDATE" : "GAP",
    topScore: candidates[0]?.score || 0,
    candidates,
  };
}

export function buildOpportunityEvidenceMatrix(requirements: string[]) {
  const matches = requirements.map(matchRequirementToZyraEvidence);
  const supportedCount = matches.filter((match) => match.state === "SUPPORTED_CANDIDATE").length;
  const total = matches.length;
  return {
    matches,
    supportedCount,
    gapCount: total - supportedCount,
    coveragePercent: total === 0 ? 0 : Math.round((supportedCount / total) * 100),
    ready: total > 0 && supportedCount === total,
    authority: "SUPPORTING_EVIDENCE_ONLY" as const,
    warning: "Credential or repository evidence may support a proposal claim but does not itself prove contract eligibility, government authorization, clearance, or agency acceptance.",
  };
}
