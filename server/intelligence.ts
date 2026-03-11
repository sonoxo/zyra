import { storage } from "./storage";

const CVE_DATABASE = [
  { cveId: "CVE-2021-44228", title: "Log4Shell - Apache Log4j RCE", severity: "critical", cvssScore: 10.0, affectedPackages: ["log4j-core", "log4j-api"], affectedVersions: ["2.0-beta9 to 2.14.1"], patchedVersions: ["2.15.0+"], description: "Apache Log4j2 JNDI features do not protect against attacker-controlled LDAP and other endpoints, enabling RCE.", source: "nvd" },
  { cveId: "CVE-2022-22965", title: "Spring4Shell - Spring Framework RCE", severity: "critical", cvssScore: 9.8, affectedPackages: ["spring-webmvc", "spring-webflux"], affectedVersions: ["5.3.0-5.3.17", "5.2.0-5.2.19"], patchedVersions: ["5.3.18+", "5.2.20+"], description: "Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution.", source: "nvd" },
  { cveId: "CVE-2023-44487", title: "HTTP/2 Rapid Reset Attack", severity: "high", cvssScore: 7.5, affectedPackages: ["nodejs", "nginx", "apache2"], affectedVersions: ["multiple"], patchedVersions: ["patched versions vary"], description: "Exploitation of the HTTP/2 protocol allows a denial-of-service attack via rapid request cancellation.", source: "nvd" },
  { cveId: "CVE-2024-3094", title: "XZ Utils Backdoor", severity: "critical", cvssScore: 10.0, affectedPackages: ["xz-utils", "liblzma"], affectedVersions: ["5.6.0", "5.6.1"], patchedVersions: ["5.4.6+"], description: "Malicious code introduced in xz Utils versions 5.6.0 and 5.6.1 could allow unauthorized access.", source: "nvd" },
  { cveId: "CVE-2023-38545", title: "curl SOCKS5 Heap Buffer Overflow", severity: "critical", cvssScore: 9.8, affectedPackages: ["curl", "libcurl"], affectedVersions: ["7.69.0-8.3.0"], patchedVersions: ["8.4.0+"], description: "Heap-based buffer overflow in the SOCKS5 proxy handshake could allow heap corruption.", source: "nvd" },
  { cveId: "CVE-2022-3786", title: "OpenSSL X.509 Email Address Buffer Overflow", severity: "high", cvssScore: 7.5, affectedPackages: ["openssl"], affectedVersions: ["3.0.0-3.0.6"], patchedVersions: ["3.0.7+"], description: "X.509 certificate verification, particularly of wildcard names, contains a buffer overrun.", source: "nvd" },
  { cveId: "CVE-2023-0286", title: "OpenSSL X.509 GeneralName Type Confusion", severity: "high", cvssScore: 7.4, affectedPackages: ["openssl"], affectedVersions: ["1.0.2-3.0.7"], patchedVersions: ["1.0.2zg+", "1.1.1t+", "3.0.8+"], description: "Type confusion vulnerability allows attackers to read memory contents or denial-of-service.", source: "nvd" },
  { cveId: "CVE-2021-3156", title: "Sudo Heap-Based Buffer Overflow (Baron Samedit)", severity: "high", cvssScore: 7.8, affectedPackages: ["sudo"], affectedVersions: ["1.8.2-1.8.31p2", "1.9.0-1.9.5p1"], patchedVersions: ["1.9.5p2+"], description: "Buffer overflow in Sudo's argument parsing allows privilege escalation to root.", source: "nvd" },
  { cveId: "CVE-2022-1292", title: "OpenSSL c_rehash Shell Command Injection", severity: "critical", cvssScore: 9.8, affectedPackages: ["openssl"], affectedVersions: ["1.0.2-3.0.2"], patchedVersions: ["1.0.2ze+", "1.1.1o+", "3.0.3+"], description: "The c_rehash script does not properly sanitize shell meta characters, allowing code injection.", source: "nvd" },
  { cveId: "CVE-2023-46604", title: "Apache ActiveMQ RCE", severity: "critical", cvssScore: 10.0, affectedPackages: ["activemq"], affectedVersions: ["5.15.15", "5.16.6", "5.17.4", "5.18.2"], patchedVersions: ["5.15.16+", "5.16.7+", "5.17.6+", "5.18.3+"], description: "Remote code execution vulnerability in Apache ActiveMQ's OpenWire protocol implementation.", source: "nvd" },
  { cveId: "CVE-2023-35708", title: "MOVEit Transfer SQL Injection", severity: "critical", cvssScore: 9.8, affectedPackages: ["moveit-transfer"], affectedVersions: ["< 2023.0.2"], patchedVersions: ["2023.0.2+"], description: "SQL injection vulnerability allows unauthenticated attackers to gain elevated access.", source: "nvd" },
  { cveId: "CVE-2024-21413", title: "Microsoft Outlook RCE", severity: "critical", cvssScore: 9.8, affectedPackages: ["microsoft-outlook"], affectedVersions: ["multiple"], patchedVersions: ["February 2024 Patch"], description: "Remote code execution vulnerability allowing attackers to bypass Outlook protected view.", source: "nvd" },
  { cveId: "CVE-2023-4863", title: "WebP Heap Buffer Overflow", severity: "critical", cvssScore: 8.8, affectedPackages: ["libwebp", "chromium", "electron"], affectedVersions: ["< 1.3.2"], patchedVersions: ["1.3.2+"], description: "Heap buffer overflow in WebP in Google Chrome allowed a remote attacker to perform an OOB memory write.", source: "nvd" },
  { cveId: "CVE-2024-6387", title: "OpenSSH regreSSHion RCE", severity: "critical", cvssScore: 8.1, affectedPackages: ["openssh"], affectedVersions: ["8.5p1-9.7p1"], patchedVersions: ["9.8p1+"], description: "Signal handler race condition in OpenSSH server (sshd) allows unauthenticated RCE as root.", source: "nvd" },
  { cveId: "CVE-2022-0847", title: "Dirty Pipe Linux Kernel Privilege Escalation", severity: "high", cvssScore: 7.8, affectedPackages: ["linux-kernel"], affectedVersions: ["5.8-5.16.10"], patchedVersions: ["5.16.11+", "5.15.25+", "5.10.102+"], description: "Privilege escalation vulnerability in the Linux kernel's pipe subsystem.", source: "nvd" },
];

