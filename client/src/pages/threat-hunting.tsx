import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Clock, Trash2, AlertTriangle, Bug, Server, Shield, Database, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { ThreatHuntQuery } from "@shared/schema";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  low: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  info: "text-gray-500 bg-gray-500/10 border-gray-500/20",
};

const RESULT_TYPE_ICONS: Record<string, any> = {
  cve: AlertTriangle,
  vulnerability: Bug,
  asset: Server,
  finding: Shield,
  incident: AlertTriangle,
  sbom: Database,
};

const EXAMPLE_QUERIES = [
  { label: "Log4Shell CVE", query: "cve:log4j" },
  { label: "Critical severity", query: "severity:critical" },
  { label: "Production assets", query: "asset:production" },
  { label: "Container assets", query: "type:container" },
  { label: "SQL injection", query: "sql injection" },
  { label: "High severity", query: "severity:high" },
];

function ResultItem({ result }: { result: any }) {
  const Icon = RESULT_TYPE_ICONS[result.type] || Shield;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground capitalize">{result.source}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-sm font-semibold text-foreground truncate">{result.title}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{result.detail}</p>
      </div>
      <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border shrink-0", SEVERITY_COLORS[result.severity])}>
        {result.severity}
      </Badge>
    </div>
  );
}

export default function ThreatHuntingPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: history = [], isLoading: histLoading } = useQuery<ThreatHuntQuery[]>({ queryKey: ["/api/hunt/history"] });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/hunt/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hunt/history"] }),
  });

  async function handleSearch(q?: string) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setLastQuery(searchQuery);
    try {
      const resp = await fetch(`/api/hunt?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
      const data = await resp.json();
      setResults(data.results || []);
      qc.invalidateQueries({ queryKey: ["/api/hunt/history"] });
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" /> Threat Hunting Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Search across all security data using structured queries</p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="hunt-query-input"
                  className="pl-9 font-mono text-sm"
                  placeholder="cve:log4j  |  severity:critical  |  asset:production-db  |  type:server"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button data-testid="hunt-search-button" onClick={() => handleSearch()} disabled={isSearching || !query.trim()}>
                {isSearching ? "Hunting…" : "Hunt"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground font-medium">Quick queries:</div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map(({ label, query: q }) => (
                  <button
                    key={q}
                    data-testid={`example-query-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => { setQuery(q); handleSearch(q); }}
                    className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-mono"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t">
              <div className="text-xs text-muted-foreground font-medium">Query syntax:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/50 font-mono"><span className="text-primary">cve:</span><span className="text-muted-foreground">log4j</span></div>
                <div className="p-2 rounded bg-muted/50 font-mono"><span className="text-primary">severity:</span><span className="text-muted-foreground">critical</span></div>
                <div className="p-2 rounded bg-muted/50 font-mono"><span className="text-primary">asset:</span><span className="text-muted-foreground">hostname</span></div>
                <div className="p-2 rounded bg-muted/50 font-mono"><span className="text-primary">type:</span><span className="text-muted-foreground">server</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isSearching && (
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Hunting across security data…
            </div>
            <div className="space-y-2 mt-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          </CardContent></Card>
        )}

        {results !== null && !isSearching && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Results for <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{lastQuery}</code></span>
                <Badge variant="outline" data-testid="results-count">{results.length} found</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="py-8 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No results found for this query</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term or use query syntax like <code className="font-mono">cve:log4j</code></p>
                </div>
              ) : (
                <div className="space-y-2" data-testid="hunt-results">
                  {results.map((result, idx) => <ResultItem key={`${result.type}-${result.id}-${idx}`} result={result} />)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Hunt History</CardTitle>
          </CardHeader>
          <CardContent>
            {histLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hunt queries yet — start searching above</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <code className="flex-1 text-xs font-mono text-foreground bg-muted/60 px-2 py-1 rounded truncate">{item.query}</code>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.resultsCount} results</Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 shrink-0"
                      data-testid={`delete-hunt-${item.id}`}
                      onClick={() => { setQuery(item.query); handleSearch(item.query); }}
                    >
                      <Search className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => deleteHistoryMutation.mutate(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
