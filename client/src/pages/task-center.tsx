import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ListTodo, Plus, Loader2, Clock, Play, CheckCircle, XCircle, Ban,
  Trash2, MoreVertical, Filter, AlertTriangle, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AuthUser } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  priority: string;
  assignedTo: string | null;
  createdById: string | null;
  result: any;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: any;
  userId: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; badgeVariant: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending", badgeVariant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  running: { icon: Play, color: "text-blue-500", label: "Running", badgeVariant: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "Completed", badgeVariant: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed", badgeVariant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { icon: Ban, color: "text-gray-500", label: "Cancelled", badgeVariant: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const TASK_TYPES = ["general", "scan", "playbook", "remediation", "audit", "compliance"];

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCards({ stats }: { stats: TaskStats | undefined }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="task-stats-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total", value: stats.total, icon: ListTodo, color: "text-foreground" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-500" },
    { label: "Running", value: stats.running, icon: Play, color: "text-blue-500" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-500" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="task-stats">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid={`stat-${c.label.toLowerCase()}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateTaskDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [priority, setPriority] = useState("medium");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/tasks", { title, description: description || null, type, priority });
    },
    onSuccess: () => {
      toast({ title: "Task created" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setType("general");
      setPriority("medium");
      onCreated();
    },
    onError: (e: any) => {
      toast({ title: "Failed to create task", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-task"><Plus className="h-4 w-4 mr-2" /> New Task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" data-testid="input-task-title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" data-testid="input-task-description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-task-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} data-testid="button-submit-task">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TasksTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const { data: tasks, isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: me } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/me"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const canEdit = me?.role === "owner" || me?.role === "admin" || me?.role === "analyst";
  const canDelete = me?.role === "owner" || me?.role === "admin";

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); },
    onError: (e: any) => { toast({ title: "Update failed", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); toast({ title: "Task deleted" }); },
    onError: (e: any) => { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); },
  });

  const filtered = tasks?.filter(t => filter === "all" || t.status === filter) ?? [];

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-task-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canEdit && <CreateTaskDialog onCreated={() => qc.invalidateQueries({ queryKey: ["/api/tasks"] })} />}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ListTodo className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium" data-testid="text-no-tasks">No tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">Create a task to get started with your security operations.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => {
                const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const StatusIcon = sc.icon;
                return (
                  <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-task-title-${task.id}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize" data-testid={`badge-task-type-${task.id}`}>{task.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium} data-testid={`badge-task-priority-${task.id}`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sc.badgeVariant} data-testid={`badge-task-status-${task.id}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatTime(task.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-task-actions-${task.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && task.status === "pending" && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "running" } })} data-testid={`action-start-${task.id}`}>
                              <Play className="h-4 w-4 mr-2" /> Start
                            </DropdownMenuItem>
                          )}
                          {canEdit && task.status === "running" && (
                            <>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "completed" } })} data-testid={`action-complete-${task.id}`}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "failed" } })} data-testid={`action-fail-${task.id}`}>
                                <XCircle className="h-4 w-4 mr-2" /> Mark Failed
                              </DropdownMenuItem>
                            </>
                          )}
                          {canEdit && (task.status === "pending" || task.status === "running") && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, data: { status: "cancelled" } })} data-testid={`action-cancel-${task.id}`}>
                              <Ban className="h-4 w-4 mr-2" /> Cancel
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(task.id)} className="text-red-600" data-testid={`action-delete-${task.id}`}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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

function ActivityTab() {
  const { data: me } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/me"], queryFn: getQueryFn({ on401: "returnNull" }) });
  const canViewAudit = me?.role === "owner" || me?.role === "admin";

  const { data: logs, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["/api/audit-logs"],
    enabled: canViewAudit,
  });

  if (!canViewAudit) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Access Restricted</p>
          <p className="text-sm text-muted-foreground mt-1">Activity logs are available to owners and admins only.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  const recentLogs = (logs || []).slice(0, 50);

  if (recentLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium" data-testid="text-no-activity">No activity yet</p>
          <p className="text-sm text-muted-foreground mt-1">Activity will appear here as you use the platform.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y" data-testid="activity-feed">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-4" data-testid={`activity-${log.id}`}>
              <div className="p-2 rounded-full bg-muted mt-0.5">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.action.replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                {log.resourceType && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.resourceType}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}
                  </p>
                )}
                {log.details && typeof log.details === "object" && Object.keys(log.details).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskCenterPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<TaskStats>({
    queryKey: ["/api/tasks", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/stats/summary", {
        headers: { Authorization: `Bearer ${localStorage.getItem("zyra_access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  return (
    <div className="space-y-6" data-testid="page-task-center">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Task Center</h1>
          <p className="text-muted-foreground">Manage security operations, track task progress, and review activity logs.</p>
        </div>
      </div>

      <StatCards stats={statsLoading ? undefined : stats} />

      <Tabs defaultValue="tasks">
        <TabsList data-testid="tabs-task-center">
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity Log</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
