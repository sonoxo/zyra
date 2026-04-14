import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, AlertTriangle, CheckCircle2, Trash2, Loader2, Key, Mail, FileCode, Shield, EyeOff, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DarkWebAlert } from "@shared/schema";

const TYPE_ICONS: Record<string, any> = {
  credential: Key,
  api_key: FileCode,
  email: Mail,
  pii: Shield,
  source_code: FileCode,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

export default function DarkWebPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [domain, setDomain] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/dark-web/stats"] });
  const { data: alerts = [], isLoading } = useQuery<DarkWebAlert[]>({ queryKey: ["/api/dark-web/alerts"] });

  const scanMutation = useMutation({
    mutationFn: (d: string) => apiRequest("POST", "/api/dark-web/scan", { domain: d || "company.com" }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/stats"] });
      toast({ title: `Scan complete`, description: `${data.alertsFound} new alert(s) found for ${data.scanned}` });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/dark-web/alerts/${id}`, { status, resolvedAt: status === "resolved" ? new Date() : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dark-web/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/stats"] });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (alert: DarkWebAlert) => {
      const res = await apiRequest("POST", "/api/incidents", {
        title: `Dark Web Alert: ${alert.alertType.replace("_", " ")} exposure on ${alert.domain}`,
        description: alert.description,
        severity: alert.severity === "critical" ? "critical" : alert.severity === "high" ? "high" : "medium",
        status: "triage",
        tags: ["dark-web", alert.alertType, alert.domain],
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident created", description: "A new incident has been created from this dark web alert." });
      navigate(`/incidents/${data.id}`);
    },
  });

  const filtered = statusFilter === "all" ? alerts : alerts.filter(a => a.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dark Web Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor for leaked credentials, API keys and sensitive data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Eye className="w-4 h-4 text-purple-500" /></div>
            <div><div className="text-2xl font-bold">{stats?.total ?? 0}</div><div className="text-xs text-muted-foreground">Total Alerts</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
            <div><div className="text-2xl font-bold text-red-500">{stats?.new ?? 0}</div><div className="text-xs text-muted-foreground">New Alerts</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><EyeOff className="w-4 h-4 text-orange-500" /></div>
            <div><div className="text-2xl font-bold text-orange-500">{stats?.critical ?? 0}</div><div className="text-xs text-muted-foreground">Critical</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
            <div><div className="text-2xl font-bold text-green-500">{stats?.resolved ?? 0}</div><div className="text-xs text-muted-foreground">Resolved</div></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Scan for Leaked Data</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              data-testid="input-domain"
              placeholder="company.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => scanMutation.mutate(domain)} disabled={scanMutation.isPending} data-testid="button-scan-domain">
              {scanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Run Scan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Simulates scanning dark web sources, paste sites, and breach databases for your domain.</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {["all", "new", "investigating", "resolved"].map(f => (
          <Button key={f} variant={statusFilter === f ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f)} className="capitalize" data-testid={`filter-${f}`}>{f}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Eye className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No dark web alerts.</p>
          <p className="text-sm text-muted-foreground/60">Run a scan to check for leaked credentials or sensitive data.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => {
            const TypeIcon = TYPE_ICONS[alert.alertType] ?? Shield;
            return (
              <Card key={alert.id} data-testid={`card-alert-${alert.id}`} className={cn(alert.status === "new" && "border-red-500/20")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg mt-0.5", SEVERITY_COLORS[alert.severity] ?? "bg-muted")}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm capitalize">{alert.alertType.replace("_", " ")} Exposure</span>
                        <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[alert.severity] ?? "")}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs",
                          alert.status === "new" ? "text-red-600 border-red-500/30" :
                          alert.status === "resolved" ? "text-green-600 border-green-500/30" : ""
                        )}>
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Domain: <strong className="text-foreground">{alert.domain}</strong></span>
                        <span>Source: <strong className="text-foreground">{alert.source}</strong></span>
                        {alert.maskedValue && <span>Value: <code className="bg-muted px-1 rounded">{alert.maskedValue}</code></span>}
                        <span>{format(new Date(alert.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {alert.status !== "resolved" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => createIncidentMutation.mutate(alert)} disabled={createIncidentMutation.isPending} data-testid={`button-escalate-${alert.id}`}>
                            <FileWarning className="w-3.5 h-3.5 mr-1" />Escalate
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => resolveMutation.mutate({ id: alert.id, status: "resolved" })} data-testid={`button-resolve-${alert.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Resolve
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(alert.id)} data-testid={`button-delete-alert-${alert.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
