import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, AlertTriangle, CheckCircle, RefreshCw, Clock,
  Code, FileText, Shield, Tag, Layers, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import type { Scan, ScanFinding } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const SEVERITY_CONFIG = {
  critical: { color: "#ef4444", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  high: { color: "#f97316", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  medium: { color: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/20" },
  low: { color: "#3b82f6", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  info: { color: "#6b7280", bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", border: "border-gray-500/20" },
};

function FindingCard({ finding }: { finding: ScanFinding }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;

  return (
    <div
      data-testid={`finding-${finding.id}`}
      className={cn("border rounded-xl overflow-hidden transition-all", sev.border, "bg-background")}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", `bg-[${sev.color}]`)}>
          <div className="w-full h-full rounded-full" style={{ background: sev.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-sm text-foreground">{finding.title}</span>
            {finding.cveId && (
              <Badge variant="outline" className="text-xs h-4.5 font-mono px-1.5">{finding.cveId}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {finding.category && <span>{finding.category}</span>}
            {finding.filePath && (
              <><span>·</span><span className="font-mono truncate max-w-48">{finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ""}</span></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn("text-xs h-5 px-2 border", sev.bg, sev.text, sev.border)}>
            {finding.severity}
          </Badge>
          {finding.isResolved && (
            <Badge variant="outline" className="text-xs h-5 border-green-500/30 text-green-600 dark:text-green-400">resolved</Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>
          {finding.impact && (
            <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-3">
              <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Potential Impact
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{finding.impact}</p>
            </div>
          )}
          {finding.remediation && (
            <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Remediation
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{finding.remediation}</p>
            </div>
          )}
          {finding.complianceFrameworks?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Compliance Impact
              </div>
              <div className="flex flex-wrap gap-1.5">
                {finding.complianceFrameworks.map((fw) => (
                  <Badge key={fw} variant="outline" className="text-xs h-5 px-1.5">{fw}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScanDetail() {
  const [, params] = useRoute("/scans/:id");
  const scanId = params?.id;
  const [activeSeverity, setActiveSeverity] = useState("all");

  const { data: scan, isLoading: scanLoading } = useQuery<Scan>({
    queryKey: ["/api/scans", scanId],
    enabled: !!scanId,
    refetchInterval: (query) => {
      const data = query.state.data as Scan | undefined;
      return data?.status === "running" ? 3000 : false;
    },
  });

  const { data: findings = [], isLoading: findingsLoading } = useQuery<ScanFinding[]>({
    queryKey: ["/api/scans", scanId, "findings"],
    enabled: !!scanId && scan?.status === "completed",
  });

  const filteredFindings = activeSeverity === "all"
    ? findings
    : findings.filter((f) => f.severity === activeSeverity);

  const chartData = [
    { name: "Critical", value: scan?.criticalCount || 0, color: "#ef4444" },
    { name: "High", value: scan?.highCount || 0, color: "#f97316" },
    { name: "Medium", value: scan?.mediumCount || 0, color: "#eab308" },
    { name: "Low", value: scan?.lowCount || 0, color: "#3b82f6" },
    { name: "Info", value: scan?.infoCount || 0, color: "#6b7280" },
  ];

  if (scanLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!scan) return null;

  const StatusIcon = STATUS_ICONS[scan.status] || Clock;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/scans">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Scans
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{scan.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="uppercase font-medium">{scan.scanType}</span>
              {scan.targetName && <><span>·</span><span>{scan.targetName}</span></>}
              {scan.createdAt && <><span>·</span><span>{format(new Date(scan.createdAt), "MMM d, yyyy HH:mm")}</span></>}
              {scan.duration && <><span>·</span><span>{Math.round(scan.duration / 60)}m {scan.duration % 60}s</span></>}
            </div>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
            scan.status === "completed" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
            scan.status === "running" ? "bg-blue-500/10 text-blue-500" :
            scan.status === "failed" ? "bg-red-500/10 text-red-500" :
            "bg-muted text-muted-foreground"
          )}>
            <StatusIcon className={cn("w-4 h-4", scan.status === "running" ? "animate-spin" : "")} />
            {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
          </div>
        </div>
        {scan.status === "running" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Scanning in progress...</span>
              <span>{scan.progress}%</span>
            </div>
            <Progress value={scan.progress} className="h-1.5" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-5 gap-3">
          {chartData.map((item) => (
            <button
              key={item.name}
              data-testid={`severity-filter-${item.name.toLowerCase()}`}
              onClick={() => setActiveSeverity(activeSeverity === item.name.toLowerCase() ? "all" : item.name.toLowerCase())}
              className={cn(
                "p-4 rounded-xl border text-center cursor-pointer transition-all",
                activeSeverity === item.name.toLowerCase()
                  ? "border-2"
                  : "border-card-border hover:border-border bg-card"
              )}
              style={{ borderColor: activeSeverity === item.name.toLowerCase() ? item.color : undefined }}
            >
              <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.name}</div>
            </button>
          ))}
        </div>

        {scan.status === "completed" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground text-sm">
                  Findings
                  {filteredFindings.length !== findings.length && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({filteredFindings.length} of {findings.length})
                    </span>
                  )}
                </h2>
                {activeSeverity !== "all" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveSeverity("all")}>
                    Clear filter
                  </Button>
                )}
              </div>
              {findingsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : filteredFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-3 opacity-70" />
                  <p className="text-sm font-medium text-foreground">No findings</p>
                  <p className="text-xs text-muted-foreground mt-1">No vulnerabilities detected for this filter</p>
                </div>
              ) : (
                filteredFindings.map((f) => <FindingCard key={f.id} finding={f} />)
              )}
            </div>

            <div className="space-y-4">
              <Card className="border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Findings Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--popover-border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {scan.securityScore !== null && (
                <Card className="border-card-border">
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "text-4xl font-bold mb-1",
                      (scan.securityScore ?? 0) >= 80 ? "text-green-500" :
                      (scan.securityScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-500"
                    )}>{scan.securityScore}</div>
                    <div className="text-sm text-muted-foreground">Security Score</div>
                    <div className="mt-3">
                      <Progress
                        value={scan.securityScore ?? 0}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-card-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Scan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "Tool", value: scan.scanType.toUpperCase() },
                    { label: "Target", value: scan.targetName || scan.targetType },
                    { label: "Total findings", value: scan.totalFindings.toString() },
                    scan.completedAt ? { label: "Completed", value: formatDistanceToNow(new Date(scan.completedAt), { addSuffix: true }) } : null,
                  ].filter(Boolean).map((item: any) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {scan.status === "running" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">Scan in progress</p>
            <p className="text-sm text-muted-foreground">Results will appear here when the scan completes</p>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  running: RefreshCw,
  completed: CheckCircle,
  failed: AlertTriangle,
};
