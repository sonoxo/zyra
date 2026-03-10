import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, Shield, AlertTriangle, Activity, TrendingUp, TrendingDown,
  Globe, Layers, Monitor, Wifi
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  mttr: number;
  riskScore: number;
  totalOpen: number;
  scansPerWeek: number;
  severityTrend: Array<{ week: string; critical: number; high: number; medium: number; low: number }>;
  topCategories: Array<{ name: string; count: number }>;
  toolEffectiveness: Array<{ tool: string; findings: number; scans: number }>;
  cvssDistribution: Array<{ range: string; count: number }>;
  riskHistory: Array<{ week: string; score: number }>;
  resolvedCount: number;
  unresolvedCount: number;
  remediationBySeverity: Record<string, { avg: number; count: number }>;
  attackSurface: {
    external: number;
    internal: number;
    network: number;
    application: number;
  };
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

const CVSS_COLORS: Record<string, string> = {
  "0-2": "#6b7280",
  "2-4": "#3b82f6",
  "4-6": "#eab308",
  "6-8": "#f97316",
  "8-10": "#ef4444",
};

const DATE_RANGES = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "12mo", value: "12mo" },
];

function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  testId: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500 shrink-0" />}
                {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />}
                {subtitle}
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState("12mo");

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/vulnerabilities"],
  });

  const toolRadarData = data?.toolEffectiveness.map((t) => ({
    tool: t.tool,
    findings: t.findings,
    scans: t.scans,
  })) || [];

  const totalResolved = data?.resolvedCount || 0;
  const totalUnresolved = data?.unresolvedCount || 0;
  const totalAll = totalResolved + totalUnresolved;
  const resolvedPct = totalAll > 0 ? Math.round((totalResolved / totalAll) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-analytics-title">
              Vulnerability Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Advanced security insights and vulnerability metrics
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1" data-testid="date-range-selector">
            {DATE_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={dateRange === range.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setDateRange(range.value)}
                data-testid={`button-range-${range.value}`}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Mean Time to Resolve"
            value={isLoading ? "..." : `${data?.mttr || 0}d`}
            icon={Clock}
            subtitle="Average resolution time"
            trend="down"
            loading={isLoading}
            testId="kpi-mttr"
          />
          <KpiCard
            title="Risk Score"
            value={isLoading ? "..." : data?.riskScore || 0}
            icon={Shield}
            subtitle="Based on open vulnerabilities"
            trend={data && data.riskScore >= 70 ? "up" : "down"}
            loading={isLoading}
            testId="kpi-risk-score"
          />
          <KpiCard
            title="Total Open Vulns"
            value={isLoading ? "..." : data?.totalOpen || 0}
            icon={AlertTriangle}
            subtitle="Unresolved findings"
            loading={isLoading}
            testId="kpi-total-open"
          />
          <KpiCard
            title="Scan Frequency"
            value={isLoading ? "..." : `${data?.scansPerWeek || 0}/wk`}
            icon={Activity}
            subtitle="Scans per week"
            trend="up"
            loading={isLoading}
            testId="kpi-scan-frequency"
          />
        </div>

        <Card data-testid="chart-severity-trend">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Severity Trend</CardTitle>
            <Badge variant="outline">Weekly</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.severityTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke={SEVERITY_COLORS.critical} fill={SEVERITY_COLORS.critical} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="high" stackId="1" stroke={SEVERITY_COLORS.high} fill={SEVERITY_COLORS.high} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke={SEVERITY_COLORS.medium} fill={SEVERITY_COLORS.medium} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="low" stackId="1" stroke={SEVERITY_COLORS.low} fill={SEVERITY_COLORS.low} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="chart-top-categories">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Vulnerability Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.topCategories || []} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-testid="chart-tool-effectiveness">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Tool Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={toolRadarData}>
                    <PolarGrid className="stroke-muted/30" />
                    <PolarAngleAxis dataKey="tool" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis tick={{ fontSize: 10 }} />
                    <Radar name="Findings" dataKey="findings" stroke={SEVERITY_COLORS.high} fill={SEVERITY_COLORS.high} fillOpacity={0.3} />
                    <Radar name="Scans" dataKey="scans" stroke={SEVERITY_COLORS.low} fill={SEVERITY_COLORS.low} fillOpacity={0.3} />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="chart-cvss-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">CVSS Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.cvssDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(data?.cvssDistribution || []).map((entry) => (
                        <rect key={entry.range} fill={CVSS_COLORS[entry.range] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-testid="chart-risk-history">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Risk Score History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data?.riskHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="card-attack-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Attack Surface Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exposure Type</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-sm text-foreground">External</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-attack-external">
                          {data?.attackSurface.external || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm text-foreground">Internal</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-attack-internal">
                          {data?.attackSurface.internal || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Layer</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="text-sm text-foreground">Network</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-attack-network">
                          {data?.attackSurface.network || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-purple-500 shrink-0" />
                          <span className="text-sm text-foreground">Application</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground" data-testid="text-attack-application">
                          {data?.attackSurface.application || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-remediation">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Remediation Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved vs Unresolved</p>
                      <p className="text-lg font-bold text-foreground" data-testid="text-resolved-ratio">
                        {totalResolved} / {totalAll}
                        <span className="text-sm font-normal text-muted-foreground ml-2">({resolvedPct}%)</span>
                      </p>
                    </div>
                    <Badge
                      variant={resolvedPct >= 70 ? "default" : "destructive"}
                      data-testid="badge-remediation-status"
                    >
                      {resolvedPct >= 70 ? "Healthy" : "Needs Attention"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Days to Fix by Severity</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["critical", "high", "medium", "low"] as const).map((sev) => {
                        const info = data?.remediationBySeverity[sev];
                        return (
                          <div key={sev} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: SEVERITY_COLORS[sev] }}
                              />
                              <span className="text-xs capitalize text-foreground">{sev}</span>
                            </div>
                            <span className="text-xs font-semibold text-foreground" data-testid={`text-fix-days-${sev}`}>
                              {info?.avg || 0}d
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
