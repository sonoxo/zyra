import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers, Server, Cloud, Box, GitBranch, Database, Globe,
  Users, Key, Cpu, Shield, AlertTriangle, Eye, TrendingUp,
  ChevronDown, ChevronRight, Link2, Bug, Flame
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ASSET_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  server:             { icon: Server,    color: "text-blue-500",    bg: "bg-blue-500/10" },
  container:          { icon: Box,       color: "text-cyan-500",    bg: "bg-cyan-500/10" },
  repository:         { icon: GitBranch, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  database:           { icon: Database,  color: "text-violet-500",  bg: "bg-violet-500/10" },
  domain:             { icon: Globe,     color: "text-orange-500",  bg: "bg-orange-500/10" },
  kubernetes_cluster: { icon: Cpu,       color: "text-pink-500",    bg: "bg-pink-500/10" },
};

const IDENTITY_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  user:            { icon: Users, color: "text-blue-500",   bg: "bg-blue-500/10" },
  service_account: { icon: Cpu,   color: "text-violet-500", bg: "bg-violet-500/10" },
  api_key:         { icon: Key,   color: "text-orange-500", bg: "bg-orange-500/10" },
  iam_role:        { icon: Shield,color: "text-emerald-500",bg: "bg-emerald-500/10" },
};

function riskColor(score: number) {
  if (score >= 80) return "text-red-500 bg-red-500/10 border-red-500/20";
  if (score >= 60) return "text-orange-500 bg-orange-500/10 border-orange-500/20";
  if (score >= 40) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  return "text-green-500 bg-green-500/10 border-green-500/20";
}

function riskBadge(score: number) {
  if (score >= 80) return "bg-red-500 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  if (score >= 40) return "bg-yellow-500 text-black";
  return "bg-green-500 text-white";
}

function riskLabel(score: number) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

// ── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset }: { asset: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ASSET_TYPE_CONFIG[asset.assetType] ?? { icon: Server, color: "text-muted-foreground", bg: "bg-muted" };
  const Icon = cfg.icon;

  return (
    <div
      data-testid={`asset-card-${asset.id}`}
      className="border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
    >
      <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
          <Icon className={cn("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{asset.hostname}</span>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", riskBadge(asset.riskScore))}>
              {riskLabel(asset.riskScore)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {asset.ip && <span className="text-xs text-muted-foreground font-mono">{asset.ip}</span>}
            <Badge variant="outline" className="text-[10px] px-1 py-0">{asset.environment}</Badge>
            {asset.cloudProvider && <Badge variant="outline" className="text-[10px] px-1 py-0">{asset.cloudProvider}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-foreground">{asset.riskScore}</div>
            <div className="text-[10px] text-muted-foreground">risk score</div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Vulnerabilities", value: asset.linkedVulnerabilities, icon: Bug, color: "text-red-500" },
              { label: "Incidents", value: asset.linkedIncidents, icon: Flame, color: "text-orange-500" },
              { label: "Attack Paths", value: asset.linkedAttackPaths, icon: TrendingUp, color: "text-yellow-500" },
              { label: "Identities", value: asset.linkedIdentities, icon: Users, color: "text-blue-500" },
            ].map(({ label, value, icon: LIcon, color }) => (
              <div key={label} className="bg-background rounded-md p-2.5 border border-border">
                <LIcon className={cn("w-3.5 h-3.5 mb-1", color)} />
                <div className="text-base font-bold text-foreground">{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {asset.correlations?.vulnerabilities?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Linked Vulnerabilities
              </div>
              <div className="space-y-1">
                {asset.correlations.vulnerabilities.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className={cn("text-[10px] border", riskColor(v.severity === "critical" ? 90 : v.severity === "high" ? 70 : 40))}>
                      {v.severity}
                    </Badge>
                    <span className="text-foreground truncate">{v.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.correlations?.attackPaths?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Linked Attack Paths
              </div>
              {asset.correlations.attackPaths.map((p: any) => (
                <div key={p.id} className="text-xs text-muted-foreground">
                  {p.name} <span className="text-foreground font-medium">(risk: {p.riskScore})</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 text-xs text-muted-foreground">
            {asset.owner && <span>Owner: <span className="text-foreground">{asset.owner}</span></span>}
            {asset.os && <span>OS: <span className="text-foreground">{asset.os}</span></span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Identity Card ─────────────────────────────────────────────────────────────

function IdentityCard({ identity }: { identity: any }) {
  const cfg = IDENTITY_TYPE_CONFIG[identity.identityType] ?? { icon: Users, color: "text-muted-foreground", bg: "bg-muted" };
  const Icon = cfg.icon;
  const daysSince = identity.lastActivity
    ? Math.floor((Date.now() - new Date(identity.lastActivity).getTime()) / 86400000)
    : null;

  return (
    <div data-testid={`identity-card-${identity.id}`} className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
          <Icon className={cn("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{identity.name}</span>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", riskBadge(identity.riskScore))}>
              {riskLabel(identity.riskScore)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{identity.identityType.replace("_", " ")}</Badge>
            <Badge variant="outline" className={cn("text-[10px] px-1 py-0 capitalize border", identity.privilegeLevel === "admin" ? "border-red-500/30 text-red-500" : identity.privilegeLevel === "elevated" ? "border-orange-500/30 text-orange-500" : "")}>
              {identity.privilegeLevel}
            </Badge>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-foreground">{identity.riskScore}</div>
          <div className="text-[10px] text-muted-foreground">risk</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className={cn("flex items-center gap-1", identity.mfaEnabled ? "text-green-500" : "text-red-500")}>
          <Shield className="w-3 h-3" /> {identity.mfaEnabled ? "MFA Enabled" : "No MFA"}
        </span>
        {daysSince !== null && (
          <span>Last active: {daysSince === 0 ? "today" : `${daysSince}d ago`}</span>
        )}
        <span>Source: {identity.source}</span>
      </div>
      {identity.permissions?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {identity.permissions.slice(0, 5).map((p: string) => (
            <span key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{p}</span>
          ))}
          {identity.permissions.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{identity.permissions.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CaasmPage() {
  const [assetFilter, setAssetFilter] = useState<"all" | "high-risk" | "exposed">("all");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/caasm/stats"] });
  const { data: allAssets = [], isLoading: assetsLoading } = useQuery<any[]>({ queryKey: ["/api/caasm/assets"] });
  const { data: highRiskAssets = [] } = useQuery<any[]>({ queryKey: ["/api/caasm/assets/high-risk"] });
  const { data: exposedAssets = [] } = useQuery<any[]>({ queryKey: ["/api/caasm/assets/exposed"] });
  const { data: identities = [], isLoading: idLoading } = useQuery<any[]>({ queryKey: ["/api/caasm/identities"] });

  const displayedAssets = assetFilter === "high-risk" ? highRiskAssets : assetFilter === "exposed" ? exposedAssets : allAssets;

  const statCards = [
    { label: "Total Assets", value: stats?.totalAssets ?? 0, icon: Layers,        color: "text-foreground" },
    { label: "High-Risk Assets", value: stats?.highRiskAssets ?? 0, icon: AlertTriangle, color: "text-red-500" },
    { label: "Exposed Assets", value: stats?.exposedAssets ?? 0,  icon: Eye,          color: "text-orange-500" },
    { label: "Cloud Assets", value: stats?.cloudAssets ?? 0,    icon: Cloud,         color: "text-blue-500" },
    { label: "Total Identities", value: stats?.totalIdentities ?? 0, icon: Users,       color: "text-foreground" },
    { label: "High-Risk Identities", value: stats?.highRiskIdentities ?? 0, icon: Shield, color: "text-red-500" },
    { label: "No MFA", value: stats?.identitiesNoMfa ?? 0, icon: Key,          color: "text-orange-500" },
    { label: "Admin Identities", value: stats?.adminIdentities ?? 0, icon: Cpu,        color: "text-violet-500" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> CAASM
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cyber Asset Attack Surface Management — unified inventory of all infrastructure, applications, cloud accounts, and identities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`caasm-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className={cn("text-2xl font-bold", color)}>
                  {statsLoading ? "—" : value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Asset Distribution */}
        {stats?.assetsByType && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Asset Distribution by Type</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3" data-testid="asset-distribution">
                {Object.entries(stats.assetsByType).map(([type, count]) => {
                  const cfg = ASSET_TYPE_CONFIG[type] ?? { icon: Server, color: "text-muted-foreground", bg: "bg-muted" };
                  const Icon = cfg.icon;
                  return (
                    <div key={type} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                      <span className="text-sm font-medium text-foreground capitalize">{type.replace("_", " ")}</span>
                      <span className="text-sm font-bold text-foreground">{count as number}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="assets">
          <TabsList>
            <TabsTrigger value="assets" data-testid="tab-assets">Assets ({allAssets.length})</TabsTrigger>
            <TabsTrigger value="identities" data-testid="tab-identities">Identities ({identities.length})</TabsTrigger>
            <TabsTrigger value="exposed" data-testid="tab-exposed">Exposed ({exposedAssets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4 mt-4">
            <div className="flex gap-2">
              {([["all", "All Assets"], ["high-risk", "High Risk"], ["exposed", "Exposed"]] as const).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={assetFilter === key ? "default" : "outline"}
                  onClick={() => setAssetFilter(key)}
                  data-testid={`filter-${key}`}
                >
                  {label} {key === "all" ? `(${allAssets.length})` : key === "high-risk" ? `(${highRiskAssets.length})` : `(${exposedAssets.length})`}
                </Button>
              ))}
            </div>

            {assetsLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : displayedAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No assets found. Add assets in the Asset Inventory.</div>
            ) : (
              <div className="space-y-3" data-testid="assets-list">
                {displayedAssets.map((asset: any) => <AssetCard key={asset.id} asset={asset} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="identities" className="space-y-4 mt-4">
            {idLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : identities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No identities discovered yet.</div>
            ) : (
              <div className="space-y-3" data-testid="identities-list">
                {identities.map((identity: any) => <IdentityCard key={identity.id} identity={identity} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exposed" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Eye className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm text-foreground">
                These assets are publicly accessible or production-critical. Each represents a potential entry point for attackers.
              </p>
            </div>
            {exposedAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No exposed assets detected.</div>
            ) : (
              <div className="space-y-3" data-testid="exposed-list">
                {exposedAssets.map((asset: any) => (
                  <div key={asset.id} data-testid={`exposed-asset-${asset.id}`} className="border border-orange-500/20 rounded-lg p-4 bg-orange-500/5">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground">{asset.hostname}</div>
                        <div className="text-xs text-muted-foreground">
                          {asset.exposureLevel ?? "internet"} · {asset.discoveryMethod?.replace("_", " ") ?? "cloud api"} · risk {asset.riskScore}
                        </div>
                      </div>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded", riskBadge(asset.riskScore))}>
                        {riskLabel(asset.riskScore)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
