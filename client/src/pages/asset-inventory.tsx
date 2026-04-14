import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server, Box, Globe, GitBranch, Plus, Search, Filter, AlertTriangle, CheckCircle, Shield, Cloud, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { AssetInventoryItem } from "@shared/schema";

const ASSET_TYPE_ICONS: Record<string, any> = {
  server: Server,
  container: Box,
  domain: Globe,
  repository: GitBranch,
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

const ENV_COLORS: Record<string, string> = {
  production: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  staging: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  development: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

function AssetTypeChart({ assets }: { assets: AssetInventoryItem[] }) {
  const types = ["server", "container", "domain", "repository"];
  const total = assets.length || 1;
  return (
    <div className="space-y-3">
      {types.map(type => {
        const count = assets.filter(a => a.assetType === type).length;
        const pct = Math.round((count / total) * 100);
        const Icon = ASSET_TYPE_ICONS[type] || Server;
        return (
          <div key={type} className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize font-medium text-foreground">{type}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full">
                <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssetCard({ asset, onUpdate }: { asset: AssetInventoryItem; onUpdate: () => void }) {
  const Icon = ASSET_TYPE_ICONS[asset.assetType] || Server;
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/assets/${asset.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); toast({ title: "Asset removed" }); },
  });

  return (
    <Card data-testid={`asset-card-${asset.id}`} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-foreground truncate" data-testid={`asset-hostname-${asset.id}`}>{asset.hostname}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", CRITICALITY_COLORS[asset.criticality])}>
                  {asset.criticality}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", ENV_COLORS[asset.environment] || "")}>
                  {asset.environment}
                </Badge>
                {asset.cloudProvider && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    <Cloud className="w-2.5 h-2.5 mr-0.5" />{asset.cloudProvider}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 space-y-1">
            {asset.ip && <div className="text-xs text-muted-foreground font-mono">{asset.ip}</div>}
            {asset.os && <div className="text-xs text-muted-foreground">{asset.os}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
          <div className="text-center">
            <div className="text-base font-bold text-red-500">{asset.vulnerabilityCount}</div>
            <div className="text-[10px] text-muted-foreground">Vulns</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-orange-500">{asset.cveCount}</div>
            <div className="text-[10px] text-muted-foreground">CVEs</div>
          </div>
          <div className="text-center">
            <div className={cn("text-base font-bold", asset.status === "active" ? "text-green-500" : "text-gray-400")}>{asset.status}</div>
            <div className="text-[10px] text-muted-foreground">Status</div>
          </div>
        </div>

        {(asset.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(asset.tags as string[]).slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}

        {asset.owner && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> Owner: <span className="text-foreground">{asset.owner}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddAssetDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { hostname: "", ip: "", assetType: "server", environment: "production", criticality: "medium", cloudProvider: "", os: "", owner: "" } });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/assets", {
      hostname: data.hostname,
      ip: data.ip || undefined,
      assetType: data.assetType,
      environment: data.environment,
      criticality: data.criticality,
      cloudProvider: data.cloudProvider || undefined,
      os: data.os || undefined,
      owner: data.owner || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/assets"] }); setOpen(false); form.reset(); toast({ title: "Asset added to inventory" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-asset-button" size="sm"><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Asset to Inventory</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-3">
            <FormField control={form.control} name="hostname" render={({ field }) => (
              <FormItem><FormLabel>Hostname / Identifier</FormLabel><FormControl><Input data-testid="input-hostname" placeholder="web-prod-01 or api.example.com" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="ip" render={({ field }) => (
              <FormItem><FormLabel>IP Address</FormLabel><FormControl><Input data-testid="input-ip" placeholder="10.0.1.10" {...field} /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="assetType" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-asset-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="repository">Repository</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="criticality" render={({ field }) => (
                <FormItem><FormLabel>Criticality</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-criticality"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="environment" render={({ field }) => (
              <FormItem><FormLabel>Environment</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger data-testid="select-environment"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="cloudProvider" render={({ field }) => (
              <FormItem><FormLabel>Cloud Provider (optional)</FormLabel><FormControl><Input data-testid="input-cloud-provider" placeholder="aws / azure / gcp" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="owner" render={({ field }) => (
              <FormItem><FormLabel>Owner Team</FormLabel><FormControl><Input data-testid="input-owner" placeholder="Platform Team" {...field} /></FormControl></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="submit-add-asset">
              {mutation.isPending ? "Adding..." : "Add Asset"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AssetInventoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("all");
  const [critFilter, setCritFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery<AssetInventoryItem[]>({ queryKey: ["/api/assets"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/assets/stats"] });

  const filtered = assets.filter(a => {
    const matchSearch = !search || a.hostname.toLowerCase().includes(search.toLowerCase()) || (a.ip || "").includes(search) || (a.owner || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.assetType === typeFilter;
    const matchEnv = envFilter === "all" || a.environment === envFilter;
    const matchCrit = critFilter === "all" || a.criticality === critFilter;
    return matchSearch && matchType && matchEnv && matchCrit;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" /> Asset Inventory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Track and manage all discovered infrastructure assets</p>
          </div>
          <AddAssetDialog />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Assets", value: stats?.total ?? 0, icon: Shield, color: "text-primary" },
            { label: "Critical", value: stats?.byCriticality?.critical ?? 0, icon: AlertTriangle, color: "text-red-500" },
            { label: "Cloud Assets", value: (stats?.byType?.server ?? 0) + (stats?.byType?.container ?? 0), icon: Cloud, color: "text-blue-500" },
            { label: "Total CVEs", value: stats?.totalCves ?? 0, icon: AlertTriangle, color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className={cn("w-4.5 h-4.5", color)} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{isLoading ? "—" : value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Asset Distribution</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32" /> : <AssetTypeChart assets={assets} />}
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input data-testid="input-search-assets" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="filter-type" className="w-36"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="server">Servers</SelectItem>
                  <SelectItem value="container">Containers</SelectItem>
                  <SelectItem value="domain">Domains</SelectItem>
                  <SelectItem value="repository">Repositories</SelectItem>
                </SelectContent>
              </Select>
              <Select value={envFilter} onValueChange={setEnvFilter}>
                <SelectTrigger data-testid="filter-env" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Envs</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
              <Select value={critFilter} onValueChange={setCritFilter}>
                <SelectTrigger data-testid="filter-criticality" className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Criticality</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Server className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No assets found matching your filters</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map(asset => (
                  <AssetCard key={asset.id} asset={asset} onUpdate={() => {}} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
