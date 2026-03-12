import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitFork, AlertTriangle, CheckCircle, Shield, ArrowRight, Target,
  ChevronDown, ChevronRight, Lock, Crosshair, Zap, Eye,
  Server, Bug, TrendingUp, Wrench, Database, Key, Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { AttackPath } from "@shared/schema";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

const STEP_TYPE_COLORS: Record<string, string> = {
  entry: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
  exploit: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  "supply-chain": "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400",
  compromise: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  lateral: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
  persistence: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
  target: "bg-red-600/10 border-red-600/40 text-red-700 dark:text-red-300 font-semibold",
};

const EFFORT_COLORS: Record<string, string> = {
  Low: "text-green-500 bg-green-500/10",
  Medium: "text-yellow-500 bg-yellow-500/10",
  High: "text-orange-500 bg-orange-500/10",
};

function ScoreBar({ label, score, color, icon: Icon }: { label: string; score: number; color: string; icon: any }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground"><Icon className="w-3 h-3" />{label}</span>
        <span className={cn("font-bold", color)}>{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", score >= 80 ? "bg-red-500" : score >= 60 ? "bg-orange-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500")} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function PrioritizedPathCard({ path, rank }: { path: any; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const steps = (path.steps ?? []) as any[];

  return (
    <Card data-testid={`prioritized-path-${path.id}`} className={cn("transition-all border-l-4", path.prioritizedRiskScore >= 80 ? "border-l-red-500" : path.prioritizedRiskScore >= 60 ? "border-l-orange-500" : "border-l-yellow-500")}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white", rank <= 3 ? "bg-red-500" : rank <= 6 ? "bg-orange-500" : "bg-yellow-500")}>
            #{rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{path.name}</span>
              <Badge variant="outline" className={cn("text-xs border", SEVERITY_COLORS[path.severity])}>{path.severity}</Badge>
              {path.reachesCritical && (
                <Badge variant="outline" className="text-xs border-red-500/40 text-red-500 bg-red-500/10">
                  <Database className="w-3 h-3 mr-1" /> {path.criticalTargetType}
                </Badge>
              )}
              {path.exploitabilityDetails?.activelyExploited && (
                <Badge variant="outline" className="text-xs border-red-600/40 text-red-600 bg-red-600/10 animate-pulse">
                  <Zap className="w-3 h-3 mr-1" /> Actively Exploited
                </Badge>
              )}
              {path.mitigated && <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/10"><CheckCircle className="w-3 h-3 mr-1" />Mitigated</Badge>}
            </div>
            {path.description && <p className="text-xs text-muted-foreground mt-1">{path.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-foreground">{path.prioritizedRiskScore}</div>
            <div className="text-[10px] text-muted-foreground">Prioritized Risk</div>
            {path.baseRiskScore !== path.prioritizedRiskScore && (
              <div className="text-[10px] text-muted-foreground">base: {path.baseRiskScore}</div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">{path.entryPoint}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-[10px]">{steps.length} steps</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">{path.targetAsset}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <ScoreBar label="Exposure" score={path.exposureScore} color="text-orange-500" icon={Eye} />
          <ScoreBar label="Exploitability" score={path.exploitabilityScore} color="text-red-500" icon={Bug} />
          <ScoreBar label="Privilege" score={path.privilegeScore} color="text-violet-500" icon={Key} />
          <ScoreBar label="Threat Intel" score={path.threatIntelScore} color="text-cyan-500" icon={Crosshair} />
          <ScoreBar label="Impact" score={path.impactScore} color="text-red-600" icon={Target} />
        </div>

        {path.exploitabilityDetails?.knownExploitKits?.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Known exploit kits:</span>
            {path.exploitabilityDetails.knownExploitKits.map((kit: string) => (
              <Badge key={kit} variant="outline" className="text-[10px] border-red-500/30 text-red-500">{kit}</Badge>
            ))}
          </div>
        )}

        {path.affectedAssets?.length > 0 && (
          <div className="mt-3">
            <span className="text-[10px] text-muted-foreground">Affected assets: </span>
            <span className="text-[11px] text-foreground">
              {path.affectedAssets.map((a: any) => `${a.hostname} (${a.criticality})`).join(", ")}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setExpanded(!expanded)} data-testid={`expand-prioritized-${path.id}`}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
            {expanded ? "Collapse" : "Details & Remediation"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Attack Chain</div>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-3">
                    {steps.map((step: any, idx: number) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-7">
                        <div className="absolute left-0 w-7 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
                            {step.order}
                          </div>
                        </div>
                        <div className={cn("flex-1 rounded-lg border p-2.5 text-xs", STEP_TYPE_COLORS[step.type] || "bg-muted/50 border-border")}>
                          <div className="font-semibold">{step.node}</div>
                          <div className="text-xs opacity-80 mt-0.5">{step.description}</div>
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 capitalize mt-1">{step.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Recommended Remediations
                  </div>
                  <div className="space-y-2" data-testid={`remediations-${path.id}`}>
                    {(path.remediations ?? []).map((r: any, i: number) => (
                      <div key={i} className="p-2.5 border border-border rounded-lg bg-muted/30">
                        <div className="flex items-start gap-2">
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white", r.priority === 1 ? "bg-red-500" : r.priority === 2 ? "bg-orange-500" : "bg-yellow-500")}>
                            P{r.priority}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-foreground">{r.action}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", EFFORT_COLORS[r.effort] ?? "bg-muted")}>{r.effort} effort</span>
                              <span className="text-[10px] text-muted-foreground">{r.impact}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {path.exposureDetails?.reasons?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Exposure Factors
                    </div>
                    <ul className="space-y-1">
                      {path.exposureDetails.reasons.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttackPathCard({ path }: { path: AttackPath }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const steps = (path.steps as any[]) || [];

  const mitigateMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/attack-paths/${path.id}`, { mitigated: !path.mitigated }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/attack-paths"] });
      qc.invalidateQueries({ queryKey: ["/api/attack-paths/prioritized"] });
      qc.invalidateQueries({ queryKey: ["/api/attack-paths/exposure"] });
      qc.invalidateQueries({ queryKey: ["/api/attack-paths/stats"] });
      toast({ title: path.mitigated ? "Path marked active" : "Path marked mitigated" });
    },
  });

  return (
    <Card data-testid={`attack-path-${path.id}`} className={cn("transition-all", path.mitigated && "opacity-60")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs border", SEVERITY_COLORS[path.severity])}>{path.severity}</Badge>
              <span className="font-semibold text-sm text-foreground">{path.name}</span>
              {path.mitigated && <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/10"><CheckCircle className="w-3 h-3 mr-1" />Mitigated</Badge>}
            </div>
            {path.description && <p className="text-xs text-muted-foreground mt-1">{path.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">{path.riskScore}</div>
              <div className="text-[10px] text-muted-foreground">Risk Score</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">{path.entryPoint}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground text-[10px]">{steps.length} steps</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">{path.targetAsset}</span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Attack Risk Score</span>
            <span className="text-[10px] font-semibold text-foreground">{path.riskScore}/100</span>
          </div>
          <Progress value={path.riskScore} className="h-1.5" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setExpanded(!expanded)} data-testid={`expand-path-${path.id}`}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
            {expanded ? "Hide" : "Show"} attack steps
          </Button>
          <Button
            variant="outline" size="sm"
            className={cn("text-xs h-7 px-3 ml-auto", path.mitigated ? "text-yellow-600 border-yellow-500/30" : "text-green-600 border-green-500/30")}
            onClick={() => mitigateMutation.mutate()}
            disabled={mitigateMutation.isPending}
            data-testid={`mitigate-path-${path.id}`}
          >
            <Lock className="w-3 h-3 mr-1" />
            {path.mitigated ? "Re-activate" : "Mark Mitigated"}
          </Button>
        </div>

        {expanded && steps.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Attack Chain</div>
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {steps.map((step: any, idx: number) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-7">
                    <div className="absolute left-0 w-7 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground z-10">
                        {step.order}
                      </div>
                    </div>
                    <div className={cn("flex-1 rounded-lg border p-2.5 text-xs", STEP_TYPE_COLORS[step.type] || "bg-muted/50 border-border")}>
                      <div className="font-semibold">{step.node}</div>
                      <div className="text-xs opacity-80 mt-0.5">{step.description}</div>
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 capitalize mt-1">{step.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttackPathsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "mitigated">("all");

  const { data: paths = [], isLoading } = useQuery<AttackPath[]>({ queryKey: ["/api/attack-paths"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/attack-paths/stats"] });
  const { data: prioritized, isLoading: priLoading } = useQuery<any>({ queryKey: ["/api/attack-paths/prioritized"] });
  const { data: exposure } = useQuery<any>({ queryKey: ["/api/attack-paths/exposure"] });

  const filtered = paths.filter(p => {
    if (filter === "active") return !p.mitigated;
    if (filter === "mitigated") return p.mitigated;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b.riskScore - a.riskScore);

  const priPaths = prioritized?.paths ?? [];
  const priStats = prioritized?.stats ?? {};

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitFork className="w-6 h-6 text-primary" /> Attack Path Modeling
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Identify, prioritize, and remediate attack chains from entry point to critical assets</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Paths", value: stats?.total ?? 0, color: "text-foreground", icon: GitFork },
            { label: "Active", value: stats?.active ?? 0, color: "text-red-500", icon: AlertTriangle },
            { label: "Critical Paths", value: priStats.criticalPaths ?? 0, color: "text-red-600", icon: Database },
            { label: "Actively Exploited", value: priStats.activelyExploitedPaths ?? 0, color: "text-red-500", icon: Zap },
            { label: "Exposed Assets", value: exposure?.totalExposed ?? 0, color: "text-orange-500", icon: Eye },
            { label: "Highest Risk", value: priStats.highestRisk ?? 0, color: priStats.highestRisk >= 80 ? "text-red-500" : "text-orange-500", icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-3">
                <Icon className={cn("w-4 h-4 mb-1", color)} />
                <div className={cn("text-xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="prioritized">
          <TabsList>
            <TabsTrigger value="prioritized" data-testid="tab-prioritized">
              Risk Prioritization ({priPaths.length})
            </TabsTrigger>
            <TabsTrigger value="all-paths" data-testid="tab-all-paths">
              All Paths ({paths.length})
            </TabsTrigger>
            <TabsTrigger value="exposure" data-testid="tab-exposure">
              Exposure Analysis ({exposure?.totalExposed ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prioritized" className="space-y-4 mt-4">
            {priPaths.some((p: any) => p.exploitabilityDetails?.activelyExploited) && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Actively Exploited Paths Detected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {priPaths.filter((p: any) => p.exploitabilityDetails?.activelyExploited).length} path(s) contain vulnerabilities being actively exploited in the wild. Prioritize immediate remediation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {priLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
            ) : priPaths.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No attack paths to prioritize</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4" data-testid="prioritized-list">
                {priPaths.map((path: any, idx: number) => (
                  <PrioritizedPathCard key={path.id} path={path} rank={idx + 1} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all-paths" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              {(["all", "active", "mitigated"] as const).map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} data-testid={`filter-${f}`} className="capitalize">
                  {f} {f === "all" ? `(${paths.length})` : f === "active" ? `(${stats?.active ?? 0})` : `(${stats?.mitigated ?? 0})`}
                </Button>
              ))}
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
            ) : sorted.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No attack paths found</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4" data-testid="all-paths-list">
                {sorted.map(path => <AttackPathCard key={path.id} path={path} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exposure" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Internet Exposed", value: exposure?.internetExposed ?? 0, color: "text-red-500", icon: Eye },
                { label: "Cloud Exposed", value: exposure?.cloudExposed ?? 0, color: "text-orange-500", icon: Cpu },
                { label: "Internal Only", value: exposure?.internalOnly ?? 0, color: "text-green-500", icon: Shield },
                { label: "Total Exposed", value: exposure?.totalExposed ?? 0, color: "text-foreground", icon: Server },
              ].map(({ label, value, color, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="p-3">
                    <Icon className={cn("w-4 h-4 mb-1", color)} />
                    <div className={cn("text-xl font-bold", color)}>{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Exposed Asset Inventory</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="exposure-list">
                  {(exposure?.assets ?? []).map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", a.exposureLevel === "internet" ? "bg-red-500" : "bg-orange-500")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{a.hostname}</div>
                        <div className="text-[11px] text-muted-foreground">{a.ip} · {a.assetType} · {a.criticality}</div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] border capitalize", a.exposureLevel === "internet" ? "border-red-500/30 text-red-500" : "border-orange-500/30 text-orange-500")}>
                        {a.exposureLevel}
                      </Badge>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-foreground">{a.vulnerabilityCount}</div>
                        <div className="text-[9px] text-muted-foreground">vulns</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
