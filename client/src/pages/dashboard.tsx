import { useQuery } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, Target, Zap, FileText, RefreshCw, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Link } from "wouter";
import type { Scan, ScanFinding } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalScans: number;
  activeScans: number;
  totalFindings: number;
  resolvedFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  securityScore: number;
  complianceScore: number;
  recentScans: Scan[];
  criticalIssues: ScanFinding[];
  findingsTrend: Array<{ date: string; critical: number; high: number; medium: number; low: number }>;
  complianceCoverage: Array<{ framework: string; coverage: number; status: string }>;
  scansByTool: Array<{ tool: string; count: number; color: string }>;
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

const FRAMEWORK_COLORS: Record<string, string> = {
  SOC2: "#3b82f6",
  HIPAA: "#8b5cf6",
  ISO27001: "#06b6d4",
  "PCI-DSS": "#f97316",
  FedRAMP: "#10b981",
  GDPR: "#ec4899",
};

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, trend, color = "primary", loading }: any) {
  return (
    <Card className="border-card-border hover-elevate relative overflow-hidden">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                color === "critical" ? "bg-red-500/10" :
                color === "warning" ? "bg-orange-500/10" :
                color === "success" ? "bg-green-500/10" :
                "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-4.5 h-4.5",
                  color === "critical" ? "text-red-500" :
                  color === "warning" ? "text-orange-500" :
                  color === "success" ? "text-green-500" :
                  "text-primary"
                )} />
              </div>
              {trend !== undefined && (
                <div className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-red-500" : "text-green-500")}>
                  {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
            <span className="font-medium text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Security Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time security posture overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </Badge>
          <Link href="/scans">
            <Button size="sm" data-testid="button-new-scan" className="gap-2">
              <Zap className="w-3.5 h-3.5" />
              New Scan
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
          <div className="col-span-2 xl:col-span-2">
            <Card className="border-card-border h-full">
              <CardContent className="p-5 flex items-center gap-6 h-full">
                {isLoading ? (
                  <div className="flex gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <Skeleton className="w-24 h-24 rounded-full" />
                  </div>
                ) : (
                  <>
                    <ScoreGauge score={stats?.securityScore ?? 0} label="Security Score" />
                    <ScoreGauge score={stats?.complianceScore ?? 0} label="Compliance" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <StatCard icon={Activity} label="Total Scans" value={stats?.totalScans ?? 0} subtext={`${stats?.activeScans ?? 0} running`} loading={isLoading} />
          <StatCard icon={AlertTriangle} label="Critical Issues" value={stats?.criticalFindings ?? 0} color="critical" trend={12} loading={isLoading} />
          <StatCard icon={Shield} label="High Severity" value={stats?.highFindings ?? 0} color="warning" trend={-5} loading={isLoading} />
          <StatCard icon={CheckCircle} label="Resolved" value={stats?.resolvedFindings ?? 0} color="success" trend={-8} loading={isLoading} />
          <StatCard icon={Target} label="Total Findings" value={stats?.totalFindings ?? 0} loading={isLoading} />
          <StatCard icon={FileText} label="Medium Issues" value={stats?.mediumFindings ?? 0} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                  Vulnerability Trends (Last 30 Days)
                  <Badge variant="outline" className="text-xs font-normal">Daily</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-52 w-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={stats?.findingsTrend ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {Object.entries(SEVERITY_COLORS).slice(0, 4).map(([k, v]) => (
                          <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={v} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={v} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="critical" stroke={SEVERITY_COLORS.critical} fill={`url(#grad-critical)`} strokeWidth={2} />
                      <Area type="monotone" dataKey="high" stroke={SEVERITY_COLORS.high} fill={`url(#grad-high)`} strokeWidth={2} />
                      <Area type="monotone" dataKey="medium" stroke={SEVERITY_COLORS.medium} fill={`url(#grad-medium)`} strokeWidth={2} />
                      <Area type="monotone" dataKey="low" stroke={SEVERITY_COLORS.low} fill={`url(#grad-low)`} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center gap-4 mt-2 justify-center">
                  {Object.entries(SEVERITY_COLORS).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: v }} />
                      <span className="text-xs text-muted-foreground capitalize">{k}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Scan Tool Coverage</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-52 w-full rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={stats?.scansByTool ?? []}
                      cx="50%" cy="45%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {(stats?.scansByTool ?? []).map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-popover border border-popover-border rounded-lg p-2 shadow-lg text-xs">
                        <span className="font-semibold">{payload[0].name}</span>: {payload[0].value}
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(stats?.scansByTool ?? []).map((t) => (
                  <div key={t.tool} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="text-xs text-muted-foreground">{t.tool}</span>
                    <span className="text-xs font-medium text-foreground ml-auto">{t.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                Compliance Framework Coverage
                <Link href="/compliance">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
              ) : (
                (stats?.complianceCoverage ?? []).map((fw) => (
                  <div key={fw.framework} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: FRAMEWORK_COLORS[fw.framework] || "#6b7280" }}
                        />
                        <span className="text-sm font-medium text-foreground">{fw.framework}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{fw.coverage}%</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs h-5 px-1.5",
                            fw.status === "compliant" ? "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5" :
                            fw.status === "partial" ? "border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/5" :
                            "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5"
                          )}
                        >
                          {fw.status}
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={fw.coverage}
                      className="h-1.5"
                      style={{ "--progress-color": FRAMEWORK_COLORS[fw.framework] || "#6b7280" } as any}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                Recent Security Scans
                <Link href="/scans">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              ) : (
                (stats?.recentScans ?? []).map((scan) => (
                  <Link key={scan.id} href={`/scans/${scan.id}`}>
                    <div
                      data-testid={`scan-card-${scan.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        scan.status === "completed" ? "bg-green-500/10" :
                        scan.status === "running" ? "bg-blue-500/10" :
                        scan.status === "failed" ? "bg-red-500/10" : "bg-muted"
                      )}>
                        {scan.status === "completed" ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                         scan.status === "running" ? <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" /> :
                         scan.status === "failed" ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                         <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{scan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {scan.scanType.toUpperCase()} · {scan.totalFindings} findings
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {scan.criticalCount > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 px-1.5">
                            {scan.criticalCount} crit
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
              {!isLoading && (!stats?.recentScans || stats.recentScans.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No scans yet</p>
                  <Link href="/scans">
                    <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">Start your first scan</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {(stats?.criticalIssues?.length ?? 0) > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Issues Requiring Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {(stats?.criticalIssues ?? []).map((issue) => (
                <div key={issue.id} data-testid={`critical-issue-${issue.id}`} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-red-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{issue.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</div>
                    {issue.filePath && (
                      <div className="text-xs font-mono text-muted-foreground mt-1 bg-muted/50 px-1.5 py-0.5 rounded inline-block">{issue.filePath}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="destructive" className="text-xs h-5">Critical</Badge>
                    {issue.complianceFrameworks?.length > 0 && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5">{issue.complianceFrameworks[0]}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
