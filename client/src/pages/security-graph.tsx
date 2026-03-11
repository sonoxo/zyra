import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Share2, AlertTriangle, Shield, Server, Box, GitBranch, Cloud, Key, Bug, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NODE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  asset:          { label: "Asset",          icon: Server,    color: "text-blue-500",   bg: "bg-blue-500/10" },
  cloud_account:  { label: "Cloud Account",  icon: Cloud,     color: "text-violet-500", bg: "bg-violet-500/10" },
  container:      { label: "Container",      icon: Box,       color: "text-cyan-500",   bg: "bg-cyan-500/10" },
  repository:     { label: "Repository",     icon: GitBranch, color: "text-emerald-500",bg: "bg-emerald-500/10" },
  vulnerability:  { label: "Vulnerability",  icon: Bug,       color: "text-red-500",    bg: "bg-red-500/10" },
  identity:       { label: "Identity",       icon: Key,       color: "text-orange-500", bg: "bg-orange-500/10" },
};

const RISK_COLOR = (score: number) =>
  score >= 80 ? "text-red-500 bg-red-500/10 border-red-500/20"
  : score >= 60 ? "text-orange-500 bg-orange-500/10 border-orange-500/20"
  : score >= 40 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
  : "text-green-500 bg-green-500/10 border-green-500/20";

function NodeCard({ node, edges, allNodes, isSelected, onClick }: { node: any; edges: any[]; allNodes: any[]; isSelected: boolean; onClick: () => void }) {
  const config = NODE_TYPE_CONFIG[node.nodeType] ?? { label: node.nodeType, icon: Shield, color: "text-muted-foreground", bg: "bg-muted" };
  const Icon = config.icon;
  const outgoing = edges.filter(e => e.source === node.id);
  const incoming = edges.filter(e => e.target === node.id);

  return (
    <div
      data-testid={`graph-node-${node.id}`}
      className={cn("border rounded-lg p-3 cursor-pointer transition-all", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", config.bg)}>
          <Icon className={cn("w-3.5 h-3.5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate">{node.label}</span>
            <Badge variant="outline" className={cn("text-[9px] border shrink-0", RISK_COLOR(node.riskScore))}>
              {node.riskScore}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">{config.label}</span>
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          {outgoing.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              → {outgoing.map(e => {
                const tgt = allNodes.find(n => n.id === e.target);
                return <span key={e.id} className="mr-1.5 text-foreground">{tgt?.label ?? e.target} <span className="text-muted-foreground">({e.edgeType})</span></span>;
              })}
            </div>
          )}
          {incoming.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              ← {incoming.map(e => {
                const src = allNodes.find(n => n.id === e.source);
                return <span key={e.id} className="mr-1.5 text-foreground">{src?.label ?? e.source} <span className="text-muted-foreground">({e.edgeType})</span></span>;
              })}
            </div>
          )}
          {Object.entries(node.properties ?? {}).length > 0 && (
            <div className="text-[10px] font-mono text-muted-foreground border-t border-border pt-1 mt-1">
              {Object.entries(node.properties).map(([k, v]) => (
                <div key={k}><span className="text-foreground">{k}:</span> {String(v)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SecurityGraphPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: graph, isLoading } = useQuery<any>({ queryKey: ["/api/graph"] });

  const nodes: any[] = graph?.nodes ?? [];
  const edges: any[] = graph?.edges ?? [];

  const filteredNodes = typeFilter === "all" ? nodes : nodes.filter(n => n.nodeType === typeFilter);

  const nodeTypeCounts: Record<string, number> = {};
  for (const n of nodes) nodeTypeCounts[n.nodeType] = (nodeTypeCounts[n.nodeType] ?? 0) + 1;

  const highRiskNodes = nodes.filter(n => n.riskScore >= 80);
  const avgRisk = nodes.length > 0 ? Math.round(nodes.reduce((s, n) => s + n.riskScore, 0) / nodes.length) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Share2 className="w-6 h-6 text-primary" /> Security Graph
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Asset relationship graph showing connections between assets, vulnerabilities, identities, and infrastructure</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Nodes", value: nodes.length, color: "text-foreground" },
            { label: "Connections", value: edges.length, color: "text-blue-500" },
            { label: "High Risk Nodes", value: highRiskNodes.length, color: "text-red-500" },
            { label: "Avg Risk Score", value: avgRisk, color: avgRisk >= 70 ? "text-red-500" : avgRisk >= 50 ? "text-yellow-500" : "text-green-500" },
          ].map(({ label, value, color }) => (
            <Card key={label} data-testid={`graph-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-4">
                <div className={cn("text-2xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
            data-testid="filter-all"
          >
            All ({nodes.length})
          </Button>
          {Object.entries(NODE_TYPE_CONFIG).map(([type, cfg]) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(type)}
              data-testid={`filter-${type}`}
              className="gap-1.5"
            >
              <cfg.icon className="w-3 h-3" />
              {cfg.label} {nodeTypeCounts[type] ? `(${nodeTypeCounts[type]})` : ""}
            </Button>
          ))}
        </div>

        {highRiskNodes.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-foreground">{highRiskNodes.length} high-risk node(s) detected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {highRiskNodes.map(n => (
                  <Badge key={n.id} variant="outline" className="text-xs border-red-500/30 text-red-500 cursor-pointer" onClick={() => setSelectedNode(n.id)}>
                    {n.label} ({n.riskScore})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="graph-nodes">
            {filteredNodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                edges={edges}
                allNodes={nodes}
                isSelected={selectedNode === node.id}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              />
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Connection Map ({edges.length} edges)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1" data-testid="edge-list">
              {edges.slice(0, 20).map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                return (
                  <div key={edge.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-foreground font-medium truncate">{src?.label ?? "?"}</span>
                    <span className="text-muted-foreground shrink-0">—{edge.edgeType}→</span>
                    <span className="text-foreground font-medium truncate">{tgt?.label ?? "?"}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
