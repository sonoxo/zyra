import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Mail, Trash2, Loader2, Clock, Copy, Check,
  Activity, Shield, AlertTriangle, Scan, Play, Server, FileText, Key, Zap,
  Phone, ThumbsUp, ThumbsDown, CheckCircle, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  analyst: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};
const ROLES = ["owner", "admin", "analyst", "viewer"];

interface TeamMember { id: string; username: string; email: string; fullName: string | null; role: string; avatarUrl: string | null; createdAt: string; }
interface InviteToken { id: string; email: string; role: string; token: string; expiresAt: string; createdAt: string; }
interface TeamData { members: TeamMember[]; pendingInvites: InviteToken[]; }

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  "scan.triggered": { icon: Scan, color: "text-blue-500 bg-blue-500/10", label: "Scan Triggered" },
  "scan.completed": { icon: Scan, color: "text-green-500 bg-green-500/10", label: "Scan Completed" },
  "incident.created": { icon: AlertTriangle, color: "text-red-500 bg-red-500/10", label: "Incident Created" },
  "incident.assigned": { icon: Users, color: "text-orange-500 bg-orange-500/10", label: "Incident Assigned" },
  "incident.resolved": { icon: Shield, color: "text-green-500 bg-green-500/10", label: "Incident Resolved" },
  "playbook.executed": { icon: Play, color: "text-violet-500 bg-violet-500/10", label: "Playbook Executed" },
  "asset.discovered": { icon: Server, color: "text-cyan-500 bg-cyan-500/10", label: "Asset Discovered" },
  "policy.updated": { icon: FileText, color: "text-yellow-500 bg-yellow-500/10", label: "Policy Updated" },
  "approval.requested": { icon: Clock, color: "text-orange-500 bg-orange-500/10", label: "Approval Requested" },
  "approval.approved": { icon: Shield, color: "text-green-500 bg-green-500/10", label: "Approval Granted" },
  "approval.rejected": { icon: AlertTriangle, color: "text-red-500 bg-red-500/10", label: "Approval Rejected" },
  "vulnerability.patched": { icon: Shield, color: "text-green-500 bg-green-500/10", label: "Vulnerability Patched" },
  "oncall.rotated": { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "On-Call Rotated" },
  "credential.rotated": { icon: Key, color: "text-yellow-500 bg-yellow-500/10", label: "Credentials Rotated" },
  "team.member_invited": { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "Member Invited" },
  "report.generated": { icon: FileText, color: "text-green-500 bg-green-500/10", label: "Report Generated" },
  "alert.escalated": { icon: Zap, color: "text-red-500 bg-red-500/10", label: "Alert Escalated" },
  "comment.added": { icon: FileText, color: "text-blue-500 bg-blue-500/10", label: "Comment Added" },
};

