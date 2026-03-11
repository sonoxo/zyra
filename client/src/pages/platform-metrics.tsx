import { useQuery } from "@tanstack/react-query";
import {
  BarChart2, Activity, Clock, Shield, AlertTriangle, TrendingUp,
  Zap, Server, Database, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { cn } from "@/lib/utils";

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: any; sub?: string; icon: any; color: string }) {
  return (
    <Card data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", `bg-${color.split("-")[1]}-500/10`)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div>
          <div className="text-xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlatformMetricsPage() {
  const { data: metrics, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/metrics"],
    refetchInterval: 10000,
  });
  const { data: securityScore } = useQuery<any>({ queryKey: ["/api/dashboard/security-score"] });
  const { data: eventStats } = useQuery<any>({ queryKey: ["/api/security-events/stats"] });
  const { data: soarStats } = useQuery<any>({ queryKey: ["/api/soar/stats"] });

  const counters = metrics?.counters ?? {};
  const histograms = metrics?.histograms ?? {};
  const uptime = metrics?.uptime ? Math.floor(metrics.uptime) : 0;
  const uptimeStr = uptime > 3600 ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : `${Math.floor(uptime / 60)}m ${uptime % 60}s`;

  const apiRateData = [
    { name: "Requests", value: counters.api_requests_total ?? 0, color: "#3b82f6" },
    { name: "Errors", value: counters.api_errors_total ?? 0, color: "#ef4444" },
    { name: "Scans", value: counters.scans_completed_total ?? 0, color: "#8b5cf6" },
    { name: "SOAR Runs", value: counters.soar_executions_total ?? 0, color: "#f97316" },
    { name: "Events", value: counters.security_events_total ?? 0, color: "#10b981" },
    { name: "Correlations", value: counters.threat_correlations_total ?? 0, color: "#06b6d4" },
  ];

  const latencyData = [
    { name: "P50", value: histograms.api_request_duration_ms?.p50 ?? 0 },
    { name: "P95", value: histograms.api_request_duration_ms?.p95 ?? 0 },
    { name: "P99", value: histograms.api_request_duration_ms?.p99 ?? 0 },
    { name: "Avg", value: histograms.api_request_duration_ms?.avg ?? 0 },
  ];

  const score = securityScore?.overall_score ?? 0;
  const scoreTrend = securityScore?.risk_trend ?? "stable";
  const scoreBg = score >= 70 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-primary" /> Platform Metrics
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time observability: API performance, worker activity, and security posture</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />Live
            </Badge>
            <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground" data-testid="refresh-metrics">
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Security Posture Score</div>
              <div className={cn("text-4xl font-bold", scoreBg)}>{isLoading ? "—" : score}</div>
              <div className="text-xs text-muted-foreground mt-1">/ 100 · {scoreTrend}</div>
              <Progress value={score} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <StatCard label="API Uptime" value={uptimeStr} sub="since last restart" icon={Server} color="text-green-500" />
          <StatCard label="Total API Requests" value={(counters.api_requests_total ?? 0).toLocaleString()} icon={Activity} color="text-blue-500" />
          <StatCard label="API Error Rate" value={counters.api_requests_total > 0 ? `${((counters.api_errors_total / counters.api_requests_total) * 100).toFixed(1)}%` : "0%"} icon={AlertTriangle} color="text-red-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Scans Completed" value={counters.scans_completed_total ?? 0} icon={Shield} color="text-violet-500" />
          <StatCard label="SOAR Executions" value={counters.soar_executions_total ?? 0} icon={Zap} color="text-orange-500" />
          <StatCard label="Security Events" value={counters.security_events_total ?? 0} icon={Database} color="text-emerald-500" />
          <StatCard label="Threat Correlations" value={counters.threat_correlations_total ?? 0} icon={TrendingUp} color="text-cyan-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Platform Activity (since start)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading
                ? <Skeleton className="h-40" />
                : <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={apiRateData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {apiRateData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">API Response Latency (ms)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading
                ? <Skeleton className="h-40" />
                : <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={latencyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-orange-500" />SOAR Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Playbooks</span><span className="font-medium">{soarStats?.totalPlaybooks ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Playbooks</span><span className="font-medium">{soarStats?.activePlaybooks ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Executions</span><span className="font-medium">{soarStats?.totalExecutions ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Successful Runs</span><span className="font-medium text-green-500">{soarStats?.successfulExecutions ?? "—"}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="w-3.5 h-3.5 text-emerald-500" />Data Lake Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Events</span><span className="font-medium">{eventStats?.total ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Critical Events</span><span className="font-medium text-red-500">{eventStats?.bySeverity?.critical ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Correlated</span><span className="font-medium text-violet-500">{eventStats?.correlated ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unique Sources</span><span className="font-medium">{Object.keys(eventStats?.bySource ?? {}).length}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-blue-500" />Security Posture</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Overall Score</span><span className={cn("font-bold", scoreBg)}>{score}/100</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scan Score</span><span className="font-medium">{securityScore?.breakdown?.scans ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Incident Score</span><span className="font-medium">{securityScore?.breakdown?.incidents ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Risk Trend</span><span className="font-medium capitalize">{scoreTrend}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
