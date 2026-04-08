import { storage } from "./storage";

export async function ensureGraphSeeded(orgId: string): Promise<void> {
  const existing = await storage.getGraphNodes(orgId);
  if (existing.length > 0) return;

  const nodeData = [
    { nodeType: "cloud_account", externalId: "aws-prod", label: "AWS Production", properties: { provider: "aws", region: "us-east-1" }, riskScore: 45 },
    { nodeType: "cloud_account", externalId: "gcp-staging", label: "GCP Staging", properties: { provider: "gcp", region: "us-central1" }, riskScore: 25 },
    { nodeType: "asset", externalId: "k8s-cluster-prod", label: "K8s Cluster (prod)", properties: { type: "kubernetes", version: "1.27" }, riskScore: 65 },
    { nodeType: "asset", externalId: "db-postgres-prod", label: "PostgreSQL RDS", properties: { type: "database", engine: "postgres 15" }, riskScore: 80 },
    { nodeType: "asset", externalId: "api-server-prod", label: "API Gateway", properties: { type: "service", exposure: "public" }, riskScore: 72 },
    { nodeType: "asset", externalId: "auth-service", label: "Auth Service", properties: { type: "service", exposure: "internal" }, riskScore: 60 },
    { nodeType: "container", externalId: "container-api-v2", label: "api:v2.1.4", properties: { image: "sentinel/api:2.1.4", critical_cves: 2 }, riskScore: 88 },
    { nodeType: "container", externalId: "container-auth-v1", label: "auth:v1.3.0", properties: { image: "sentinel/auth:1.3.0", critical_cves: 0 }, riskScore: 30 },
    { nodeType: "repository", externalId: "repo-sentinel-app", label: "sentinel-app", properties: { provider: "github", stars: 12 }, riskScore: 55 },
    { nodeType: "repository", externalId: "repo-auth-service", label: "auth-service", properties: { provider: "github", stars: 4 }, riskScore: 35 },
    { nodeType: "vulnerability", externalId: "cve-log4shell", label: "CVE-2021-44228 (Log4Shell)", properties: { cvss: 10.0, severity: "critical" }, riskScore: 100 },
    { nodeType: "vulnerability", externalId: "cve-openssl", label: "CVE-2024-0727 (OpenSSL)", properties: { cvss: 7.5, severity: "high" }, riskScore: 75 },
    { nodeType: "identity", externalId: "service-account-api", label: "api-svc-account", properties: { type: "service_account", privileges: "admin" }, riskScore: 70 },
    { nodeType: "identity", externalId: "user-admin", label: "admin@company.com", properties: { type: "user", mfa: false }, riskScore: 85 },
  ];

  const createdNodes: Record<string, any> = {};
  for (const node of nodeData) {
    const created = await storage.createGraphNode({ organizationId: orgId, ...node });
    createdNodes[node.externalId] = created;
  }

  const edges = [
    ["aws-prod", "k8s-cluster-prod", "hosts"],
    ["gcp-staging", "k8s-cluster-prod", "belongs_to"],
    ["k8s-cluster-prod", "container-api-v2", "runs"],
    ["k8s-cluster-prod", "container-auth-v1", "runs"],
    ["container-api-v2", "api-server-prod", "exposes"],
    ["container-auth-v1", "auth-service", "exposes"],
    ["api-server-prod", "db-postgres-prod", "connects_to"],
    ["auth-service", "db-postgres-prod", "connects_to"],
    ["repo-sentinel-app", "container-api-v2", "builds"],
    ["repo-auth-service", "container-auth-v1", "builds"],
    ["cve-log4shell", "container-api-v2", "affects"],
    ["cve-openssl", "api-server-prod", "affects"],
    ["service-account-api", "api-server-prod", "authenticates"],
    ["user-admin", "db-postgres-prod", "has_access"],
    ["user-admin", "k8s-cluster-prod", "administers"],
  ];

  for (const [srcExt, tgtExt, edgeType] of edges) {
    const src = createdNodes[srcExt];
    const tgt = createdNodes[tgtExt];
    if (src && tgt) {
      await storage.createGraphEdge({
        organizationId: orgId,
        sourceNodeId: src.id,
        targetNodeId: tgt.id,
        edgeType,
        weight: 1,
        properties: {},
      });
    }
  }
}

export async function getGraphData(orgId: string) {
  const nodes = await storage.getGraphNodes(orgId);
  const edges = await storage.getGraphEdges(orgId);

  const nodeTypeColors: Record<string, string> = {
    asset: "#3b82f6",
    cloud_account: "#8b5cf6",
    container: "#06b6d4",
    repository: "#10b981",
    vulnerability: "#ef4444",
    identity: "#f97316",
  };

  return {
    nodes: nodes.map(n => ({
      id: n.id,
      externalId: n.externalId,
      label: n.label,
      nodeType: n.nodeType,
      riskScore: n.riskScore,
      properties: n.properties,
      color: nodeTypeColors[n.nodeType] ?? "#6b7280",
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      edgeType: e.edgeType,
      weight: e.weight,
    })),
  };
}

export async function addGraphNode(orgId: string, nodeType: string, externalId: string, label: string, properties?: Record<string, any>, riskScore = 0) {
  return storage.createGraphNode({ organizationId: orgId, nodeType, externalId, label, properties: properties ?? {}, riskScore });
}

export async function addGraphEdge(orgId: string, sourceNodeId: string, targetNodeId: string, edgeType: string, weight = 1) {
  return storage.createGraphEdge({ organizationId: orgId, sourceNodeId, targetNodeId, edgeType, weight, properties: {} });
}
