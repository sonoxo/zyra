import { storage } from "./storage";

interface MetricPoint {
  value: number;
  timestamp: number;
}

const counters: Record<string, number> = {
  api_requests_total: 0,
  api_errors_total: 0,
  scans_started_total: 0,
  scans_completed_total: 0,
  soar_executions_total: 0,
  security_events_total: 0,
  threat_correlations_total: 0,
};

const histograms: Record<string, number[]> = {
  api_request_duration_ms: [],
  scan_duration_ms: [],
};

export function incrementCounter(name: string, by = 1) {
  if (counters[name] !== undefined) counters[name] += by;
  else counters[name] = by;
}

export function recordDuration(histogram: string, durationMs: number) {
  if (!histograms[histogram]) histograms[histogram] = [];
  histograms[histogram].push(durationMs);
  if (histograms[histogram].length > 1000) histograms[histogram].shift();
}

export function getMetrics() {
  const histStats: Record<string, any> = {};
  for (const [name, values] of Object.entries(histograms)) {
    if (values.length === 0) {
      histStats[name] = { count: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    } else {
      const sorted = [...values].sort((a, b) => a - b);
      histStats[name] = {
        count: sorted.length,
        avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
  }
  return { counters, histograms: histStats, uptime: process.uptime(), timestamp: Date.now() };
}

export function getPrometheusMetrics(): string {
  const lines: string[] = [];
  const metrics = getMetrics();

  for (const [name, value] of Object.entries(metrics.counters)) {
    lines.push(`# HELP zyra_${name} Zyra counter`);
    lines.push(`# TYPE zyra_${name} counter`);
    lines.push(`zyra_${name} ${value}`);
  }

  for (const [name, stats] of Object.entries(metrics.histograms)) {
    lines.push(`# HELP zyra_${name} Zyra histogram`);
    lines.push(`# TYPE zyra_${name} summary`);
    lines.push(`zyra_${name}{quantile="0.5"} ${(stats as any).p50 || 0}`);
    lines.push(`zyra_${name}{quantile="0.95"} ${(stats as any).p95 || 0}`);
    lines.push(`zyra_${name}{quantile="0.99"} ${(stats as any).p99 || 0}`);
    lines.push(`zyra_${name}_count ${(stats as any).count || 0}`);
  }

  lines.push(`zyra_process_uptime_seconds ${Math.floor(metrics.uptime)}`);
  return lines.join("\n");
}

export function requestMetricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    incrementCounter("api_requests_total");
    res.on("finish", () => {
      const duration = Date.now() - start;
      recordDuration("api_request_duration_ms", duration);
      if (res.statusCode >= 400) incrementCounter("api_errors_total");
    });
    next();
  };
}

export async function emitSecurityEvent(orgId: string, event: {
  eventType: string;
  source: string;
  severity: string;
  title: string;
  description?: string;
  assetId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    incrementCounter("security_events_total");
    await storage.createSecurityEvent({
      organizationId: orgId,
      eventType: event.eventType,
      source: event.source,
      assetId: event.assetId,
      severity: event.severity,
      title: event.title,
      description: event.description,
      metadata: event.metadata ?? {},
      isCorrelated: false,
    });
  } catch (_) {}
}

export async function runThreatCorrelation(orgId: string): Promise<{ correlations: any[]; eventsCreated: number }> {
  incrementCounter("threat_correlations_total");

  const correlations: any[] = [];
  let eventsCreated = 0;

  try {
    const sbomItems = await storage.getSbomItems(orgId);
    if (sbomItems.length === 0) return { correlations, eventsCreated };

    const { fetchCveDatabase } = await import("./intelligence");
    const cves = await fetchCveDatabase(orgId);

    for (const cve of cves) {
      if (!cve.affectedInEnvironment) continue;
      const affected = sbomItems.filter(item =>
        cve.affectedPackages.some((pkg: string) =>
          item.name?.toLowerCase().includes(pkg.toLowerCase())
        )
      );
      if (affected.length > 0) {
        correlations.push({
          cveId: cve.cveId,
          severity: cve.severity,
          affectedPackages: affected.map(a => `${a.name}@${a.version}`),
          cvssScore: cve.cvssScore,
        });

        await emitSecurityEvent(orgId, {
          eventType: "cve_correlation",
          source: "threat_correlation_engine",
          severity: cve.severity === "critical" ? "critical" : "high",
          title: `${cve.cveId} affects ${affected.length} SBOM package(s)`,
          description: `Vulnerability ${cve.cveId} (CVSS ${cve.cvssScore}) detected in: ${affected.map(a => a.name).join(", ")}`,
          metadata: { cveId: cve.cveId, affectedCount: affected.length },
        });
        eventsCreated++;
      }
    }
  } catch (_) {}

  return { correlations, eventsCreated };
}

export async function seedSecurityEvents(orgId: string): Promise<void> {
  const existing = await storage.getSecurityEvents(orgId, 5);
  if (existing.length > 0) return;

  const seedEvents = [
    { eventType: "vulnerability_detected", source: "trivy", severity: "critical", title: "CVE-2021-44228 Log4Shell detected in log4j-core:2.14.1", description: "Log4j RCE vulnerability found in SBOM package log4j-core version 2.14.1", assetId: "api-server-prod" },
    { eventType: "scan_completed", source: "semgrep", severity: "high", title: "Semgrep scan completed: 3 critical findings", description: "Code scan on zyra-app detected SQL injection, hardcoded secret, and path traversal" },
    { eventType: "threat_detected", source: "threat_hunting", severity: "critical", title: "Lateral movement detected from compromised host", description: "Unusual network connections detected from api-server-01 to internal database nodes", assetId: "api-server-01" },
    { eventType: "secret_exposed", source: "secrets_scanner", severity: "high", title: "AWS access key exposed in git history", description: "AKIA... key found in commit history of frontend-app repository" },
    { eventType: "anomaly_detected", source: "dark_web_monitor", severity: "medium", title: "Company email found on dark web forum", description: "admin@company.com credential found in dark web breach dataset" },
    { eventType: "soar_execution", source: "soar", severity: "info", title: "SOAR: Block Malicious IP executed", description: "Playbook triggered by threat intelligence feed, IP 185.220.101.x blocked across 4 firewall rules" },
    { eventType: "cve_correlation", source: "threat_correlation_engine", severity: "critical", title: "CVE-2024-0727 correlates with 2 production assets", description: "OpenSSL vulnerability affects api-server-prod and auth-service based on SBOM analysis" },
    { eventType: "compliance_drift", source: "compliance_engine", severity: "medium", title: "PCI-DSS control drift detected", description: "Requirement 6.3.3 (patch management) score dropped below threshold" },
    { eventType: "incident_created", source: "incident_response", severity: "critical", title: "P1 Incident: Active data exfiltration attempt", description: "Unusual data transfer volume detected from production database (4.2GB in 10 minutes)" },
    { eventType: "access_anomaly", source: "identity_monitoring", severity: "high", title: "Privileged access from unexpected location", description: "Admin login from new country (RU) for user john.smith@company.com — 2FA not triggered" },
  ];

  for (const ev of seedEvents) {
    await storage.createSecurityEvent({
      organizationId: orgId,
      ...ev,
      metadata: {},
      isCorrelated: Math.random() > 0.5,
    });
  }
}
