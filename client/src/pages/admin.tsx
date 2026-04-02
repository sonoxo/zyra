import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, Users, Activity, Settings2, Loader2, Trash2,
  CheckCircle, XCircle, Clock, Play, BarChart3, AlertTriangle, Crown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { AuthUser } from "@/lib/auth";

interface AdminOverview {
  userCount: number;
  roleCounts: Record<string, number>;
  taskStats: { total: number; pending: number; running: number; completed: number; failed: number };
  scanCount: number;
  incidentCount: number;
  recentActivity: any[];
  subscription: { plan: string; status: string; maxUsers: number; maxScansPerMonth: number } | null;
  users: { id: string; username: string; email: string; fullName: string | null; role: string; createdAt: string; emailVerified: boolean }[];
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  analyst: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function OverviewTab({ data }: { data: AdminOverview }) {
  const stats = [
    { label: "Users", value: data.userCount, icon: Users, color: "text-blue-500" },
    { label: "Scans", value: data.scanCount, icon: BarChart3, color: "text-green-500" },
    { label: "Incidents", value: data.incidentCount, icon: AlertTriangle, color: "text-red-500" },
    { label: "Tasks", value: data.taskStats.total, icon: CheckCircle, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="admin-stats">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold" data-testid={`stat-${s.label.toLowerCase()}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Role Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["owner", "admin", "analyst", "viewer"].map(role => (
              <div key={role} className="flex items-center justify-between">
                <Badge className={ROLE_COLORS[role]}>{role}</Badge>
                <span className="text-sm font-medium">{data.roleCounts[role] || 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Subscription</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="capitalize">{data.subscription.plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={data.subscription.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-yellow-100 text-yellow-800"}>{data.subscription.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Users</span>
                  <span className="text-sm font-medium">{data.subscription.maxUsers === -1 ? "Unlimited" : data.subscription.maxUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Scans/mo</span>
                  <span className="text-sm font-medium">{data.subscription.maxScansPerMonth === -1 ? "Unlimited" : data.subscription.maxScansPerMonth}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Task Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { label: "Pending", value: data.taskStats.pending, icon: Clock, color: "text-yellow-500" },
              { label: "Running", value: data.taskStats.running, icon: Play, color: "text-blue-500" },
              { label: "Completed", value: data.taskStats.completed, icon: CheckCircle, color: "text-green-500" },
              { label: "Failed", value: data.taskStats.failed, icon: XCircle, color: "text-red-500" },
              { label: "Total", value: data.taskStats.total, icon: BarChart3, color: "text-foreground" },
            ].map(s => (
              <div key={s.label}>
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ data }: { data: AdminOverview }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/me"], queryFn: getQueryFn({ on401: "returnNull" }) });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/overview"] }); toast({ title: "Role updated" }); },
    onError: (e: any) => { toast({ title: "Failed to update role", description: e.message, variant: "destructive" }); },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/overview"] }); toast({ title: "User removed" }); },
    onError: (e: any) => { toast({ title: "Failed to remove user", description: e.message, variant: "destructive" }); },
  });

  const isOwner = me?.role === "owner";

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Joined</TableHead>
            {isOwner && <TableHead className="w-[80px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.users.map(user => {
            const initials = user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase();
            const isSelf = user.id === me?.id;
            return (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.fullName || user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell>
                  {isOwner && !isSelf ? (
                    <Select value={user.role} onValueChange={(role) => roleMutation.mutate({ userId: user.id, role })}>
                      <SelectTrigger className="w-[110px] h-7 text-xs" data-testid={`select-role-${user.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={ROLE_COLORS[user.role]}>
                      {isSelf && <Crown className="h-3 w-3 mr-1" />}
                      {user.role}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.emailVerified
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-muted-foreground" />
                  }
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatTime(user.createdAt)}</TableCell>
                {isOwner && (
                  <TableCell>
                    {!isSelf && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMutation.mutate(user.id)} data-testid={`button-remove-${user.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function ActivityTab({ data }: { data: AdminOverview }) {
  if (data.recentActivity.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium" data-testid="text-no-activity">No activity yet</p>
          <p className="text-sm text-muted-foreground mt-1">Platform activity will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y" data-testid="admin-activity-feed">
          {data.recentActivity.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 p-4" data-testid={`activity-${log.id}`}>
              <div className="p-2 rounded-full bg-muted mt-0.5">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.action.replace(/\./g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                {log.resourceType && (
                  <p className="text-xs text-muted-foreground mt-0.5">{log.resourceType}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}</p>
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

function SystemTab({ data }: { data: AdminOverview }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: envStatus } = useQuery<Record<string, boolean>>({ queryKey: ["/api/admin/env-status"] });

  const executePendingMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/tasks/execute-pending"),
    onSuccess: async (res) => {
      const result = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      toast({ title: `Executed ${result.executed} pending tasks` });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const envKeys = ["JWT_SECRET", "DATABASE_URL", "STRIPE_SECRET_KEY", "RESEND_API_KEY"];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">System Controls</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Execute Pending Tasks</p>
              <p className="text-xs text-muted-foreground">Run all queued tasks now ({data.taskStats.pending} pending)</p>
            </div>
            <Button
              size="sm"
              onClick={() => executePendingMutation.mutate()}
              disabled={executePendingMutation.isPending || data.taskStats.pending === 0}
              data-testid="button-execute-pending"
            >
              {executePendingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Environment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {envKeys.map(key => {
            const configured = envStatus?.[key] ?? false;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">{key}</span>
                <Badge variant="outline" className={configured ? "border-green-500/30 text-green-600" : "border-yellow-500/30 text-yellow-600"}>
                  {configured ? "Configured" : "Not Set"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { data, isLoading, error } = useQuery<AdminOverview>({ queryKey: ["/api/admin/overview"] });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-admin">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    const is403 = (error as any)?.message?.includes("403") || (error as any)?.message?.includes("Forbidden");
    return (
      <div className="space-y-6" data-testid="page-admin">
        <Card>
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <p className="text-lg font-medium">{is403 ? "Access Denied" : "Something went wrong"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {is403 ? "You need owner or admin permissions to access the Admin Panel." : "Failed to load admin data. Please try again."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6" data-testid="page-admin">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, roles, and platform operations.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-admin">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab data={data} /></TabsContent>
        <TabsContent value="activity" className="mt-4"><ActivityTab data={data} /></TabsContent>
        <TabsContent value="system" className="mt-4"><SystemTab data={data} /></TabsContent>
      </Tabs>
    </div>
  );
}
