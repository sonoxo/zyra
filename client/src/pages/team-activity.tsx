import { useQuery } from "@tanstack/react-query";
import {
  Activity, Shield, AlertTriangle, Scan, Play, Server, Users,
  FileText, Key, Zap, Clock, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  "vulnerability.patched": { icon: Shield, color: "text-green-500 bg-green-500/10", label: "Vulnerability Patched" },
  "oncall.rotated": { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "On-Call Rotated" },
  "credential.rotated": { icon: Key, color: "text-yellow-500 bg-yellow-500/10", label: "Credentials Rotated" },
  "team.member_invited": { icon: Users, color: "text-blue-500 bg-blue-500/10", label: "Member Invited" },
  "report.generated": { icon: FileText, color: "text-green-500 bg-green-500/10", label: "Report Generated" },
  "alert.escalated": { icon: Zap, color: "text-red-500 bg-red-500/10", label: "Alert Escalated" },
  "comment.added": { icon: FileText, color: "text-blue-500 bg-blue-500/10", label: "Comment Added" },
  "approval.approved": { icon: Shield, color: "text-green-500 bg-green-500/10", label: "Approval Granted" },
  "approval.rejected": { icon: AlertTriangle, color: "text-red-500 bg-red-500/10", label: "Approval Rejected" },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActivityItem({ activity }: { activity: any }) {
  const config = ACTION_CONFIG[activity.action] ?? { icon: Activity, color: "text-muted-foreground bg-muted", label: activity.action };
  const Icon = config.icon;
  const details = activity.details ?? {};

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0" data-testid={`activity-${activity.id}`}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{activity.userName}</span>
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
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
          {details.actionType && !details.playbook && <span>Action: {details.actionType}</span>}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground shrink-0">{formatTime(activity.createdAt)}</div>
    </div>
  );
}

export default function TeamActivityPage() {
  const { data: activities = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/activity"] });
  const { data: permissions } = useQuery<any>({ queryKey: ["/api/team-ops/permissions"] });

  const actionCounts: Record<string, number> = {};
  for (const a of activities) {
    const type = a.action.split(".")[0];
    actionCounts[type] = (actionCounts[type] ?? 0) + 1;
  }

  const topCategories = Object.entries(actionCounts).sort(([, a], [, b]) => b - a).slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Team Activity
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time activity feed across all security operations</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Events", value: activities.length, color: "text-foreground", icon: Activity },
            { label: "Your Role", value: permissions?.role ?? "—", color: "text-primary", icon: Shield },
            ...topCategories.slice(0, 2).map(([cat, count]) => ({
              label: cat.charAt(0).toUpperCase() + cat.slice(1) + " Events",
              value: count,
              color: "text-orange-500",
              icon: ArrowUpRight,
            })),
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-3">
                <Icon className={cn("w-4 h-4 mb-1", color)} />
                <div className={cn("text-xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div data-testid="activity-feed">
                {activities.map((a: any) => <ActivityItem key={a.id} activity={a} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
