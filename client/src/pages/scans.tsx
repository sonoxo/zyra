import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, Plus, RefreshCw, CheckCircle, AlertTriangle, Clock,
  Filter, ChevronRight, Zap, Code, Package, Globe, Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Scan, Repository } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const SCAN_TOOLS = [
  { id: "semgrep", name: "Semgrep", icon: Code, desc: "Static analysis for source code", color: "#3b82f6" },
  { id: "trivy", name: "Trivy", icon: Package, desc: "Container & dependency vulnerability scanner", color: "#8b5cf6" },
  { id: "bandit", name: "Bandit", icon: Server, desc: "Python security linter", color: "#f97316" },
  { id: "zap", name: "OWASP ZAP", icon: Globe, desc: "Web application security scanner", color: "#10b981" },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "text-muted-foreground", icon: Clock, label: "Pending" },
  running: { color: "text-blue-500", icon: RefreshCw, label: "Running" },
  completed: { color: "text-green-500", icon: CheckCircle, label: "Completed" },
  failed: { color: "text-red-500", icon: AlertTriangle, label: "Failed" },
};

function ScanRow({ scan }: { scan: Scan }) {
  const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const tool = SCAN_TOOLS.find((t) => t.id === scan.scanType);

  return (
    <Link href={`/scans/${scan.id}`}>
      <div
        data-testid={`scan-row-${scan.id}`}
        className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 cursor-pointer transition-all group"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tool?.color}15` }}>
          {tool ? <tool.icon className="w-5 h-5" style={{ color: tool.color }} /> : <Search className="w-5 h-5 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-foreground text-sm truncate">{scan.name}</span>
            {scan.criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs h-4.5 px-1.5 shrink-0">{scan.criticalCount} critical</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium uppercase">{scan.scanType}</span>
            {scan.targetName && <><span>·</span><span className="truncate">{scan.targetName}</span></>}
            {scan.createdAt && (
              <><span>·</span><span>{formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}</span></>
            )}
          </div>
          {scan.status === "running" && (
            <div className="mt-2">
              <Progress value={scan.progress} className="h-1" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {scan.status === "completed" && (
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{scan.totalFindings}</div>
              <div className="text-xs text-muted-foreground">findings</div>
            </div>
          )}
          {scan.securityScore !== null && scan.securityScore !== undefined && (
            <div className="text-right">
              <div className={cn("text-sm font-bold", scan.securityScore >= 80 ? "text-green-500" : scan.securityScore >= 60 ? "text-yellow-500" : "text-red-500")}>
                {scan.securityScore}
              </div>
              <div className="text-xs text-muted-foreground">score</div>
            </div>
          )}
          <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg", cfg.color)}>
            <Icon className={cn("w-3.5 h-3.5", scan.status === "running" ? "animate-spin" : "")} />
            {cfg.label}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function Scans() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [showNewScan, setShowNewScan] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [scanName, setScanName] = useState("");
  const [targetType, setTargetType] = useState("repository");
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const { data: scans = [], isLoading } = useQuery<Scan[]>({ queryKey: ["/api/scans"] });
  const { data: repos = [] } = useQuery<Repository[]>({ queryKey: ["/api/repositories"] });

  const createScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scans", {
        name: scanName || `${selectedTool.toUpperCase()} Scan`,
        scanType: selectedTool,
        targetType,
        targetId: selectedRepo || null,
        targetName: repos.find((r) => r.id === selectedRepo)?.name || targetType,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scans"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowNewScan(false);
      setScanName("");
      setSelectedTool("");
      setSelectedRepo("");
      toast({ title: "Scan initiated", description: "Your security scan is now running" });
    },
    onError: () => toast({ title: "Error", description: "Failed to start scan", variant: "destructive" }),
  });

  const filtered = scans.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (toolFilter !== "all" && s.scanType !== toolFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Security Scans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated vulnerability scanning across your infrastructure</p>
        </div>
        <Button onClick={() => setShowNewScan(true)} data-testid="button-new-scan-modal" className="gap-2">
          <Plus className="w-4 h-4" />
          New Scan
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {SCAN_TOOLS.map((tool) => {
            const count = scans.filter((s) => s.scanType === tool.id).length;
            return (
              <Card
                key={tool.id}
                data-testid={`tool-card-${tool.id}`}
                className="border-card-border cursor-pointer hover-elevate"
                onClick={() => setToolFilter(toolFilter === tool.id ? "all" : tool.id)}
                style={{ borderColor: toolFilter === tool.id ? tool.color + "50" : undefined }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: tool.color + "15" }}>
                      <tool.icon className="w-4.5 h-4.5" style={{ color: tool.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">{tool.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{count} scans</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-scan-search"
              placeholder="Search scans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9" data-testid="select-status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-muted-foreground opacity-50" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">No scans found</p>
              <p className="text-sm text-muted-foreground mb-4">Start your first security scan to identify vulnerabilities</p>
              <Button onClick={() => setShowNewScan(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Start First Scan
              </Button>
            </div>
          ) : (
            filtered.map((scan) => <ScanRow key={scan.id} scan={scan} />)
          )}
        </div>
      </div>

      <Dialog open={showNewScan} onOpenChange={setShowNewScan}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Launch Security Scan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Scan name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                data-testid="input-scan-name"
                value={scanName}
                onChange={(e) => setScanName(e.target.value)}
                placeholder="e.g. Production security audit"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Select scan tool</Label>
              <div className="grid grid-cols-2 gap-2">
                {SCAN_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    data-testid={`select-tool-${tool.id}`}
                    onClick={() => setSelectedTool(tool.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                      selectedTool === tool.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-accent/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tool.color + "15" }}>
                      <tool.icon className="w-4 h-4" style={{ color: tool.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{tool.name}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Target type</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger className="h-9" data-testid="select-target-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repository">Repository</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="webapp">Web Application</SelectItem>
                    <SelectItem value="container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "repository" && repos.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Repository</Label>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger className="h-9" data-testid="select-repo">
                      <SelectValue placeholder="Select repo" />
                    </SelectTrigger>
                    <SelectContent>
                      {repos.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewScan(false)}>Cancel</Button>
            <Button
              data-testid="button-launch-scan"
              onClick={() => createScanMutation.mutate()}
              disabled={!selectedTool || createScanMutation.isPending}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              {createScanMutation.isPending ? "Launching..." : "Launch Scan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
