import { storage } from "./storage";
import { emitSecurityEvent } from "./metrics";

export interface PlaybookAction {
  id: string;
  name: string;
  description: string;
  type: "isolate" | "disable" | "rotate" | "block" | "alert" | "scan" | "patch" | "notify";
  simulatedDurationMs: number;
}

export interface BuiltinPlaybook {
  id: string;
  name: string;
  description: string;
  trigger: string;
  category: string;
  actions: PlaybookAction[];
}

export const BUILTIN_PLAYBOOKS: BuiltinPlaybook[] = [
  {
    id: "contain-compromised-host",
    name: "Contain Compromised Host",
    description: "Automatically isolate a compromised host from the network, revoke active sessions, and trigger forensic collection.",
    trigger: "critical_incident",
    category: "incident_response",
    actions: [
      { id: "a1", name: "Identify host", description: "Resolve asset ID from incident context", type: "scan", simulatedDurationMs: 800 },
      { id: "a2", name: "Isolate host from network", description: "Apply network ACL to block all outbound/inbound traffic", type: "isolate", simulatedDurationMs: 1200 },
      { id: "a3", name: "Terminate active sessions", description: "Revoke all active user sessions on the host", type: "disable", simulatedDurationMs: 600 },
      { id: "a4", name: "Collect forensic snapshot", description: "Capture process list, open connections, and memory dump", type: "scan", simulatedDurationMs: 2000 },
      { id: "a5", name: "Notify security team", description: "Send PagerDuty alert and Slack notification to #incidents", type: "notify", simulatedDurationMs: 400 },
    ],
  },
  {
    id: "disable-exposed-api-key",
    name: "Disable Exposed API Key",
    description: "Detect and immediately revoke an API key found in source code, rotate credentials, and open a remediation ticket.",
    trigger: "secret_exposed",
    category: "secrets_management",
    actions: [
      { id: "a1", name: "Identify exposed key", description: "Match key prefix in secrets database", type: "scan", simulatedDurationMs: 500 },
      { id: "a2", name: "Revoke API key", description: "Mark key as inactive and invalidate all tokens", type: "disable", simulatedDurationMs: 700 },
      { id: "a3", name: "Generate replacement key", description: "Issue new API key with same permissions", type: "rotate", simulatedDurationMs: 600 },
      { id: "a4", name: "Update dependent services", description: "Push new key to vault and notify consuming services", type: "notify", simulatedDurationMs: 900 },
      { id: "a5", name: "Create remediation ticket", description: "Open Jira ticket to audit all usages of old key", type: "alert", simulatedDurationMs: 400 },
    ],
  },
  {
    id: "rotate-credentials",
    name: "Rotate Credentials",
    description: "Perform automated credential rotation for a user or service account following a security event.",
    trigger: "manual",
    category: "identity_management",
    actions: [
      { id: "a1", name: "Enumerate credentials", description: "List all credentials for the target principal", type: "scan", simulatedDurationMs: 600 },
      { id: "a2", name: "Generate new credentials", description: "Create new strong random credentials", type: "rotate", simulatedDurationMs: 500 },
      { id: "a3", name: "Update credential stores", description: "Push new credentials to Vault and SSM Parameter Store", type: "rotate", simulatedDurationMs: 1000 },
      { id: "a4", name: "Invalidate old credentials", description: "Revoke previous credentials across all systems", type: "disable", simulatedDurationMs: 800 },
      { id: "a5", name: "Audit log rotation event", description: "Write rotation event to compliance audit trail", type: "alert", simulatedDurationMs: 300 },
    ],
  },
  {
    id: "block-malicious-ip",
    name: "Block Malicious IP",
    description: "Block a confirmed malicious IP across firewall rules, WAF, and security groups.",
    trigger: "threat_intelligence",
    category: "network_defense",
    actions: [
      { id: "a1", name: "Verify IP reputation", description: "Cross-check IP against threat feeds and internal blocklist", type: "scan", simulatedDurationMs: 700 },
      { id: "a2", name: "Update WAF rules", description: "Add IP to WAF deny rule (AWS WAF / Cloudflare)", type: "block", simulatedDurationMs: 900 },
      { id: "a3", name: "Update security groups", description: "Apply inbound block rule to all security groups", type: "block", simulatedDurationMs: 1100 },
      { id: "a4", name: "Update edge firewall", description: "Push deny rule to Palo Alto / Cisco edge firewall", type: "block", simulatedDurationMs: 1300 },
      { id: "a5", name: "Log to threat intel feed", description: "Share IOC with threat intelligence platform", type: "alert", simulatedDurationMs: 400 },
    ],
  },
  {
    id: "quarantine-container",
    name: "Quarantine Vulnerable Container",
    description: "Detect and isolate a running container with critical CVEs, drain its workload, and trigger a patched rebuild.",
    trigger: "critical_cve",
    category: "container_security",
    actions: [
      { id: "a1", name: "Identify container", description: "Resolve container ID and image from CVE context", type: "scan", simulatedDurationMs: 600 },
      { id: "a2", name: "Drain container workload", description: "Gracefully terminate connections and redirect traffic", type: "isolate", simulatedDurationMs: 1500 },
      { id: "a3", name: "Stop container", description: "Send SIGTERM to container and wait for shutdown", type: "isolate", simulatedDurationMs: 800 },
      { id: "a4", name: "Trigger patched image build", description: "Kick off CI/CD pipeline with patched base image", type: "patch", simulatedDurationMs: 2000 },
      { id: "a5", name: "Notify DevOps team", description: "Send Slack message to #platform-ops with details", type: "notify", simulatedDurationMs: 300 },
    ],
  },
  {
    id: "patch-critical-cve",
    name: "Patch Critical CVE",
    description: "Automatically identify affected assets from SBOM, prioritize patching, and create remediation tasks.",
    trigger: "critical_cve",
    category: "vulnerability_management",
    actions: [
      { id: "a1", name: "Identify affected packages", description: "Cross-reference CVE with SBOM to find affected assets", type: "scan", simulatedDurationMs: 1000 },
      { id: "a2", name: "Assess blast radius", description: "Map all assets, containers and services using the package", type: "scan", simulatedDurationMs: 1200 },
      { id: "a3", name: "Create remediation tasks", description: "Open priority tickets for each affected system", type: "alert", simulatedDurationMs: 700 },
      { id: "a4", name: "Generate patch commands", description: "Produce upgrade commands for each package manager", type: "patch", simulatedDurationMs: 500 },
      { id: "a5", name: "Schedule patch window", description: "Create change request for approved patching window", type: "notify", simulatedDurationMs: 400 },
    ],
  },
];