const ATTACK_PATH_TEMPLATES = [
  {
    name: "Public Web App → RCE → Database Exfiltration",
    description: "Attacker exploits a vulnerable dependency in the public-facing web application to achieve remote code execution, then pivots to the database.",
    entryPoint: "Public Web Application",
    targetAsset: "Production Database",
    severity: "critical",
    riskScore: 95,
    steps: [
      { order: 1, node: "Public Web App", description: "Entry point via internet-exposed web application", type: "entry", risk: "high" },
      { order: 2, node: "Vulnerable Dependency (Log4j)", description: "Exploit CVE-2021-44228 Log4Shell RCE via user-supplied input", type: "exploit", risk: "critical" },
      { order: 3, node: "Application Server", description: "Code execution achieved on application server process", type: "compromise", risk: "critical" },
      { order: 4, node: "Internal Network", description: "Lateral movement via compromised app server credentials", type: "lateral", risk: "high" },
      { order: 5, node: "Production Database", description: "Database credentials extracted; full data exfiltration possible", type: "target", risk: "critical" },
    ],
  },
  {
    name: "Supply Chain → Container Escape → Host Takeover",
    description: "Malicious package introduced in build pipeline infects container image, enabling container escape to the underlying host.",
    entryPoint: "NPM/PyPI Package Registry",
    targetAsset: "Kubernetes Node",
    severity: "critical",
    riskScore: 88,
    steps: [
      { order: 1, node: "Package Registry", description: "Malicious package published to public registry (typosquatting)", type: "entry", risk: "medium" },
      { order: 2, node: "CI/CD Pipeline", description: "Malicious package pulled during npm install in build stage", type: "supply-chain", risk: "high" },
      { order: 3, node: "Container Image", description: "Backdoored container image pushed to registry", type: "persistence", risk: "high" },
      { order: 4, node: "Running Container", description: "Malicious code executes inside production container", type: "compromise", risk: "critical" },
      { order: 5, node: "Kubernetes Node", description: "Container escape via privileged mount or kernel exploit", type: "target", risk: "critical" },
    ],
  },
  {
    name: "Phishing → Credential Theft → Cloud Account Takeover",
    description: "Employee targeted via spear phishing, credentials harvested, used to access cloud management console.",
    entryPoint: "Employee Email",
    targetAsset: "AWS Management Console",
    severity: "high",
    riskScore: 78,
    steps: [
      { order: 1, node: "Phishing Email", description: "Targeted phishing email sent to developer with AWS access", type: "entry", risk: "medium" },
      { order: 2, node: "Credential Harvest Page", description: "Employee submits credentials to convincing fake login page", type: "exploit", risk: "high" },
      { order: 3, node: "Developer Laptop", description: "Session cookie stolen or MFA bypass via real-time phishing kit", type: "compromise", risk: "high" },
      { order: 4, node: "AWS IAM Credentials", description: "Access keys found in browser history / environment variables", type: "lateral", risk: "critical" },
      { order: 5, node: "AWS Management Console", description: "Full cloud account takeover; S3 data exfiltration and resource abuse", type: "target", risk: "critical" },
    ],
  },
  {
    name: "Exposed API Key → Service Account Abuse → Data Breach",
    description: "Hardcoded API key discovered in public repository grants access to production services.",
    entryPoint: "GitHub Public Repository",
    targetAsset: "Customer Data Store",
    severity: "high",
    riskScore: 72,
    steps: [
      { order: 1, node: "Public GitHub Repository", description: "Hardcoded API key committed and pushed to public repo", type: "entry", risk: "high" },
      { order: 2, node: "API Gateway", description: "Attacker authenticates to production API using stolen key", type: "exploit", risk: "high" },
      { order: 3, node: "Internal Service Mesh", description: "Service-to-service calls made using compromised service account", type: "lateral", risk: "high" },
      { order: 4, node: "Customer Data Store", description: "Bulk export of PII data via authenticated API endpoints", type: "target", risk: "critical" },
    ],
  },
  {
    name: "SSRF → Internal Metadata → IAM Privilege Escalation",
    description: "Server-side request forgery vulnerability used to access cloud metadata service and escalate privileges.",
    entryPoint: "Vulnerable Web Application",
    targetAsset: "Cloud IAM Root Access",
    severity: "critical",
    riskScore: 85,
    steps: [
      { order: 1, node: "Web Application Input", description: "SSRF vulnerability in URL fetch functionality", type: "entry", risk: "medium" },
      { order: 2, node: "Internal HTTP Request", description: "Attacker crafts request to 169.254.169.254 (AWS metadata)", type: "exploit", risk: "high" },
      { order: 3, node: "Instance Metadata Service", description: "IAM role credentials retrieved from metadata endpoint", type: "compromise", risk: "critical" },
      { order: 4, node: "AWS IAM", description: "Temporary credentials used to enumerate and escalate permissions", type: "lateral", risk: "critical" },
      { order: 5, node: "Cloud IAM Root Access", description: "Full administrative access to cloud environment achieved", type: "target", risk: "critical" },
    ],
  },
];

