import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Key, Plus, Copy, Trash2, Loader2, AlertTriangle, Code, Check
} from "lucide-react";
import type { ApiKey } from "@shared/schema";

const AVAILABLE_PERMISSIONS = [
  { value: "read:scans", label: "Read Scans" },
  { value: "write:scans", label: "Write Scans" },
  { value: "read:reports", label: "Read Reports" },
  { value: "write:reports", label: "Write Reports" },
  { value: "read:compliance", label: "Read Compliance" },
  { value: "read:analytics", label: "Read Analytics" },
];

const EXPIRATION_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "365 days" },
  { value: "never", label: "Never" },
];

function ApiKeysPageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [newKeyExpiration, setNewKeyExpiration] = useState("90");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; expiresInDays: number | null }) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json();
    },
    onSuccess: (data: { rawKey: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setGeneratedKey(data.rawKey);
      setCreateOpen(false);
      setShowKeyDialog(true);
      setNewKeyName("");
      setNewKeyPermissions([]);
      setNewKeyExpiration("90");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create API key", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key revoked" });
      setRevokeKeyId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to revoke API key", description: err.message, variant: "destructive" });
    },
  });

  function handleCreate() {
    if (!newKeyName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: newKeyName.trim(),
      permissions: newKeyPermissions,
      expiresInDays: newKeyExpiration === "never" ? null : parseInt(newKeyExpiration),
    });
  }

  function togglePermission(perm: string) {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }

  function isExpired(key: ApiKey) {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) < new Date();
  }

  function formatDate(date: string | Date | null | undefined) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-description">
            Manage API keys for programmatic access to your organization's data.
          </p>
        </div>
        <Button
          data-testid="button-create-api-key"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Active Keys
          </CardTitle>
          <Badge variant="secondary" data-testid="badge-key-count">
            {apiKeys?.length ?? 0} key{(apiKeys?.length ?? 0) !== 1 ? "s" : ""}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ApiKeysPageSkeleton />
          ) : !apiKeys?.length ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-keys">
              <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm mt-1">Create your first API key to get started with programmatic access.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => {
                    const expired = isExpired(key);
                    const active = key.isActive && !expired;
                    return (
                      <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                        <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>
                          {key.name}
                        </TableCell>
                        <TableCell>
                          <code
                            className="text-xs bg-muted px-2 py-1 rounded-md"
                            data-testid={`text-key-prefix-${key.id}`}
                          >
                            {key.keyPrefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.permissions?.length ? (
                              key.permissions.map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="text-xs"
                                  data-testid={`badge-permission-${key.id}-${p}`}
                                >
                                  {p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-key-created-${key.id}`}>
                          {formatDate(key.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-key-last-used-${key.id}`}>
                          {formatDate(key.lastUsedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-key-expires-${key.id}`}>
                          {key.expiresAt ? formatDate(key.expiresAt) : "Never"}
                        </TableCell>
                        <TableCell>
                          {active ? (
                            <Badge variant="default" data-testid={`badge-status-${key.id}`}>Active</Badge>
                          ) : expired ? (
                            <Badge variant="destructive" data-testid={`badge-status-${key.id}`}>Expired</Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-status-${key.id}`}>Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              data-testid={`button-revoke-${key.id}`}
                              onClick={() => setRevokeKeyId(key.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-api-docs-description">
            Use your API key in the Authorization header to authenticate requests.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">List Scans</Label>
              <pre
                className="mt-1 p-3 rounded-md bg-muted text-sm overflow-x-auto"
                data-testid="text-example-list-scans"
              >
                <code>{`curl -H "Authorization: Bearer sf_your_api_key_here" \\
  https://your-domain.com/api/scans`}</code>
              </pre>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Get Reports</Label>
              <pre
                className="mt-1 p-3 rounded-md bg-muted text-sm overflow-x-auto"
                data-testid="text-example-get-reports"
              >
                <code>{`curl -H "Authorization: Bearer sf_your_api_key_here" \\
  https://your-domain.com/api/reports`}</code>
              </pre>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Trigger a Scan</Label>
              <pre
                className="mt-1 p-3 rounded-md bg-muted text-sm overflow-x-auto"
                data-testid="text-example-trigger-scan"
              >
                <code>{`curl -X POST -H "Authorization: Bearer sf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"API Scan","scanType":"semgrep"}' \\
  https://your-domain.com/api/scans`}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                data-testid="input-key-name"
                placeholder="e.g. CI/CD Pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.value}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid={`checkbox-permission-${perm.value}`}
                  >
                    <Checkbox
                      checked={newKeyPermissions.includes(perm.value)}
                      onCheckedChange={() => togglePermission(perm.value)}
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={newKeyExpiration} onValueChange={setNewKeyExpiration}>
                <SelectTrigger data-testid="select-expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-expiration-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showKeyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowKeyDialog(false);
            setGeneratedKey(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                This key will only be displayed once. Store it securely.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 p-3 rounded-md bg-muted text-sm break-all font-mono"
                data-testid="text-generated-key"
              >
                {generatedKey}
              </code>
              <Button
                size="icon"
                variant="outline"
                data-testid="button-copy-key"
                onClick={() => generatedKey && copyToClipboard(generatedKey)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowKeyDialog(false);
                setGeneratedKey(null);
                setCopied(false);
              }}
              data-testid="button-done-key"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeKeyId} onOpenChange={(open) => !open && setRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone.
              Any applications using this key will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-revoke"
              onClick={() => revokeKeyId && revokeMutation.mutate(revokeKeyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
