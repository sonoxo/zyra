import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitFork, AlertTriangle, CheckCircle, Shield, ArrowRight, Target, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

function AttackPathCard({ path }: { path: AttackPath }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const steps = (path.steps as any[]) || [];

  const mitigateMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/attack-paths/${path.id}`, { mitigated: !path.mitigated }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/attack-paths"] }); toast({ title: path.mitigated ? "Path marked active" : "Path marked mitigated" }); },
  });

  return (
    <Card data-testid={`attack-path-${path.id}`} className={cn("transition-all", path.mitigated && "opacity-60")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs border", SEVERITY_COLORS[path.severity])}>
                {path.severity}
              </Badge>
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
            variant="outline"
            size="sm"
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
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 capitalize">{step.type}</Badge>
                      </div>
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

  const filtered = paths.filter(p => {
    if (filter === "active") return !p.mitigated;
    if (filter === "mitigated") return p.mitigated;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitFork className="w-6 h-6 text-primary" /> Attack Path Modeling
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visualize how an attacker could traverse your environment from entry to critical assets</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Paths", value: stats?.total ?? 0, color: "text-foreground" },
            { label: "Active Paths", value: stats?.active ?? 0, color: "text-red-500" },
            { label: "Critical Severity", value: stats?.critical ?? 0, color: "text-red-600" },
            { label: "Avg Risk Score", value: stats?.avgRiskScore ?? 0, color: "text-orange-500" },
          ].map(({ label, value, color }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className={cn("text-2xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats?.avgRiskScore > 0 && (
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Highest Risk Path: {paths.find(p => p.riskScore === Math.max(...paths.map(x => x.riskScore)))?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">This path has the highest risk score in your environment. Review and mitigate the steps to reduce exposure.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2">
          {(["all", "active", "mitigated"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              className="capitalize"
            >
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
          <div className="space-y-4">
            {sorted.map(path => <AttackPathCard key={path.id} path={path} />)}
          </div>
        )}
      </div>
    </div>
  );
}
