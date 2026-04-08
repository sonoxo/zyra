import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, Clock, User, Activity, Globe } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_CATEGORIES: Record<string, { label: string; color: string }> = {
  "auth": { label: "Authentication", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  "team": { label: "Team", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  "billing": { label: "Billing", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  "scan": { label: "Scan", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  "incident": { label: "Incident", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  "settings": { label: "Settings", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  "deployment": { label: "Deployment", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300" },
  "task": { label: "Task", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
};

function getCategory(action: string): { label: string; color: string } {
  const prefix = action.split(".")[0];
  return ACTION_CATEGORIES[prefix] || { label: prefix, color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" };
}

function formatAction(action: string): string {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const categories = Array.from(new Set(logs.map(l => l.action.split(".")[0]))).sort();

  const filtered = logs.filter(log => {
    const matchesSearch = !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.resourceType?.toLowerCase().includes(search.toLowerCase())) ||
      (log.ipAddress?.includes(search)) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.action.startsWith(categoryFilter + ".");
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" data-testid="page-audit-logs">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Track all actions and changes across your organization.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Activity className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-events">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Shield className="w-4 h-4 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.action.startsWith("auth.")).length}</p>
              <p className="text-xs text-muted-foreground">Auth Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><User className="w-4 h-4 text-purple-500" /></div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.action.startsWith("team.")).length}</p>
              <p className="text-xs text-muted-foreground">Team Events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Globe className="w-4 h-4 text-orange-500" /></div>
            <div>
              <p className="text-2xl font-bold">{new Set(logs.map(l => l.ipAddress).filter(Boolean)).size}</p>
              <p className="text-xs text-muted-foreground">Unique IPs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <CardTitle className="text-base font-semibold">Event Log</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-9" data-testid="select-category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">
                {search || categoryFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Actions performed in the platform will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((log) => {
                const cat = getCategory(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0"
                    data-testid={`row-audit-${log.id}`}
                  >
                    <div className="pt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{formatAction(log.action)}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cat.color}`}>
                          {cat.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {log.resourceType && (
                          <span>Resource: {log.resourceType}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}</span>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <span className="truncate max-w-[300px]">
                            {Object.entries(log.details)
                              .filter(([, v]) => v !== null && v !== undefined && v !== "")
                              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      {log.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ipAddress}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(log.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
