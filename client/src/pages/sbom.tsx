import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { SbomItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Package, ShieldAlert, ScanLine, Loader2, AlertTriangle, CheckCircle2, ExternalLink, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const ecosystemColors: Record<string, string> = {
  npm: "bg-red-500/10 text-red-500 border-red-500/20",
  pip: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  maven: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  gem: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  go: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  nuget: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
};

function riskColor(score: number) {
  if (score >= 80) return "text-red-500";
  if (score >= 50) return "text-orange-500";
  if (score >= 20) return "text-yellow-600";
  return "text-green-500";
}

export default function SbomPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [ecosystemFilter, setEcosystemFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = useQuery<SbomItem[]>({ queryKey: ["/api/sbom"] });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sbom/scan"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sbom"] });
      toast({ title: "SBOM Scan Complete", description: `Scanned ${data.scanned} packages, found ${data.vulnerable} vulnerable.` });
    },
    onError: () => toast({ title: "Scan failed", variant: "destructive" }),
  });

  const ecosystems = ["all", ...Array.from(new Set(items.map(i => i.ecosystem)))];

  const filtered = items.filter(i => {
    if (filter === "vulnerable" && !i.isVulnerable) return false;
    if (filter === "safe" && i.isVulnerable) return false;
    if (ecosystemFilter !== "all" && i.ecosystem !== ecosystemFilter) return false;
    if (search && !i.packageName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const vulnerable = items.filter(i => i.isVulnerable).length;
  const totalCves = items.reduce((s, i) => s + (i.knownCves?.length || 0), 0);
  const avgRisk = items.length ? Math.round(items.reduce((s, i) => s + i.riskScore, 0) / items.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-sbom">Supply Chain / SBOM</h1>
          <p className="text-muted-foreground text-sm mt-1">Software Bill of Materials — catalog and monitor third-party dependencies for known vulnerabilities</p>
        </div>
        <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending} data-testid="button-scan-sbom">
          {scanMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : <><ScanLine className="w-4 h-4 mr-2" />Scan Dependencies</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Packages", value: items.length, icon: Package, color: "text-foreground" },
          { label: "Vulnerable", value: vulnerable, icon: ShieldAlert, color: "text-red-500" },
          { label: "Known CVEs", value: totalCves, icon: AlertTriangle, color: "text-orange-500" },
          { label: "Avg Risk Score", value: `${avgRisk}/100`, icon: CheckCircle2, color: avgRisk > 50 ? "text-red-500" : "text-green-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-sbom-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                <s.icon className={cn("w-8 h-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ecosystem Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ecosystems.filter(e => e !== "all").map(eco => {
                const count = items.filter(i => i.ecosystem === eco).length;
                const vulnCount = items.filter(i => i.ecosystem === eco && i.isVulnerable).length;
                return (
                  <div key={eco} className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("text-xs w-16 justify-center", ecosystemColors[eco] || "bg-muted")}>{eco}</Badge>
                    <Progress value={(count / items.length) * 100} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-16 text-right">{count} pkgs{vulnCount > 0 && <span className="text-red-500"> ({vulnCount} vuln)</span>}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <Input placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" data-testid="input-sbom-search" />
        {["all", "vulnerable", "safe"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} data-testid={`filter-sbom-${f}`}>
            {f === "all" ? "All" : f === "vulnerable" ? `Vulnerable (${vulnerable})` : `Safe (${items.length - vulnerable})`}
          </Button>
        ))}
        <Select value={ecosystemFilter} onValueChange={setEcosystemFilter}>
          <SelectTrigger className="w-32 h-9" data-testid="select-ecosystem"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>{ecosystems.map(e => <SelectItem key={e} value={e}>{e === "all" ? "All Ecosystems" : e}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No packages cataloged</p>
          <p className="text-sm text-muted-foreground mt-1">Run a dependency scan to populate your SBOM</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Ecosystem</TableHead>
                <TableHead>CVEs</TableHead>
                <TableHead>Patched Version</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id} className={item.isVulnerable ? "bg-red-500/5" : ""} data-testid={`row-sbom-${item.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.isVulnerable ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      {item.packageName}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.packageVersion}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-xs", ecosystemColors[item.ecosystem] || "")}>{item.ecosystem}</Badge></TableCell>
                  <TableCell>
                    {item.knownCves && item.knownCves.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.knownCves.slice(0, 2).map(cve => <Badge key={cve} variant="secondary" className="text-xs font-mono">{cve}</Badge>)}
                        {item.knownCves.length > 2 && <Badge variant="secondary" className="text-xs">+{item.knownCves.length - 2}</Badge>}
                      </div>
                    ) : <span className="text-muted-foreground text-sm">None</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.patchedVersion || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.riskScore} className="w-16 h-1.5" />
                      <span className={cn("text-xs font-bold", riskColor(item.riskScore))}>{item.riskScore}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{item.transitive ? "Transitive" : "Direct"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
