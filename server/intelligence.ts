import { storage } from "./storage";

export async function fetchCveDatabase(orgId: string) {
  const [threatIntelItems, sbomItems] = await Promise.all([
    storage.getThreatIntelItems(orgId),
    storage.getSbomItems(orgId),
  ]);
  const vulnPackages = new Set(sbomItems.filter(i => i.isVulnerable).map(i => i.packageName.toLowerCase()));

  return threatIntelItems
    .filter(item => item.cveId)
    .map(item => ({
      id: item.id,
      cveId: item.cveId,
      title: item.title,
      severity: item.severity,
      cvssScore: item.cvssScore,
      affectedPackages: item.affectedPackages || [],
      affectedVersions: item.affectedVersions || [],
      patchedVersions: item.patchedVersions || [],
      description: item.description,
      source: item.source,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
      affectedInEnvironment: (item.affectedPackages || []).some((pkg: string) =>
        vulnPackages.has(pkg.toLowerCase()) ||
        sbomItems.some(s => s.packageName.toLowerCase().includes(pkg.toLowerCase()))
      ),
      relatedSbomCount: sbomItems.filter(s =>
        (item.affectedPackages || []).some((pkg: string) => s.packageName.toLowerCase().includes(pkg.toLowerCase()))
      ).length,
    }));
}

export async function runThreatHunt(query: string, orgId: string) {
  const q = query.toLowerCase().trim();
  const results: any[] = [];

  const [cveMatch] = q.match(/cve:([\w-]+)/) ?? [];
  const cveId = cveMatch?.split(":")[1];

  const [assetMatch] = q.match(/asset:([\w-]+)/) ?? [];
  const assetName = assetMatch?.split(":")[1];

  const [severityMatch] = q.match(/severity:(critical|high|medium|low)/) ?? [];
  const severityFilter = severityMatch?.split(":")[1];

  const [typeMatch] = q.match(/type:(server|container|domain|repository)/) ?? [];
  const typeFilter = typeMatch?.split(":")[1];

  if (cveId) {
    const threatIntelItems = await storage.getThreatIntelItems(orgId);
    const cve = threatIntelItems.find(c => c.cveId?.toLowerCase().includes(cveId.toLowerCase()));
    if (cve) {
      results.push({ type: "cve", source: "CVE Database", title: cve.title, id: cve.cveId, severity: cve.severity, detail: cve.description });
    }
    const sbomItems = await storage.getSbomItems(orgId);
    const matchedSbom = sbomItems.filter(s =>
      cve ? (cve.affectedPackages as string[] || []).some(p => s.packageName.toLowerCase().includes(p)) : false
    );
    matchedSbom.forEach(s => results.push({ type: "sbom", source: "SBOM", title: `${s.packageName}@${s.packageVersion}`, id: s.id, severity: s.isVulnerable ? "high" : "info", detail: `Package found in SBOM${s.isVulnerable ? " (vulnerable)" : ""}` }));
  }

  if (assetName) {
    const assets = await storage.getAssets(orgId);
    const matched = assets.filter(a => a.hostname.toLowerCase().includes(assetName) || (a.tags as string[]).some(t => t.includes(assetName)));
    matched.forEach(a => results.push({ type: "asset", source: "Asset Inventory", title: a.hostname, id: a.id, severity: a.criticality === "critical" ? "critical" : "medium", detail: `${a.assetType} in ${a.environment} (${a.cloudProvider || "on-prem"})` }));
  }

  if (severityFilter) {
    const vulns = await storage.getVulnerabilities(orgId);
    const matched = vulns.filter(v => v.severity === severityFilter);
    matched.slice(0, 10).forEach(v => results.push({ type: "vulnerability", source: "Vulnerabilities", title: v.title, id: v.id, severity: v.severity, detail: v.description || "No description" }));

    const findings = await storage.getFindingsByOrg(orgId);
    const matchedF = findings.filter(f => f.severity === severityFilter);
    matchedF.slice(0, 10).forEach(f => results.push({ type: "finding", source: "Scan Finding", title: f.title, id: f.id, severity: f.severity, detail: f.description }));
  }

  if (typeFilter) {
    const assets = await storage.getAssets(orgId);
    const matched = assets.filter(a => a.assetType === typeFilter);
    matched.forEach(a => results.push({ type: "asset", source: "Asset Inventory", title: a.hostname, id: a.id, severity: a.criticality === "critical" ? "critical" : "medium", detail: `${a.assetType} — ${a.environment}` }));
  }

  if (results.length === 0) {
    const vulns = await storage.getVulnerabilities(orgId);
    const incidents = await storage.getIncidents(orgId);
    const assets = await storage.getAssets(orgId);

    const terms = q.split(/\s+/).filter(t => t.length > 2);
    terms.forEach(term => {
      vulns.filter(v => v.title.toLowerCase().includes(term) || (v.description || "").toLowerCase().includes(term))
        .slice(0, 5).forEach(v => results.push({ type: "vulnerability", source: "Vulnerabilities", title: v.title, id: v.id, severity: v.severity, detail: v.description || "No description" }));
      incidents.filter(i => i.title.toLowerCase().includes(term) || (i.description || "").toLowerCase().includes(term))
        .slice(0, 5).forEach(i => results.push({ type: "incident", source: "Incidents", title: i.title, id: i.id, severity: i.severity, detail: i.description || "No description" }));
      assets.filter(a => a.hostname.toLowerCase().includes(term))
        .slice(0, 5).forEach(a => results.push({ type: "asset", source: "Asset Inventory", title: a.hostname, id: a.id, severity: a.criticality === "critical" ? "critical" : "medium", detail: `${a.assetType} — ${a.environment}` }));
    });
  }

  const unique = results.filter((r, i, arr) => arr.findIndex(x => x.id === r.id && x.type === r.type) === i);
  return unique.slice(0, 50);
}

