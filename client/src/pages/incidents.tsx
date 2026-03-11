import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Incident } from "@shared/schema";
import { insertIncidentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, Clock, Shield, CheckCircle2, Loader2, Flame, Users, Timer, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formSchema = insertIncidentSchema.extend({
  organizationId: z.string().optional(),
});

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  triage: { label: "Triage", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: AlertTriangle },
  assign: { label: "Assigned", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Users },
  contain: { label: "Contained", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Shield },
  remediate: { label: "Remediating", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Flame },
  close: { label: "Closed", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
};

const severityConfig: Record<string, { color: string }> = {
  critical: { color: "bg-red-500/10 text-red-500 border-red-500/20" },
  high: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  medium: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  low: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  info: { color: "bg-muted text-muted-foreground border-border" },
};

const workflowSteps = ["triage", "assign", "contain", "remediate", "close"];

export default function IncidentsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: incidents = [], isLoading } = useQuery<Incident[]>({ queryKey: ["/api/incidents"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/incidents/stats"] });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", severity: "medium", status: "triage", assignedTo: "", affectedSystems: [], tags: [] },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/incidents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/stats"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Incident created", description: "Incident has been logged and is in triage." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/incidents/${id}`, data);
      return res.json() as Promise<Incident>;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/stats"] });
      if (selectedIncident?.id === updated.id) setSelectedIncident(updated);
      toast({ title: "Incident updated" });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data);
  };

  const advanceStatus = (incident: Incident) => {
    const idx = workflowSteps.indexOf(incident.status);
    if (idx < workflowSteps.length - 1) {
      const nextStatus = workflowSteps[idx + 1];
      const extra: any = {};
      if (nextStatus === "close") {
        extra.resolvedAt = new Date().toISOString();
        const created = new Date(incident.createdAt);
        extra.mttr = Math.round((Date.now() - created.getTime()) / 60000);
      }
      updateMutation.mutate({ id: incident.id, data: { status: nextStatus, ...extra } });
    }
  };

  const filtered = statusFilter === "all" ? incidents : incidents.filter(i => i.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-incidents">Incident Response</h1>
          <p className="text-muted-foreground text-sm mt-1">Track, triage, and resolve security incidents through structured workflows</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-incident"><Plus className="w-4 h-4 mr-2" />New Incident</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Security Incident</DialogTitle>
              <DialogDescription>Create a new incident and start the response workflow.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Brief description of the incident" data-testid="input-incident-title" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed incident description..." rows={3} data-testid="input-incident-description" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="severity" render={({ field }) => (
                    <FormItem><FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? "medium"}>
                        <FormControl><SelectTrigger data-testid="select-severity"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assignedTo" render={({ field }) => (
                    <FormItem><FormLabel>Assign To</FormLabel><FormControl><Input placeholder="engineer@company.com" data-testid="input-assigned-to" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-incident">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Incident"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Incidents", value: stats?.active ?? 0, icon: Flame, color: "text-red-500" },
          { label: "Avg MTTR (min)", value: stats?.avgMttr ?? 0, icon: Timer, color: "text-blue-500" },
          { label: "Critical", value: stats?.bySeverity?.critical ?? 0, icon: AlertTriangle, color: "text-red-500" },
          { label: "Closed", value: stats?.byStatus?.close ?? 0, icon: CheckCircle2, color: "text-green-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                <s.icon className={cn("w-8 h-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {["all", ...workflowSteps].map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} data-testid={`filter-${s}`}>
            {s === "all" ? "All" : statusConfig[s]?.label}
            {s !== "all" && <Badge variant="secondary" className="ml-2 text-xs">{stats?.byStatus?.[s] ?? 0}</Badge>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No incidents found</p>
          <p className="text-sm text-muted-foreground mt-1">Log a new incident to begin the response workflow</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => {
            const sev = severityConfig[incident.severity] || severityConfig.medium;
            const status = statusConfig[incident.status] || statusConfig.triage;
            const StatusIcon = status.icon;
            const stepIdx = workflowSteps.indexOf(incident.status);
            return (
              <Card key={incident.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedIncident(incident)} data-testid={`card-incident-${incident.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-xs", sev.color)}>{incident.severity.toUpperCase()}</Badge>
                        <Badge variant="outline" className={cn("text-xs", status.color)}><StatusIcon className="w-3 h-3 mr-1" />{status.label}</Badge>
                      </div>
                      <p className="font-medium truncate">{incident.title}</p>
                      {incident.assignedTo && <p className="text-xs text-muted-foreground mt-1">Assigned to {incident.assignedTo}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(incident.createdAt), "MMM d, yyyy HH:mm")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        {workflowSteps.map((s, i) => (
                          <div key={s} className={cn("h-1.5 w-8 rounded-full", i <= stepIdx ? "bg-primary" : "bg-muted")} />
                        ))}
                      </div>
                      {incident.status !== "close" && (
                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); advanceStatus(incident); }} disabled={updateMutation.isPending} data-testid={`button-advance-${incident.id}`}>
                          Advance <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedIncident} onOpenChange={o => !o && setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", severityConfig[selectedIncident.severity]?.color)}>{selectedIncident.severity.toUpperCase()}</Badge>
                  <Badge variant="outline" className={cn("text-xs", statusConfig[selectedIncident.status]?.color)}>{statusConfig[selectedIncident.status]?.label}</Badge>
                </div>
                <DialogTitle className="mt-2">{selectedIncident.title}</DialogTitle>
                {selectedIncident.description && <DialogDescription>{selectedIncident.description}</DialogDescription>}
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-1">
                  {workflowSteps.map((s, i) => {
                    const idx = workflowSteps.indexOf(selectedIncident.status);
                    const cfg = statusConfig[s];
                    return (
                      <div key={s} className="flex-1 text-center">
                        <div className={cn("h-2 rounded-full mb-1", i <= idx ? "bg-primary" : "bg-muted")} />
                        <p className="text-xs text-muted-foreground">{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Assigned To:</span> <span className="ml-2">{selectedIncident.assignedTo || "Unassigned"}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="ml-2">{format(new Date(selectedIncident.createdAt), "MMM d, yyyy")}</span></div>
                  {selectedIncident.mttr && <div><span className="text-muted-foreground">MTTR:</span> <span className="ml-2">{selectedIncident.mttr} minutes</span></div>}
                  {selectedIncident.resolvedAt && <div><span className="text-muted-foreground">Resolved:</span> <span className="ml-2">{format(new Date(selectedIncident.resolvedAt), "MMM d, yyyy")}</span></div>}
                </div>
                {selectedIncident.status !== "close" && (
                  <Button className="w-full" onClick={() => advanceStatus(selectedIncident)} disabled={updateMutation.isPending} data-testid="button-advance-detail">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                    Advance to {statusConfig[workflowSteps[workflowSteps.indexOf(selectedIncident.status) + 1]]?.label}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
