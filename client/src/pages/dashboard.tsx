import { useQuery } from "@tanstack/react-query";
import {
  Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Activity, Target, Zap, FileText, RefreshCw, ArrowUpRight,
  GraduationCap, Building, Eye, Map, Fish, Box,
  Cpu, DatabaseZap, GitFork, ScanSearch, Bot, ArrowRight, Server
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
  pentestStats?: { sessions: number; criticalFindings: number };
  cloudStats?: { targets: number; criticalMisconfigs: number };
  threatIntelStats?: { activeThreats: number; criticalCVEs: number; severityBreakdown?: Record<string, number> };
  monitoringActive?: boolean;
  teamMemberCount?: number;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  recentActivity?: Array<{ id: string; action: string; userId: string; resourceType: string | null; createdAt: string }>;
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

function AttackSurfaceMap({ stats }: { stats?: DashboardStats }) {
  const scansByTool = stats?.scansByTool ?? [];
  const hasScans = scansByTool.some(s => s.count > 0);
  const maxCount = Math.max(...scansByTool.map(s => s.count), 1);

  const data = hasScans
    ? scansByTool.map(s => ({ subject: s.tool, A: Math.round((s.count / maxCount) * 100), fullMark: 100 }))
    : [
        { subject: 'SAST', A: 0, fullMark: 100 },
        { subject: 'Container', A: 0, fullMark: 100 },
        { subject: 'Dependencies', A: 0, fullMark: 100 },
        { subject: 'DAST', A: 0, fullMark: 100 },
      ];

  const getFillColor = (value: number) => {
    if (value > 60) return "#ef4444";
    if (value > 40) return "#eab308";
    return "#10b981";
  };

  const avgScore = data.reduce((acc, curr) => acc + curr.A, 0) / data.length;

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Attack Surface Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Radar
                name="Risk Score"
                dataKey="A"
                stroke={getFillColor(avgScore)}
                fill={getFillColor(avgScore)}
                fillOpacity={0.5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-popover-border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-semibold text-foreground">{payload[0].payload.subject}</p>
                        <p className="text-muted-foreground">Risk Score: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function InfrastructurePosture({ stats }: { stats?: DashboardStats }) {
  const coverage = stats?.complianceCoverage ?? [];
  const postureItems = coverage.length > 0
    ? coverage.slice(0, 5).map(c => ({ label: c.framework, score: c.coverage }))
    : [
        { label: "SOC2", score: 0 },
        { label: "HIPAA", score: 0 },
        { label: "ISO27001", score: 0 },
        { label: "PCI-DSS", score: 0 },
        { label: "GDPR", score: 0 },
      ];

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Infrastructure Security Posture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {postureItems.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{item.label}</span>
              <span className="text-foreground font-bold">{item.score}%</span>
            </div>
            <Progress
              value={item.score}
              className="h-2"
              style={{
                "--progress-color": item.score >= 80 ? "#10b981" : item.score >= 60 ? "#eab308" : "#ef4444"
              } as any}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ComplianceMaturity({ stats }: { stats?: DashboardStats }) {
  const score = stats?.complianceScore ?? 0;
  let level = "Initial";
  if (score >= 90) level = "Optimizing";
  else if (score >= 75) level = "Managed";
  else if (score >= 60) level = "Defined";
  else if (score >= 40) level = "Developing";

  const levels = ["Initial", "Developing", "Defined", "Managed", "Optimizing"];

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Compliance Maturity Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-4">
        <div className="text-3xl font-bold text-primary mb-1">{level}</div>
        <div className="text-xs text-muted-foreground mb-6">Level {levels.indexOf(level) + 1} of 5</div>
        <div className="w-full flex justify-between gap-1">
          {levels.map((l, i) => (
            <div
              key={l}
              className={cn(
                "h-2 flex-1 rounded-full",
                i <= levels.indexOf(level) ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="w-full flex justify-between mt-2 px-1">
          <span className="text-[10px] text-muted-foreground">L1</span>
          <span className="text-[10px] text-muted-foreground">L5</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DependencyVulnerabilitySummary({ stats }: { stats?: DashboardStats }) {
  const hasData = stats?.threatIntelStats && stats.threatIntelStats.activeThreats > 0;

  // Mock data for breakdown if none provided by API
  const data = [
    { name: 'npm', count: 12 },
    { name: 'pypi', count: 5 },
    { name: 'go', count: 3 },
    { name: 'maven', count: 8 },
  ];

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Dependency Vulnerability Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[150px]">
        {hasData ? (
          <div className="w-full h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-popover-border rounded-lg p-2 shadow-lg text-xs">
                          <p className="font-semibold text-foreground">{payload[0].payload.name}</p>
                          <p className="text-muted-foreground">Vulnerabilities: {payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center p-4">
            <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
            <p className="text-xs text-muted-foreground">Run CVE refresh to see dependency vulnerabilities</p>
            <Link href="/threat-intel">
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs mt-1 text-primary hover:bg-transparent">Go to Threat Intel</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
          <StatCard icon={AlertTriangle} label="Critical Issues" value={stats?.criticalFindings ?? 0} color="critical" loading={isLoading} />
          <StatCard icon={Shield} label="High Severity" value={stats?.highFindings ?? 0} color="warning" loading={isLoading} />
          <StatCard icon={CheckCircle} label="Resolved" value={stats?.resolvedFindings ?? 0} color="success" loading={isLoading} />
          <StatCard icon={Target} label="Total Findings" value={stats?.totalFindings ?? 0} loading={isLoading} />
          <StatCard icon={FileText} label="Medium Issues" value={stats?.mediumFindings ?? 0} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/pentest">
            <Card className="border-card-border hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats?.pentestStats?.sessions ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium">Pentest Sessions</div>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/cloud-security">
            <Card className="border-card-border hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats?.cloudStats?.targets ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium">Cloud Targets</div>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/threat-intel">
            <Card className="border-card-border hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats?.threatIntelStats?.activeThreats ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    Threat Intel
                    {stats?.threatIntelStats?.criticalCVEs ? (
                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">{stats.threatIntelStats.criticalCVEs} crit</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/devsecops">
            <Card className="border-card-border hover-elevate cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats?.monitoringActive ? 'Active' : 'Disabled'}</div>
                  <div className="text-xs text-muted-foreground font-medium">Monitoring</div>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
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
                    <Button variant="ghost" size="sm" className="mt-1 h-auto p-0 text-xs">Start your first scan</Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttackSurfaceMap stats={stats} />
          <InfrastructurePosture stats={stats} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ComplianceMaturity stats={stats} />
          </div>
          <div className="lg:col-span-2">
            <DependencyVulnerabilitySummary stats={stats} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                Recent Activity
                <Link href="/audit-logs">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="link-view-audit-logs">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
              ) : (stats?.recentActivity?.length ?? 0) > 0 ? (
                stats!.recentActivity!.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0" data-testid={`activity-row-${a.id}`}>
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{a.action.replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                      {a.resourceType && <div className="text-xs text-muted-foreground">{a.resourceType}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Organization Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Team Members</span>
                <span className="text-sm font-semibold text-foreground" data-testid="text-team-count">{stats?.teamMemberCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Subscription</span>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  stats?.subscriptionStatus === "active" ? "border-green-500/30 text-green-600" :
                  stats?.subscriptionStatus === "trialing" ? "border-blue-500/30 text-blue-600" :
                  "border-red-500/30 text-red-600"
                )} data-testid="text-subscription-status">
                  {stats?.subscriptionStatus === "trialing" ? "Trial" : stats?.subscriptionStatus ?? "None"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-semibold text-foreground capitalize" data-testid="text-plan">{stats?.subscriptionPlan ?? "None"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Total Scans</span>
                <span className="text-sm font-semibold text-foreground">{stats?.totalScans ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <IntelligenceSection />
        <NewModulesSection />
      </div>
    </div>
  );
}

function IntelligenceSection() {
  const { data: intelStats } = useQuery<any>({ queryKey: ["/api/intelligence/stats"] });

  const tiles = [
    {
      href: "/asset-inventory",
      label: "Asset Inventory",
      icon: Cpu,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      stat: intelStats ? `${intelStats.assets ?? 0} assets` : "–",
      detail: intelStats ? `${intelStats.criticalAssets ?? 0} critical` : "Loading…",
      alert: (intelStats?.criticalAssets ?? 0) > 0 ? `${intelStats.criticalAssets} critical asset(s)` : null,
    },
    {
      href: "/cve-intelligence",
      label: "CVE Intelligence",
      icon: DatabaseZap,
      color: "text-red-500",
      bg: "bg-red-500/10",
      stat: intelStats ? `${intelStats.cves ?? 0} CVEs` : "–",
      detail: intelStats ? `${intelStats.criticalCves ?? 0} critical` : "Loading…",
      alert: (intelStats?.affectedCves ?? 0) > 0 ? `${intelStats.affectedCves} affect you` : null,
    },
    {
      href: "/attack-paths",
      label: "Attack Paths",
      icon: GitFork,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      stat: intelStats ? `${intelStats.attackPaths ?? 0} paths` : "–",
      detail: intelStats ? `${intelStats.criticalPaths ?? 0} critical paths` : "Loading…",
      alert: (intelStats?.criticalPaths ?? 0) > 0 ? `${intelStats.criticalPaths} critical path(s)` : null,
    },
    {
      href: "/threat-hunting",
      label: "Threat Hunting",
      icon: ScanSearch,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      stat: intelStats ? `${intelStats.huntQueries ?? 0} queries` : "–",
      detail: intelStats ? `${intelStats.huntHits ?? 0} hits` : "Loading…",
      alert: (intelStats?.huntHits ?? 0) > 0 ? `${intelStats.huntHits} threat(s) detected` : null,
    },
    {
      href: "/security-copilot",
      label: "AI Copilot",
      icon: Bot,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      stat: intelStats ? `${intelStats.copilotConversations ?? 0} sessions` : "–",
      detail: "Ask anything",
      alert: null,
    },
  ];

  return (
    <div data-testid="intelligence-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />Security Intelligence
        </h2>
        <Link href="/asset-inventory">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
            Explore <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map(mod => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="cursor-pointer hover:border-primary/30 transition-colors group" data-testid={`intel-card-${mod.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-4">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", mod.bg)}>
                    <Icon className={cn("w-4 h-4", mod.color)} />
                  </div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">{mod.label}</div>
                  <div className="text-lg font-bold">{mod.stat}</div>
                  <div className="text-xs text-muted-foreground">{mod.detail}</div>
                  {mod.alert && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-500 truncate">{mod.alert}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewModulesSection() {
  const { data: awarenessStats } = useQuery<any>({ queryKey: ["/api/security-awareness/stats"] });
  const { data: vendorStats } = useQuery<any>({ queryKey: ["/api/vendors/stats"] });
  const { data: darkWebStats } = useQuery<any>({ queryKey: ["/api/dark-web/stats"] });
  const { data: roadmapStats } = useQuery<any>({ queryKey: ["/api/roadmap/stats"] });
  const { data: bountyStats } = useQuery<any>({ queryKey: ["/api/bounty/stats"] });
  const { data: containerStats } = useQuery<any>({ queryKey: ["/api/containers/stats"] });

  const modules = [
    {
      href: "/security-awareness",
      label: "Security Awareness",
      icon: GraduationCap,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      stat: awarenessStats ? `${awarenessStats.enrollments ?? 0} enrolled` : "–",
      detail: awarenessStats ? `${awarenessStats.completionRate ?? 0}% completion` : "No data",
      alert: (awarenessStats?.activeCampaigns ?? 0) > 0 ? `${awarenessStats.activeCampaigns} active campaign(s)` : null,
    },
    {
      href: "/vendor-risk",
      label: "Vendor Risk",
      icon: Building,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      stat: vendorStats ? `${vendorStats.total ?? 0} vendors` : "–",
      detail: vendorStats ? `${vendorStats.high ?? 0} high risk` : "No data",
      alert: (vendorStats?.high ?? 0) > 0 ? `${vendorStats.high} high-risk vendor(s)` : null,
    },
    {
      href: "/dark-web",
      label: "Dark Web Monitor",
      icon: Eye,
      color: "text-red-500",
      bg: "bg-red-500/10",
      stat: darkWebStats ? `${darkWebStats.total ?? 0} alerts` : "–",
      detail: darkWebStats ? `${darkWebStats.new ?? 0} new` : "No data",
      alert: (darkWebStats?.new ?? 0) > 0 ? `${darkWebStats.new} unresolved alert(s)` : null,
    },
    {
      href: "/security-roadmap",
      label: "Security Roadmap",
      icon: Map,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      stat: roadmapStats ? `${roadmapStats.total ?? 0} tasks` : "–",
      detail: roadmapStats ? `${roadmapStats.progress ?? 0}% complete` : "No data",
      alert: null,
    },
    {
      href: "/bug-bounty",
      label: "Bug Bounty",
      icon: Fish,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      stat: bountyStats ? `${bountyStats.total ?? 0} reports` : "–",
      detail: bountyStats ? `$${(bountyStats.totalReward ?? 0).toLocaleString()} rewarded` : "No data",
      alert: (bountyStats?.critical ?? 0) > 0 ? `${bountyStats.critical} critical report(s)` : null,
    },
    {
      href: "/container-security",
      label: "Container Security",
      icon: Box,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      stat: containerStats ? `${containerStats.totalScans ?? 0} scans` : "–",
      detail: containerStats ? `${containerStats.totalCritical ?? 0} critical CVEs` : "No data",
      alert: (containerStats?.totalCritical ?? 0) > 0 ? `${containerStats.totalCritical} critical CVE(s)` : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Security Modules</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {modules.map(mod => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="cursor-pointer hover:border-primary/30 transition-colors group" data-testid={`module-card-${mod.label.toLowerCase().replace(/\s/g, "-")}`}>
                <CardContent className="p-4">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", mod.bg)}>
                    <Icon className={cn("w-4 h-4", mod.color)} />
                  </div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">{mod.label}</div>
                  <div className="text-lg font-bold">{mod.stat}</div>
                  <div className="text-xs text-muted-foreground">{mod.detail}</div>
                  {mod.alert && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-500 truncate">{mod.alert}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
