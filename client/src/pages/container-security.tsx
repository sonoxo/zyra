import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box, Play, AlertTriangle, CheckCircle2, Loader2, Shield, Lock, Eye, Server, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ContainerScan, ContainerFinding } from "@shared/schema";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

function FindingsPanel({ scan }: { scan: ContainerScan }) {
  const [open, setOpen] = useState(false);
  const { data: findings = [], isLoading } = useQuery<ContainerFinding[]>({
    queryKey: ["/api/containers/scans", scan.id, "findings"],
    queryFn: async () => {
      const res = await fetch(`/api/containers/scans/${scan.id}/findings`, { credentials: "include" });
      return res.json();
    },
    enabled: open,
  });

  return (
    <div>
      <button className="flex items-center gap-1 text-xs text-primary hover:underline mt-2" onClick={() => setOpen(o => !o)} data-testid={`button-findings-${scan.id}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? "Hide" : "Show"} findings
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Loading...</div>
            : findings.length === 0 ? <p className="text-xs text-muted-foreground">No findings recorded.</p>
            : findings.map(f => (
              <div key={f.id} className={cn("px-3 py-2 rounded-lg border text-xs", SEVERITY_COLORS[f.severity] ?? "border-border bg-muted")} data-testid={`finding-${f.id}`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px] h-4 px-1", SEVERITY_COLORS[f.severity] ?? "")}>{f.severity}</Badge>
                  <span className="font-medium">{f.title}</span>
                  {f.cveId && <code className="text-[10px] bg-background/50 px-1 rounded">{f.cveId}</code>}
                </div>
                <p className="text-muted-foreground mt-0.5">{f.description}</p>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function ContainerSecurityPage() {
  const { toast } = useToast();
  const [imageName, setImageName] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const [scanType, setScanType] = useState("image");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/containers/stats"] });
  const { data: scans = [], isLoading } = useQuery<ContainerScan[]>({ queryKey: ["/api/containers/scans"] });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/containers/scan", { imageName, imageTag, scanType }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/containers/stats"] });
      setImageName("");
      toast({ title: "Scan started", description: "Container scan is running. Results will appear shortly." });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/containers/scans"] });
        queryClient.invalidateQueries({ queryKey: ["/api/containers/stats"] });
      }, 3500);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Container Security</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scan container images and Kubernetes clusters for vulnerabilities and misconfigurations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Box className="w-4 h-4 text-blue-500" /></div>
            <div><div className="text-2xl font-bold">{stats?.totalScans ?? 0}</div><div className="text-xs text-muted-foreground">Total Scans</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
            <div><div className="text-2xl font-bold text-red-500">{stats?.totalCritical ?? 0}</div><div className="text-xs text-muted-foreground">Critical CVEs</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Lock className="w-4 h-4 text-orange-500" /></div>
            <div><div className="text-2xl font-bold text-orange-500">{stats?.privilegedContainers ?? 0}</div><div className="text-xs text-muted-foreground">Privileged Containers</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Shield className="w-4 h-4 text-yellow-500" /></div>
            <div><div className="text-2xl font-bold text-yellow-500">{stats?.weakRbac ?? 0}</div><div className="text-xs text-muted-foreground">Weak RBAC</div></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Scan Container Image or Kubernetes Cluster</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input
              data-testid="input-image-name"
              placeholder="nginx:latest or k8s-cluster"
              value={imageName}
              onChange={e => setImageName(e.target.value)}
              className="max-w-xs"
            />
            <Input
              data-testid="input-image-tag"
              placeholder="Tag (latest)"
              value={imageTag}
              onChange={e => setImageTag(e.target.value)}
              className="max-w-32"
            />
            <Select value={scanType} onValueChange={setScanType}>
              <SelectTrigger className="w-40" data-testid="select-scan-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Container Image</SelectItem>
                <SelectItem value="kubernetes">Kubernetes Cluster</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => scanMutation.mutate()} disabled={!imageName || scanMutation.isPending} data-testid="button-run-scan">
              {scanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : scans.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Box className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No container scans yet.</p>
          <p className="text-sm text-muted-foreground/60">Enter an image name above to start a security scan.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {scans.map(scan => (
            <Card key={scan.id} data-testid={`card-scan-${scan.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", scan.scanType === "kubernetes" ? "bg-purple-500/10" : "bg-blue-500/10")}>
                    {scan.scanType === "kubernetes" ? <Server className={cn("w-4 h-4", scan.status === "running" ? "animate-pulse text-purple-500" : "text-purple-500")} /> : <Box className={cn("w-4 h-4", scan.status === "running" ? "animate-pulse text-blue-500" : "text-blue-500")} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{scan.imageName}:{scan.imageTag}</span>
                      <Badge variant="outline" className="text-xs capitalize">{scan.scanType}</Badge>
                      <Badge variant="outline" className={cn("text-xs",
                        scan.status === "completed" ? "text-green-600 border-green-500/30" :
                        scan.status === "running" ? "text-blue-600 border-blue-500/30" :
                        scan.status === "failed" ? "text-red-600 border-red-500/30" : ""
                      )}>
                        {scan.status === "running" ? <><Loader2 className="w-2.5 h-2.5 animate-spin mr-1 inline" />Running</> : scan.status}
                      </Badge>
                    </div>
                    {scan.status === "completed" && (
                      <div className="flex gap-4 text-xs mt-1 flex-wrap">
                        {scan.criticalCount > 0 && <span className="text-red-500 font-semibold">{scan.criticalCount} critical</span>}
                        {scan.highCount > 0 && <span className="text-orange-500">{scan.highCount} high</span>}
                        {scan.mediumCount > 0 && <span className="text-yellow-500">{scan.mediumCount} medium</span>}
                        {scan.lowCount > 0 && <span className="text-blue-500">{scan.lowCount} low</span>}
                        {scan.privilegedContainers > 0 && <span className="text-orange-400">{scan.privilegedContainers} privileged</span>}
                        {scan.weakRbac && <span className="text-yellow-400">Weak RBAC</span>}
                        {scan.openDashboards && <span className="text-red-400">Open dashboard</span>}
                        {scan.untrustedImages > 0 && <span className="text-red-400">{scan.untrustedImages} untrusted images</span>}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{format(new Date(scan.createdAt), "MMM d, yyyy HH:mm")}</div>
                    {scan.status === "completed" && <FindingsPanel scan={scan} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