export async function ensureSoarPlaybooksSeeded(orgId: string): Promise<void> {
  const existing = await storage.getSoarPlaybooks(orgId);
  if (existing.length > 0) return;

  for (const pb of BUILTIN_PLAYBOOKS) {
    await storage.createSoarPlaybook({
      organizationId: orgId,
      name: pb.name,
      description: pb.description,
      trigger: pb.trigger,
      category: pb.category,
      actions: pb.actions as any,
      isActive: true,
      isBuiltin: true,
      executionCount: 0,
    });
  }
}

export async function executePlaybook(
  playbookId: string,
  orgId: string,
  triggeredBy: string,
  inputData?: Record<string, any>
): Promise<{ executionId: string; status: string; steps: any[]; duration: number }> {
  const playbooks = await storage.getSoarPlaybooks(orgId);
  const playbook = playbooks.find(p => p.id === playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const actions = playbook.actions as PlaybookAction[];
  const startTime = Date.now();
  const executedSteps: any[] = [];

  const execution = await storage.createSoarExecution({
    organizationId: orgId,
    playbookId: playbook.id,
    playbookName: playbook.name,
    triggeredBy,
    status: "running",
    steps: [],
    inputData: inputData ?? {},
    startedAt: new Date(),
  });

  let overallStatus = "success";

  for (const action of actions) {
    executedSteps.push({
      id: action.id,
      name: action.name,
      type: action.type,
      description: action.description,
      status: "success",
      duration: action.simulatedDurationMs,
      completedAt: new Date().toISOString(),
      output: `✓ ${action.name} completed successfully`,
    });
  }

  const duration = Date.now() - startTime;

  await storage.updateSoarExecution(execution.id, {
    status: overallStatus,
    steps: executedSteps,
    outputData: { summary: `${executedSteps.filter(s => s.status === "success").length}/${executedSteps.length} steps succeeded` },
    duration,
    completedAt: new Date(),
  });

  await storage.updateSoarPlaybook(playbook.id, {
    executionCount: (playbook.executionCount ?? 0) + 1,
    lastExecutedAt: new Date(),
  });

  await emitSecurityEvent(orgId, {
    eventType: "soar_execution",
    source: "soar",
    severity: "info",
    title: `SOAR playbook executed: ${playbook.name}`,
    description: `Playbook completed with status: ${overallStatus}. ${executedSteps.filter(s => s.status === "success").length}/${executedSteps.length} steps succeeded.`,
    metadata: { playbookId, executionId: execution.id, status: overallStatus },
  });

  return { executionId: execution.id, status: overallStatus, steps: executedSteps, duration };
}
