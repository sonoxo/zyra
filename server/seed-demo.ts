import { db } from "./db";
import { storage } from "./storage";
import {
  repositories, scans, scanFindings, complianceMappings, reports,
  pentestSessions, pentestFindings, cloudScanTargets, cloudScanResults,
  threatIntelItems, incidents, vulnerabilities, sbomItems, secretsFindings,
  risks, attackSurfaceAssets, postureScores, darkWebAlerts, vendors,
  trainingRecords, phishingCampaigns, bountyReports, containerScans,
  containerFindings, assetInventory, attackPaths, securityEvents,
  soarPlaybooks, soarExecutions, graphNodes, graphEdges, pipelineConfigs,
  alertRules, remediationTasks, monitoringConfigs, tasks,
} from "@shared/schema";
import { eq, count } from "drizzle-orm";

export async function seedDemoData(orgId: string, userId: string): Promise<{ seeded: string[] }> {
  const seeded: string[] = [];

  const [repoCheck] = await db.select({ c: count() }).from(repositories).where(eq(repositories.organizationId, orgId));
  if (repoCheck.c > 0) return { seeded: ["already_seeded"] };

  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000);
  const agoH = (hours: number) => new Date(now.getTime() - hours * 3600000);

  // ── Repositories ──
  const [repo1] = await db.insert(repositories).values([
    { organizationId: orgId, name: "api-gateway", fullName: "xunia/api-gateway", provider: "github" as const, url: "https://github.com/xunia/api-gateway", branch: "main", lastScannedAt: ago(1) },
    { organizationId: orgId, name: "web-dashboard", fullName: "xunia/web-dashboard", provider: "github" as const, url: "https://github.com/xunia/web-dashboard", branch: "main", lastScannedAt: ago(2) },
    { organizationId: orgId, name: "auth-service", fullName: "xunia/auth-service", provider: "gitlab" as const, url: "https://gitlab.com/xunia/auth-service", branch: "main", lastScannedAt: ago(3) },
    { organizationId: orgId, name: "payment-processor", fullName: "xunia/payment-processor", provider: "github" as const, url: "https://github.com/xunia/payment-processor", branch: "main" },
    { organizationId: orgId, name: "infra-terraform", fullName: "xunia/infra-terraform", provider: "github" as const, url: "https://github.com/xunia/infra-terraform", branch: "main", lastScannedAt: ago(5) },
  ]).returning();
  seeded.push("repositories");

  // ── Scans + Findings ──
  const scanRows = [
    { organizationId: orgId, name: "API Gateway SAST Scan", scanType: "semgrep" as const, status: "completed" as const, targetType: "repository", targetName: "api-gateway", progress: 100, startedAt: ago(1), completedAt: ago(1), duration: 142, totalFindings: 12, criticalCount: 2, highCount: 3, mediumCount: 4, lowCount: 3, securityScore: 72, initiatedById: userId },
    { organizationId: orgId, name: "Web Dashboard Trivy Scan", scanType: "trivy" as const, status: "completed" as const, targetType: "repository", targetName: "web-dashboard", progress: 100, startedAt: ago(2), completedAt: ago(2), duration: 98, totalFindings: 8, criticalCount: 1, highCount: 2, mediumCount: 3, lowCount: 2, securityScore: 78, initiatedById: userId },
    { organizationId: orgId, name: "Auth Service Bandit Scan", scanType: "bandit" as const, status: "completed" as const, targetType: "repository", targetName: "auth-service", progress: 100, startedAt: ago(3), completedAt: ago(3), duration: 67, totalFindings: 5, criticalCount: 0, highCount: 1, mediumCount: 2, lowCount: 2, securityScore: 88, initiatedById: userId },
    { organizationId: orgId, name: "Payment Processor ZAP Scan", scanType: "zap" as const, status: "completed" as const, targetType: "repository", targetName: "payment-processor", progress: 100, startedAt: ago(5), completedAt: ago(5), duration: 312, totalFindings: 15, criticalCount: 3, highCount: 5, mediumCount: 4, lowCount: 3, securityScore: 62, initiatedById: userId },
    { organizationId: orgId, name: "Infra Security Scan", scanType: "semgrep" as const, status: "running" as const, targetType: "repository", targetName: "infra-terraform", progress: 65, startedAt: agoH(2), initiatedById: userId },
  ];
  const createdScans = await db.insert(scans).values(scanRows).returning();
  seeded.push("scans");

  const findingTemplates = [
    { title: "SQL Injection in User Input Handler", description: "User input is concatenated directly into SQL query string without parameterization", severity: "critical" as const, scanTool: "semgrep", category: "injection", cveId: "CVE-2024-1234", filePath: "src/handlers/user.ts", lineNumber: 45, remediation: "Use parameterized queries instead of string concatenation", impact: "Full database compromise possible", complianceFrameworks: ["SOC2", "PCI-DSS"] },
    { title: "Cross-Site Scripting (XSS) in Template Rendering", description: "User-supplied data rendered in HTML template without escaping or sanitization", severity: "critical" as const, scanTool: "semgrep", category: "xss", cveId: "CVE-2024-2345", filePath: "src/views/profile.tsx", lineNumber: 112, remediation: "Sanitize all user inputs before rendering", impact: "Account takeover via session hijacking", complianceFrameworks: ["SOC2", "GDPR"] },
    { title: "Hardcoded AWS Secret Key", description: "AWS secret access key found hardcoded in configuration file", severity: "high" as const, scanTool: "trivy", category: "secrets", filePath: "config/aws.ts", lineNumber: 23, remediation: "Move secrets to environment variables or AWS Secrets Manager", impact: "Unauthorized cloud access", complianceFrameworks: ["SOC2", "ISO27001"] },
    { title: "Insecure Deserialization in API Endpoint", description: "Untrusted data deserialized without validation in webhook handler", severity: "high" as const, scanTool: "semgrep", category: "deserialization", filePath: "src/api/webhook.ts", lineNumber: 78, remediation: "Validate and sanitize serialized data before processing", impact: "Remote code execution", complianceFrameworks: ["PCI-DSS"] },
    { title: "Missing CSRF Protection on State-Changing Endpoint", description: "POST endpoint modifies state without CSRF token validation", severity: "high" as const, scanTool: "zap", category: "csrf", filePath: "src/routes/settings.ts", lineNumber: 34, remediation: "Implement CSRF tokens for all state-changing requests", impact: "Unauthorized actions on behalf of authenticated users", complianceFrameworks: ["SOC2"] },
    { title: "Weak TLS Configuration (TLS 1.0 Enabled)", description: "Server accepts TLS 1.0 connections which are known to be insecure", severity: "medium" as const, scanTool: "trivy", category: "cryptography", filePath: "config/tls.conf", lineNumber: 12, remediation: "Disable TLS 1.0 and 1.1, enforce TLS 1.2+", impact: "Man-in-the-middle attacks", complianceFrameworks: ["PCI-DSS", "FedRAMP"] },
    { title: "Verbose Error Messages Exposing Stack Traces", description: "Production error handler returns full stack traces to API consumers", severity: "medium" as const, scanTool: "zap", category: "information_disclosure", filePath: "src/middleware/error.ts", lineNumber: 18, remediation: "Return generic error messages in production", impact: "Information disclosure to attackers", complianceFrameworks: ["SOC2"] },
    { title: "Missing Rate Limiting on Authentication Endpoint", description: "Login endpoint allows unlimited authentication attempts without throttling", severity: "medium" as const, scanTool: "zap", category: "bruteforce", filePath: "src/routes/auth.ts", lineNumber: 56, remediation: "Implement rate limiting (e.g., 5 attempts/minute)", impact: "Brute force attacks on user accounts", complianceFrameworks: ["SOC2", "HIPAA"] },
    { title: "Outdated Dependency with Known Vulnerability", description: "lodash@4.17.19 has known prototype pollution vulnerability", severity: "medium" as const, scanTool: "trivy", category: "dependency", cveId: "CVE-2023-9876", filePath: "package.json", lineNumber: 42, remediation: "Update lodash to version 4.17.21+", impact: "Prototype pollution", complianceFrameworks: ["SOC2"] },
    { title: "Insecure Cookie Configuration (Missing Secure Flag)", description: "Session cookies set without Secure flag allowing transmission over HTTP", severity: "low" as const, scanTool: "zap", category: "session", filePath: "src/middleware/session.ts", lineNumber: 15, remediation: "Set Secure and HttpOnly flags on all cookies", impact: "Session cookies sent over unencrypted connections", complianceFrameworks: ["SOC2", "HIPAA"] },
    { title: "Missing Content-Security-Policy Header", description: "HTTP responses lack Content-Security-Policy header reducing XSS defense", severity: "low" as const, scanTool: "zap", category: "headers", filePath: "src/middleware/security.ts", lineNumber: 8, remediation: "Add CSP header to prevent XSS attacks", impact: "Reduced defense against script injection", complianceFrameworks: ["SOC2"] },
    { title: "Open Redirect Vulnerability", description: "OAuth callback redirect URL not validated against allowlist", severity: "low" as const, scanTool: "semgrep", category: "redirect", filePath: "src/routes/oauth.ts", lineNumber: 67, remediation: "Validate redirect URLs against an allowlist", impact: "Phishing attacks using legitimate domain", complianceFrameworks: ["SOC2"] },
  ];

  const findingRows = [];
  for (let si = 0; si < 4; si++) {
    const scan = createdScans[si];
    const subset = findingTemplates.slice(si * 3, si * 3 + 3);
    for (const f of subset) {
      findingRows.push({ ...f, scanId: scan.id, organizationId: orgId });
    }
  }
  await db.insert(scanFindings).values(findingRows);
  seeded.push("scan_findings");

  // ── Compliance Mappings ──
  const frameworks = [
    { fw: "SOC2" as const, controls: [
      { id: "CC6.1", name: "Logical and Physical Access Controls", status: "compliant", coverage: 92 },
      { id: "CC6.2", name: "System Component Registration", status: "compliant", coverage: 88 },
      { id: "CC6.3", name: "Access Removal", status: "partial", coverage: 75 },
      { id: "CC7.1", name: "Monitoring", status: "compliant", coverage: 95 },
      { id: "CC7.2", name: "Anomaly Detection", status: "partial", coverage: 70 },
    ]},
    { fw: "HIPAA" as const, controls: [
      { id: "164.312(a)", name: "Access Control", status: "compliant", coverage: 90 },
      { id: "164.312(c)", name: "Integrity Controls", status: "compliant", coverage: 85 },
      { id: "164.312(d)", name: "Authentication", status: "partial", coverage: 78 },
      { id: "164.312(e)", name: "Transmission Security", status: "compliant", coverage: 92 },
    ]},
    { fw: "ISO27001" as const, controls: [
      { id: "A.9.1", name: "Access Control Policy", status: "compliant", coverage: 90 },
      { id: "A.12.4", name: "Logging and Monitoring", status: "compliant", coverage: 88 },
      { id: "A.14.2", name: "Security in Development", status: "partial", coverage: 72 },
    ]},
    { fw: "PCI-DSS" as const, controls: [
      { id: "Req 6", name: "Secure Systems and Applications", status: "partial", coverage: 68 },
      { id: "Req 10", name: "Track and Monitor Access", status: "compliant", coverage: 85 },
      { id: "Req 11", name: "Test Security Systems", status: "partial", coverage: 60 },
    ]},
    { fw: "GDPR" as const, controls: [
      { id: "Art.25", name: "Data Protection by Design", status: "compliant", coverage: 82 },
      { id: "Art.32", name: "Security of Processing", status: "compliant", coverage: 88 },
      { id: "Art.33", name: "Breach Notification", status: "partial", coverage: 65 },
    ]},
  ];
  const compRows = frameworks.flatMap(f => f.controls.map(c => ({
    organizationId: orgId, framework: f.fw, controlId: c.id, controlName: c.name, status: c.status, coverage: c.coverage, lastAssessedAt: ago(7),
  })));
  await db.insert(complianceMappings).values(compRows);
  seeded.push("compliance_mappings");

  // ── Reports ──
  await db.insert(reports).values([
    { organizationId: orgId, title: "Q1 2026 Security Assessment", status: "ready" as const, frameworks: ["SOC2", "HIPAA"], executiveSummary: "Overall security posture improved by 15% this quarter with 92% of critical vulnerabilities remediated within SLA.", securityScore: 78, totalVulnerabilities: 40, criticalCount: 5, highCount: 12, mediumCount: 15, lowCount: 8, generatedById: userId, generatedAt: ago(7) },
    { organizationId: orgId, title: "PCI-DSS Compliance Report", status: "ready" as const, frameworks: ["PCI-DSS"], executiveSummary: "Partial compliance achieved. 3 controls require remediation before next audit cycle.", securityScore: 68, totalVulnerabilities: 18, criticalCount: 3, highCount: 5, mediumCount: 6, lowCount: 4, generatedById: userId, generatedAt: ago(14) },
    { organizationId: orgId, title: "Monthly Vulnerability Summary - March 2026", status: "ready" as const, frameworks: ["SOC2", "ISO27001"], executiveSummary: "342 packages audited. 12 vulnerabilities found, 8 remediated. MTTR improved to 4.2 days.", securityScore: 82, totalVulnerabilities: 12, criticalCount: 1, highCount: 3, mediumCount: 5, lowCount: 3, generatedById: userId, generatedAt: ago(3) },
  ]);
  seeded.push("reports");

  // ── Pentest Sessions + Findings ──
  const [pt1, pt2] = await db.insert(pentestSessions).values([
    { organizationId: orgId, name: "API Gateway Penetration Test", targetUrl: "https://api.xunia.io", targetDescription: "Production API gateway", status: "completed", testTypes: ["sql_injection", "xss", "auth_bypass", "rate_limiting"], authorizedBy: "CISO", summary: { totalFindings: 6, critical: 1, high: 2, medium: 2, low: 1, duration: "3h 24m" }, startedAt: ago(5), completedAt: ago(5), createdById: userId },
    { organizationId: orgId, name: "Web Application Security Assessment", targetUrl: "https://app.xunia.io", targetDescription: "Customer-facing web application", status: "completed", testTypes: ["xss", "csrf", "ssrf", "idor"], authorizedBy: "VP Engineering", summary: { totalFindings: 4, critical: 0, high: 1, medium: 2, low: 1, duration: "2h 15m" }, startedAt: ago(10), completedAt: ago(10), createdById: userId },
  ]).returning();
  await db.insert(pentestFindings).values([
    { sessionId: pt1.id, organizationId: orgId, testType: "sql_injection", severity: "critical", title: "Blind SQL Injection in Search API", description: "The /api/search endpoint is vulnerable to time-based blind SQL injection via the 'q' parameter.", payload: "' OR SLEEP(5)--", evidence: "Response time increased from 120ms to 5120ms", cvssScore: 9.8, remediationSteps: "Use parameterized queries. Implement input validation.", status: "open" },
    { sessionId: pt1.id, organizationId: orgId, testType: "auth_bypass", severity: "high", title: "JWT Algorithm Confusion", description: "The API accepts tokens signed with 'none' algorithm, allowing authentication bypass.", payload: '{"alg":"none","typ":"JWT"}', evidence: "Access granted to /api/admin with unsigned JWT", cvssScore: 8.5, remediationSteps: "Enforce RS256 algorithm. Reject tokens with 'none' algorithm.", status: "open" },
    { sessionId: pt1.id, organizationId: orgId, testType: "rate_limiting", severity: "medium", title: "Missing Rate Limiting on Login", description: "No rate limiting on /api/auth/login allows unlimited brute force attempts.", cvssScore: 5.3, remediationSteps: "Implement exponential backoff and account lockout after 5 failed attempts.", status: "remediated" },
    { sessionId: pt2.id, organizationId: orgId, testType: "idor", severity: "high", title: "Insecure Direct Object Reference in User Profile", description: "Changing user ID in /api/users/:id returns other users' PII data.", payload: "GET /api/users/42 (as user 1)", evidence: "Full profile data of user 42 returned including email and phone", cvssScore: 7.5, remediationSteps: "Implement authorization checks. Verify requesting user owns the resource.", status: "open" },
    { sessionId: pt2.id, organizationId: orgId, testType: "ssrf", severity: "medium", title: "Server-Side Request Forgery via Webhook URL", description: "The webhook configuration endpoint allows requests to internal network addresses.", payload: "http://169.254.169.254/latest/meta-data/", evidence: "AWS metadata endpoint accessible", cvssScore: 6.5, remediationSteps: "Implement URL validation. Block requests to private IP ranges and cloud metadata endpoints.", status: "remediated" },
  ]);
  seeded.push("pentest_sessions", "pentest_findings");

  // ── Cloud Security ──
  const [ct1, ct2] = await db.insert(cloudScanTargets).values([
    { organizationId: orgId, name: "AWS Production", provider: "aws", region: "us-east-1", description: "Main production AWS account", lastScannedAt: ago(1) },
    { organizationId: orgId, name: "GCP Staging", provider: "gcp", region: "us-central1", description: "Staging and development environment", lastScannedAt: ago(3) },
  ]).returning();
  await db.insert(cloudScanResults).values([
    { targetId: ct1.id, organizationId: orgId, checkName: "S3 Bucket Public Access", category: "Storage", severity: "critical", resourceId: "arn:aws:s3:::xunia-backups", resourceType: "S3 Bucket", description: "S3 bucket has public read access enabled", recommendation: "Disable public access. Enable S3 Block Public Access." },
    { targetId: ct1.id, organizationId: orgId, checkName: "IAM Root Account MFA", category: "IAM", severity: "critical", resourceId: "arn:aws:iam::123456:root", resourceType: "IAM Root", description: "Root account does not have MFA enabled", recommendation: "Enable MFA on the root account immediately." },
    { targetId: ct1.id, organizationId: orgId, checkName: "Security Group Open to World", category: "Network", severity: "high", resourceId: "sg-0abc123def", resourceType: "Security Group", description: "Security group allows inbound SSH (port 22) from 0.0.0.0/0", recommendation: "Restrict SSH access to known IP ranges." },
    { targetId: ct1.id, organizationId: orgId, checkName: "Unencrypted EBS Volume", category: "Storage", severity: "medium", resourceId: "vol-0123abc456", resourceType: "EBS Volume", description: "EBS volume is not encrypted at rest", recommendation: "Enable EBS encryption by default." },
    { targetId: ct2.id, organizationId: orgId, checkName: "GCE Instance with External IP", category: "Compute", severity: "high", resourceId: "projects/xunia-staging/instances/dev-1", resourceType: "Compute Instance", description: "Instance has external IP with no firewall rules", recommendation: "Remove external IP or configure firewall rules." },
    { targetId: ct2.id, organizationId: orgId, checkName: "Cloud SQL Public IP", category: "Database", severity: "high", resourceId: "xunia-staging:us-central1:db-prod", resourceType: "Cloud SQL", description: "Cloud SQL instance accessible via public IP", recommendation: "Use private IP and Cloud SQL Proxy for access." },
  ]);
  seeded.push("cloud_scan_targets", "cloud_scan_results");

  // ── Threat Intel ──
  await db.insert(threatIntelItems).values([
    { organizationId: orgId, cveId: "CVE-2024-3094", title: "XZ Utils Backdoor (Critical Supply Chain Attack)", severity: "critical", cvssScore: 10.0, description: "Malicious code in xz/liblzma compromises SSH authentication. Affects xz-utils 5.6.0-5.6.1.", affectedPackages: ["xz-utils", "liblzma"], affectedVersions: ["5.6.0", "5.6.1"], patchedVersions: ["5.6.2"], publishedAt: ago(90), source: "nvd", status: "active" },
    { organizationId: orgId, cveId: "CVE-2024-21626", title: "runc Container Escape (Leaky Vessels)", severity: "critical", cvssScore: 8.6, description: "Container escape vulnerability in runc allows host filesystem access.", affectedPackages: ["runc"], affectedVersions: ["<1.1.12"], patchedVersions: ["1.1.12"], publishedAt: ago(60), source: "nvd", status: "active" },
    { organizationId: orgId, cveId: "CVE-2024-4577", title: "PHP CGI Argument Injection (Critical RCE)", severity: "critical", cvssScore: 9.8, description: "PHP CGI on Windows allows argument injection leading to remote code execution.", affectedPackages: ["php"], affectedVersions: ["<8.1.29", "<8.2.20", "<8.3.8"], patchedVersions: ["8.1.29", "8.2.20", "8.3.8"], publishedAt: ago(30), source: "nvd", status: "monitoring" },
    { organizationId: orgId, cveId: "CVE-2023-44487", title: "HTTP/2 Rapid Reset DDoS Attack", severity: "high", cvssScore: 7.5, description: "HTTP/2 protocol vulnerability enabling rapid reset attacks for DDoS amplification.", affectedPackages: ["nginx", "apache", "envoy"], affectedVersions: ["multiple"], patchedVersions: ["varies"], publishedAt: ago(180), source: "nvd", status: "resolved" },
    { organizationId: orgId, cveId: "CVE-2024-27316", title: "Apache HTTP/2 Memory Exhaustion", severity: "high", cvssScore: 7.5, description: "Apache HTTP Server HTTP/2 CONTINUATION frames can cause memory exhaustion DoS.", affectedPackages: ["apache-httpd"], affectedVersions: ["<2.4.59"], patchedVersions: ["2.4.59"], publishedAt: ago(45), source: "nvd", status: "active" },
    { organizationId: orgId, cveId: "CVE-2024-29944", title: "Node.js Permission Model Bypass", severity: "medium", cvssScore: 6.5, description: "Experimental permission model in Node.js can be bypassed through module loading.", affectedPackages: ["node"], affectedVersions: ["20.x", "21.x"], patchedVersions: ["20.12.0", "21.7.2"], publishedAt: ago(20), source: "nvd", status: "monitoring" },
  ]);
  seeded.push("threat_intel_items");

  // ── Incidents ──
  await db.insert(incidents).values([
    { organizationId: orgId, title: "Unauthorized Access Attempt on Admin Portal", severity: "critical" as const, status: "investigating", assignedTo: "Zyra", affectedSystems: ["admin-portal", "auth-service"], timeline: [{ time: agoH(6).toISOString(), event: "Alert triggered by WAF" }, { time: agoH(5).toISOString(), event: "Investigation started" }], tags: ["unauthorized-access", "brute-force"] },
    { organizationId: orgId, title: "Data Exfiltration Alert - Unusual Outbound Traffic", severity: "high" as const, status: "triage", assignedTo: "Zyra", affectedSystems: ["api-gateway", "database-cluster"], timeline: [{ time: agoH(3).toISOString(), event: "Anomalous egress traffic detected" }], tags: ["data-exfiltration", "anomaly"] },
    { organizationId: orgId, title: "Phishing Campaign Targeting Engineering Team", severity: "high" as const, status: "contained", assignedTo: "Zyra", affectedSystems: ["email-system"], timeline: [{ time: ago(2).toISOString(), event: "Phishing emails reported" }, { time: ago(2).toISOString(), event: "Email rules updated to block sender" }], tags: ["phishing", "social-engineering"], mttr: 180 },
    { organizationId: orgId, title: "SSL Certificate Expiration Warning", severity: "medium" as const, status: "resolved", affectedSystems: ["api.xunia.io"], timeline: [{ time: ago(5).toISOString(), event: "Certificate expiry warning" }, { time: ago(4).toISOString(), event: "Certificate renewed" }], tags: ["certificate", "maintenance"], mttr: 1440, resolvedAt: ago(4) },
    { organizationId: orgId, title: "Suspicious Login from Unrecognized Country", severity: "medium" as const, status: "resolved", affectedSystems: ["auth-service"], timeline: [{ time: ago(8).toISOString(), event: "Login from Nigeria detected" }, { time: ago(8).toISOString(), event: "Account temporarily locked" }], tags: ["geo-anomaly"], mttr: 60, resolvedAt: ago(8) },
  ]);
  seeded.push("incidents");

  // ── Vulnerabilities ──
  await db.insert(vulnerabilities).values([
    { organizationId: orgId, title: "Remote Code Execution in ImageMagick", severity: "critical" as const, status: "open", source: "scan", cve: "CVE-2024-1234", cvss: 9.8, affectedComponent: "imagemagick@7.1.0", remediationSteps: "Update to ImageMagick 7.1.1-28+", dueDate: ago(-7) },
    { organizationId: orgId, title: "Prototype Pollution in Lodash", severity: "high" as const, status: "open", source: "scan", cve: "CVE-2023-9876", cvss: 7.4, affectedComponent: "lodash@4.17.19", remediationSteps: "Update lodash to 4.17.21+", dueDate: ago(-14) },
    { organizationId: orgId, title: "Authentication Bypass in JWT Middleware", severity: "high" as const, status: "in_progress", source: "pentest", cvss: 8.5, affectedComponent: "auth-service", remediationSteps: "Enforce RS256 algorithm. Add algorithm whitelist.", assignedTo: "Zyra" },
    { organizationId: orgId, title: "Missing Input Validation on File Upload", severity: "medium" as const, status: "open", source: "scan", cvss: 6.5, affectedComponent: "api-gateway", remediationSteps: "Validate file types and implement size limits" },
    { organizationId: orgId, title: "Weak Password Policy Configuration", severity: "medium" as const, status: "resolved", source: "audit", cvss: 5.3, affectedComponent: "auth-service", remediationSteps: "Enforce minimum 12 characters with complexity", resolvedAt: ago(3), verifiedAt: ago(2) },
    { organizationId: orgId, title: "Outdated TLS Configuration on Load Balancer", severity: "medium" as const, status: "resolved", source: "scan", cve: "CVE-2023-5555", cvss: 5.9, affectedComponent: "lb-prod-01", remediationSteps: "Disable TLS 1.0/1.1. Enable TLS 1.3.", resolvedAt: ago(10), verifiedAt: ago(9) },
    { organizationId: orgId, title: "Information Disclosure in Error Messages", severity: "low" as const, status: "open", source: "scan", cvss: 3.7, affectedComponent: "web-dashboard", remediationSteps: "Return generic error messages in production" },
  ]);
  seeded.push("vulnerabilities");

  // ── SBOM ──
  await db.insert(sbomItems).values([
    { organizationId: orgId, packageName: "express", packageVersion: "4.18.2", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 5 },
    { organizationId: orgId, packageName: "lodash", packageVersion: "4.17.19", ecosystem: "npm", license: "MIT", isVulnerable: true, knownCves: ["CVE-2023-9876"], patchedVersion: "4.17.21", riskScore: 65 },
    { organizationId: orgId, packageName: "axios", packageVersion: "1.6.2", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 10 },
    { organizationId: orgId, packageName: "jsonwebtoken", packageVersion: "9.0.2", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 15 },
    { organizationId: orgId, packageName: "bcryptjs", packageVersion: "2.4.3", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 8 },
    { organizationId: orgId, packageName: "pg", packageVersion: "8.11.3", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 5 },
    { organizationId: orgId, packageName: "imagemagick", packageVersion: "7.1.0", ecosystem: "system", license: "Apache-2.0", isVulnerable: true, knownCves: ["CVE-2024-1234"], patchedVersion: "7.1.1-28", riskScore: 90 },
    { organizationId: orgId, packageName: "react", packageVersion: "18.2.0", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 3 },
    { organizationId: orgId, packageName: "typescript", packageVersion: "5.3.3", ecosystem: "npm", license: "Apache-2.0", isVulnerable: false, riskScore: 2 },
    { organizationId: orgId, packageName: "xz-utils", packageVersion: "5.6.0", ecosystem: "system", license: "Public Domain", isVulnerable: true, knownCves: ["CVE-2024-3094"], patchedVersion: "5.6.2", riskScore: 100 },
    { organizationId: orgId, packageName: "drizzle-orm", packageVersion: "0.29.3", ecosystem: "npm", license: "Apache-2.0", isVulnerable: false, riskScore: 5 },
    { organizationId: orgId, packageName: "vite", packageVersion: "5.0.12", ecosystem: "npm", license: "MIT", isVulnerable: false, riskScore: 8, transitive: false },
  ]);
  seeded.push("sbom_items");

  // ── Secrets Findings ──
  await db.insert(secretsFindings).values([
    { organizationId: orgId, secretType: "AWS Access Key", maskedValue: "AKIA****7X2F", filePath: "config/cloud.ts", lineNumber: 23, commitHash: "a1b2c3d", status: "open", severity: "critical" as const },
    { organizationId: orgId, secretType: "GitHub Token", maskedValue: "ghp_****xK9m", filePath: ".env.production", lineNumber: 5, commitHash: "d4e5f6g", status: "open", severity: "critical" as const },
    { organizationId: orgId, secretType: "Stripe Secret Key", maskedValue: "sk_live_****3pQR", filePath: "src/payments/stripe.ts", lineNumber: 12, commitHash: "h7i8j9k", status: "resolved", severity: "high" as const, resolvedAt: ago(5) },
    { organizationId: orgId, secretType: "Database Password", maskedValue: "pg://****:****@", filePath: "docker-compose.yml", lineNumber: 34, commitHash: "l0m1n2o", status: "open", severity: "high" as const },
    { organizationId: orgId, secretType: "Private RSA Key", maskedValue: "-----BEGIN RSA****", filePath: "certs/server.key", lineNumber: 1, commitHash: "p3q4r5s", status: "suppressed", severity: "medium" as const, suppressedReason: "Test certificate only" },
  ]);
  seeded.push("secrets_findings");

  // ── Risks ──
  await db.insert(risks).values([
    { organizationId: orgId, title: "Supply Chain Compromise via Third-Party Dependencies", category: "technical", likelihood: 4, impact: 5, riskScore: 20, owner: "Zyra", treatment: "mitigate", mitigationPlan: "Implement SBOM monitoring and automated dependency scanning", status: "open" },
    { organizationId: orgId, title: "Ransomware Attack on Production Systems", category: "technical", likelihood: 3, impact: 5, riskScore: 15, owner: "Zyra", treatment: "mitigate", mitigationPlan: "Implement offline backups, network segmentation, and EDR", status: "open" },
    { organizationId: orgId, title: "Data Breach via Insider Threat", category: "operational", likelihood: 2, impact: 5, riskScore: 10, owner: "Zyra", treatment: "accept", mitigationPlan: "DLP tools, access reviews, and security awareness training", status: "monitoring" },
    { organizationId: orgId, title: "Cloud Misconfiguration Leading to Data Exposure", category: "technical", likelihood: 3, impact: 4, riskScore: 12, owner: "Zyra", treatment: "mitigate", mitigationPlan: "CSPM tooling, IaC scanning, and regular cloud posture reviews", status: "open" },
    { organizationId: orgId, title: "Regulatory Non-Compliance (GDPR)", category: "compliance", likelihood: 2, impact: 4, riskScore: 8, owner: "Zyra", treatment: "mitigate", mitigationPlan: "Complete data mapping, implement DSAR process, update privacy policies", status: "mitigated", residualRisk: 4 },
  ]);
  seeded.push("risks");

  // ── Attack Surface ──
  await db.insert(attackSurfaceAssets).values([
    { organizationId: orgId, assetType: "web_application", host: "api.xunia.io", port: 443, service: "HTTPS", status: "active", riskLevel: "high", tlsCertExpiry: ago(-60), tlsCertIssuer: "Let's Encrypt", openPorts: [443, 80], technologies: ["Node.js", "Express", "Nginx"], vulnerabilityCount: 5 },
    { organizationId: orgId, assetType: "web_application", host: "app.xunia.io", port: 443, service: "HTTPS", status: "active", riskLevel: "medium", tlsCertExpiry: ago(-90), tlsCertIssuer: "Let's Encrypt", openPorts: [443], technologies: ["React", "Vite", "CloudFront"], vulnerabilityCount: 2 },
    { organizationId: orgId, assetType: "dns", host: "mail.xunia.io", port: 25, service: "SMTP", status: "active", riskLevel: "low", openPorts: [25, 587, 993], technologies: ["Postfix"], vulnerabilityCount: 0 },
    { organizationId: orgId, assetType: "ip_address", host: "52.14.128.73", port: 22, service: "SSH", status: "active", riskLevel: "critical", openPorts: [22, 80, 443, 3306], technologies: ["Ubuntu", "OpenSSH", "MySQL"], vulnerabilityCount: 8 },
    { organizationId: orgId, assetType: "web_application", host: "staging.xunia.io", port: 443, service: "HTTPS", status: "active", riskLevel: "medium", tlsCertExpiry: ago(-30), openPorts: [443, 8080], technologies: ["Node.js", "Docker"], vulnerabilityCount: 3 },
    { organizationId: orgId, assetType: "subdomain", host: "dev.xunia.io", port: 443, service: "HTTPS", status: "inactive", riskLevel: "low", technologies: ["Vercel"], vulnerabilityCount: 0 },
  ]);
  seeded.push("attack_surface_assets");

  // ── Posture Scores ──
  const today = new Date().toISOString().split("T")[0];
  await db.insert(postureScores).values([
    { organizationId: orgId, date: today, overallScore: 74, scanScore: 72, pentestScore: 65, cloudScore: 68, complianceScore: 82, incidentScore: 70, vulnerabilityScore: 78, trend: "improving" },
    { organizationId: orgId, date: new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0], overallScore: 68, scanScore: 65, pentestScore: 60, cloudScore: 62, complianceScore: 78, incidentScore: 65, vulnerabilityScore: 72, trend: "stable" },
    { organizationId: orgId, date: new Date(now.getTime() - 14 * 86400000).toISOString().split("T")[0], overallScore: 62, scanScore: 58, pentestScore: 55, cloudScore: 58, complianceScore: 72, incidentScore: 60, vulnerabilityScore: 68, trend: "declining" },
  ]);
  seeded.push("posture_scores");

  // ── Dark Web Alerts ──
  await db.insert(darkWebAlerts).values([
    { organizationId: orgId, domain: "xunia.io", alertType: "credential_leak", severity: "critical", source: "dark_web_forum", maskedValue: "admin@xunia.io:****", description: "Credentials matching your domain found in data breach dump on dark web marketplace", status: "new" },
    { organizationId: orgId, domain: "xunia.io", alertType: "data_mention", severity: "high", source: "paste_site", description: "Company name and internal document references found on Pastebin-like site", status: "investigating" },
    { organizationId: orgId, domain: "xunia.io", alertType: "domain_impersonation", severity: "high", source: "domain_monitor", maskedValue: "xun1a.io", description: "Lookalike domain 'xun1a.io' registered — potential phishing infrastructure", status: "new" },
    { organizationId: orgId, domain: "xunia.io", alertType: "credential_leak", severity: "medium", source: "breach_database", maskedValue: "dev@xunia.io:****", description: "Email found in historical breach database (2023 collection)", status: "resolved", resolvedAt: ago(15) },
  ]);
  seeded.push("dark_web_alerts");

  // ── Vendors ──
  await db.insert(vendors).values([
    { organizationId: orgId, name: "AWS", contactEmail: "enterprise@aws.amazon.com", website: "https://aws.amazon.com", riskScore: 15, riskRating: "low", status: "approved", complianceStatus: "compliant", category: "cloud", questionnaireSent: true, questionnaireCompleted: true, lastAssessedAt: ago(30) },
    { organizationId: orgId, name: "Datadog", contactEmail: "security@datadoghq.com", website: "https://www.datadoghq.com", riskScore: 20, riskRating: "low", status: "approved", complianceStatus: "compliant", category: "saas", questionnaireSent: true, questionnaireCompleted: true, lastAssessedAt: ago(60) },
    { organizationId: orgId, name: "Stripe", contactEmail: "security@stripe.com", website: "https://stripe.com", riskScore: 12, riskRating: "low", status: "approved", complianceStatus: "compliant", category: "saas", questionnaireSent: true, questionnaireCompleted: true, lastAssessedAt: ago(45) },
    { organizationId: orgId, name: "Acme Analytics", contactEmail: "support@acmeanalytics.io", website: "https://acmeanalytics.io", riskScore: 55, riskRating: "medium", status: "under_review", complianceStatus: "partial", category: "saas", questionnaireSent: true, questionnaireCompleted: false, lastAssessedAt: ago(10) },
    { organizationId: orgId, name: "QuickChat AI", contactEmail: "info@quickchat.ai", website: "https://quickchat.ai", riskScore: 72, riskRating: "high", status: "pending", complianceStatus: "unknown", category: "saas", questionnaireSent: false },
  ]);
  seeded.push("vendors");

  // ── Training + Phishing ──
  await db.insert(trainingRecords).values([
    { organizationId: orgId, userEmail: "zyra@zyra.host", course: "Security Fundamentals 2026", completed: true, completedAt: ago(14), phishingScore: 95 },
    { organizationId: orgId, userEmail: "zyra@zyra.host", course: "Advanced Phishing Recognition", completed: true, completedAt: ago(7), phishingScore: 88 },
    { organizationId: orgId, userEmail: "analyst@xunia.io", course: "Security Fundamentals 2026", completed: true, completedAt: ago(10), phishingScore: 82 },
    { organizationId: orgId, userEmail: "analyst@xunia.io", course: "Secure Coding Practices", completed: false, phishingScore: 0 },
    { organizationId: orgId, userEmail: "dev@xunia.io", course: "Security Fundamentals 2026", completed: false, phishingScore: 0 },
  ]);
  await db.insert(phishingCampaigns).values([
    { organizationId: orgId, name: "Q1 Credential Harvest Test", status: "completed", templateType: "credential_harvest", targetCount: 25, clickedCount: 4, reportedCount: 18, ignoredCount: 3, humanRiskScore: 16, launchedAt: ago(30), completedAt: ago(23) },
    { organizationId: orgId, name: "CEO Impersonation Test", status: "completed", templateType: "business_email_compromise", targetCount: 10, clickedCount: 2, reportedCount: 6, ignoredCount: 2, humanRiskScore: 20, launchedAt: ago(14), completedAt: ago(10) },
    { organizationId: orgId, name: "Malware Download Simulation", status: "active", templateType: "malware_download", targetCount: 30, clickedCount: 1, reportedCount: 8, ignoredCount: 21, humanRiskScore: 3, launchedAt: ago(3) },
  ]);
  seeded.push("training_records", "phishing_campaigns");

  // ── Bounty Reports ──
  await db.insert(bountyReports).values([
    { organizationId: orgId, researcherEmail: "hunter@bugcrowd.com", title: "Stored XSS in User Profile Bio", vulnerability: "Cross-Site Scripting (Stored)", severity: "high", status: "triaged", reward: 2500, cvss: 7.5, reproducible: true, stepsToReproduce: "1. Navigate to profile settings\n2. Enter <script>alert(1)</script> in bio field\n3. Save and view public profile" },
    { organizationId: orgId, researcherEmail: "whitehat@h1.com", title: "IDOR in Invoice Download API", vulnerability: "Insecure Direct Object Reference", severity: "high", status: "accepted", reward: 3000, cvss: 7.2, reproducible: true, stepsToReproduce: "1. Download your invoice at /api/invoices/123\n2. Change ID to 124\n3. Another user's invoice is returned", assignedTo: "Zyra" },
    { organizationId: orgId, researcherEmail: "security@research.org", title: "Open Redirect in OAuth Callback", vulnerability: "Open Redirect", severity: "medium", status: "resolved", reward: 500, cvss: 4.3, reproducible: true, resolvedAt: ago(20) },
    { organizationId: orgId, researcherEmail: "bounty@hacker.one", title: "Rate Limiting Bypass on Password Reset", vulnerability: "Business Logic", severity: "medium", status: "new", cvss: 5.3, reproducible: true },
  ]);
  seeded.push("bounty_reports");

  // ── Container Security ──
  const [cs1, cs2] = await db.insert(containerScans).values([
    { organizationId: orgId, imageName: "xunia/api-gateway", imageTag: "v2.4.1", scanType: "image", status: "completed", criticalCount: 2, highCount: 3, mediumCount: 5, lowCount: 8, privilegedContainers: 0, weakRbac: false, completedAt: ago(1) },
    { organizationId: orgId, imageName: "xunia/web-dashboard", imageTag: "v3.1.0", scanType: "image", status: "completed", criticalCount: 0, highCount: 1, mediumCount: 3, lowCount: 4, privilegedContainers: 1, weakRbac: true, openDashboards: true, completedAt: ago(2) },
  ]).returning();
  await db.insert(containerFindings).values([
    { scanId: cs1.id, organizationId: orgId, findingType: "vulnerability", severity: "critical", title: "CVE-2024-3094 in xz-utils", description: "Backdoor in xz-utils 5.6.0 affecting SSH authentication", cveId: "CVE-2024-3094", packageName: "xz-utils", fixedVersion: "5.6.2", remediation: "Update base image to use xz-utils >= 5.6.2" },
    { scanId: cs1.id, organizationId: orgId, findingType: "vulnerability", severity: "critical", title: "CVE-2024-21626 runc Container Escape", description: "Container escape via leaked file descriptors in runc", cveId: "CVE-2024-21626", packageName: "runc", fixedVersion: "1.1.12", remediation: "Update runc to 1.1.12+" },
    { scanId: cs1.id, organizationId: orgId, findingType: "misconfiguration", severity: "high", title: "Container Running as Root", description: "Container process runs as root user (UID 0)", remediation: "Add USER directive to Dockerfile. Use non-root user." },
    { scanId: cs2.id, organizationId: orgId, findingType: "misconfiguration", severity: "high", title: "Kubernetes Dashboard Exposed", description: "Kubernetes dashboard accessible without authentication", remediation: "Restrict dashboard access via RBAC and network policies" },
    { scanId: cs2.id, organizationId: orgId, findingType: "misconfiguration", severity: "medium", title: "Privileged Container Detected", description: "Container running with --privileged flag", remediation: "Remove privileged flag and use specific capabilities instead" },
  ]);
  seeded.push("container_scans", "container_findings");

  // ── Asset Inventory ──
  await db.insert(assetInventory).values([
    { organizationId: orgId, hostname: "prod-api-01", ip: "10.0.1.10", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Ubuntu 22.04 LTS", criticality: "critical", status: "active", owner: "Platform Team", tags: ["api", "production"], vulnerabilityCount: 5, cveCount: 3 },
    { organizationId: orgId, hostname: "prod-api-02", ip: "10.0.1.11", cloudProvider: "aws", assetType: "server", environment: "production", region: "us-east-1", os: "Ubuntu 22.04 LTS", criticality: "critical", status: "active", owner: "Platform Team", tags: ["api", "production"], vulnerabilityCount: 3, cveCount: 2 },
    { organizationId: orgId, hostname: "prod-db-primary", ip: "10.0.2.10", cloudProvider: "aws", assetType: "database", environment: "production", region: "us-east-1", os: "Amazon Linux 2", criticality: "critical", status: "active", owner: "DBA Team", tags: ["database", "postgresql"], vulnerabilityCount: 1, cveCount: 1 },
    { organizationId: orgId, hostname: "staging-web-01", ip: "10.1.1.10", cloudProvider: "aws", assetType: "server", environment: "staging", region: "us-east-1", os: "Ubuntu 22.04 LTS", criticality: "medium", status: "active", owner: "Dev Team", tags: ["web", "staging"], vulnerabilityCount: 7 },
    { organizationId: orgId, hostname: "k8s-worker-01", ip: "10.0.3.10", cloudProvider: "aws", assetType: "container", environment: "production", region: "us-east-1", os: "Container-Optimized OS", criticality: "high", status: "active", owner: "Platform Team", tags: ["kubernetes", "worker"], vulnerabilityCount: 4, cveCount: 2 },
    { organizationId: orgId, hostname: "cdn-edge-us", ip: "52.84.123.45", cloudProvider: "aws", assetType: "network", environment: "production", region: "us-east-1", criticality: "high", status: "active", owner: "Infra Team", tags: ["cdn", "cloudfront"] },
    { organizationId: orgId, hostname: "dev-laptop-jsmith", ip: "192.168.1.42", assetType: "endpoint", environment: "corporate", os: "macOS 14.3", criticality: "low", status: "active", owner: "John Smith", tags: ["endpoint", "macos"] },
    { organizationId: orgId, hostname: "gcp-staging-vm-01", ip: "10.128.0.5", cloudProvider: "gcp", assetType: "server", environment: "staging", region: "us-central1", os: "Debian 12", criticality: "medium", status: "active", owner: "Dev Team", tags: ["gcp", "staging"], vulnerabilityCount: 2 },
  ]);
  seeded.push("asset_inventory");

  // ── Attack Paths ──
  await db.insert(attackPaths).values([
    { organizationId: orgId, name: "External → API Gateway → Database (SQLi Chain)", description: "Attack chain exploiting SQL injection in API gateway to reach production database", entryPoint: "api.xunia.io:443", targetAsset: "prod-db-primary", riskScore: 92, severity: "critical", steps: [{ step: 1, action: "Exploit SQLi in /api/search", target: "api-gateway" }, { step: 2, action: "Extract database credentials", target: "env-variables" }, { step: 3, action: "Connect to database directly", target: "prod-db-primary" }], status: "active" },
    { organizationId: orgId, name: "Phishing → Credential Theft → Lateral Movement", description: "Social engineering attack leading to credential compromise and internal access", entryPoint: "Email (phishing)", targetAsset: "admin-portal", riskScore: 78, severity: "high", steps: [{ step: 1, action: "Send phishing email to engineering", target: "email" }, { step: 2, action: "Harvest credentials via fake login page", target: "credentials" }, { step: 3, action: "Access VPN with stolen creds", target: "vpn" }, { step: 4, action: "Escalate privileges to admin", target: "admin-portal" }], status: "active" },
    { organizationId: orgId, name: "Container Escape → Host Compromise", description: "Exploiting container runtime vulnerability to escape to host OS", entryPoint: "k8s-worker-01", targetAsset: "Host OS", riskScore: 85, severity: "critical", steps: [{ step: 1, action: "Exploit CVE-2024-21626 in runc", target: "container" }, { step: 2, action: "Access host filesystem", target: "host" }, { step: 3, action: "Install persistence mechanism", target: "host-os" }], status: "active" },
    { organizationId: orgId, name: "Supply Chain → Build Pipeline → Production", description: "Compromised dependency injecting malicious code into build pipeline", entryPoint: "npm registry", targetAsset: "Production deployment", riskScore: 70, severity: "high", steps: [{ step: 1, action: "Typosquatting on npm package", target: "npm" }, { step: 2, action: "Malicious code runs in CI/CD", target: "ci-pipeline" }, { step: 3, action: "Backdoor deployed to production", target: "production" }], status: "mitigated", mitigated: true, mitigationNotes: "SBOM monitoring and lockfile integrity checks implemented" },
  ]);
  seeded.push("attack_paths");

  // ── Security Events ──
  const eventRows = [
    { organizationId: orgId, eventType: "intrusion_detection", source: "waf", severity: "critical", title: "SQL Injection Attempt Blocked", description: "WAF blocked SQL injection attempt on /api/search from 185.220.101.42", metadata: { sourceIp: "185.220.101.42", destinationPort: 443, ruleId: "942100" } },
    { organizationId: orgId, eventType: "malware_detection", source: "edr", severity: "high", title: "Suspicious PowerShell Execution Detected", description: "Encoded PowerShell command detected on endpoint dev-laptop-jsmith", metadata: { hostname: "dev-laptop-jsmith", processName: "powershell.exe", hash: "a1b2c3d4" } },
    { organizationId: orgId, eventType: "authentication", source: "sso", severity: "medium", title: "Failed Login Attempts from Multiple IPs", description: "15 failed login attempts for admin@xunia.io from 5 different IP addresses in 10 minutes", metadata: { username: "admin@xunia.io", attemptCount: 15, uniqueIps: 5 } },
    { organizationId: orgId, eventType: "network_anomaly", source: "ids", severity: "high", title: "Unusual Outbound Data Transfer", description: "2.3GB outbound transfer to unknown IP detected from prod-api-01", metadata: { sourceHost: "prod-api-01", destinationIp: "185.220.101.1", bytesTransferred: 2300000000 } },
    { organizationId: orgId, eventType: "configuration_change", source: "cspm", severity: "medium", title: "Security Group Modified", description: "Security group sg-0abc123def modified to allow 0.0.0.0/0 on port 3306", metadata: { securityGroupId: "sg-0abc123def", port: 3306, cidr: "0.0.0.0/0" } },
    { organizationId: orgId, eventType: "vulnerability_scan", source: "trivy", severity: "critical", title: "Critical CVE Found in Production Image", description: "CVE-2024-3094 (CVSS 10.0) found in xunia/api-gateway:v2.4.1", metadata: { cveId: "CVE-2024-3094", cvss: 10.0, image: "xunia/api-gateway:v2.4.1" } },
    { organizationId: orgId, eventType: "access_control", source: "iam", severity: "high", title: "Privilege Escalation Attempt", description: "User attempted to access /admin endpoint without admin role", metadata: { userId: "user-123", attemptedRole: "admin", currentRole: "viewer" } },
    { organizationId: orgId, eventType: "compliance", source: "audit", severity: "medium", title: "SOC2 Control Gap Detected", description: "Access removal process not completed within 24 hours for terminated employee", metadata: { controlId: "CC6.3", framework: "SOC2", employee: "former-dev@xunia.io" } },
  ];
  await db.insert(securityEvents).values(eventRows);
  seeded.push("security_events");

  // ── SOAR Playbooks + Executions ──
  const [pb1, pb2, pb3] = await db.insert(soarPlaybooks).values([
    { organizationId: orgId, name: "Auto-Block Malicious IP", description: "Automatically blocks IPs with 5+ failed login attempts by updating firewall rules", trigger: "failed_login_threshold", category: "response", actions: [{ step: 1, action: "query_logs", params: { threshold: 5, window: "10m" } }, { step: 2, action: "block_ip", params: { duration: "24h" } }, { step: 3, action: "notify_team", params: { channel: "security-alerts" } }], isActive: true, isBuiltin: true, executionCount: 23, lastExecutedAt: agoH(6) },
    { organizationId: orgId, name: "Incident Triage & Enrichment", description: "Automatically enriches new incidents with threat intelligence and assigns severity", trigger: "new_incident", category: "triage", actions: [{ step: 1, action: "enrich_iocs" }, { step: 2, action: "check_threat_feeds" }, { step: 3, action: "assign_severity" }, { step: 4, action: "create_ticket" }], isActive: true, isBuiltin: true, executionCount: 12, lastExecutedAt: agoH(3) },
    { organizationId: orgId, name: "Certificate Expiry Auto-Renew", description: "Monitors TLS certificates and triggers renewal 30 days before expiry", trigger: "cert_expiry_warning", category: "maintenance", actions: [{ step: 1, action: "check_expiry" }, { step: 2, action: "request_renewal" }, { step: 3, action: "deploy_cert" }, { step: 4, action: "verify_tls" }], isActive: true, executionCount: 5, lastExecutedAt: ago(4) },
  ]).returning();
  await db.insert(soarExecutions).values([
    { organizationId: orgId, playbookId: pb1.id, playbookName: "Auto-Block Malicious IP", triggeredBy: "automated", status: "completed", steps: [{ name: "query_logs", status: "completed", output: "5 IPs exceeded threshold" }, { name: "block_ip", status: "completed", output: "Blocked 185.220.101.42" }, { name: "notify_team", status: "completed", output: "Slack notification sent" }], duration: 12, startedAt: agoH(6), completedAt: agoH(6) },
    { organizationId: orgId, playbookId: pb2.id, playbookName: "Incident Triage & Enrichment", triggeredBy: "automated", status: "completed", steps: [{ name: "enrich_iocs", status: "completed", output: "3 IOCs enriched" }, { name: "check_threat_feeds", status: "completed", output: "1 match in threat feed" }, { name: "assign_severity", status: "completed", output: "Severity: high" }, { name: "create_ticket", status: "completed", output: "Ticket INC-2024-042 created" }], duration: 8, startedAt: agoH(3), completedAt: agoH(3) },
    { organizationId: orgId, playbookId: pb1.id, playbookName: "Auto-Block Malicious IP", triggeredBy: "manual", status: "completed", steps: [{ name: "query_logs", status: "completed", output: "2 IPs exceeded threshold" }, { name: "block_ip", status: "completed", output: "Blocked 198.51.100.17" }, { name: "notify_team", status: "completed", output: "Slack notification sent" }], duration: 9, startedAt: ago(1), completedAt: ago(1) },
  ]);
  seeded.push("soar_playbooks", "soar_executions");

  // ── Security Graph ──
  const gNodes = await db.insert(graphNodes).values([
    { organizationId: orgId, nodeType: "asset", externalId: "api-gateway", label: "API Gateway", properties: { type: "web_app", criticality: "critical" }, riskScore: 85 },
    { organizationId: orgId, nodeType: "asset", externalId: "auth-service", label: "Auth Service", properties: { type: "microservice", criticality: "critical" }, riskScore: 72 },
    { organizationId: orgId, nodeType: "asset", externalId: "prod-db", label: "Production Database", properties: { type: "database", criticality: "critical" }, riskScore: 60 },
    { organizationId: orgId, nodeType: "identity", externalId: "admin-role", label: "Admin Role", properties: { type: "role", members: 2 }, riskScore: 45 },
    { organizationId: orgId, nodeType: "vulnerability", externalId: "sqli-vuln", label: "SQL Injection (CVE-2024-1234)", properties: { severity: "critical", cvss: 9.8 }, riskScore: 95 },
    { organizationId: orgId, nodeType: "vulnerability", externalId: "jwt-vuln", label: "JWT Algorithm Confusion", properties: { severity: "high", cvss: 8.5 }, riskScore: 80 },
    { organizationId: orgId, nodeType: "asset", externalId: "k8s-cluster", label: "Kubernetes Cluster", properties: { type: "infrastructure", nodes: 5 }, riskScore: 55 },
    { organizationId: orgId, nodeType: "identity", externalId: "service-account", label: "CI/CD Service Account", properties: { type: "service_account", permissions: "admin" }, riskScore: 70 },
  ]).returning();
  const gn = (label: string) => gNodes.find(n => n.label === label)!.id;
  await db.insert(graphEdges).values([
    { organizationId: orgId, sourceNodeId: gn("API Gateway"), targetNodeId: gn("Auth Service"), edgeType: "connects_to", weight: 1 },
    { organizationId: orgId, sourceNodeId: gn("API Gateway"), targetNodeId: gn("Production Database"), edgeType: "accesses", weight: 0.8 },
    { organizationId: orgId, sourceNodeId: gn("Auth Service"), targetNodeId: gn("Production Database"), edgeType: "reads_from", weight: 0.9 },
    { organizationId: orgId, sourceNodeId: gn("Admin Role"), targetNodeId: gn("API Gateway"), edgeType: "has_access_to", weight: 1 },
    { organizationId: orgId, sourceNodeId: gn("SQL Injection (CVE-2024-1234)"), targetNodeId: gn("API Gateway"), edgeType: "affects", weight: 1 },
    { organizationId: orgId, sourceNodeId: gn("JWT Algorithm Confusion"), targetNodeId: gn("Auth Service"), edgeType: "affects", weight: 1 },
    { organizationId: orgId, sourceNodeId: gn("CI/CD Service Account"), targetNodeId: gn("Kubernetes Cluster"), edgeType: "manages", weight: 1 },
    { organizationId: orgId, sourceNodeId: gn("Kubernetes Cluster"), targetNodeId: gn("API Gateway"), edgeType: "hosts", weight: 0.7 },
  ]);
  seeded.push("graph_nodes", "graph_edges");

  // ── DevSecOps Pipelines + Alerts + Monitoring ──
  await db.insert(pipelineConfigs).values([
    { organizationId: orgId, name: "API Gateway CI/CD", provider: "github_actions", repositoryUrl: "https://github.com/xunia/api-gateway", branch: "main", scanTypes: ["semgrep", "trivy"], failOnCritical: true, failOnHigh: true, isActive: true, lastTriggeredAt: ago(1) },
    { organizationId: orgId, name: "Web Dashboard Pipeline", provider: "github_actions", repositoryUrl: "https://github.com/xunia/web-dashboard", branch: "main", scanTypes: ["semgrep"], failOnCritical: true, isActive: true, lastTriggeredAt: ago(2) },
    { organizationId: orgId, name: "Auth Service Pipeline", provider: "gitlab_ci", repositoryUrl: "https://gitlab.com/xunia/auth-service", branch: "main", scanTypes: ["bandit", "trivy"], failOnCritical: true, isActive: true, lastTriggeredAt: ago(3) },
  ]);
  await db.insert(alertRules).values([
    { organizationId: orgId, name: "Critical Vulnerability Alert", description: "Alert on any new critical or high severity vulnerability", trigger: "critical_finding", channels: ["email", "slack"], slackChannel: "#security-alerts", isActive: true },
    { organizationId: orgId, name: "Incident Created", description: "Notify when a new security incident is created", trigger: "new_incident", channels: ["email", "slack", "pagerduty"], slackChannel: "#incidents", isActive: true },
    { organizationId: orgId, name: "Compliance Drift", description: "Alert when compliance score drops below 80%", trigger: "compliance_drift", channels: ["email"], isActive: true },
  ]);
  await db.insert(monitoringConfigs).values([
    { organizationId: orgId, name: "Continuous Vulnerability Monitoring", type: "vulnerability_scan", targetType: "all", isEnabled: true, schedule: "*/6 * * * *", lastRunAt: agoH(2) },
    { organizationId: orgId, name: "Dark Web Monitoring", type: "dark_web_scan", targetType: "domain", isEnabled: true, schedule: "0 */12 * * *", lastRunAt: agoH(12) },
  ]);
  seeded.push("pipeline_configs", "alert_rules", "monitoring_configs");

  // ── Remediation Tasks (Security Roadmap) ──
  await db.insert(remediationTasks).values([
    { organizationId: orgId, title: "Remediate SQL Injection in API Search", owner: "Zyra", status: "in_progress", priority: "critical", category: "vulnerability", targetDate: ago(-7), description: "Fix blind SQL injection in /api/search endpoint discovered during pentest" },
    { organizationId: orgId, title: "Update xz-utils Across All Images", owner: "Platform Team", status: "open", priority: "critical", category: "supply_chain", targetDate: ago(-3), description: "Update xz-utils to 5.6.2+ to address CVE-2024-3094 backdoor" },
    { organizationId: orgId, title: "Implement MFA for All Admin Accounts", owner: "Zyra", status: "completed", priority: "high", category: "access_control", completedAt: ago(5), description: "Enforce TOTP-based MFA for all admin and owner roles" },
    { organizationId: orgId, title: "Complete SOC2 CC6.3 Access Removal Controls", owner: "Zyra", status: "in_progress", priority: "high", category: "compliance", targetDate: ago(-14), description: "Implement automated access removal within 24 hours of employee termination" },
    { organizationId: orgId, title: "Deploy Network Segmentation for Database Tier", owner: "Infra Team", status: "open", priority: "medium", category: "network", targetDate: ago(-30), description: "Implement VPC isolation between application and database tiers" },
    { organizationId: orgId, title: "Rotate All Exposed Credentials", owner: "Zyra", status: "completed", priority: "critical", category: "secrets", completedAt: ago(3), description: "Rotate AWS keys, GitHub tokens, and database passwords found in code" },
  ]);
  seeded.push("remediation_tasks");

  // ── Tasks (Task Center) ──
  await db.insert(tasks).values([
    { organizationId: orgId, title: "Review Q1 Security Assessment Report", description: "Review and approve the quarterly security assessment report before distribution", status: "pending" as const, priority: "high", assignedTo: userId, type: "review" },
    { organizationId: orgId, title: "Investigate Dark Web Credential Leak", description: "Investigate the credential leak found on dark web marketplace and determine impact", status: "running" as const, priority: "critical", assignedTo: userId, type: "incident" },
    { organizationId: orgId, title: "Update Vendor Risk Questionnaire for Acme Analytics", description: "Follow up with Acme Analytics on incomplete security questionnaire", status: "pending" as const, priority: "medium", assignedTo: userId, type: "vendor" },
    { organizationId: orgId, title: "Schedule Penetration Test for Payment Service", description: "Coordinate with pentest team to schedule assessment of payment-processor repo", status: "pending" as const, priority: "high", assignedTo: userId, type: "scan" },
  ]);
  seeded.push("tasks");

  return { seeded };
}
