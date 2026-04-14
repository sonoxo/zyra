import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Key, Mail, FileCode, Shield, AlertTriangle, CheckCircle2, FileWarning, Loader2, Clock, Globe, Database } from "lucide-react";
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

export default function DarkWebDetailPage() {
  const [, params] = useRoute("/dark-web/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: alert, isLoading } = useQuery<DarkWebAlert>({
    queryKey: ["/api/dark-web/alerts", params?.id],
    enabled: !!params?.id,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/dark-web/alerts/${id}`, { status, resolvedAt: status === "resolved" ? new Date() : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/alerts", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dark-web/stats"] });
      toast({ title: "Alert resolved" });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (a: DarkWebAlert) => {
      const res = await apiRequest("POST", "/api/incidents", {
        title: `Dark Web Alert: ${a.alertType.replace("_", " ")} exposure on ${a.domain}`,
        description: `${a.description}\n\nSource: ${a.source}\nDomain: ${a.domain}${a.maskedValue ? `\nExposed value: ${a.maskedValue}` : ""}`,
        severity: a.severity === "critical" ? "critical" : a.severity === "high" ? "high" : "medium",
        status: "triage",
        category: "dark-web",
        tags: ["dark-web", a.alertType, a.domain],
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident created", description: "A new incident has been created from this dark web alert." });
      navigate(`/incidents/${data.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Alert not found.</p>
        <Link href="/dark-web"><Button variant="outline" className="mt-4">Back to Dark Web Monitoring</Button></Link>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[alert.alertType] ?? Shield;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dark-web">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold capitalize" data-testid="text-alert-title">{alert.alertType.replace("_", " ")} Exposure</h1>
              <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[alert.severity] ?? "")}>{alert.severity}</Badge>
              <Badge variant="outline" className={cn("text-xs",
                alert.status === "new" ? "text-red-600 border-red-500/30" :
                alert.status === "resolved" ? "text-green-600 border-green-500/30" : ""
              )}>{alert.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{alert.domain} &mdash; {alert.source}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {alert.status !== "resolved" && (
            <>
              <Button variant="outline" onClick={() => resolveMutation.mutate({ id: alert.id, status: "resolved" })} disabled={resolveMutation.isPending} data-testid="button-resolve">
                <CheckCircle2 className="w-4 h-4 mr-2" />Resolve
              </Button>
              <Button onClick={() => createIncidentMutation.mutate(alert)} disabled={createIncidentMutation.isPending} data-testid="button-create-incident">
                {createIncidentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileWarning className="w-4 h-4 mr-2" />}
                Escalate to Incident
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="w-4 h-4" />Alert Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-alert-description">{alert.description}</p>
            </CardContent>
          </Card>

          {alert.maskedValue && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4" />Exposed Data</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="block text-sm bg-muted px-3 py-2 rounded font-mono" data-testid="text-exposed-value">{alert.maskedValue}</code>
                <p className="text-xs text-muted-foreground mt-2">Values are partially masked for security. Full data available in incident response.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { step: 1, title: "Verify Exposure", desc: `Confirm whether the exposed ${alert.alertType.replace("_", " ")} is still valid and in active use.` },
                  { step: 2, title: "Rotate Credentials", desc: alert.alertType === "credential" || alert.alertType === "api_key" ? "Immediately rotate the affected credentials and invalidate existing sessions." : "Review and update any affected data or configurations." },
                  { step: 3, title: "Investigate Source", desc: `Investigate how the data was exposed on ${alert.source} and identify the root cause.` },
                  { step: 4, title: "Monitor", desc: "Continue monitoring for any additional exposures or related activity." },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 items-start" data-testid={`action-step-${s.step}`}>
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{s.step}</div>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={cn("border-l-4", alert.severity === "critical" ? "border-l-red-500" : alert.severity === "high" ? "border-l-orange-500" : "border-l-yellow-500")}>
            <CardHeader>
              <CardTitle className="text-base">Alert Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span className="font-medium capitalize">{alert.alertType.replace("_", " ")}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[alert.severity] ?? "")}>{alert.severity}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize text-xs">{alert.status}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domain</span>
                  <span className="font-medium">{alert.domain}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium">{alert.source}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" data-testid="alert-timeline">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Detected</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), "MMM dd, yyyy 'at' HH:mm")}</p>
                  </div>
                </div>
                {alert.status === "investigating" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Under Investigation</p>
                      <p className="text-xs text-muted-foreground">Alert is being reviewed</p>
                    </div>
                  </div>
                )}
                {alert.status === "resolved" && alert.resolvedAt && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Resolved</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(alert.resolvedAt), "MMM dd, yyyy 'at' HH:mm")}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
