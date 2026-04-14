import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { format } from "date-fns";
import type { ThreatIntelItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, AlertTriangle, Shield, CheckCircle, Package,
  ExternalLink, Calendar, Activity, Bug, FileWarning, Loader2,
  AlertCircle, ShieldAlert, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig: Record<string, { color: string; bg: string; icon: any }> = {
  critical: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: AlertTriangle },
  high: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: ShieldAlert },
  medium: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: AlertCircle },
  low: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Shield },
};

export default function ThreatDetailPage() {
  const [, params] = useRoute("/threat-intel/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = params?.id;

  const { data: threat, isLoading } = useQuery<ThreatIntelItem>({
    queryKey: ["/api/threat-intel", id],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PUT", `/api/threat-intel/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel/stats"] });
      toast({ title: "Status updated" });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/incidents", {
        title: `[${threat!.cveId}] ${threat!.title}`,
        description: `Threat intelligence alert: ${threat!.description}\n\nSource: ${threat!.source}\nCVSS Score: ${threat!.cvssScore ?? "N/A"}`,
        severity: threat!.severity === "critical" ? "critical" : threat!.severity === "high" ? "high" : "medium",
        status: "triage",
        category: "threat-intel",
        affectedSystems: threat!.affectedPackages || [],
        tags: [threat!.cveId, threat!.source].filter(Boolean),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident created", description: "A new incident has been created from this threat." });
      navigate(`/incidents/${data.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!threat) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bug className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Threat not found</h2>
          <p className="text-muted-foreground mt-2">This threat intel item may have been removed.</p>
          <Link href="/threat-intel">
            <Button variant="outline" className="mt-4" data-testid="button-back-threats"><ArrowLeft className="w-4 h-4 mr-2" />Back to Threat Intel</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sev = severityConfig[threat.severity] || severityConfig.medium;
  const SevIcon = sev.icon;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/threat-intel">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-xs">{threat.cveId}</Badge>
            <Badge variant="outline" className={cn("text-xs", sev.bg, sev.color)}>{threat.severity.toUpperCase()}</Badge>
            <Badge variant="secondary" className="text-xs capitalize">{threat.status}</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-threat-title">{threat.title}</h1>
        </div>
        <div className="flex gap-2">
          {threat.status === "active" && (
            <Button variant="outline" onClick={() => updateStatusMutation.mutate("acknowledged")} disabled={updateStatusMutation.isPending} data-testid="button-acknowledge">
              <CheckCircle className="w-4 h-4 mr-2" />Acknowledge
            </Button>
          )}
          {threat.status !== "resolved" && (
            <Button variant="outline" onClick={() => updateStatusMutation.mutate("resolved")} disabled={updateStatusMutation.isPending} data-testid="button-resolve">
              <Shield className="w-4 h-4 mr-2" />Resolve
            </Button>
          )}
          <Button onClick={() => createIncidentMutation.mutate()} disabled={createIncidentMutation.isPending} data-testid="button-create-incident">
            {createIncidentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileWarning className="w-4 h-4 mr-2" />}
            Create Incident
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4" />Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-threat-description">{threat.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" />Affected Packages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Packages</h4>
                  <div className="flex flex-wrap gap-2" data-testid="list-affected-packages">
                    {threat.affectedPackages.length > 0 ? threat.affectedPackages.map((pkg, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs px-3 py-1">{pkg}</Badge>
                    )) : <span className="text-sm text-muted-foreground">No packages listed</span>}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Affected Versions</h4>
                    <div className="flex flex-wrap gap-1" data-testid="list-affected-versions">
                      {threat.affectedVersions.length > 0 ? threat.affectedVersions.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-mono">{v}</Badge>
                      )) : <span className="text-xs text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Patched Versions</h4>
                    <div className="flex flex-wrap gap-1" data-testid="list-patched-versions">
                      {threat.patchedVersions.length > 0 ? threat.patchedVersions.map((v, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono border-green-200 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10">{v}</Badge>
                      )) : <span className="text-xs text-muted-foreground">No patch available</span>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Remediation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { step: 1, title: "Identify Exposure", desc: `Check if any of the affected packages (${threat.affectedPackages.join(", ") || "N/A"}) are in your dependency tree.` },
                  { step: 2, title: "Update Dependencies", desc: threat.patchedVersions.length > 0 ? `Update to patched version(s): ${threat.patchedVersions.join(", ")}` : "No patched version is available yet. Apply vendor-recommended workarounds." },
                  { step: 3, title: "Verify Fix", desc: "Run a security scan to confirm the vulnerability is no longer present in your environment." },
                  { step: 4, title: "Monitor", desc: "Continue monitoring for any follow-up advisories or related CVEs." },
                ].map(s => (
                  <div key={s.step} className="flex gap-3 items-start" data-testid={`remediation-step-${s.step}`}>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4" />Discovery Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" data-testid="threat-timeline">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Published</p>
                    <p className="text-xs text-muted-foreground">{threat.publishedAt ? format(new Date(threat.publishedAt), "MMM dd, yyyy 'at' HH:mm") : "Date unknown"}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Discovered by Zyra</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(threat.createdAt), "MMM dd, yyyy 'at' HH:mm")}</p>
                  </div>
                </div>
                {threat.status === "acknowledged" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Acknowledged</p>
                      <p className="text-xs text-muted-foreground">Threat has been reviewed and acknowledged by the team</p>
                    </div>
                  </div>
                )}
                {threat.status === "resolved" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Resolved</p>
                      <p className="text-xs text-muted-foreground">Threat has been mitigated and resolved</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={cn("border-l-4", threat.severity === "critical" ? "border-l-red-500" : threat.severity === "high" ? "border-l-orange-500" : threat.severity === "medium" ? "border-l-yellow-500" : "border-l-blue-500")}>
            <CardHeader>
              <CardTitle className="text-base">Severity Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", sev.bg)}>
                  <SevIcon className={cn("w-6 h-6", sev.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-bold capitalize", sev.color)}>{threat.severity}</p>
                  <p className="text-xs text-muted-foreground">Severity Level</p>
                </div>
              </div>
              {threat.cvssScore !== null && threat.cvssScore !== undefined && (
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-medium">CVSS Score</span>
                    <span className={cn("text-2xl font-bold", threat.cvssScore >= 9 ? "text-red-600" : threat.cvssScore >= 7 ? "text-orange-600" : threat.cvssScore >= 4 ? "text-yellow-600" : "text-blue-600")}>{threat.cvssScore.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={cn("h-2 rounded-full transition-all", threat.cvssScore >= 9 ? "bg-red-500" : threat.cvssScore >= 7 ? "bg-orange-500" : threat.cvssScore >= 4 ? "bg-yellow-500" : "bg-blue-500")} style={{ width: `${(threat.cvssScore / 10) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">CVSS v3.1 Base Score</p>
                </div>
              )}
              <Separator />
              <div data-testid="text-severity-reasoning">
                <h4 className="text-sm font-medium mb-1">Severity Reasoning</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {threat.severity === "critical" ? `This vulnerability has a critical severity rating${threat.cvssScore ? ` (CVSS ${threat.cvssScore.toFixed(1)})` : ""}. It may allow remote code execution, privilege escalation, or complete system compromise. Immediate action is required.`
                    : threat.severity === "high" ? `This vulnerability is rated high severity${threat.cvssScore ? ` (CVSS ${threat.cvssScore.toFixed(1)})` : ""}. It may allow unauthorized access or significant data exposure. Prioritize remediation within your next maintenance window.`
                    : threat.severity === "medium" ? `This vulnerability is rated medium severity${threat.cvssScore ? ` (CVSS ${threat.cvssScore.toFixed(1)})` : ""}. Exploitation may require specific conditions or user interaction. Plan remediation accordingly.`
                    : `This vulnerability is rated low severity${threat.cvssScore ? ` (CVSS ${threat.cvssScore.toFixed(1)})` : ""}. Impact is limited and exploitation is unlikely. Monitor for updates.`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ExternalLink className="w-4 h-4" />Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium uppercase">{threat.source}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{threat.publishedAt ? format(new Date(threat.publishedAt), "MMM dd, yyyy") : "Unknown"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added to Zyra</span>
                  <span className="font-medium">{format(new Date(threat.createdAt), "MMM dd, yyyy")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize text-xs">{threat.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${threat.cveId}`, "_blank")} data-testid="button-view-nvd">
                <ExternalLink className="w-4 h-4 mr-2" />View on NVD
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" onClick={() => window.open(`https://www.cve.org/CVERecord?id=${threat.cveId}`, "_blank")} data-testid="button-view-cve">
                <ExternalLink className="w-4 h-4 mr-2" />View CVE Record
              </Button>
              <Link href="/sbom">
                <Button variant="outline" className="w-full justify-start text-sm" data-testid="button-check-sbom">
                  <Package className="w-4 h-4 mr-2" />Check SBOM Impact
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
