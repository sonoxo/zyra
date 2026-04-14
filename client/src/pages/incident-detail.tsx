import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import type { Incident } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, AlertTriangle, Shield, CheckCircle2, Users,
  Flame, ChevronRight, Loader2, Clock, MessageSquare,
  Send, Tag, Server, Calendar, Timer, UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any; description: string }> = {
  triage: { label: "New", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20", icon: AlertTriangle, description: "Assess severity and impact" },
  assign: { label: "Investigating", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", icon: Users, description: "Team assigned and investigating" },
  contain: { label: "Contained", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", icon: Shield, description: "Threat contained, limiting spread" },
  remediate: { label: "Resolved", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20", icon: Flame, description: "Root cause resolved" },
  close: { label: "Closed", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10 border-green-500/20", icon: CheckCircle2, description: "Incident resolved and documented" },
};

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  high: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  medium: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  low: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

const workflowSteps = ["triage", "assign", "contain", "remediate", "close"];

export default function IncidentDetailPage() {
  const [, params] = useRoute("/incidents/:id");
  const { toast } = useToast();
  const id = params?.id;
  const [noteText, setNoteText] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");

  const { data: incident, isLoading } = useQuery<Incident>({
    queryKey: ["/api/incidents", id],
    enabled: !!id,
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/incidents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/stats"] });
      toast({ title: "Incident updated" });
    },
  });

  const timelineMutation = useMutation({
    mutationFn: async (entry: { action: string; note: string; user?: string }) => {
      const res = await apiRequest("POST", `/api/incidents/${id}/timeline`, entry);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", id] });
      setNoteText("");
      toast({ title: "Note added" });
    },
  });

  const advanceStatus = () => {
    if (!incident) return;
    const idx = workflowSteps.indexOf(incident.status);
    if (idx < workflowSteps.length - 1) {
      const nextStatus = workflowSteps[idx + 1];
      const extra: any = { status: nextStatus };
      if (nextStatus === "close") {
        extra.resolvedAt = new Date().toISOString();
        const created = new Date(incident.createdAt);
        extra.mttr = Math.round((Date.now() - created.getTime()) / 60000);
      }
      updateMutation.mutate(extra);
    }
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    timelineMutation.mutate({ action: "note", note: noteText });
  };

  const updateAssignee = () => {
    if (!assigneeInput.trim()) return;
    updateMutation.mutate({ assignedTo: assigneeInput });
    setAssigneeInput("");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Incident not found</h2>
          <p className="text-muted-foreground mt-2">This incident may have been deleted.</p>
          <Link href="/incidents">
            <Button variant="outline" className="mt-4" data-testid="button-back-incidents"><ArrowLeft className="w-4 h-4 mr-2" />Back to Incidents</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sev = severityConfig[incident.severity] || severityConfig.medium;
  const currentStatus = statusConfig[incident.status] || statusConfig.triage;
  const CurrentIcon = currentStatus.icon;
  const stepIdx = workflowSteps.indexOf(incident.status);
  const timeline = (incident.timeline as any[]) || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/incidents">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs", sev.bg, sev.color)}>{incident.severity.toUpperCase()}</Badge>
            <Badge variant="outline" className={cn("text-xs", currentStatus.bgColor, currentStatus.color)}>
              <CurrentIcon className="w-3 h-3 mr-1" />{currentStatus.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-incident-title">{incident.title}</h1>
          {incident.description && <p className="text-sm text-muted-foreground mt-1" data-testid="text-incident-description">{incident.description}</p>}
        </div>
        {incident.status !== "close" && (
          <Button onClick={advanceStatus} disabled={updateMutation.isPending} data-testid="button-advance-status">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
            Advance to {statusConfig[workflowSteps[stepIdx + 1]]?.label}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-0">
            {workflowSteps.map((step, i) => {
              const cfg = statusConfig[step];
              const StepIcon = cfg.icon;
              const isActive = i === stepIdx;
              const isComplete = i < stepIdx;
              const isFuture = i > stepIdx;
              return (
                <div key={step} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all",
                      isActive ? "border-primary bg-primary text-primary-foreground scale-110" :
                      isComplete ? "border-green-500 bg-green-500/10 text-green-600" :
                      "border-muted bg-muted/50 text-muted-foreground"
                    )}>
                      {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <p className={cn("text-xs mt-2 font-medium", isActive ? "text-primary" : isComplete ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>{cfg.label}</p>
                    <p className={cn("text-[10px] mt-0.5 max-w-[100px] text-center", isFuture ? "text-muted-foreground/50" : "text-muted-foreground")}>{cfg.description}</p>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div className={cn("absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5", isComplete ? "bg-green-500" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">Add Note</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="mt-4">
                  {timeline.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No timeline entries yet</p>
                    </div>
                  ) : (
                    <div className="space-y-0" data-testid="list-timeline">
                      {[...timeline].reverse().map((entry: any, i: number) => (
                        <div key={i} className="flex gap-3 pb-4 relative" data-testid={`timeline-entry-${i}`}>
                          {i < timeline.length - 1 && <div className="absolute left-[11px] top-7 bottom-0 w-px bg-border" />}
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-medium">{entry.action || "Update"}</p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {entry.timestamp ? formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true }) : ""}
                              </span>
                            </div>
                            {entry.note && <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>}
                            {entry.user && <p className="text-[10px] text-muted-foreground mt-0.5">by {entry.user}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="notes" className="mt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a note about this incident..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                      data-testid="input-note"
                    />
                    <Button onClick={addNote} disabled={timelineMutation.isPending || !noteText.trim()} data-testid="button-add-note">
                      {timelineMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Add Note
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {incident.affectedSystems && incident.affectedSystems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="w-4 h-4" />Affected Systems</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="list-affected-systems">
                  {incident.affectedSystems.map((sys, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs px-3 py-1">{sys}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {incident.tags && incident.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="w-4 h-4" />Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="list-tags">
                  {incident.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserCircle className="w-4 h-4" />Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Currently assigned to</p>
                <p className="text-sm font-medium mt-1" data-testid="text-assignee">{incident.assignedTo || "Unassigned"}</p>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Input
                  placeholder="Reassign to..."
                  value={assigneeInput}
                  onChange={(e) => setAssigneeInput(e.target.value)}
                  className="text-sm"
                  data-testid="input-assignee"
                />
                <Button size="sm" onClick={updateAssignee} disabled={updateMutation.isPending || !assigneeInput.trim()} data-testid="button-reassign">
                  Set
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{format(new Date(incident.createdAt), "MMM d, yyyy HH:mm")}</span>
                </div>
                <Separator />
                {incident.resolvedAt && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span className="font-medium">{format(new Date(incident.resolvedAt), "MMM d, yyyy HH:mm")}</span>
                    </div>
                    <Separator />
                  </>
                )}
                {incident.mttr !== null && incident.mttr !== undefined && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />MTTR</span>
                      <span className="font-medium">{incident.mttr} min</span>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <Badge variant="outline" className={cn("text-xs", sev.bg, sev.color)}>{incident.severity.toUpperCase()}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={cn("text-xs", currentStatus.bgColor, currentStatus.color)}>{currentStatus.label}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {incident.status !== "close" && (
            <Card className="border-dashed">
              <CardContent className="py-4 space-y-2">
                <p className="text-xs text-muted-foreground">Quick Status Change</p>
                <div className="grid grid-cols-2 gap-2">
                  {workflowSteps.filter(s => s !== incident.status).map(step => {
                    const cfg = statusConfig[step];
                    return (
                      <Button
                        key={step}
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start"
                        onClick={() => {
                          const extra: any = { status: step };
                          if (step === "close") {
                            extra.resolvedAt = new Date().toISOString();
                            extra.mttr = Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60000);
                          }
                          updateMutation.mutate(extra);
                        }}
                        disabled={updateMutation.isPending}
                        data-testid={`button-set-status-${step}`}
                      >
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
