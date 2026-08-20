import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first === -1) throw new Error(`repair pattern not found: ${label}`);
  if (source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`repair pattern is ambiguous: ${label}`);
  }
  return source.replace(before, after);
}

function replaceAllRequired(source, before, after, expectedMinimum, label) {
  const count = source.split(before).length - 1;
  if (count < expectedMinimum) throw new Error(`repair pattern count too low for ${label}: ${count}`);
  return source.split(before).join(after);
}

// Frontend typing repairs.
{
  const path = "client/src/pages/enterprise.tsx";
  let source = read(path);
  source = replaceOnce(
    source,
    'function MultiRegionTab({ isLoading: _parentLoading }: { settings?: Setting[]; isLoading: boolean }) {',
    'function MultiRegionTab({ settings, isLoading: _parentLoading }: { settings?: Setting[]; isLoading: boolean }) {',
    "enterprise settings destructure",
  );
  write(path, source);
}

{
  const path = "client/src/pages/pentest.tsx";
  let source = read(path);
  source = replaceOnce(
    source,
    '{session.testTypes.length} test types',
    '{Array.isArray(session.testTypes) ? session.testTypes.length : 0} test types',
    "pentest testTypes rendering",
  );
  source = replaceOnce(
    source,
    '{session.summary && ((session.summary as any).findingsCount as number) > 0 && (',
    '{Boolean(session.summary) && ((session.summary as any).findingsCount as number) > 0 && (',
    "pentest unknown summary rendering",
  );
  source = replaceOnce(
    source,
    '{(finding.testType as React.ReactNode).toString().replace("_", " ")}',
    '{String(finding.testType ?? "unknown").replace("_", " ")}',
    "pentest nullable testType",
  );
  write(path, source);
}

{
  const path = "client/src/pages/threat-detail.tsx";
  let source = read(path);
  source = replaceOnce(
    source,
    '<Button variant="link" size="sm" className="mt-1" data-testid="link-view-assets">',
    '<Button variant="ghost" size="sm" className="mt-1 underline" data-testid="link-view-assets">',
    "supported button variant",
  );
  write(path, source);
}

// Schema-aligned server repairs.
{
  const path = "server/caasm.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '    const linkedVulns = vulnerabilities.filter(v =>\n      v.assetId === asset.id ||\n      (v.title?.toLowerCase().includes(asset.hostname.toLowerCase()))\n    );',
    '    const linkedVulns = vulnerabilities.filter(v =>\n      v.affectedComponent?.toLowerCase().includes(asset.hostname.toLowerCase()) ||\n      (v.title?.toLowerCase().includes(asset.hostname.toLowerCase()))\n    );',
    "CAASM vulnerability correlation",
  );
  source = replaceAllRequired(source, "i.affectedAssets", "i.affectedSystems", 2, "CAASM incident systems");
  write(path, source);
}

{
  const path = "server/exposure.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '    exposed: level !== "internal" && level !== "none",',
    '    exposed: level !== "internal",',
    "exposure union comparison",
  );
  write(path, source);
}

{
  const path = "server/intelligence.ts";
  let source = read(path);
  source = replaceAllRequired(source, "v.remediation ||", "v.remediationSteps ||", 1, "vulnerability remediation field");
  source = replaceAllRequired(source, "a.isPublicFacing", 'a.tags.includes("public-facing")', 2, "public-facing asset label");
  source = replaceAllRequired(source, "a.operatingSystem", "a.os", 1, "asset OS field");
  write(path, source);
}

{
  const path = "server/metrics.ts";
  let source = read(path);
  source = replaceAllRequired(source, "item.name", "item.packageName", 1, "SBOM package name filter");
  source = replaceAllRequired(source, "a.name", "a.packageName", 2, "SBOM package name output");
  source = replaceAllRequired(source, "a.version", "a.packageVersion", 1, "SBOM package version output");
  write(path, source);
}

{
  const path = "server/routes.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '          const updated = f.updatedAt ? new Date(f.updatedAt).getTime() : Date.now();',
    '          const updated = f.resolvedAt ? new Date(f.resolvedAt).getTime() : Date.now();',
    "resolved finding timestamp",
  );
  source = replaceOnce(
    source,
    '      const scannedRepoCount = new Set(allScans.map(s => s.repositoryId).filter(Boolean)).size;',
    '      const scannedRepoCount = new Set(allScans.filter(s => s.targetType === "repository").map(s => s.targetId).filter((id): id is string => Boolean(id))).size;',
    "scan target repository coverage",
  );
  source = replaceAllRequired(source, "resource: \"", "resourceType: \"", 3, "audit resource type field");
  source = replaceOnce(
    source,
    '    const r = await storage.updateTrainingRecord(req.params.id, parsed.data);',
    '    const trainingUpdate = {\n      completed: parsed.data.completed,\n      completedAt: parsed.data.completedAt === undefined ? undefined : parsed.data.completedAt === null ? null : new Date(parsed.data.completedAt),\n      course: parsed.data.courseName,\n      phishingScore: parsed.data.score,\n    };\n    const r = await storage.updateTrainingRecord(req.params.id, trainingUpdate);',
    "training schema transform",
  );
  source = replaceOnce(
    source,
    '      avgCvss: parseFloat((cves.reduce((s, c) => s + c.cvssScore, 0) / cves.length).toFixed(1)),',
    '      avgCvss: cves.length > 0 ? parseFloat((cves.reduce((s, c) => s + (c.cvssScore ?? 0), 0) / cves.length).toFixed(1)) : 0,',
    "nullable CVSS average",
  );
  source = replaceOnce(
    source,
    '      const criticalRisks = risks.filter(r => r.severity === "critical" && r.status !== "accepted").length;',
    '      const criticalRisks = risks.filter(r => r.riskScore >= 15 && r.status !== "accepted").length;',
    "risk severity derivation",
  );
  write(path, source);
}

{
  const path = "server/seed-demo.ts";
  let source = read(path);
  source = replaceOnce(source, ', resolvedAt: ago(3), verifiedAt: ago(2)', ', verifiedAt: ago(2)', "resolved vulnerability fixture one");
  source = replaceOnce(source, ', resolvedAt: ago(10), verifiedAt: ago(9)', ', verifiedAt: ago(9)', "resolved vulnerability fixture two");
  write(path, source);
}

{
  const path = "server/task-runner.ts";
  let source = read(path);
  source = replaceOnce(
    source,
    '    const scan = await storage.createScan({\n      organizationId: task.organizationId,\n      repositoryId: repo.id,\n      type: "full",\n      status: "running",\n      branch: repo.defaultBranch || "main",\n      commitHash: null,\n      triggeredBy: task.createdById || "system",\n      totalFindings: 0,\n      criticalCount: 0,\n      highCount: 0,\n      mediumCount: 0,\n      lowCount: 0,\n    });',
    '    const scan = await storage.createScan({\n      organizationId: task.organizationId,\n      name: `Task scan: ${repo.name}`,\n      scanType: "semgrep",\n      status: "running",\n      targetType: "repository",\n      targetId: repo.id,\n      targetName: repo.name,\n      initiatedById: task.createdById || null,\n    });',
    "task scan schema",
  );
  source = replaceOnce(
    source,
    '    playbookId: playbook.id,\n    status: "running",',
    '    playbookId: playbook.id,\n    playbookName: playbook.name,\n    status: "running",',
    "SOAR playbook name",
  );
  write(path, source);
}

console.log("TypeScript schema repair applied");
