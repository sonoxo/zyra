import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap, Play, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Shield, RefreshCw, BarChart2, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  critical_incident: "Critical Incident",
  secret_exposed: "Secret Exposed",
  manual: "Manual",
  threat_intelligence: "Threat Intel",
  critical_cve: "Critical CVE",
};

const CATEGORY_COLORS: Record<string, string> = {
  incident_response: "text-red-500 bg-red-500/10 border-red-500/20",
  secrets_management: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  identity_management: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  network_defense: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  container_security: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  vulnerability_management: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
};

const ACTION_ICONS: Record<string, string> = {
  isolate: "🔒",
  disable: "⛔",
  rotate: "🔄",
  block: "🚫",
  alert: "🔔",
  scan: "🔍",
  patch: "🩹",
  notify: "📣",
};

const STATUS_ICON = {
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  partial: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
};

function PlaybookCard({ playbook, onRun, isRunning }: { playbook: any; onRun: (id: string) => void; isRunning: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const actions = (playbook.actions ?? []) as any[];

  return (
    <Card data-testid={`playbook-card-${playbook.id}`} className="overflow-hidden hover:border-primary/30 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", CATEGORY_COLORS[playbook.category] ?? "text-muted-foreground bg-muted")}>
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{playbook.name}</span>
              <Badge variant="outline" className={cn("text-[10px] border", CATEGORY_COLORS[playbook.category])}>
                {playbook.category.replace(/_/g, " ")}
              </Badge>
              {playbook.isBuiltin && (
                <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">Built-in</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{playbook.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>Trigger: <span className="text-foreground">{TRIGGER_LABELS[playbook.trigger] ?? playbook.trigger}</span></span>
              <span>{actions.length} steps</span>
              <span>{playbook.executionCount ?? 0} run(s)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setExpanded(!expanded)}
              data-testid={`expand-playbook-${playbook.id}`}
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Steps
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onRun(playbook.id)}
              disabled={isRunning}
              data-testid={`run-playbook-${playbook.id}`}
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-1.5">
          {actions.map((action: any, idx: number) => (
            <div key={action.id} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 flex items-center justify-center text-muted-foreground font-mono text-[10px]">{idx + 1}</span>
              <span className="text-base">{ACTION_ICONS[action.type] ?? "⚙️"}</span>
              <span className="font-medium text-foreground">{action.name}</span>
              <span className="text-muted-foreground">— {action.description}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ExecutionCard({ exec }: { exec: any }) {
  const [expanded, setExpanded] = useState(false);
  const steps = (exec.steps ?? []) as any[];
  const status = exec.status as keyof typeof STATUS_ICON;

  return (
    <div data-testid={`execution-${exec.id}`} className="border border-border rounded-lg overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {STATUS_ICON[status] ?? STATUS_ICON.running}
          <span className="font-medium text-sm text-foreground truncate">{exec.playbookName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span>{exec.duration ? `${exec.duration}ms` : "—"}</span>
          <span>{steps.filter(s => s.status === "success").length}/{steps.length} steps</span>
          <span>{new Date(exec.startedAt).toLocaleString()}</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-1.5">
          {steps.map((step: any) => (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              {step.status === "success"
                ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                : <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
              <span className="font-medium text-foreground">{step.name}</span>
              <span className="text-muted-foreground">— {step.output}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SoarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data: playbooks = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/soar/playbooks"] });
  const { data: executions = [], isLoading: execLoading } = useQuery<any[]>({ queryKey: ["/api/soar/executions"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/soar/stats"] });

  const runMutation = useMutation({
    mutationFn: async (playbookId: string) => {
      const data = await apiRequest("POST", `/api/soar/execute/${playbookId}`, {});
      return data.json();
    },
    onSuccess: (data) => {
      setRunningId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/soar/executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/soar/playbooks"] });
      toast({
        title: data.status === "success" ? "Playbook completed" : "Playbook finished with warnings",
        description: `${data.steps?.filter((s: any) => s.status === "success").length}/${data.steps?.length} steps succeeded in ${data.duration}ms`,
        variant: data.status === "success" ? "default" : "destructive",
      });
    },
    onError: () => {
      setRunningId(null);
      toast({ title: "Execution failed", description: "Could not run the playbook", variant: "destructive" });
    },
  });

  const handleRun = (id: string) => {
    setRunningId(id);
    runMutation.mutate(id);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> SOAR Automation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Security Orchestration, Automation and Response — execute playbooks to automate security workflows</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Playbooks", value: stats?.totalPlaybooks ?? 0, icon: Zap, color: "text-violet-500" },
            { label: "Active Playbooks", value: stats?.activePlaybooks ?? 0, icon: Shield, color: "text-green-500" },
            { label: "Total Executions", value: stats?.totalExecutions ?? 0, icon: BarChart2, color: "text-blue-500" },
            { label: "Successful Runs", value: stats?.successfulExecutions ?? 0, icon: CheckCircle, color: "text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`soar-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <div>
                  <div className="text-xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="playbooks">
          <TabsList>
            <TabsTrigger value="playbooks" data-testid="tab-playbooks">Playbooks</TabsTrigger>
            <TabsTrigger value="executions" data-testid="tab-executions">Execution History</TabsTrigger>
          </TabsList>

          <TabsContent value="playbooks" className="space-y-3 mt-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
              : playbooks.map(pb => (
                <PlaybookCard
                  key={pb.id}
                  playbook={pb}
                  onRun={handleRun}
                  isRunning={runningId === pb.id}
                />
              ))
            }
            {!isLoading && playbooks.length === 0 && (
              <Card><CardContent className="py-12 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No playbooks available</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="executions" className="space-y-2 mt-4">
            {execLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)
              : executions.length === 0
              ? <Card><CardContent className="py-12 text-center">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No executions yet — run a playbook to see results here</p>
                </CardContent></Card>
              : executions.map(exec => <ExecutionCard key={exec.id} exec={exec} />)
            }
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