const ASSET_SEEDS = [
  { hostname: "web-prod-01", ip: "10.0.1.10", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Ubuntu 22.04", criticality: "critical", owner: "Platform Team", tags: ["web", "load-balanced", "public"] },
  { hostname: "api-prod-01", ip: "10.0.1.20", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Ubuntu 22.04", criticality: "critical", owner: "Backend Team", tags: ["api", "internal"] },
  { hostname: "db-prod-01", ip: "10.0.2.10", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Amazon Linux 2", criticality: "critical", owner: "Data Team", tags: ["database", "postgres", "encrypted"] },
  { hostname: "k8s-node-01", ip: "10.0.1.30", cloudProvider: "aws", assetType: "container", environment: "production", region: "us-east-1", os: "Bottlerocket", criticality: "high", owner: "DevOps Team", tags: ["kubernetes", "eks"] },
  { hostname: "k8s-node-02", ip: "10.0.1.31", cloudProvider: "aws", assetType: "container", environment: "production", region: "us-east-1", os: "Bottlerocket", criticality: "high", owner: "DevOps Team", tags: ["kubernetes", "eks"] },
  { hostname: "ci-runner-01", ip: "10.0.3.10", cloudProvider: "aws", assetType: "server", environment: "staging", region: "us-east-1", os: "Ubuntu 20.04", criticality: "medium", owner: "DevOps Team", tags: ["ci-cd", "github-actions"] },
  { hostname: "cache-prod-01", ip: "10.0.2.20", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Amazon Linux 2", criticality: "medium", owner: "Backend Team", tags: ["redis", "cache"] },
  { hostname: "app.example.com", ip: "52.20.44.100", cloudProvider: null, assetType: "domain", environment: "production", region: null, os: null, criticality: "critical", owner: "Platform Team", tags: ["public", "domain", "ssl"] },
  { hostname: "api.example.com", ip: "52.20.44.101", cloudProvider: null, assetType: "domain", environment: "production", region: null, os: null, criticality: "high", owner: "Backend Team", tags: ["public", "api", "ssl"] },
  { hostname: "github.com/org/backend", ip: null, cloudProvider: null, assetType: "repository", environment: "development", region: null, os: null, criticality: "high", owner: "Backend Team", tags: ["source-code", "node", "private"] },
  { hostname: "github.com/org/frontend", ip: null, cloudProvider: null, assetType: "repository", environment: "development", region: null, os: null, criticality: "medium", owner: "Frontend Team", tags: ["source-code", "react", "private"] },
  { hostname: "monitoring-prod-01", ip: "10.0.3.20", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Ubuntu 22.04", criticality: "medium", owner: "SRE Team", tags: ["monitoring", "prometheus", "grafana"] },
];

export async function seedIntelligenceData(orgId: string) {
  const existingAssets = await storage.getAssets(orgId);
  if (existingAssets.length === 0) {
    for (const seed of ASSET_SEEDS) {
      await storage.createAsset({
        organizationId: orgId,
        ...seed,
        vulnerabilityCount: Math.floor(Math.random() * 8),
        cveCount: Math.floor(Math.random() * 4),
      } as any);
    }
  }

  const existingPaths = await storage.getAttackPaths(orgId);
  if (existingPaths.length === 0) {
    for (const template of ATTACK_PATH_TEMPLATES) {
      await storage.createAttackPath({
        organizationId: orgId,
        ...template,
        steps: template.steps,
      } as any);
    }
  }
}

export async function fetchCveDatabase(orgId: string) {
  const sbomItems = await storage.getSbomItems(orgId);
  const containerFindings = await storage.getContainerScans(orgId);
  const vulnPackages = new Set(sbomItems.filter(i => i.isVulnerable).map(i => i.packageName.toLowerCase()));

  return CVE_DATABASE.map(cve => ({
    ...cve,
    publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    affectedInEnvironment: cve.affectedPackages.some(pkg =>
      vulnPackages.has(pkg.toLowerCase()) ||
      sbomItems.some(s => s.packageName.toLowerCase().includes(pkg.toLowerCase()))
    ),
    relatedSbomCount: sbomItems.filter(s =>
      cve.affectedPackages.some(pkg => s.packageName.toLowerCase().includes(pkg.toLowerCase()))
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
    const cve = CVE_DATABASE.find(c => c.cveId.toLowerCase().includes(cveId.toLowerCase()));
    if (cve) {
      results.push({ type: "cve", source: "CVE Database", title: cve.title, id: cve.cveId, severity: cve.severity, detail: cve.description });
    }
    const sbomItems = await storage.getSbomItems(orgId);
    const matchedSbom = sbomItems.filter(s =>
      cve ? cve.affectedPackages.some(p => s.packageName.toLowerCase().includes(p)) : false
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

export async function runSecurityCopilot(question: string, orgId: string): Promise<string> {
  const q = question.toLowerCase();

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
  const openIncidents = incidents.filter(i => i.status !== "resolved" && i.status !== "closed");
  const criticalRisks = risks.filter(r => r.riskScore >= 15);
  const cloudAssets = assets.filter(a => a.cloudProvider);
  const activePaths = paths.filter(p => !p.mitigated);

  if (q.includes("cloud") && (q.includes("vulnerabilit") || q.includes("affect"))) {
    const cloudHostnames = cloudAssets.map(a => a.hostname);
    const relevant = criticalVulns.filter(v => v.affectedComponent && cloudHostnames.some(h => (v.affectedComponent || "").includes(h)));
    if (relevant.length > 0) {
      return `**Cloud Asset Vulnerabilities**\n\nI found **${relevant.length}** vulnerabilities directly affecting your ${cloudAssets.length} cloud assets:\n\n${relevant.slice(0, 5).map(v => `• **${v.title}** (${v.severity}) — ${v.affectedComponent || "Unknown component"}`).join("\n")}\n\nYour cloud environment spans ${cloudAssets.filter(a => a.cloudProvider === "aws").length} AWS, ${cloudAssets.filter(a => a.cloudProvider === "azure").length} Azure, and ${cloudAssets.filter(a => a.cloudProvider === "gcp").length} GCP assets. I recommend prioritizing remediation of critical findings on production assets first.`;
    }
    return `**Cloud Asset Summary**\n\nYour inventory contains **${cloudAssets.length} cloud assets** across ${[...new Set(cloudAssets.map(a => a.cloudProvider))].filter(Boolean).join(", ")}.\n\nCurrently there are **${criticalVulns.length} critical** and **${highVulns.length} high** open vulnerabilities across all assets. Use Asset Inventory to filter by cloud provider for detailed breakdown.`;
  }

  if (q.includes("risk") && (q.includes("highest") || q.includes("top") || q.includes("critical"))) {
    if (criticalRisks.length > 0) {
      return `**Top Critical Risks**\n\nYou have **${criticalRisks.length}** critical risks (score ≥ 15) requiring immediate attention:\n\n${criticalRisks.slice(0, 5).map(r => `• **${r.title}** — Score: ${r.riskScore}/25, Treatment: ${r.treatment}, Owner: ${r.owner || "Unassigned"}`).join("\n")}\n\n**Recommendation:** Focus on risks in the "${criticalRisks[0]?.category || "technical"}" category first. Consider scheduling a risk review sprint within the next 2 weeks.`;
    }
    return `**Risk Assessment**\n\nNo critical risks (score ≥ 15) found. Your current risk register has **${risks.length}** total risks with an average score of ${risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length) : 0}/25.\n\nThis is a good sign — continue monitoring and reviewing quarterly.`;
  }

  if (q.includes("incident") && (q.includes("last week") || q.includes("recent") || q.includes("open"))) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentIncidents = incidents.filter(i => new Date(i.createdAt) > weekAgo);
    if (recentIncidents.length > 0) {
      return `**Recent Incident Summary (Last 7 Days)**\n\nThere are **${recentIncidents.length}** incidents from the past week:\n\n${recentIncidents.slice(0, 5).map(i => `• **${i.title}** (${i.severity}) — Status: ${i.status}, Assigned to: ${i.assignedTo || "Unassigned"}`).join("\n")}\n\n**Open incidents:** ${openIncidents.length}\n**Critical open:** ${openIncidents.filter(i => i.severity === "critical").length}\n\nRecommend triaging unassigned incidents immediately.`;
    }
    return `**Incident Report**\n\nNo new incidents created in the last 7 days — excellent.\n\n**Overall:** ${openIncidents.length} open incident(s) total, ${openIncidents.filter(i => i.severity === "critical").length} critical. Your team has resolved ${incidents.filter(i => i.status === "resolved").length} incidents historically.`;
  }

  if (q.includes("attack path") || q.includes("attack vector")) {
    return `**Attack Path Analysis**\n\nI've identified **${activePaths.length}** active attack paths in your environment:\n\n${activePaths.slice(0, 3).map(p => `• **${p.name}** (Risk Score: ${p.riskScore}/100)\n  Entry: ${p.entryPoint} → Target: ${p.targetAsset}`).join("\n\n")}\n\n**Highest priority:** ${activePaths[0]?.name || "None"} with a risk score of ${activePaths[0]?.riskScore ?? 0}.\n\nVisit the Attack Path Modeling page for visual graph representations and mitigation guidance.`;
  }

  if (q.includes("sbom") || q.includes("supply chain") || q.includes("package") || q.includes("dependenc")) {
    const vulnerablePkgs = sbom.filter(s => s.isVulnerable);
    return `**Supply Chain & SBOM**\n\nYour software bill of materials contains **${sbom.length}** packages:\n\n• **Vulnerable packages:** ${vulnerablePkgs.length}\n• **Ecosystems:** ${[...new Set(sbom.map(s => s.ecosystem))].join(", ")}\n• **Known CVEs across packages:** ${sbom.reduce((s, pkg) => s + (pkg.knownCves as string[]).length, 0)}\n\n${vulnerablePkgs.length > 0 ? `Top vulnerable: ${vulnerablePkgs.slice(0, 3).map(p => `${p.packageName}@${p.packageVersion}`).join(", ")}\n\nRecommend updating these packages immediately.` : "No vulnerable packages detected — great hygiene!"}`;
  }

  if (q.includes("threat") || q.includes("cve") || q.includes("intel")) {
    const criticalCves = threatItems.filter(t => t.severity === "critical");
    return `**Threat Intelligence Summary**\n\nCurrently tracking **${threatItems.length}** threat intelligence items:\n\n• **Critical CVEs:** ${criticalCves.length}\n• **High severity:** ${threatItems.filter(t => t.severity === "high").length}\n• **Active threats:** ${threatItems.filter(t => t.status === "active").length}\n\n${criticalCves.length > 0 ? `Most critical: **${criticalCves[0]?.cveId}** — ${criticalCves[0]?.title}\nCVSS Score: ${criticalCves[0]?.cvssScore}` : "No critical CVEs currently tracked."}\n\nVisit the CVE Intelligence page for full database with SBOM correlation.`;
  }

  const totalOpen = criticalVulns.length + highVulns.length;
  return `**Security Overview**\n\nHere's a summary of your current security posture:\n\n• **Assets tracked:** ${assets.length} (${cloudAssets.length} cloud)\n• **Open vulnerabilities:** ${vulns.filter(v => v.status !== "resolved").length} (${criticalVulns.length} critical, ${highVulns.length} high)\n• **Open incidents:** ${openIncidents.length}\n• **Active attack paths:** ${activePaths.length}\n• **Risk items:** ${risks.length} (${criticalRisks.length} critical)\n\n${totalOpen > 5 ? `⚠️ You have ${totalOpen} critical/high vulnerabilities requiring immediate attention.` : totalOpen > 0 ? `You have ${totalOpen} critical/high vulnerabilities to address.` : "✓ No critical or high vulnerabilities currently open."}\n\nFor detailed analysis, try asking about specific areas like cloud assets, attack paths, or recent incidents.`;
}
