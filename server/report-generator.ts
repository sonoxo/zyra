import { storage } from "./storage";

export async function generateReport(reportId: string, orgId: string, frameworks: string[]) {
  try {
    await delay(2000);

    const allFindings = await storage.getFindingsByOrg(orgId);
    const mappings = await storage.getComplianceMappings(orgId);

    const criticalCount = allFindings.filter((f) => f.severity === "critical" && !f.isResolved).length;
    const highCount = allFindings.filter((f) => f.severity === "high" && !f.isResolved).length;
    const mediumCount = allFindings.filter((f) => f.severity === "medium" && !f.isResolved).length;
    const lowCount = allFindings.filter((f) => f.severity === "low" && !f.isResolved).length;
    const totalVulnerabilities = criticalCount + highCount + mediumCount + lowCount;

    const securityScore = Math.max(0, Math.min(100,
      100 - (criticalCount * 15) - (highCount * 8) - (mediumCount * 3) - (lowCount * 1)
    ));

    const complianceSummary = frameworks.map((fw) => {
      const fwMappings = mappings.filter((m) => m.framework === fw);
      const avg = fwMappings.length > 0
        ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
        : 0;
      const compliantCount = fwMappings.filter((m) => m.status === "compliant").length;
      const totalControls = fwMappings.length;
      return {
        framework: fw,
        coverage: avg,
        compliantControls: compliantCount,
        totalControls,
        status: avg >= 80 ? "compliant" : avg >= 50 ? "partial" : "non-compliant",
      };
    });

    const executiveSummary = generateExecutiveSummary(
      totalVulnerabilities, criticalCount, highCount, mediumCount, lowCount,
      securityScore, complianceSummary, frameworks
    );

    const recommendations = generateRecommendations(allFindings, complianceSummary);

    await storage.updateReport(reportId, {
      status: "ready",
      securityScore,
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      executiveSummary,
      complianceSummary,
      recommendations,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error("Report generation error:", err);
    await storage.updateReport(reportId, { status: "failed" });
  }
}

function generateExecutiveSummary(
  total: number, critical: number, high: number, medium: number, low: number,
  score: number, compliance: any[], frameworks: string[]
): string {
  const riskLevel = score >= 80 ? "LOW" : score >= 60 ? "MODERATE" : score >= 40 ? "HIGH" : "CRITICAL";
  const overallCompliance = compliance.length > 0
    ? Math.round(compliance.reduce((a, c) => a + c.coverage, 0) / compliance.length)
    : 0;

  let summary = `This security audit report provides a comprehensive assessment of the organization's security posture across ${frameworks.length} compliance frameworks (${frameworks.join(", ")}).\n\n`;

  summary += `OVERALL RISK ASSESSMENT: ${riskLevel}\n`;
  summary += `Security Score: ${score}/100\n`;
  summary += `Overall Compliance Coverage: ${overallCompliance}%\n\n`;

  if (total === 0) {
    summary += `No active vulnerabilities were detected during this assessment period. The organization maintains a strong security posture. Continue regular scanning and monitoring to maintain this status.\n`;
  } else {
    summary += `A total of ${total} vulnerabilities were identified during this assessment:\n`;
    if (critical > 0) summary += `- ${critical} CRITICAL vulnerabilities requiring immediate remediation\n`;
    if (high > 0) summary += `- ${high} HIGH severity issues that should be addressed within 7 days\n`;
    if (medium > 0) summary += `- ${medium} MEDIUM severity findings for planned remediation\n`;
    if (low > 0) summary += `- ${low} LOW severity items for consideration\n`;

    summary += `\n`;

    if (critical > 0) {
      summary += `IMMEDIATE ACTION REQUIRED: Critical vulnerabilities present a significant risk to the organization's security posture and compliance status. These should be prioritized for immediate remediation.\n\n`;
    }
  }

  summary += `COMPLIANCE STATUS:\n`;
  for (const c of compliance) {
    summary += `- ${c.framework}: ${c.coverage}% coverage (${c.compliantControls}/${c.totalControls} controls compliant) - ${c.status.toUpperCase()}\n`;
  }

  return summary;
}

function generateRecommendations(findings: any[], compliance: any[]): any[] {
  const recs: any[] = [];

  const criticalFindings = findings.filter((f) => f.severity === "critical" && !f.isResolved);
  if (criticalFindings.length > 0) {
    recs.push({
      title: "Remediate Critical Vulnerabilities Immediately",
      description: `${criticalFindings.length} critical vulnerabilities were found. These include ${criticalFindings.map(f => f.title).slice(0, 3).join(", ")}. Prioritize these for immediate patching.`,
      priority: "high",
      frameworks: Array.from(new Set(criticalFindings.flatMap((f) => f.complianceFrameworks || []))).slice(0, 4),
    });
  }

  const highFindings = findings.filter((f) => f.severity === "high" && !f.isResolved);
  if (highFindings.length > 0) {
    recs.push({
      title: "Address High Severity Security Gaps",
      description: `${highFindings.length} high severity issues need attention within the next sprint cycle. Focus on authentication and access control weaknesses.`,
      priority: "high",
      frameworks: Array.from(new Set(highFindings.flatMap((f) => f.complianceFrameworks || []))).slice(0, 4),
    });
  }

  const nonCompliant = compliance.filter((c) => c.status === "non-compliant");
  if (nonCompliant.length > 0) {
    recs.push({
      title: "Improve Compliance Coverage for Non-Compliant Frameworks",
      description: `${nonCompliant.map(c => c.framework).join(", ")} ${nonCompliant.length === 1 ? "is" : "are"} below compliance thresholds. Implement required security controls to achieve compliance.`,
      priority: "high",
      frameworks: nonCompliant.map((c) => c.framework),
    });
  }

  recs.push({
    title: "Implement Automated Dependency Scanning in CI/CD",
    description: "Set up automated dependency vulnerability scanning as part of the CI/CD pipeline to catch vulnerabilities early in the development lifecycle.",
    priority: "medium",
    frameworks: ["SOC2", "PCI-DSS", "ISO27001"],
  });

  recs.push({
    title: "Enable Security Headers Across All Endpoints",
    description: "Ensure all web-facing endpoints return proper security headers including CSP, HSTS, X-Frame-Options, and X-Content-Type-Options.",
    priority: "medium",
    frameworks: ["SOC2", "PCI-DSS"],
  });

  recs.push({
    title: "Schedule Regular Penetration Testing",
    description: "Establish a quarterly penetration testing schedule with a qualified third party to validate security controls and discover vulnerabilities not caught by automated scanning.",
    priority: "low",
    frameworks: ["SOC2", "ISO27001", "FedRAMP", "PCI-DSS"],
  });

  return recs;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