const APPROVAL_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  playbook_execution: { icon: Play, color: "text-violet-500 bg-violet-500/10 border-violet-500/20", label: "Playbook Execution" },
  policy_change: { icon: FileText, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", label: "Policy Change" },
  credential_rotation: { icon: Key, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20", label: "Credential Rotation" },
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function MembersTab({ me }: { me: AuthUser | null | undefined }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data, isLoading } = useQuery<TeamData>({ queryKey: ["/api/team"] });
  const canManage = me?.role === "owner" || me?.role === "admin";

  const inviteMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/team/invite", { email, role }); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/team"] }); toast({ title: "Invite sent", description: `Invitation sent to ${email}.` }); setInviteOpen(false); setEmail(""); setRole("analyst"); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => { const res = await apiRequest("PATCH", `/api/team/${userId}/role`, { role: newRole }); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/team"] }); toast({ title: "Role updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => { const res = await apiRequest("DELETE", `/api/team/${userId}`, {}); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/team"] }); toast({ title: "Member removed" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const initials = (m: TeamMember) => m.fullName ? m.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : m.username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-member" size="sm"><Plus className="w-4 h-4 mr-1" /> Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle><DialogDescription>Send an invitation link to a new team member.</DialogDescription></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Email address</Label><Input data-testid="input-invite-email" type="email" placeholder="colleague@company.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger data-testid="select-invite-role" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-testid="button-send-invite" className="w-full" disabled={!email || inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
                  {inviteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}Send Invite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead>{canManage && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {(data?.members ?? []).map(m => (
                  <TableRow key={m.id} data-testid={`row-member-${m.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-8 h-8"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials(m)}</AvatarFallback></Avatar>
                        <div><div className="text-sm font-medium">{m.fullName || m.username}</div><div className="text-xs text-muted-foreground">@{m.username}</div></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {canManage && m.id !== me?.id ? (
                        <Select defaultValue={m.role} onValueChange={(r) => changeRoleMutation.mutate({ userId: m.id, newRole: r })}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`text-xs capitalize ${ROLE_COLORS[m.role] ?? ""}`} variant="secondary">{m.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {m.id !== me?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(m.id)} data-testid={`button-remove-${m.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(data?.pendingInvites ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /> Pending Invitations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Expires</TableHead><TableHead className="text-right">Invite Link</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.pendingInvites ?? []).map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{inv.email}</TableCell>
                    <TableCell><Badge className={`text-xs capitalize ${ROLE_COLORS[inv.role] ?? ""}`} variant="secondary">{inv.role}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${inv.token}`); setCopiedToken(inv.token); setTimeout(() => setCopiedToken(null), 2000); }}>
                        {copiedToken === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedToken === inv.token ? "Copied!" : "Copy Link"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivityTab() {
  const { data: activities = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/activity"] });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Activity Feed</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center"><Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-muted-foreground text-sm">No activity recorded yet</p></div>
        ) : (
          <div data-testid="activity-feed">
            {activities.map((a: any) => {
              const config = ACTION_CONFIG[a.action] ?? { icon: Activity, color: "text-muted-foreground bg-muted", label: a.action };
              const Icon = config.icon;
              const details = a.details ?? {};
              return (
                <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0" data-testid={`activity-${a.id}`}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.color)}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground">{a.userName}</span><span className="text-xs text-muted-foreground">{config.label}</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {details.scanType && <span>Type: {details.scanType} · Target: {details.target}</span>}
                      {details.severity && <span>Severity: {details.severity} — {details.title}</span>}
                      {details.playbook && <span>Playbook: {details.playbook} {details.status && `(${details.status})`}</span>}
                      {details.hostname && <span>Host: {details.hostname} ({details.assetType})</span>}
                      {details.assignee && <span>Assigned to {details.assignee} — {details.incident}</span>}
                      {details.policy && <span>{details.policy}: {details.change}</span>}
                      {details.cve && <span>{details.cve} on {details.asset}</span>}
                      {details.from && details.to && <span>From {details.from} → {details.to}</span>}
                      {details.scope && details.count && <span>{details.scope} ({details.count} rotated)</span>}
                      {details.findings && <span>{details.findings} findings ({details.critical} critical)</span>}
                      {details.resolution && <span>{details.title} — {details.resolution}</span>}
                      {details.email && <span>{details.email} as {details.role}</span>}
                      {details.type && details.pages && <span>{details.type} ({details.pages} pages)</span>}
                      {details.alert && <span>{details.alert} → {details.escalatedTo}</span>}
                      {details.preview && <span>{details.preview}</span>}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{formatTime(a.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OnCallTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: oncallData, isLoading } = useQuery<any>({ queryKey: ["/api/team-ops/oncall"] });
  const { data: policies = [], isLoading: polLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/escalation"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/team-ops/oncall/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/team-ops/oncall"] }); toast({ title: "Schedule entry removed" }); },
  });

  const schedules = oncallData?.schedules ?? [];
  const currentOnCall = oncallData?.currentOnCall;
  const primarySchedules = schedules.filter((s: any) => s.label === "Primary On-Call");
  const secondarySchedules = schedules.filter((s: any) => s.label !== "Primary On-Call");

  return (
    <div className="space-y-4">
      {currentOnCall && (
        <Card className="border-green-500/30 bg-green-500/5" data-testid="current-oncall">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><Phone className="w-5 h-5 text-green-500" /></div>
            <div>
              <div className="text-sm font-semibold text-foreground">Currently On-Call</div>
              <div className="text-xs text-muted-foreground"><span className="font-medium text-green-600 dark:text-green-400">{currentOnCall.userName}</span> · Until {formatDate(currentOnCall.endTime)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {primarySchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Primary On-Call Rotation</CardTitle></CardHeader>
          <CardContent className="space-y-2" data-testid="primary-schedule-list">
            {primarySchedules.map((s: any) => {
              const now = new Date();
              const isActive = new Date(s.startTime) <= now && new Date(s.endTime) >= now;
              const isPast = new Date(s.endTime) < now;
              return (
                <div key={s.id} data-testid={`schedule-${s.id}`} className={cn("flex items-center gap-4 p-3 rounded-lg border transition-all", isActive ? "border-green-500/40 bg-green-500/5" : isPast ? "opacity-50" : "")}>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isActive ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground")}><Phone className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.userName}</span>
                      {isActive && <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">Active Now</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(s.startTime)} — {formatDate(s.endTime)}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(s.id)} data-testid={`delete-schedule-${s.id}`}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {secondarySchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Secondary / Backup Rotation</CardTitle></CardHeader>
          <CardContent className="space-y-2" data-testid="secondary-schedule-list">
            {secondarySchedules.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-muted-foreground" /></div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{s.userName}</span>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDate(s.startTime)} — {formatDate(s.endTime)}</div>
                </div>
                <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">{s.label}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {policies.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Escalation Policies</CardTitle></CardHeader>
          <CardContent className="space-y-3" data-testid="escalation-list">
            {policies.map((p: any) => {
              const conditions = p.conditions ?? {};
              const actions = p.actions ?? {};
              return (
                <div key={p.id} data-testid={`policy-${p.id}`} className={cn("p-3 rounded-lg border", !p.enabled && "opacity-50")}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <Badge variant="outline" className={cn("text-[10px]", p.enabled ? "text-green-500 border-green-500/30" : "text-muted-foreground")}>{p.enabled ? "Active" : "Disabled"}</Badge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mb-2">{p.description}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-red-500/5 border border-red-500/20">
                      <div className="text-[10px] text-red-500 font-semibold uppercase mb-1">Triggers</div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {conditions.severity && <div>Severity: <span className="text-foreground font-medium">{conditions.severity}</span></div>}
                        {conditions.unacknowledgedMinutes && <div>Timeout: <span className="text-foreground font-medium">{conditions.unacknowledgedMinutes} min</span></div>}
                        {conditions.eventType && <div>Event: <span className="text-foreground font-medium">{conditions.eventType}</span></div>}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20">
                      <div className="text-[10px] text-blue-500 font-semibold uppercase mb-1">Actions</div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {actions.escalateTo && <div>Escalate to: <span className="text-foreground font-medium">{actions.escalateTo}</span></div>}
                        {actions.notifyChannel && <div>Via: <span className="text-foreground font-medium">{actions.notifyChannel}</span></div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
    </div>
  );
}

function ApprovalsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: requests = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/approvals"] });

  const actionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/team-ops/approvals/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["/api/team-ops/approvals"] });
      qc.invalidateQueries({ queryKey: ["/api/team-ops/activity"] });
      toast({ title: status === "approved" ? "Request approved" : "Request rejected" });
    },
  });

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{pending.length} Pending Approval{pending.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sensitive actions are waiting for your review before execution.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/40" /><p className="text-muted-foreground text-sm">No approval requests</p></CardContent></Card>
      ) : (
        <div className="space-y-3" data-testid="approvals-list">
          {requests.map((r: any) => {
            const typeConfig = APPROVAL_TYPE_CONFIG[r.actionType] ?? { icon: Shield, color: "text-muted-foreground bg-muted", label: r.actionType };
            const TypeIcon = typeConfig.icon;
            const StatusIcon = r.status === "approved" ? CheckCircle : r.status === "rejected" ? XCircle : Clock;
            const statusColor = r.status === "approved" ? "text-green-500 bg-green-500/10 border-green-500/30" : r.status === "rejected" ? "text-red-500 bg-red-500/10 border-red-500/30" : "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
            const details = r.actionDetails ?? {};
            return (
              <Card key={r.id} data-testid={`approval-${r.id}`} className={cn(r.status !== "pending" && "opacity-70")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", typeConfig.color)}><TypeIcon className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{typeConfig.label}</span>
                        <Badge variant="outline" className={cn("text-[10px] border", statusColor)}><StatusIcon className="w-3 h-3 mr-1" />{r.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Requested by <span className="font-medium text-foreground">{r.requesterName}</span> · {formatTime(r.createdAt)}</div>
                    </div>
                  </div>
                  <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border text-xs space-y-1">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2"><span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span><span className="text-foreground font-medium">{String(value)}</span></div>
                    ))}
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 flex items-center gap-2" data-testid={`approval-actions-${r.id}`}>
                      <Button size="sm" className="text-xs h-7 px-3 bg-green-600 hover:bg-green-700 text-white" onClick={() => actionMutation.mutate({ id: r.id, status: "approved" })} data-testid={`approve-${r.id}`}><ThumbsUp className="w-3 h-3 mr-1" /> Approve</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-3 text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => actionMutation.mutate({ id: r.id, status: "rejected" })} data-testid={`reject-${r.id}`}><ThumbsDown className="w-3 h-3 mr-1" /> Reject</Button>
                    </div>
                  )}
                  {r.status !== "pending" && r.approverName && (
                    <div className="mt-2 text-[11px] text-muted-foreground">{r.status === "approved" ? "Approved" : "Rejected"} by <span className="font-medium text-foreground">{r.approverName}</span>{r.resolvedAt && ` · ${formatTime(r.resolvedAt)}`}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { data: me } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });
  const { data: teamData } = useQuery<TeamData>({ queryKey: ["/api/team"] });
  const { data: activities = [] } = useQuery<any[]>({ queryKey: ["/api/team-ops/activity"] });
  const { data: approvals = [] } = useQuery<any[]>({ queryKey: ["/api/team-ops/approvals"] });
  const { data: oncallData } = useQuery<any>({ queryKey: ["/api/team-ops/oncall"] });

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Team
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage members, monitor activity, and coordinate security operations</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3">
            <Users className="w-4 h-4 mb-1 text-blue-500" />
            <div className="text-xl font-bold">{teamData?.members.length ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Members</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Activity className="w-4 h-4 mb-1 text-green-500" />
            <div className="text-xl font-bold text-green-500">{activities.length}</div>
            <div className="text-[10px] text-muted-foreground">Recent Events</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Phone className="w-4 h-4 mb-1 text-cyan-500" />
            <div className="text-xl font-bold text-cyan-500">{oncallData?.currentOnCall?.userName ?? "—"}</div>
            <div className="text-[10px] text-muted-foreground">On-Call Now</div>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <Clock className={cn("w-4 h-4 mb-1", pendingApprovals > 0 ? "text-yellow-500" : "text-foreground")} />
            <div className={cn("text-xl font-bold", pendingApprovals > 0 ? "text-yellow-500" : "")}>{pendingApprovals}</div>
            <div className="text-[10px] text-muted-foreground">Pending Approvals</div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity ({activities.length})</TabsTrigger>
            <TabsTrigger value="oncall" data-testid="tab-oncall">On-Call & Escalation</TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              Approvals {pendingApprovals > 0 && <Badge className="ml-1.5 bg-yellow-500/20 text-yellow-600 text-[10px] h-4 px-1">{pendingApprovals}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4"><MembersTab me={me} /></TabsContent>
          <TabsContent value="activity" className="mt-4"><ActivityTab /></TabsContent>
          <TabsContent value="oncall" className="mt-4"><OnCallTab /></TabsContent>
          <TabsContent value="approvals" className="mt-4"><ApprovalsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
