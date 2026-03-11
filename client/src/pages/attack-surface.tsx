import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AttackSurfaceAsset } from "@shared/schema";
import { insertAttackSurfaceAssetSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Radar, Plus, Loader2, AlertTriangle, Shield, Server, Lock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formSchema = insertAttackSurfaceAssetSchema.extend({ organizationId: z.string().optional() });

const assetTypeIcons: Record<string, any> = {
  subdomain: Globe,
  ip: Server,
  port: Wifi,
  certificate: Lock,
  api_endpoint: Radar,
};

const riskColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function AttackSurfacePage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery<AttackSurfaceAsset[]>({ queryKey: ["/api/attack-surface"] });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { assetType: "subdomain", host: "", service: "", riskLevel: "low", technologies: [], openPorts: [], vulnerabilityCount: 0 },
  });

  const discoverMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attack-surface/discover"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attack-surface"] });
      toast({ title: "Discovery Complete", description: `Found ${data.discovered} new assets. Total: ${data.total}` });
    },
    onError: () => toast({ title: "Discovery failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/attack-surface", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attack-surface"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Asset added" });
    },
  });

  const filtered = riskFilter === "all" ? assets : assets.filter(a => a.riskLevel === riskFilter);

  const byRisk = { critical: 0, high: 0, medium: 0, low: 0 };
  assets.forEach(a => { if (a.riskLevel in byRisk) (byRisk as any)[a.riskLevel]++; });
  const totalVulns = assets.reduce((s, a) => s + a.vulnerabilityCount, 0);
  const expiredCerts = assets.filter(a => a.tlsCertExpiry && new Date(a.tlsCertExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-attack-surface">Attack Surface Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Discover and monitor your external-facing assets — what attackers see from the outside</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-asset"><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Asset</DialogTitle>
                <DialogDescription>Manually add an external asset to track.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="assetType" render={({ field }) => (
                      <FormItem><FormLabel>Asset Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? "subdomain"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["subdomain","ip","port","certificate","api_endpoint"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="riskLevel" render={({ field }) => (
                      <FormItem><FormLabel>Risk Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? "low"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["critical","high","medium","low"].map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="host" render={({ field }) => (
                    <FormItem><FormLabel>Host / Address</FormLabel><FormControl><Input placeholder="api.example.com or 203.0.113.10" data-testid="input-asset-host" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="service" render={({ field }) => (
                      <FormItem><FormLabel>Service</FormLabel><FormControl><Input placeholder="HTTPS, SSH, etc." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="port" render={({ field }) => (
                      <FormItem><FormLabel>Port</FormLabel><FormControl><Input type="number" placeholder="443" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-asset">
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : "Add Asset"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending} data-testid="button-discover">
            {discoverMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Discovering...</> : <><Radar className="w-4 h-4 mr-2" />Auto-Discover</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: assets.length, icon: Globe, color: "text-foreground" },
          { label: "Critical/High", value: byRisk.critical + byRisk.high, icon: AlertTriangle, color: "text-red-500" },
          { label: "Total Vulnerabilities", value: totalVulns, icon: Shield, color: "text-orange-500" },
          { label: "Cert Expiring ≤30d", value: expiredCerts, icon: Lock, color: expiredCerts > 0 ? "text-red-500" : "text-green-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-asm-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                <s.icon className={cn("w-8 h-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {["all", "critical", "high", "medium", "low"].map(r => (
          <Button key={r} size="sm" variant={riskFilter === r ? "default" : "outline"} onClick={() => setRiskFilter(r)} data-testid={`filter-asm-${r}`}>
            {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            {r !== "all" && <Badge variant="secondary" className="ml-1 text-xs">{(byRisk as any)[r] ?? 0}</Badge>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : assets.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Radar className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No assets discovered</p>
          <p className="text-sm text-muted-foreground mt-1">Run auto-discovery to scan your external attack surface</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Open Ports</TableHead>
                <TableHead>Technologies</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Vulns</TableHead>
                <TableHead>TLS Expiry</TableHead>
                <TableHead>Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(asset => {
                const Icon = assetTypeIcons[asset.assetType] || Globe;
                const rc = riskColors[asset.riskLevel] || riskColors.low;
                const certExpiring = asset.tlsCertExpiry && new Date(asset.tlsCertExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <TableRow key={asset.id} data-testid={`row-asm-${asset.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm font-medium">{asset.host}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{asset.assetType}</Badge></TableCell>
                    <TableCell className="text-sm">{asset.service || "—"}</TableCell>
                    <TableCell>
                      {asset.openPorts && asset.openPorts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {asset.openPorts.slice(0, 3).map(p => <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>)}
                          {asset.openPorts.length > 3 && <span className="text-xs text-muted-foreground">+{asset.openPorts.length - 3}</span>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {asset.technologies && asset.technologies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {asset.technologies.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", rc)}>{asset.riskLevel}</Badge></TableCell>
                    <TableCell>{asset.vulnerabilityCount > 0 ? <span className="text-red-500 font-medium">{asset.vulnerabilityCount}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell>
                      {asset.tlsCertExpiry ? (
                        <span className={cn("text-xs", certExpiring ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {format(new Date(asset.tlsCertExpiry), "MMM d, yyyy")}
                          {certExpiring && " ⚠️"}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(asset.lastSeenAt), "MMM d")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