export async function analyzeSecurityImage(imageBase64: string, mimeType: string, userPrompt?: string): Promise<string> {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return "Vision analysis is not available — HF_TOKEN is not configured.";

  const prompt = userPrompt?.trim() || "Analyze this image from a cybersecurity perspective. Identify any security alerts, vulnerabilities, misconfigurations, suspicious indicators, or notable findings. Provide actionable recommendations.";

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hfToken}`,
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `You are ZyraCopilot, an expert cybersecurity AI analyst. ${prompt}` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("HF vision API error:", resp.status, errText);
    return `Vision analysis failed (${resp.status}). Please try again later.`;
  }

  const data = await resp.json() as any;
  return data.choices?.[0]?.message?.content || "No analysis was returned from the vision model.";
}

export async function runSecurityCopilot(question: string, orgId: string): Promise<string> {
  const q = question.toLowerCase();
  const now = new Date();

  const [vulns, incidents, risks, assets, threatItems, paths, sbom] = await Promise.all([
    storage.getVulnerabilities(orgId),
    storage.getIncidents(orgId),
    storage.getRisks(orgId),
    storage.getAssets(orgId),
    storage.getThreatIntelItems(orgId),
    storage.getAttackPaths(orgId),
    storage.getSbomItems(orgId),
  ]);

  const criticalVulns = vulns.filter(v => v.severity === "critical" && v.status !== "resolved");
  const highVulns = vulns.filter(v => v.severity === "high" && v.status !== "resolved");
  const openVulns = vulns.filter(v => v.status !== "resolved");
  const openIncidents = incidents.filter(i => i.status !== "resolved" && i.status !== "closed");
  const criticalRisks = risks.filter(r => r.riskScore >= 15);
  const highRisks = risks.filter(r => r.riskScore >= 10 && r.riskScore < 15);
  const cloudAssets = assets.filter(a => a.cloudProvider);
  const activePaths = paths.filter(p => !p.mitigated);
  const vulnerablePkgs = sbom.filter(s => s.isVulnerable);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  function computePostureScore(): number {
    let score = 100;
    score -= criticalVulns.length * 5;
    score -= highVulns.length * 2;
    score -= openIncidents.filter(i => i.severity === "critical").length * 8;
    score -= openIncidents.filter(i => i.severity === "high").length * 3;
    score -= activePaths.filter(p => p.severity === "critical").length * 6;
    score -= criticalRisks.length * 4;
    score -= vulnerablePkgs.length * 1;
    return Math.max(0, Math.min(100, score));
  }

  function getMttr(): string {
    const resolved = incidents.filter(i => i.status === "resolved" && i.resolvedAt && i.createdAt);
    if (resolved.length === 0) return "N/A";
    const totalHrs = resolved.reduce((sum, i) => {
      return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 3600000;
    }, 0);
    const avg = totalHrs / resolved.length;
    return avg < 1 ? `${Math.round(avg * 60)} minutes` : avg < 24 ? `${avg.toFixed(1)} hours` : `${(avg / 24).toFixed(1)} days`;
  }

  function getUnassignedItems(): string[] {
    const items: string[] = [];
    const unassignedInc = openIncidents.filter(i => !i.assignedTo);
    const unassignedRisks = risks.filter(r => !r.owner && r.riskScore >= 10);
    if (unassignedInc.length > 0) items.push(`${unassignedInc.length} incident(s) without assignee`);
    if (unassignedRisks.length > 0) items.push(`${unassignedRisks.length} high-scoring risk(s) without owner`);
    return items;
  }

  function prioritizedActions(): string[] {
    const actions: string[] = [];
    if (criticalVulns.length > 0) actions.push(`Patch ${criticalVulns.length} critical vulnerabilities — highest exposure risk`);
    const critInc = openIncidents.filter(i => i.severity === "critical");
    if (critInc.length > 0) actions.push(`Triage ${critInc.length} critical open incident(s) immediately`);
    if (activePaths.filter(p => p.severity === "critical").length > 0) actions.push(`Mitigate critical attack paths to reduce blast radius`);
    const unassigned = getUnassignedItems();
    if (unassigned.length > 0) actions.push(`Assign ownership: ${unassigned.join(", ")}`);
    if (vulnerablePkgs.length > 0) actions.push(`Update ${vulnerablePkgs.length} vulnerable packages in SBOM`);
    if (highVulns.length > 3) actions.push(`Schedule remediation sprint for ${highVulns.length} high-severity vulnerabilities`);
    return actions;
  }

  if (q.includes("help") || q.includes("what can you do") || q.includes("capabilities") || q.includes("how do i use")) {
    return `**ZyraCopilot — Your Security Command Center**\n\nI analyze your entire security environment in real time. Here's what I can help with:\n\n**Posture & Overview**\n• "What's my security posture?" — Live score with breakdown\n• "Give me a full overview" — Complete environment summary\n• "What should I prioritize?" — Ranked action items\n\n**Vulnerabilities**\n• "Show critical vulnerabilities" — Filtered by severity\n• "What's unpatched?" — Open remediation items\n• "Which assets are most exposed?" — Cross-referenced with attack paths\n\n**Incidents & Response**\n• "Show open incidents" — Active incident board\n• "What's my MTTR?" — Mean time to resolution\n• "Any unassigned incidents?" — Ownership gaps\n\n**Risk & Compliance**\n• "Top risks" — Sorted by risk score\n• "Unmitigated attack paths" — Active exploit chains\n• "SBOM health" — Supply chain analysis\n\n**Threat Intelligence**\n• "Active threats" — Current threat landscape\n• "CVE correlations" — Match CVEs to your assets\n\nI pull data live from your database — no stale snapshots. Ask me anything.`;
  }

  if (q.includes("posture") || (q.includes("score") && !q.includes("risk") && !q.includes("compliance") && !q.includes("attack")) || (q.includes("how") && q.includes("secure"))) {
    const score = computePostureScore();
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
    const trend = score >= 75 ? "Your posture is solid" : score >= 50 ? "Room for improvement" : "Immediate action required";
    return `**Security Posture — Live Score**\n\n🎯 **Score: ${score}/100 (Grade: ${grade})**\n${trend}\n\n**Score Breakdown:**\n• Critical vulns (−5 each): ${criticalVulns.length} → −${criticalVulns.length * 5}\n• High vulns (−2 each): ${highVulns.length} → −${highVulns.length * 2}\n• Critical incidents (−8 each): ${openIncidents.filter(i => i.severity === "critical").length} → −${openIncidents.filter(i => i.severity === "critical").length * 8}\n• Active attack paths (−6 each): ${activePaths.filter(p => p.severity === "critical").length} → −${activePaths.filter(p => p.severity === "critical").length * 6}\n• Critical risks (−4 each): ${criticalRisks.length} → −${criticalRisks.length * 4}\n• Vulnerable packages (−1 each): ${vulnerablePkgs.length} → −${vulnerablePkgs.length}\n\n**To improve your score:**\n${prioritizedActions().slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join("\n") || "No critical actions needed — maintain current practices."}`;
  }

  if (q.includes("priorit") || q.includes("what should i") || q.includes("action") || q.includes("recommend") || q.includes("next step") || q.includes("todo") || q.includes("to-do") || q.includes("what do i need")) {
    const actions = prioritizedActions();
    if (actions.length === 0) {
      return `**Prioritized Actions**\n\nNo critical actions required right now. Your environment looks well-maintained.\n\n**Maintenance recommendations:**\n1. Review risk register quarterly\n2. Run SBOM audit monthly\n3. Test incident response playbooks bi-weekly\n4. Schedule penetration testing within next 30 days`;
    }
    return `**ZyraCopilot — Prioritized Action Plan**\n\nBased on real-time analysis of your environment, here are your top priorities ranked by risk impact:\n\n${actions.map((a, i) => `**${i + 1}.** ${a}`).join("\n")}\n\n**Current posture score:** ${computePostureScore()}/100\n**Estimated score after remediation:** ${Math.min(100, computePostureScore() + actions.length * 5)}/100\n\nWant me to drill into any specific area?`;
  }

  if ((q.includes("mttr") || q.includes("mean time") || q.includes("resolution time") || q.includes("response time"))) {
    const mttr = getMttr();
    const resolved = incidents.filter(i => i.status === "resolved");
    const total = incidents.length;
    const resRate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;
    return `**Incident Response Metrics**\n\n• **Mean Time to Resolution (MTTR):** ${mttr}\n• **Total incidents:** ${total}\n• **Resolved:** ${resolved.length} (${resRate}%)\n• **Open:** ${openIncidents.length}\n• **Critical open:** ${openIncidents.filter(i => i.severity === "critical").length}\n\n**By severity:**\n• Critical: ${incidents.filter(i => i.severity === "critical").length} total, ${openIncidents.filter(i => i.severity === "critical").length} open\n• High: ${incidents.filter(i => i.severity === "high").length} total, ${openIncidents.filter(i => i.severity === "high").length} open\n• Medium: ${incidents.filter(i => i.severity === "medium").length} total\n• Low: ${incidents.filter(i => i.severity === "low").length} total\n\n${openIncidents.filter(i => !i.assignedTo).length > 0 ? `⚠️ ${openIncidents.filter(i => !i.assignedTo).length} open incidents are unassigned — assign them to reduce MTTR.` : "All open incidents have assignees — good ownership coverage."}`;
  }

  if (q.includes("unassigned") || q.includes("no owner") || q.includes("orphan") || q.includes("who owns")) {
    const unassignedInc = openIncidents.filter(i => !i.assignedTo);
    const unassignedRisks = risks.filter(r => !r.owner);
    const items: string[] = [];
    if (unassignedInc.length > 0) {
      items.push(`**Unassigned Incidents (${unassignedInc.length}):**\n${unassignedInc.slice(0, 5).map(i => `• **${i.title}** (${i.severity}) — Created ${new Date(i.createdAt).toLocaleDateString()}`).join("\n")}`);
    }
    if (unassignedRisks.length > 0) {
      items.push(`**Unassigned Risks (${unassignedRisks.length}):**\n${unassignedRisks.slice(0, 5).map(r => `• **${r.title}** — Score: ${r.riskScore}/25`).join("\n")}`);
    }
    if (items.length === 0) return `**Ownership Check**\n\nAll incidents and risks have assigned owners. Good governance.`;
    return `**Ownership Gaps**\n\n${items.join("\n\n")}\n\n**Recommendation:** Assign owners immediately. Unowned items have 3x longer resolution times on average.`;
  }

  if (q.includes("cloud") && (q.includes("vulnerabilit") || q.includes("affect") || q.includes("exposure") || q.includes("risk"))) {
    const cloudHostnames = cloudAssets.map(a => a.hostname);
    const relevant = criticalVulns.filter(v => v.affectedComponent && cloudHostnames.some(h => (v.affectedComponent || "").includes(h)));
    const byProvider: Record<string, number> = {};
    cloudAssets.forEach(a => { if (a.cloudProvider) byProvider[a.cloudProvider] = (byProvider[a.cloudProvider] || 0) + 1; });
    const providerBreakdown = Object.entries(byProvider).map(([p, c]) => `${p.toUpperCase()}: ${c}`).join(", ");
    if (relevant.length > 0) {
      return `**Cloud Exposure Analysis**\n\n**${relevant.length}** vulnerabilities directly impact your **${cloudAssets.length}** cloud assets (${providerBreakdown}):\n\n${relevant.slice(0, 5).map(v => `• **${v.title}** (${v.severity}) — ${v.affectedComponent || "Unknown"}\n  Remediation: Patch immediately, isolate affected workloads`).join("\n")}\n\n**Attack surface:** ${activePaths.filter(p => cloudAssets.some(a => p.entryPoint?.includes(a.hostname) || p.targetAsset?.includes(a.hostname))).length} attack paths traverse cloud assets.\n\n**Immediate actions:**\n1. Patch critical vulns on production cloud assets\n2. Review network segmentation between cloud tiers\n3. Verify cloud IAM policies and access controls`;
    }
    return `**Cloud Security Summary**\n\n**${cloudAssets.length} cloud assets** across ${providerBreakdown || "no providers detected"}.\n\nNo direct vulnerability matches to cloud hostnames, but **${criticalVulns.length} critical** and **${highVulns.length} high** vulns exist globally.\n\nRecommend running a cloud-specific scan to correlate assets with known CVEs.`;
  }

  if ((q.includes("vulnerabilit") || q.includes("vuln")) && (q.includes("critical") || q.includes("patch") || q.includes("unpatched") || q.includes("open") || q.includes("top") || q.includes("worst"))) {
    const target = criticalVulns.length > 0 ? criticalVulns : highVulns;
    const label = criticalVulns.length > 0 ? "Critical" : "High";
    return `**${label} Vulnerability Report (Live)**\n\n**${openVulns.length}** open vulnerabilities total:\n• Critical: **${criticalVulns.length}**\n• High: **${highVulns.length}**\n• Medium: ${openVulns.filter(v => v.severity === "medium").length}\n• Low: ${openVulns.filter(v => v.severity === "low").length}\n\n**Top ${label} Findings:**\n${target.slice(0, 5).map(v => `• **${v.title}** (${v.severity})\n  Component: ${v.affectedComponent || "—"} | Status: ${v.status}\n  → Remediation: ${v.remediation || "Apply vendor patch"}`).join("\n")}\n\n**Remediation strategy:**\n1. Patch critical vulns within 24 hours\n2. Schedule high vulns within 7 days\n3. Automate dependency scanning in CI/CD pipeline\n4. Enable automated SBOM correlation to catch new CVEs`;
  }

  if (q.includes("risk") && (q.includes("highest") || q.includes("top") || q.includes("critical") || q.includes("worst"))) {
    const sorted = [...risks].sort((a, b) => b.riskScore - a.riskScore);
    if (sorted.length === 0) return `**Risk Register**\n\nNo risks recorded yet. Consider running a risk assessment to establish your baseline.`;
    return `**Risk Analysis — Top Risks by Score**\n\n• **Critical (≥15):** ${criticalRisks.length}\n• **High (10-14):** ${highRisks.length}\n• **Total:** ${risks.length}\n\n**Top 5 Risks:**\n${sorted.slice(0, 5).map((r, i) => `${i + 1}. **${r.title}** — Score: ${r.riskScore}/25\n   Category: ${r.category} | Treatment: ${r.treatment} | Owner: ${r.owner || "⚠️ Unassigned"}`).join("\n")}\n\n**Mitigation guidance:**\n${criticalRisks.length > 0 ? `• Escalate ${criticalRisks.length} critical risks to leadership\n• Implement compensating controls for unmitigated risks\n• Review treatment plans bi-weekly until resolved` : "• No critical risks — maintain quarterly review cadence"}`;
  }

  if (q.includes("incident") && (q.includes("last week") || q.includes("recent") || q.includes("open") || q.includes("today") || q.includes("new"))) {
    const recentIncidents = incidents.filter(i => new Date(i.createdAt) > weekAgo);
    const todayIncidents = incidents.filter(i => new Date(i.createdAt) > dayAgo);
    return `**Incident Dashboard (Live)**\n\n**Last 24 hours:** ${todayIncidents.length} new\n**Last 7 days:** ${recentIncidents.length} new\n**Open now:** ${openIncidents.length} (${openIncidents.filter(i => i.severity === "critical").length} critical, ${openIncidents.filter(i => i.severity === "high").length} high)\n\n${openIncidents.length > 0 ? `**Open Incidents:**\n${openIncidents.slice(0, 6).map(i => `• **${i.title}** (${i.severity})\n  Status: ${i.status} | Assignee: ${i.assignedTo || "⚠️ Unassigned"} | Age: ${Math.round((now.getTime() - new Date(i.createdAt).getTime()) / 3600000)}h`).join("\n")}` : "No open incidents — all clear."}\n\n**MTTR:** ${getMttr()}\n\n${openIncidents.filter(i => !i.assignedTo).length > 0 ? `**Action needed:** ${openIncidents.filter(i => !i.assignedTo).length} unassigned incidents require immediate triage.` : "All incidents have assigned responders."}`;
  }

  if (q.includes("attack path") || q.includes("attack vector") || q.includes("kill chain") || q.includes("blast radius") || q.includes("lateral")) {
    if (activePaths.length === 0) return `**Attack Path Analysis**\n\nNo unmitigated attack paths detected. This means either:\n1. All known paths have been mitigated\n2. No attack paths have been modeled yet\n\nRecommend running attack path analysis from the Exposure Management page.`;
    const sorted = [...activePaths].sort((a, b) => b.riskScore - a.riskScore);
    return `**Attack Path Analysis (Live)**\n\n**${activePaths.length}** active (unmitigated) attack paths detected:\n\n${sorted.slice(0, 4).map((p, i) => `**${i + 1}. ${p.name}**\n   Risk Score: ${p.riskScore}/100 | Severity: ${p.severity}\n   Entry: ${p.entryPoint} → Target: ${p.targetAsset}\n   Steps: ${(p.steps as any[])?.length || "Unknown"} hops`).join("\n\n")}\n\n**Highest blast radius:** ${sorted[0]?.name} (score ${sorted[0]?.riskScore})\n\n**Mitigation priorities:**\n1. Break the highest-score path by hardening the entry point\n2. Segment networks between entry and target assets\n3. Deploy detection rules at each pivot point\n4. Run tabletop exercises on top 3 paths`;
  }

  if (q.includes("sbom") || q.includes("supply chain") || q.includes("package") || q.includes("dependenc") || q.includes("software bill")) {
    const ecosystems = [...new Set(sbom.map(s => s.ecosystem))];
    const totalCves = sbom.reduce((s, pkg) => s + (pkg.knownCves as string[]).length, 0);
    return `**SBOM & Supply Chain Analysis (Live)**\n\n**${sbom.length}** tracked packages across ${ecosystems.length} ecosystem(s): ${ecosystems.join(", ") || "none"}\n\n• **Vulnerable packages:** ${vulnerablePkgs.length}\n• **Total known CVEs:** ${totalCves}\n• **Vulnerability rate:** ${sbom.length > 0 ? Math.round((vulnerablePkgs.length / sbom.length) * 100) : 0}%\n\n${vulnerablePkgs.length > 0 ? `**Vulnerable Packages:**\n${vulnerablePkgs.slice(0, 5).map(p => `• **${p.packageName}@${p.packageVersion}** (${p.ecosystem})\n  CVEs: ${(p.knownCves as string[]).join(", ") || "see database"}`).join("\n")}\n\n**Actions:**\n1. Update vulnerable packages to patched versions\n2. Add automated dependency scanning to CI pipeline\n3. Review transitive dependencies for hidden risks\n4. Block vulnerable package versions in package registry` : "No vulnerable packages detected — excellent supply chain hygiene.\n\nMaintain this by running weekly SBOM scans and blocking known-bad versions at the registry level."}`;
  }

  if (q.includes("threat") || q.includes("cve") || q.includes("intel") || q.includes("threat landscape")) {
    const criticalCves = threatItems.filter(t => t.severity === "critical");
    const activeThreat = threatItems.filter(t => t.status === "active");
    return `**Threat Intelligence (Live)**\n\n**${threatItems.length}** tracked threat intelligence items:\n• Critical: **${criticalCves.length}**\n• High: ${threatItems.filter(t => t.severity === "high").length}\n• Active threats: **${activeThreat.length}**\n\n${criticalCves.length > 0 ? `**Critical Threats:**\n${criticalCves.slice(0, 4).map(t => `• **${t.cveId}** — ${t.title}\n  CVSS: ${t.cvssScore} | Status: ${t.status}\n  Affected: ${(t.affectedPackages as string[])?.join(", ") || "see advisory"}`).join("\n")}` : "No critical CVEs currently tracked."}\n\n**Correlation with your environment:**\n• ${vulnerablePkgs.length} of your SBOM packages match known CVEs\n• ${activePaths.length} attack paths could leverage active threats\n\n**Actions:** Cross-reference critical CVEs with your asset inventory and prioritize patching matched assets.`;
  }

  if (q.includes("asset") && (q.includes("exposed") || q.includes("internet") || q.includes("public") || q.includes("external"))) {
    const publicAssets = assets.filter(a => a.isPublicFacing);
    return `**Exposed Asset Analysis**\n\n**${publicAssets.length}** public-facing assets detected out of ${assets.length} total:\n\n${publicAssets.slice(0, 5).map(a => `• **${a.hostname}** (${a.assetType})\n  Criticality: ${a.criticality} | Cloud: ${a.cloudProvider || "on-prem"}\n  OS: ${a.operatingSystem || "—"}`).join("\n")}\n\n**Risk factors:**\n• ${activePaths.filter(p => publicAssets.some(a => p.entryPoint?.includes(a.hostname))).length} attack paths originate from public assets\n• ${criticalVulns.filter(v => publicAssets.some(a => v.affectedComponent?.includes(a.hostname))).length} critical vulns affect public assets\n\n**Hardening steps:**\n1. Verify WAF/CDN protection on all public endpoints\n2. Restrict unnecessary open ports\n3. Enable DDoS protection\n4. Schedule quarterly external penetration tests`;
  }

  if (q.includes("compliance") || q.includes("audit") || q.includes("framework") || q.includes("regulation") || q.includes("nist") || q.includes("iso") || q.includes("soc")) {
    const score = computePostureScore();
    return `**Compliance Readiness Assessment**\n\nBased on your current security posture (score: ${score}/100):\n\n**Key Metrics:**\n• Open vulnerabilities: ${openVulns.length}\n• Mean time to resolution: ${getMttr()}\n• Risk items tracked: ${risks.length}\n• SBOM coverage: ${sbom.length} packages\n• Attack paths modeled: ${paths.length}\n\n**Framework Alignment:**\n• Vulnerability management: ${criticalVulns.length === 0 ? "✓ No critical vulns" : `⚠️ ${criticalVulns.length} critical vulns outstanding`}\n• Incident response: ${openIncidents.length <= 3 ? "✓ Manageable incident queue" : `⚠️ ${openIncidents.length} open incidents`}\n• Risk management: ${risks.length > 0 ? "✓ Risk register active" : "⚠️ No risks documented"}\n• Asset inventory: ${assets.length > 0 ? "✓ Asset tracking active" : "⚠️ No assets inventoried"}\n• Supply chain: ${sbom.length > 0 ? "✓ SBOM maintained" : "⚠️ No SBOM data"}\n\n**Gaps to address before audit:**\n${criticalVulns.length > 0 ? `1. Remediate ${criticalVulns.length} critical vulnerabilities\n` : ""}${openIncidents.filter(i => !i.assignedTo).length > 0 ? `2. Assign all open incidents\n` : ""}${risks.filter(r => !r.owner).length > 0 ? `3. Assign owners to all risks\n` : ""}`;
  }

  if (q.includes("trend") || q.includes("getting better") || q.includes("getting worse") || q.includes("over time") || q.includes("progress")) {
    const recentInc = incidents.filter(i => new Date(i.createdAt) > monthAgo);
    const recentVulns = vulns.filter(v => new Date(v.createdAt) > monthAgo);
    const resolvedRecently = incidents.filter(i => i.status === "resolved" && i.resolvedAt && new Date(i.resolvedAt) > monthAgo);
    return `**30-Day Trend Analysis**\n\n**Incidents:**\n• New this month: ${recentInc.length}\n• Resolved this month: ${resolvedRecently.length}\n• Net change: ${resolvedRecently.length - recentInc.length >= 0 ? "+" : ""}${resolvedRecently.length - recentInc.length}\n• ${resolvedRecently.length >= recentInc.length ? "✓ Resolving faster than creating — positive trend" : "⚠️ Creating faster than resolving — backlog growing"}\n\n**Vulnerabilities:**\n• New this month: ${recentVulns.length}\n• Total open: ${openVulns.length}\n\n**Current posture score:** ${computePostureScore()}/100\n\n**Assessment:** ${computePostureScore() >= 75 ? "Your security posture is strong. Maintain current practices and focus on continuous improvement." : computePostureScore() >= 50 ? "Your posture needs attention. Focus on the top 3 prioritized actions to see improvement." : "Critical attention needed. Multiple high-impact items require immediate remediation."}`;
  }

  const score = computePostureScore();
  const totalOpen = criticalVulns.length + highVulns.length;
  const actions = prioritizedActions();
  return `**ZyraCopilot — Environment Overview (Live)**\n\n🎯 **Posture Score: ${score}/100**\n\n**Real-Time Metrics:**\n• **Assets:** ${assets.length} tracked (${cloudAssets.length} cloud, ${assets.filter(a => a.isPublicFacing).length} public-facing)\n• **Vulnerabilities:** ${openVulns.length} open (${criticalVulns.length} critical, ${highVulns.length} high)\n• **Incidents:** ${openIncidents.length} open (${openIncidents.filter(i => i.severity === "critical").length} critical)\n• **Attack paths:** ${activePaths.length} unmitigated\n• **Risks:** ${risks.length} registered (${criticalRisks.length} critical)\n• **SBOM:** ${sbom.length} packages (${vulnerablePkgs.length} vulnerable)\n• **MTTR:** ${getMttr()}\n\n${actions.length > 0 ? `**Top Actions:**\n${actions.slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join("\n")}` : "✓ No critical actions needed."}\n\n${totalOpen > 5 ? `⚠️ **Alert:** ${totalOpen} critical/high vulnerabilities require immediate attention.` : totalOpen > 0 ? `${totalOpen} critical/high vulnerabilities to address this sprint.` : "✓ No critical or high vulnerabilities open."}\n\nAsk me about specific areas — vulnerabilities, incidents, risks, attack paths, compliance, or trends.`;
}
