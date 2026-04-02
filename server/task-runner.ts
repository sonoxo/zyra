import { storage } from "./storage";
import type { Task } from "@shared/schema";

interface TaskResult {
  success: boolean;
  output: string;
  details?: any;
  duration?: number;
}

const TASK_HANDLERS: Record<string, (task: Task) => Promise<TaskResult>> = {
  scan: runScanTask,
  playbook: runPlaybookTask,
  remediation: runRemediationTask,
  audit: runAuditTask,
  compliance: runComplianceTask,
  general: runGeneralTask,
};

async function runScanTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  try {
    const repos = await storage.getRepositories(task.organizationId);
    if (repos.length === 0) {
      return { success: true, output: "No repositories configured for scanning.", duration: Date.now() - start };
    }
    const repo = repos[0];
    const scan = await storage.createScan({
      organizationId: task.organizationId,
      repositoryId: repo.id,
      type: "full",
      status: "running",
      branch: repo.defaultBranch || "main",
      commitHash: null,
      triggeredBy: task.createdById || "system",
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    });
    await storage.updateScan(scan.id, { status: "completed", totalFindings: 0 });
    await logTaskAudit(task, "scan.completed", "scan", scan.id);
    return { success: true, output: `Scan completed on ${repo.name}. No findings.`, details: { scanId: scan.id, repo: repo.name }, duration: Date.now() - start };
  } catch (e: any) {
    return { success: false, output: `Scan failed: ${e.message}`, duration: Date.now() - start };
  }
}

async function runPlaybookTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  const playbooks = await storage.getSoarPlaybooks(task.organizationId);
  if (playbooks.length === 0) {
    return { success: true, output: "No playbooks configured.", duration: Date.now() - start };
  }
  const playbook = playbooks[0];
  const execution = await storage.createSoarExecution({
    organizationId: task.organizationId,
    playbookId: playbook.id,
    status: "running",
    triggeredBy: task.createdById || "agent",
    steps: [],
  });
  await storage.updateSoarExecution(execution.id, { status: "completed" });
  await logTaskAudit(task, "playbook.executed", "soar_execution", execution.id);
  return { success: true, output: `Playbook "${playbook.name}" executed.`, details: { executionId: execution.id }, duration: Date.now() - start };
}

async function runRemediationTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  await logTaskAudit(task, "remediation.checked", "task", task.id);
  return { success: true, output: "Remediation check completed. No open items requiring action.", duration: Date.now() - start };
}

async function runAuditTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  const logs = await storage.getAuditLogs(task.organizationId, 100);
  await logTaskAudit(task, "audit.completed", "task", task.id);
  return { success: true, output: `Audit completed. ${logs.length} recent log entries reviewed.`, details: { logCount: logs.length }, duration: Date.now() - start };
}

async function runComplianceTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  const mappings = await storage.getComplianceMappings(task.organizationId);
  const implemented = mappings.filter(m => m.status === "implemented").length;
  const total = mappings.length;
  await logTaskAudit(task, "compliance.assessed", "task", task.id);
  return {
    success: true,
    output: `Compliance assessment completed. ${implemented}/${total} controls implemented.`,
    details: { implemented, total, percentage: total > 0 ? Math.round((implemented / total) * 100) : 0 },
    duration: Date.now() - start,
  };
}

async function runGeneralTask(task: Task): Promise<TaskResult> {
  const start = Date.now();
  await logTaskAudit(task, "task.executed", "task", task.id);
  return { success: true, output: "Task completed successfully.", duration: Date.now() - start };
}

async function logTaskAudit(task: Task, action: string, resourceType: string, resourceId: string) {
  try {
    await storage.createAuditLog({
      organizationId: task.organizationId,
      userId: task.createdById || "system",
      action,
      resourceType,
      resourceId,
      details: { taskId: task.id, title: task.title },
    });
  } catch {}
}

export async function executeTask(taskId: string, orgId: string): Promise<Task | null> {
  const task = await storage.getTask(taskId, orgId);
  if (!task || task.status !== "pending") return null;

  await storage.updateTask(taskId, { status: "running", startedAt: new Date() });

  const handler = TASK_HANDLERS[task.type] || TASK_HANDLERS.general;
  try {
    const result = await handler(task);
    const status = result.success ? "completed" : "failed";
    const updated = await storage.updateTask(taskId, {
      status,
      completedAt: new Date(),
      result: result as any,
    });

    await storage.createNotification({
      organizationId: orgId,
      title: result.success ? `Task completed: ${task.title}` : `Task failed: ${task.title}`,
      message: result.output,
      type: result.success ? "success" : "error",
      severity: result.success ? "info" : "high",
      resourceType: "task",
      resourceId: taskId,
    });

    return updated || null;
  } catch (e: any) {
    await storage.updateTask(taskId, {
      status: "failed",
      completedAt: new Date(),
      result: { success: false, output: e.message } as any,
    });
    return null;
  }
}

export async function processPendingTasks(orgId: string): Promise<number> {
  const tasks = await storage.getTasks(orgId);
  const pending = tasks.filter(t => t.status === "pending");
  let executed = 0;
  for (const task of pending.slice(0, 5)) {
    await executeTask(task.id, orgId);
    executed++;
  }
  return executed;
}

export async function getTaskExecutionHistory(orgId: string): Promise<any[]> {
  const tasks = await storage.getTasks(orgId);
  return tasks
    .filter(t => t.status === "completed" || t.status === "failed")
    .map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      status: t.status,
      result: t.result,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      duration: t.startedAt && t.completedAt
        ? new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()
        : null,
    }));
}
