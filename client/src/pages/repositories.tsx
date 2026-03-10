import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch, Plus, Github, Gitlab, Trash2, RefreshCw,
  CheckCircle, Clock, ExternalLink, GitCommit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Repository } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function ProviderIcon({ provider, size = 5 }: { provider: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  if (provider === "github") return <Github className={cls} />;
  return <Gitlab className={cn(cls, "text-orange-500")} />;
}

export default function Repositories() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<"github" | "gitlab">("github");
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");

  const { data: repos = [], isLoading } = useQuery<Repository[]>({ queryKey: ["/api/repositories"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/repositories", { provider, name, fullName, url, branch });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/repositories"] });
      setShowAdd(false);
      setName(""); setFullName(""); setUrl(""); setBranch("main");
      toast({ title: "Repository connected", description: "Repository added successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add repository", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/repositories/${id}`, undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/repositories"] });
      toast({ title: "Repository removed" });
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Repositories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Connect GitHub and GitLab repositories for security scanning</p>
        </div>
        <Button onClick={() => setShowAdd(true)} data-testid="button-add-repo" className="gap-2">
          <Plus className="w-4 h-4" />
          Connect Repository
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <GitBranch className="w-7 h-7 text-muted-foreground opacity-50" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">No repositories connected</p>
              <p className="text-sm text-muted-foreground mb-4">Connect your GitHub or GitLab repositories to run security scans</p>
              <Button onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Connect First Repository
              </Button>
            </div>
          ) : (
            repos.map((repo) => (
              <Card key={repo.id} data-testid={`repo-card-${repo.id}`} className="border-card-border hover-elevate">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                    repo.provider === "github" ? "bg-foreground/10 dark:bg-foreground/10" : "bg-orange-500/10"
                  )}>
                    <ProviderIcon provider={repo.provider} size={5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-foreground text-sm">{repo.fullName}</span>
                      <Badge variant="outline" className="text-xs h-4.5 px-1.5 gap-1">
                        <GitCommit className="w-2.5 h-2.5" />
                        {repo.branch}
                      </Badge>
                      {repo.isActive && (
                        <Badge variant="outline" className="text-xs h-4.5 px-1.5 border-green-500/30 text-green-600 dark:text-green-400">active</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{repo.url}</div>
                    {repo.lastScannedAt && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Last scanned {formatDistanceToNow(new Date(repo.lastScannedAt), { addSuffix: true })}
                      </div>
                    )}
                    {!repo.lastScannedAt && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Never scanned
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      data-testid={`delete-repo-${repo.id}`}
                      onClick={() => deleteMutation.mutate(repo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Connect Repository
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["github", "gitlab"] as const).map((p) => (
                  <button
                    key={p}
                    data-testid={`provider-${p}`}
                    onClick={() => setProvider(p)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border transition-all",
                      provider === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <ProviderIcon provider={p} />
                    <span className="text-sm font-medium capitalize">{p === "gitlab" ? "GitLab" : "GitHub"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Repository name</Label>
                <Input
                  data-testid="input-repo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-app"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Full name</Label>
                <Input
                  data-testid="input-repo-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="org/my-app"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Repository URL</Label>
              <Input
                data-testid="input-repo-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/org/my-app"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Default branch</Label>
              <Input
                data-testid="input-repo-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              data-testid="button-connect-repo"
              onClick={() => addMutation.mutate()}
              disabled={!name || !url || addMutation.isPending}
              className="gap-2"
            >
              <GitBranch className="w-4 h-4" />
              {addMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
