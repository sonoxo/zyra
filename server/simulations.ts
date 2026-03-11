import { storage } from "./storage";
import { type PentestSession, type CloudScanTarget, type ThreatIntelItem } from "@shared/schema";

export async function runPentestSimulation(sessionId: string, orgId: string, testTypes: string[]) {
  // Wait 3-12s per test type as per requirement
  for (const type of testTypes) {
    const delay = Math.floor(Math.random() * 9000) + 3000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Generate 0-3 findings
    const count = Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const severities = ["critical", "high", "medium", "low", "info"];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      await storage.createPentestFinding({
        sessionId,
        organizationId: orgId,
        testType: type,
        severity,
        title: `${type.replace(/_/g, ' ').toUpperCase()} Finding ${i + 1}`,
        description: `This is a simulated ${severity} finding for ${type}.`,
        payload: "OR 1=1 --",
        responseSnippet: "HTTP/1.1 200 OK\nServer: nginx\nContent-Type: text/html",
        evidence: "Screenshot-of-payload-execution.png",
        cvssScore: severity === "critical" ? 9.8 : severity === "high" ? 7.5 : 5.0,
        remediationSteps: "Update your sanitization logic and use parameterized queries.",
        status: "open"
      });
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
  // Short simulation delay
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const findings = [
    { checkName: "Public S3 Bucket", category: "Storage", severity: "high", resourceType: "Bucket", description: "Bucket is publicly accessible", recommendation: "Remove public access" },
    { checkName: "Unencrypted EBS Volume", category: "Storage", severity: "medium", resourceType: "Volume", description: "EBS volume is not encrypted", recommendation: "Enable encryption" },
    { checkName: "Overly Permissive IAM Policy", category: "IAM", severity: "critical", resourceType: "Role", description: "Role has AdministratorAccess", recommendation: "Apply least privilege" },
    { checkName: "Logging Disabled", category: "Logging", severity: "low", resourceType: "CloudTrail", description: "CloudTrail is disabled in region", recommendation: "Enable CloudTrail" },
    { checkName: "Exposed SSH Port", category: "Network", severity: "high", resourceType: "SecurityGroup", description: "SSH port (22) is open to 0.0.0.0/0", recommendation: "Restrict SSH access" }
  ];

  for (const f of findings) {
    if (Math.random() > 0.3) {
      await storage.createCloudScanResult({
        targetId,
        organizationId: orgId,
        checkName: f.checkName,
        category: f.category,
        severity: f.severity,
        resourceId: `${provider}-${Math.floor(Math.random() * 10000)}`,
        resourceType: f.resourceType,
        description: f.description,
        recommendation: f.recommendation,
        status: "open"
      });
    }
  }

  await storage.updateCloudScanTarget(targetId, { lastScannedAt: new Date() });
}

export async function refreshThreatIntel(orgId: string) {
  const packages = ["lodash", "express", "axios", "next.js", "react", "webpack", "node", "openssl"];
  const count = Math.floor(Math.random() * 6) + 3; // 3-8
  
  for (let i = 0; i < count; i++) {
    const pkg = packages[Math.floor(Math.random() * packages.length)];
    const id = Math.floor(Math.random() * 99999);
    await storage.createThreatIntelItem({
      organizationId: orgId,
      cveId: `CVE-2024-${id}`,
      title: `Vulnerability in ${pkg}`,
      severity: i % 3 === 0 ? "critical" : "high",
      cvssScore: i % 3 === 0 ? 9.8 : 8.1,
      description: `A simulated security vulnerability was found in ${pkg} that allows for remote code execution.`,
      affectedPackages: [pkg],
      affectedVersions: ["1.0.0", "1.0.1"],
      patchedVersions: ["1.0.2"],
      publishedAt: new Date(),
      source: "nvd",
      status: "active"
    });
  }
}
