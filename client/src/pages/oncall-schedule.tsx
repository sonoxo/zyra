import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, Users, Phone, Shield, Calendar, Plus, Trash2, AlertTriangle, Zap, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

function ScheduleCard({ schedule, onDelete }: { schedule: any; onDelete: () => void }) {
  const now = new Date();
  const isActive = new Date(schedule.startTime) <= now && new Date(schedule.endTime) >= now;
  const isPast = new Date(schedule.endTime) < now;

  return (
    <div data-testid={`schedule-${schedule.id}`} className={cn(
      "flex items-center gap-4 p-3 rounded-lg border transition-all",
      isActive ? "border-green-500/40 bg-green-500/5" : isPast ? "opacity-50 border-border" : "border-border"
    )}>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isActive ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground")}>
        <Phone className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{schedule.userName}</span>
          {isActive && <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">Active Now</Badge>}
          {isPast && <Badge variant="outline" className="text-[10px] text-muted-foreground">Past</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{formatDateRange(schedule.startTime, schedule.endTime)}</div>
      </div>
      <Badge variant="outline" className={cn("text-[10px]", schedule.label === "Primary On-Call" ? "border-blue-500/30 text-blue-500" : "border-violet-500/30 text-violet-500")}>
        {schedule.label}
      </Badge>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete} data-testid={`delete-schedule-${schedule.id}`}>
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

function EscalationPolicyCard({ policy }: { policy: any }) {
  const conditions = policy.conditions ?? {};
  const actions = policy.actions ?? {};

  return (
    <Card data-testid={`policy-${policy.id}`} className={cn(!policy.enabled && "opacity-50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{policy.name}</span>
              <Badge variant="outline" className={cn("text-[10px]", policy.enabled ? "text-green-500 border-green-500/30" : "text-muted-foreground")}>
                {policy.enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            {policy.description && <p className="text-xs text-muted-foreground mt-1">{policy.description}</p>}
          </div>
          <Zap className={cn("w-5 h-5 shrink-0", policy.enabled ? "text-yellow-500" : "text-muted-foreground")} />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="text-[10px] text-red-500 font-semibold uppercase mb-1">Trigger Conditions</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {conditions.severity && <div>Severity: <span className="text-foreground font-medium">{conditions.severity}</span></div>}
              {conditions.unacknowledgedMinutes && <div>Unacknowledged for: <span className="text-foreground font-medium">{conditions.unacknowledgedMinutes} min</span></div>}
              {conditions.eventType && <div>Event: <span className="text-foreground font-medium">{conditions.eventType}</span></div>}
              {conditions.consecutive && <div>Consecutive: <span className="text-foreground font-medium">{conditions.consecutive} occurrences</span></div>}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="text-[10px] text-blue-500 font-semibold uppercase mb-1">Actions</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {actions.escalateTo && <div>Escalate to: <span className="text-foreground font-medium">{actions.escalateTo}</span></div>}
              {actions.notifyChannel && <div>Notify via: <span className="text-foreground font-medium">{actions.notifyChannel}</span></div>}
              {actions.createIncident !== undefined && <div>Create incident: <span className="text-foreground font-medium">{actions.createIncident ? "Yes" : "No"}</span></div>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnCallSchedulePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: oncallData, isLoading } = useQuery<any>({ queryKey: ["/api/team-ops/oncall"] });
  const { data: policies = [], isLoading: polLoading } = useQuery<any[]>({ queryKey: ["/api/team-ops/escalation"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/team-ops/oncall/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/team-ops/oncall"] });
      toast({ title: "Schedule entry removed" });
    },
  });

  const schedules = oncallData?.schedules ?? [];
  const currentOnCall = oncallData?.currentOnCall;
  const primarySchedules = schedules.filter((s: any) => s.label === "Primary On-Call");
  const secondarySchedules = schedules.filter((s: any) => s.label !== "Primary On-Call");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> On-Call Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage on-call rotations and escalation policies for alert routing</p>
        </div>

        {currentOnCall && (
          <Card className="border-green-500/30 bg-green-500/5" data-testid="current-oncall">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Currently On-Call</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-green-600 dark:text-green-400">{currentOnCall.userName}</span>
                  {" · "}Until {formatDate(currentOnCall.endTime)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Schedules", value: schedules.length, color: "text-foreground", icon: Calendar },
            { label: "Primary Rotation", value: primarySchedules.length, color: "text-blue-500", icon: Phone },
            { label: "Secondary", value: secondarySchedules.length, color: "text-violet-500", icon: Users },
            { label: "Escalation Policies", value: policies.length, color: "text-yellow-500", icon: Zap },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <Icon className={cn("w-4 h-4 mb-1", color)} />
                <div className={cn("text-xl font-bold", color)}>{isLoading ? "—" : value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule" data-testid="tab-schedule">On-Call Rotation</TabsTrigger>
            <TabsTrigger value="escalation" data-testid="tab-escalation">Escalation Policies ({policies.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            {primarySchedules.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Primary On-Call Rotation</CardTitle></CardHeader>
                <CardContent className="space-y-2" data-testid="primary-schedule-list">
                  {primarySchedules.map((s: any) => (
                    <ScheduleCard key={s.id} schedule={s} onDelete={() => deleteMutation.mutate(s.id)} />
                  ))}
                </CardContent>
              </Card>
            )}

            {secondarySchedules.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Secondary / Backup Rotation</CardTitle></CardHeader>
                <CardContent className="space-y-2" data-testid="secondary-schedule-list">
                  {secondarySchedules.map((s: any) => (
                    <ScheduleCard key={s.id} schedule={s} onDelete={() => deleteMutation.mutate(s.id)} />
                  ))}
                </CardContent>
              </Card>
            )}

            {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}

            {!isLoading && schedules.length === 0 && (
              <Card><CardContent className="py-12 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No on-call schedules configured</p>
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="escalation" className="space-y-4 mt-4">
            {polLoading ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
            ) : policies.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No escalation policies configured</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3" data-testid="escalation-list">
                {policies.map((p: any) => <EscalationPolicyCard key={p.id} policy={p} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
