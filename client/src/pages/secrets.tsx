import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { SecretsFinding } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Key, ScanLine, Loader2, AlertTriangle, CheckCircle2, EyeOff, FileCode, GitCommit, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const secretTypeLabels: Record<string, string> = {
  aws_access_key: "AWS Access Key",
  github_token: "GitHub Token",
  gcp_api_key: "GCP API Key",
  stripe_key: "Stripe Key",
  private_key: "Private Key",
  database_url: "Database URL",
  generic_api_key: "API Key",
  password: "Password",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  suppressed: { label: "Suppressed", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
};

export default function SecretsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<SecretsFinding | null>(null);

  const { data: findings = [], isLoading } = useQuery<SecretsFinding[]>({ queryKey: ["/api/secrets"] });

  const scanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/secrets/scan"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/secrets"] });
      toast({ title: "Secrets Scan Complete", description: `Scanned ${data.scanned} files, found ${data.found} secrets.` });
    },
    onError: () => toast({ title: "Scan failed", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/secrets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/secrets"] });
      setSelected(null);
      toast({ title: "Secret finding updated" });
    },
  });

  const open = findings.filter(f => f.status === "open").length;
  const suppressed = findings.filter(f => f.status === "suppressed").length;
  const resolved = findings.filter(f => f.status === "resolved").length;

  const filtered = statusFilter === "all" ? findings : findings.filter(f => f.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-secrets">Secrets Scanning</h1>
          <p className="text-muted-foreground text-sm mt-1">Detect hardcoded API keys, tokens, passwords, and private keys across your repositories</p>
        </div>
        <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending} data-testid="button-scan-secrets">
          {scanMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</> : <><ScanLine className="w-4 h-4 mr-2" />Scan Repositories</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", value: open, icon: AlertTriangle, color: "text-red-500" },
          { label: "Suppressed", value: suppressed, icon: EyeOff, color: "text-yellow-600" },
          { label: "Resolved", value: resolved, icon: CheckCircle2, color: "text-green-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-secrets-${s.label.toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                <s.icon className={cn("w-8 h-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{open} open secret{open > 1 ? "s" : ""} require immediate attention. Rotate any exposed credentials immediately.</p>
        </div>
      )}

      <div className="flex gap-2">
        {["all", "open", "suppressed", "resolved"].map(f => (
          <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"} onClick={() => setStatusFilter(f)} data-testid={`filter-secrets-${f}`}>
            {f === "all" ? "All" : statusConfig[f]?.label}
            {f !== "all" && <Badge variant="secondary" className="ml-1 text-xs">{f === "open" ? open : f === "suppressed" ? suppressed : resolved}</Badge>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : findings.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Key className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No secrets found</p>
          <p className="text-sm text-muted-foreground mt-1">Run a scan to detect exposed credentials in your codebase</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Secret Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Masked Value</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f => {
                const sc = statusConfig[f.status] || statusConfig.open;
                return (
                  <TableRow key={f.id} className={f.status === "open" ? "bg-red-500/5" : ""} data-testid={`row-secret-${f.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{secretTypeLabels[f.secretType] || f.secretType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{f.filePath}{f.lineNumber ? `:${f.lineNumber}` : ""}</span>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{f.maskedValue}</code></TableCell>
                    <TableCell>{f.commitHash ? <div className="flex items-center gap-1"><GitCommit className="w-3 h-3" /><span className="font-mono text-xs">{f.commitHash.slice(0, 7)}</span></div> : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", sc.color)}>{sc.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(f.createdAt), "MMM d")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelected(f)} data-testid={`button-action-secret-${f.id}`}>Manage</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && <>
            <DialogHeader>
              <DialogTitle>{secretTypeLabels[selected.secretType] || selected.secretType}</DialogTitle>
              <DialogDescription className="font-mono text-xs">{selected.filePath}{selected.lineNumber ? `:${selected.lineNumber}` : ""}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Masked value:</span><code className="ml-2 bg-muted px-1 py-0.5 rounded text-xs">{selected.maskedValue}</code></div>
              {selected.commitHash && <div><span className="text-muted-foreground">Commit:</span><span className="ml-2 font-mono text-xs">{selected.commitHash}</span></div>}
              <div><span className="text-muted-foreground">Status:</span><Badge variant="outline" className={cn("ml-2 text-xs", statusConfig[selected.status]?.color)}>{statusConfig[selected.status]?.label}</Badge></div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {selected.status === "open" && <>
                <Button variant="destructive" onClick={() => updateMutation.mutate({ id: selected.id, data: { status: "resolved" } })} disabled={updateMutation.isPending} data-testid="button-resolve-secret">
                  <CheckCircle2 className="w-4 h-4 mr-2" />Mark Resolved (Rotated)
                </Button>
                <Button variant="outline" onClick={() => updateMutation.mutate({ id: selected.id, data: { status: "suppressed" } })} disabled={updateMutation.isPending} data-testid="button-suppress-secret">
                  <Ban className="w-4 h-4 mr-2" />Suppress (False Positive)
                </Button>
              </>}
              {selected.status !== "open" && (
                <Button variant="outline" onClick={() => updateMutation.mutate({ id: selected.id, data: { status: "open" } })} disabled={updateMutation.isPending} data-testid="button-reopen-secret">
                  Reopen Finding
                </Button>
              )}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
