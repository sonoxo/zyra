import { storage } from "./storage";
import { type PentestSession, type CloudScanTarget, type ThreatIntelItem } from "@shared/schema";

export async function runPentestSimulation(sessionId: string, orgId: string, testTypes: string[]) {
  const findingTemplates: Record<string, Array<{ title: string; description: string; severity: string; payload: string; evidence: string; cvssScore: number; remediationSteps: string }>> = {
    sql_injection: [
      { title: "SQL Injection in Login Form", description: "The login form is vulnerable to SQL injection via the username field, allowing authentication bypass.", severity: "critical", payload: "' OR 1=1 --", evidence: "Server returned 200 OK with admin session cookie when payload was injected.", cvssScore: 9.8, remediationSteps: "Use parameterized queries and input validation on all user-supplied fields." },
    ],
    xss: [
      { title: "Reflected XSS in Search Parameter", description: "The search endpoint reflects user input without sanitization, enabling script injection.", severity: "high", payload: "<script>alert(document.cookie)</script>", evidence: "Injected script was executed in browser context, confirmed via alert popup.", cvssScore: 7.5, remediationSteps: "Apply context-aware output encoding. Use CSP headers to mitigate impact." },
    ],
    auth_bypass: [
      { title: "JWT Token Manipulation", description: "The application accepts JWT tokens signed with the 'none' algorithm, allowing token forgery.", severity: "critical", payload: "eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ.", evidence: "Forged token granted admin access without valid signature.", cvssScore: 9.5, remediationSteps: "Enforce algorithm validation in JWT verification. Reject 'none' algorithm." },
    ],
    ssrf: [
      { title: "SSRF via URL Parameter", description: "Internal services are accessible by manipulating the URL parameter to point to internal addresses.", severity: "high", payload: "http://169.254.169.254/latest/meta-data/", evidence: "AWS metadata endpoint returned IAM role credentials.", cvssScore: 8.2, remediationSteps: "Validate and whitelist allowed URL schemes and hosts. Block internal IP ranges." },
    ],
    directory_traversal: [
      { title: "Path Traversal in File Download", description: "The file download endpoint allows directory traversal to access arbitrary system files.", severity: "high", payload: "../../../../etc/passwd", evidence: "Contents of /etc/passwd returned in response body.", cvssScore: 7.8, remediationSteps: "Normalize file paths and validate against a whitelist of allowed directories." },
    ],
  };

  for (const type of testTypes) {
    const templates = findingTemplates[type];
    if (templates) {
      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        await storage.createPentestFinding({
          sessionId,
          organizationId: orgId,
          testType: type,
          severity: t.severity,
          title: t.title,
          description: t.description,
          payload: t.payload,
          responseSnippet: t.evidence,
          evidence: t.evidence,
          cvssScore: t.cvssScore,
          remediationSteps: t.remediationSteps,
          status: "open"
        });
      }
    }
  }

  const findings = await storage.getPentestFindings(sessionId);
  const summary = {
    totalTests: testTypes.length,
    findingsCount: findings.length,
    criticalCount: findings.filter(f => f.severity === "critical").length,
    highCount: findings.filter(f => f.severity === "high").length
  };

  await storage.updatePentestSession(sessionId, {
    status: "completed",
    completedAt: new Date(),
    summary
  });
}

export async function runCloudScanSimulation(targetId: string, orgId: string, provider: string) {
  const findings = [
    { checkName: "Public S3 Bucket", category: "Storage", severity: "high", resourceType: "Bucket", description: "Bucket is publicly accessible", recommendation: "Remove public access" },
    { checkName: "Unencrypted EBS Volume", category: "Storage", severity: "medium", resourceType: "Volume", description: "EBS volume is not encrypted", recommendation: "Enable encryption" },
    { checkName: "Overly Permissive IAM Policy", category: "IAM", severity: "critical", resourceType: "Role", description: "Role has AdministratorAccess", recommendation: "Apply least privilege" },
    { checkName: "Logging Disabled", category: "Logging", severity: "low", resourceType: "CloudTrail", description: "CloudTrail is disabled in region", recommendation: "Enable CloudTrail" },
    { checkName: "Exposed SSH Port", category: "Network", severity: "high", resourceType: "SecurityGroup", description: "SSH port (22) is open to 0.0.0.0/0", recommendation: "Restrict SSH access" }
  ];

  for (const f of findings) {
    await storage.createCloudScanResult({
      targetId,
      organizationId: orgId,
      checkName: f.checkName,
      category: f.category,
      severity: f.severity,
      resourceId: `${provider}-${f.resourceType.toLowerCase()}-1`,
      resourceType: f.resourceType,
      description: f.description,
      recommendation: f.recommendation,
      status: "open"
    });
  }

  await storage.updateCloudScanTarget(targetId, { lastScannedAt: new Date() });
}

export async function refreshThreatIntel(orgId: string) {
  const existing = await storage.getThreatIntelItems(orgId);
  if (existing.length > 0) return;

  const knownThreats = [
    { cveId: "CVE-2021-44228", title: "Log4Shell RCE in Apache Log4j", severity: "critical", cvssScore: 10.0, pkg: "log4j-core", publishedAt: "2021-12-10T00:00:00Z" },
    { cveId: "CVE-2024-3094", title: "XZ Utils Supply Chain Backdoor", severity: "critical", cvssScore: 10.0, pkg: "xz-utils", publishedAt: "2024-03-29T00:00:00Z" },
    { cveId: "CVE-2023-44487", title: "HTTP/2 Rapid Reset DDoS Attack", severity: "high", cvssScore: 7.5, pkg: "nodejs", publishedAt: "2023-10-10T00:00:00Z" },
    { cveId: "CVE-2022-22965", title: "Spring4Shell RCE", severity: "critical", cvssScore: 9.8, pkg: "spring-webmvc", publishedAt: "2022-03-31T00:00:00Z" },
    { cveId: "CVE-2023-38545", title: "curl SOCKS5 Heap Overflow", severity: "critical", cvssScore: 9.8, pkg: "curl", publishedAt: "2023-10-11T00:00:00Z" },
  ];

  for (const t of knownThreats) {
    await storage.createThreatIntelItem({
      organizationId: orgId,
      cveId: t.cveId,
      title: t.title,
      severity: t.severity,
      cvssScore: t.cvssScore,
      description: `${t.title} — affects ${t.pkg}. See NVD for full details.`,
      affectedPackages: [t.pkg],
      affectedVersions: ["see advisory"],
      patchedVersions: ["see advisory"],
      publishedAt: new Date(t.publishedAt),
      source: "nvd",
      status: "active"
    });
  }
}
