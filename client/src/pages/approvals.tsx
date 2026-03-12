import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Clock, Shield, Key, Play, FileText,
  AlertTriangle, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const ACTION_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  playbook_execution: { icon: Play, color: "text-violet-500 bg-violet-500/10 border-violet-500/20", label: "Playbook Execution" },
  policy_change: { icon: FileText, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", label: "Policy Change" },
  credential_rotation: { icon: Key, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20", label: "Credential Rotation" },
};

const STATUS_CONFIG: Record<string, { icon: any; color: string }> = {
  pending: { icon: Clock, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" },
  approved: { icon: CheckCircle, color: "text-green-500 bg-green-500/10 border-green-500/30" },
  rejected: { icon: XCircle, color: "text-red-500 bg-red-500/10 border-red-500/30" },
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
  return `${Math.floor(hrs / 24)}d ago`;
}

function ApprovalCard({ request, onAction }: { request: any; onAction: (status: string) => void }) {
  const typeConfig = ACTION_TYPE_CONFIG[request.actionType] ?? { icon: Shield, color: "text-muted-foreground bg-muted", label: request.actionType };
  const statusConfig = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const details = request.actionDetails ?? {};

  return (
    <Card data-testid={`approval-${request.id}`} className={cn("transition-all", request.status !== "pending" && "opacity-70")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", typeConfig.color)}>
            <TypeIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{typeConfig.label}</span>
              <Badge variant="outline" className={cn("text-[10px] border", statusConfig.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {request.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Requested by <span className="font-medium text-foreground">{request.requesterName}</span>
              {" · "}{formatTime(request.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-border">
          <div className="space-y-1 text-xs">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                <span className="text-foreground font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {request.status === "pending" && (
          <div className="mt-3 flex items-center gap-2" data-testid={`approval-actions-${request.id}`}>
            <Button
              size="sm" className="text-xs h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => onAction("approved")}
              data-testid={`approve-${request.id}`}
            >
              <ThumbsUp className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button
              variant="outline" size="sm" className="text-xs h-7 px-3 text-red-500 border-red-500/30 hover:bg-red-500/10"
              onClick={() => onAction("rejected")}
              data-testid={`reject-${request.id}`}
            >
              <ThumbsDown className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        )}

        {request.status !== "pending" && request.approverName && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            {request.status === "approved" ? "Approved" : "Rejected"} by <span className="font-medium text-foreground">{request.approverName}</span>
            {request.resolvedAt && ` · ${formatTime(request.resolvedAt)}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/approvals"] });

  const actionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/team-ops/approvals/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["/api/team-ops/approvals"] });
      qc.invalidateQueries({ queryKey: ["/api/team-ops/activity"] });
      toast({ title: status === "approved" ? "Request approved" : "Request rejected" });
    },
  });

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");
  const approved = requests.filter(r => r.status === "approved");
  const rejected = requests.filter(r => r.status === "rejected");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Approval Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Review and approve sensitive security operations before execution</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Pending", value: pending.length, color: pending.length > 0 ? "text-yellow-500" : "text-foreground", icon: Clock },
            { label: "Approved", value: approved.length, color: "text-green-500", icon: CheckCircle },
            { label: "Rejected", value: rejected.length, color: "text-red-500", icon: XCircle },
            { label: "Total Requests", value: requests.length, color: "text-foreground", icon: Shield },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase()}`}>
              <CardContent className="p-3">
                <Icon className={cn("w-4 h-4 mb-1", color)} />
                <div className={cn("text-xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

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

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">Resolved ({resolved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
            ) : pending.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/40" />
                <p className="text-muted-foreground text-sm">All caught up — no pending approvals</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3" data-testid="pending-list">
                {pending.map((r: any) => (
                  <ApprovalCard
                    key={r.id} request={r}
                    onAction={(status) => actionMutation.mutate({ id: r.id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-3 mt-4">
            {resolved.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No resolved requests yet</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3" data-testid="resolved-list">
                {resolved.map((r: any) => (
                  <ApprovalCard
                    key={r.id} request={r}
                    onAction={(status) => actionMutation.mutate({ id: r.id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
