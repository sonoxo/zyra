import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database, AlertTriangle, Shield, Search, RefreshCw, Activity,
  Filter, ChevronDown, ChevronRight, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  info: "text-gray-500 bg-gray-500/10 border-gray-500/20",
};

const SOURCE_ICONS: Record<string, string> = {
  trivy: "🔍",
  semgrep: "🧩",
  threat_hunting: "🎯",
  secrets_scanner: "🔑",
  dark_web_monitor: "🌑",
  soar: "⚡",
  threat_correlation_engine: "🔗",
  compliance_engine: "📋",
  incident_response: "🚨",
  identity_monitoring: "👤",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  vulnerability_detected: "text-red-500",
  scan_completed: "text-blue-500",
  threat_detected: "text-orange-500",
  secret_exposed: "text-yellow-500",
  anomaly_detected: "text-violet-500",
  soar_execution: "text-green-500",
  cve_correlation: "text-red-400",
  compliance_drift: "text-yellow-400",
  incident_created: "text-red-600",
  access_anomaly: "text-orange-400",
};

function EventRow({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div data-testid={`event-row-${event.id}`} className="border border-border rounded-lg overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="w-4 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        <Badge variant="outline" className={cn("text-[10px] border shrink-0 font-medium", SEVERITY_STYLES[event.severity])}>
          {event.severity}
        </Badge>
        <span className="text-base shrink-0">{SOURCE_ICONS[event.source] ?? "📌"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-mono shrink-0", EVENT_TYPE_COLORS[event.eventType] ?? "text-muted-foreground")}>
              {event.eventType.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-foreground truncate">{event.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.isCorrelated && (
            <Badge variant="outline" className="text-[10px] text-violet-500 border-violet-500/30">correlated</Badge>
          )}
          <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-2">
          <p className="text-sm text-muted-foreground">{event.description ?? "No description available."}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Source: <span className="text-foreground font-medium">{event.source}</span></span>
            {event.assetId && <span>Asset: <span className="text-foreground font-mono">{event.assetId}</span></span>}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <span>Metadata: <span className="font-mono text-foreground">{JSON.stringify(event.metadata)}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityEventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/security-events"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/security-events/stats"] });

  const correlateMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/correlate", {});
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security-events/stats"] });
      toast({
        title: "Correlation complete",
        description: `Found ${data.correlations?.length ?? 0} correlation(s), created ${data.eventsCreated} new event(s)`,
      });
    },
    onError: () => toast({ title: "Correlation failed", variant: "destructive" }),
  });

  const allSources = Array.from(new Set(events.map((e: any) => e.source)));

  const filtered = events.filter((e: any) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.source.toLowerCase().includes(search.toLowerCase()) || e.eventType.toLowerCase().includes(search.toLowerCase());
    const matchSev = sevFilter === "all" || e.severity === sevFilter;
    const matchSrc = sourceFilter === "all" || e.source === sourceFilter;
    return matchSearch && matchSev && matchSrc;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" /> Security Data Lake
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Centralized security telemetry from all platform modules</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => correlateMutation.mutate()}
            disabled={correlateMutation.isPending}
            data-testid="run-correlation"
          >
            {correlateMutation.isPending
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />}
            Run Correlation
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Events", value: stats?.total ?? 0, color: "text-foreground" },
            { label: "Critical", value: stats?.bySeverity?.critical ?? 0, color: "text-red-500" },
            { label: "High", value: stats?.bySeverity?.high ?? 0, color: "text-orange-500" },
            { label: "Correlated", value: stats?.correlated ?? 0, color: "text-violet-500" },
            { label: "Sources", value: Object.keys(stats?.bySource ?? {}).length, color: "text-blue-500" },
          ].map(({ label, value, color }) => (
            <Card key={label} data-testid={`event-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className={cn("text-2xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Events by Source</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.bySource ?? {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([source, count]: [string, any]) => (
                  <div key={source} className="flex items-center gap-2">
                    <span className="text-sm">{SOURCE_ICONS[source] ?? "📌"}</span>
                    <span className="text-xs text-muted-foreground flex-1">{source.replace(/_/g, " ")}</span>
                    <span className="text-xs font-bold text-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Events by Type</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.byType ?? {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={cn("text-xs font-mono flex-1 truncate", EVENT_TYPE_COLORS[type] ?? "text-muted-foreground")}>{type.replace(/_/g, " ")}</span>
                    <span className="text-xs font-bold text-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input data-testid="event-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="pl-9" />
          </div>
          <Select value={sevFilter} onValueChange={setSevFilter}>
            <SelectTrigger data-testid="event-severity-filter" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger data-testid="event-source-filter" className="w-44"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {allSources.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground self-center">{filtered.length} events</span>
        </div>

        {isLoading
          ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          : filtered.length === 0
          ? <Card><CardContent className="py-12 text-center">
              <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No events match your filters</p>
            </CardContent></Card>
          : <div className="space-y-2" data-testid="events-list">
              {filtered.map((ev: any) => <EventRow key={ev.id} event={ev} />)}
            </div>
        }
      </div>
    </div>
  );
}
