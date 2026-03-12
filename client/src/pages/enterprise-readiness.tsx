import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Server, Database, Clock, Trash2, Plus, Loader2,
  CheckCircle, XCircle, Play, Settings, AlertTriangle, Layers,
  Send, RefreshCw, Building2, Folder
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<string, { color: string }> = {
  splunk: { color: "text-green-500 bg-green-500/10" },
  elastic: { color: "text-yellow-500 bg-yellow-500/10" },
  sentinel: { color: "text-blue-500 bg-blue-500/10" },
  qradar: { color: "text-purple-500 bg-purple-500/10" },
};

const WORKSPACE_COLORS: Record<string, string> = {
  "#ef4444": "bg-red-500",
  "#f59e0b": "bg-yellow-500",
  "#22c55e": "bg-green-500",
  "#3b82f6": "bg-blue-500",
  "#6366f1": "bg-indigo-500",
  "#8b5cf6": "bg-violet-500",
  "#ec4899": "bg-pink-500",
};

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SiemTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ configs: any[]; providers: any[] }>({ queryKey: ["/api/siem/config"] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiRequest("PATCH", `/api/siem/config/${id}`, { enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/siem/config"] }); toast({ title: "SIEM config updated" }); },
  });

  const testMutation = useMutation({
    mutationFn: async (configId: string) => { const r = await apiRequest("POST", "/api/siem/test-export", { configId }); return r.json(); },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/siem/config"] }); toast({ title: "Test export sent", description: data.message }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/siem/config/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/siem/config"] }); toast({ title: "SIEM config removed" }); },
  });

  const configs = data?.configs ?? [];
  const providers = data?.providers ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <Server className="w-4 h-4 mb-1 text-blue-500" />
          <div className="text-xl font-bold">{configs.length}</div>
          <div className="text-[10px] text-muted-foreground">Configured</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <CheckCircle className="w-4 h-4 mb-1 text-green-500" />
          <div className="text-xl font-bold text-green-500">{configs.filter(c => c.enabled).length}</div>
          <div className="text-[10px] text-muted-foreground">Active</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <Send className="w-4 h-4 mb-1 text-violet-500" />
          <div className="text-xl font-bold text-violet-500">{configs.reduce((s: number, c: any) => s + c.eventsExported, 0)}</div>
          <div className="text-[10px] text-muted-foreground">Events Exported</div>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-3" data-testid="siem-configs">
          {configs.map((c: any) => {
            const prov = providers.find((p: any) => p.id === c.provider);
            const provStyle = PROVIDER_ICONS[c.provider] ?? { color: "text-muted-foreground bg-muted" };
            return (
              <Card key={c.id} data-testid={`siem-${c.id}`} className={cn(!c.enabled && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", provStyle.color)}><Server className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{prov?.name ?? c.provider}</span>
                        <Badge variant="outline" className={cn("text-[10px]", c.enabled ? "text-green-500 border-green-500/30" : "text-muted-foreground")}>{c.enabled ? "Active" : "Disabled"}</Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">{prov?.format ?? "JSON"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono truncate max-w-md">{c.endpoint}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Index: <span className="font-medium text-foreground">{c.index ?? "default"}</span> · 
                        Exported: <span className="font-medium text-foreground">{c.eventsExported}</span> events · 
                        Last export: <span className="font-medium">{formatDate(c.lastExportAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={c.enabled} onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, enabled: checked })} data-testid={`toggle-siem-${c.id}`} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => testMutation.mutate(c.id)} disabled={testMutation.isPending} data-testid={`test-siem-${c.id}`}>
                        {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}Test
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(c.id)} data-testid={`delete-siem-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
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

function RetentionTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ policies: any[]; dataTypes: any[] }>({ queryKey: ["/api/retention-policy"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; retentionDays?: number; enabled?: boolean }) => apiRequest("PATCH", `/api/retention-policy/${id}`, rest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/retention-policy"] }); toast({ title: "Policy updated" }); },
  });

  const purgeMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/retention-policy/purge", {}); return r.json(); },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/retention-policy"] });
      toast({ title: "Purge complete", description: `Processed ${data.totalPolicies} policies` });
    },
  });

  const policies = data?.policies ?? [];
  const dataTypes = data?.dataTypes ?? [];
  const totalRetained = policies.reduce((s: number, p: any) => s + p.purgedCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
          <Card><CardContent className="p-3">
            <Database className="w-4 h-4 mb-1 text-blue-500" />
            <div className="text-xl font-bold">{policies.length}</div>
            <div className="text-[10px] text-muted-foreground">Policies</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <CheckCircle className="w-4 h-4 mb-1 text-green-500" />
            <div className="text-xl font-bold text-green-500">{policies.filter(p => p.enabled).length}</div>
            <div className="text-[10px] text-muted-foreground">Active</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Trash2 className="w-4 h-4 mb-1 text-red-500" />
            <div className="text-xl font-bold text-red-500">{totalRetained}</div>
            <div className="text-[10px] text-muted-foreground">Records Purged</div>
          </CardContent></Card>
        </div>
        <Button variant="outline" size="sm" onClick={() => purgeMutation.mutate()} disabled={purgeMutation.isPending} data-testid="run-purge">
          {purgeMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Run Purge
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Retention</TableHead>
                  <TableHead>Last Purged</TableHead>
                  <TableHead>Purged Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p: any) => {
                  const dt = dataTypes.find((d: any) => d.type === p.dataType);
                  return (
                    <TableRow key={p.id} data-testid={`retention-${p.id}`} className={cn(!p.enabled && "opacity-50")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{dt?.label ?? p.dataType}</div>
                            <div className="text-[10px] text-muted-foreground">{p.dataType}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={String(p.retentionDays)} onValueChange={(v) => updateMutation.mutate({ id: p.id, retentionDays: Number(v) })}>
                          <SelectTrigger className="h-7 text-xs w-28" data-testid={`retention-days-${p.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 days</SelectItem>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="180">180 days</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                            <SelectItem value="730">2 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.lastPurgedAt)}</TableCell>
                      <TableCell className="text-sm font-medium">{p.purgedCount}</TableCell>
                      <TableCell>
                        <Switch checked={p.enabled} onCheckedChange={(checked) => updateMutation.mutate({ id: p.id, enabled: checked })} data-testid={`toggle-retention-${p.id}`} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn("text-[10px]", p.enabled ? "text-green-500 border-green-500/30" : "text-muted-foreground")}>{p.enabled ? "Active" : "Disabled"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WorkspacesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const { data: workspacesData = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/workspaces"] });

  const createMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/workspaces/create", { name, description, color }); return r.json(); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({ title: "Workspace created" });
      setCreateOpen(false); setName(""); setDescription(""); setColor("#6366f1");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workspaces/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/workspaces"] }); toast({ title: "Workspace deleted" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-3 flex-1 mr-4">
          <Card><CardContent className="p-3">
            <Folder className="w-4 h-4 mb-1 text-indigo-500" />
            <div className="text-xl font-bold">{workspacesData.length}</div>
            <div className="text-[10px] text-muted-foreground">Workspaces</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Layers className="w-4 h-4 mb-1 text-cyan-500" />
            <div className="text-xl font-bold text-cyan-500">{workspacesData.reduce((s: number, w: any) => s + (w.assetCount ?? 0), 0)}</div>
            <div className="text-[10px] text-muted-foreground">Total Assets</div>
          </CardContent></Card>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-workspace"><Plus className="w-4 h-4 mr-1" /> New Workspace</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Name</Label><Input data-testid="input-workspace-name" placeholder="e.g. Production" value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
              <div><Label>Description</Label><Input data-testid="input-workspace-desc" placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1" /></div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {Object.keys(WORKSPACE_COLORS).map(c => (
                    <button key={c} onClick={() => setColor(c)} className={cn("w-7 h-7 rounded-full transition-all", WORKSPACE_COLORS[c], color === c ? "ring-2 ring-offset-2 ring-primary" : "opacity-60 hover:opacity-100")} />
                  ))}
                </div>
              </div>
              <Button data-testid="button-submit-workspace" className="w-full" disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : workspacesData.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Folder className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-muted-foreground text-sm">No workspaces yet</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="workspaces-grid">
          {workspacesData.map((w: any) => (
            <Card key={w.id} data-testid={`workspace-${w.id}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", WORKSPACE_COLORS[w.color] ?? "bg-indigo-500")} />
                    <span className="text-sm font-semibold">{w.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(w.id)} data-testid={`delete-workspace-${w.id}`}><Trash2 className="w-3 h-3" /></Button>
                </div>
                {w.description && <p className="text-xs text-muted-foreground mb-3">{w.description}</p>}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><Layers className="w-3 h-3" />{w.assetCount} assets</div>
                  <div className="flex items-center gap-1"><Building2 className="w-3 h-3" />{w.memberCount} members</div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">Created {formatDate(w.createdAt)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnterpriseReadinessPage() {
  const { data: siemData } = useQuery<{ configs: any[] }>({ queryKey: ["/api/siem/config"] });
  const { data: retentionData } = useQuery<{ policies: any[] }>({ queryKey: ["/api/retention-policy"] });
  const { data: workspacesData = [] } = useQuery<any[]>({ queryKey: ["/api/workspaces"] });

  const activeIntegrations = (siemData?.configs ?? []).filter(c => c.enabled).length;
  const activePolicies = (retentionData?.policies ?? []).filter((p: any) => p.enabled).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Enterprise Readiness
          </h1>
          <p className="text-muted-foreground text-sm mt-1">SIEM integration, data retention controls, and multi-tenant workspaces</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3">
            <Server className="w-4 h-4 mb-1 text-blue-500" />
            <div className="text-xl font-bold">{activeIntegrations}</div>
            <div className="text-[10px] text-muted-foreground">SIEM Integrations</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Database className="w-4 h-4 mb-1 text-green-500" />
            <div className="text-xl font-bold text-green-500">{activePolicies}</div>
            <div className="text-[10px] text-muted-foreground">Retention Policies</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Folder className="w-4 h-4 mb-1 text-indigo-500" />
            <div className="text-xl font-bold text-indigo-500">{workspacesData.length}</div>
            <div className="text-[10px] text-muted-foreground">Workspaces</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <CheckCircle className="w-4 h-4 mb-1 text-emerald-500" />
            <div className="text-xl font-bold text-emerald-500">Enterprise</div>
            <div className="text-[10px] text-muted-foreground">Readiness Tier</div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="siem">
          <TabsList>
            <TabsTrigger value="siem" data-testid="tab-siem">SIEM Integration</TabsTrigger>
            <TabsTrigger value="retention" data-testid="tab-retention">Data Retention</TabsTrigger>
            <TabsTrigger value="workspaces" data-testid="tab-workspaces">Workspaces ({workspacesData.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="siem" className="mt-4"><SiemTab /></TabsContent>
          <TabsContent value="retention" className="mt-4"><RetentionTab /></TabsContent>
          <TabsContent value="workspaces" className="mt-4"><WorkspacesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
