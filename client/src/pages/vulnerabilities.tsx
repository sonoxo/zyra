import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Vulnerability } from "@shared/schema";
import { insertVulnerabilitySchema } from "@shared/schema";
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
import { Progress } from "@/components/ui/progress";
import { Plus, Bug, ShieldAlert, CheckCircle2, Loader2, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FilterBar, useFilterValues, type FilterDefinition, type FilterState } from "@/components/filter-bar";

const formSchema = insertVulnerabilitySchema.extend({
  organizationId: z.string().optional(),
  cvss: z.number().min(0).max(10).optional().or(z.string().transform(v => v ? parseFloat(v) : undefined)),
});

const statusConfig: Record<string, { label: string; color: string; next?: string }> = {
  open: { label: "Open", color: "bg-red-500/10 text-red-500 border-red-500/20", next: "in_progress" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", next: "remediated" },
  remediated: { label: "Remediated", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", next: "verified" },
  verified: { label: "Verified", color: "bg-green-500/10 text-green-500 border-green-500/20" },
};

const severityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-muted text-muted-foreground border-border",
};

const baseVulnFilters: FilterDefinition[] = [
  { key: "search", label: "Search", type: "text", placeholder: "Search vulnerabilities..." },
  {
    key: "severity", label: "Severity", type: "select",
    options: [
      { value: "critical", label: "Critical" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
      { value: "info", label: "Info" },
    ],
  },
  {
    key: "status", label: "Status", type: "select",
    options: [
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In Progress" },
      { value: "remediated", label: "Remediated" },
      { value: "verified", label: "Verified" },
    ],
  },
  { key: "assignee", label: "Assignee", type: "select", options: [] },
  { key: "date", label: "Date Range", type: "date-range" },
];

export default function VulnerabilitiesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const filterState = useFilterValues(baseVulnFilters);
  const { values } = filterState;

  const { data: vulns = [], isLoading } = useQuery<Vulnerability[]>({ queryKey: ["/api/vulnerabilities"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/vulnerabilities/stats"] });
  const { data: teamData } = useQuery<{ members: { id: string; username: string; fullName: string | null }[] }>({ queryKey: ["/api/team"] });

  const vulnFilters = useMemo<FilterDefinition[]>(() => {
    const memberOptions = (teamData?.members || []).map(m => ({
      value: m.username,
      label: m.fullName || m.username,
    }));
    return baseVulnFilters.map(f => {
      if (f.key === "assignee") return { ...f, options: memberOptions };
      return f;
    });
  }, [teamData]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", severity: "medium", status: "open", source: "manual", cve: "", assignedTo: "", affectedComponent: "", remediationSteps: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vulnerabilities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vulnerabilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vulnerabilities/stats"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Vulnerability created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/vulnerabilities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vulnerabilities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vulnerabilities/stats"] });
      toast({ title: "Vulnerability updated" });
    },
  });

  const advance = (v: Vulnerability) => {
    const next = statusConfig[v.status]?.next;
    if (next) updateMutation.mutate({ id: v.id, data: { status: next } });
  };

  const filtered = useMemo(() => {
    return vulns.filter(v => {
      if (values.status && values.status !== "all" && v.status !== values.status) return false;
      if (values.severity && values.severity !== "all" && v.severity !== values.severity) return false;
      if (values.search) {
        const q = values.search.toLowerCase();
        if (!v.title.toLowerCase().includes(q) && !(v.description?.toLowerCase().includes(q)) && !(v.cve?.toLowerCase().includes(q))) return false;
      }
      if (values.assignee && values.assignee !== "all") {
        if (v.assignedTo?.toLowerCase() !== values.assignee.toLowerCase()) return false;
      }
      if (values.date_from) {
        if (new Date(v.createdAt) < new Date(values.date_from)) return false;
      }
      if (values.date_to) {
        const to = new Date(values.date_to);
        to.setDate(to.getDate() + 1);
        if (new Date(v.createdAt) > to) return false;
      }
      return true;
    });
  }, [vulns, values]);

  const workflowPct = (status: string) => {
    const steps = ["open", "in_progress", "remediated", "verified"];
    return ((steps.indexOf(status) + 1) / steps.length) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-vulnerabilities">Vulnerability Lifecycle</h1>
          <p className="text-muted-foreground text-sm mt-1">Track vulnerabilities from discovery through verification with SLA enforcement</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-vulnerability"><Plus className="w-4 h-4 mr-2" />Add Vulnerability</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Vulnerability</DialogTitle>
              <DialogDescription>Track a new vulnerability through the remediation lifecycle.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Vulnerability title" data-testid="input-vuln-title" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="severity" render={({ field }) => (
                    <FormItem><FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? "medium"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["critical","high","medium","low","info"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem><FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value ?? "manual"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["manual","scan","pentest","sbom","secrets","bug_bounty"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="cve" render={({ field }) => (
                    <FormItem><FormLabel>CVE ID</FormLabel><FormControl><Input placeholder="CVE-2024-XXXXX" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cvss" render={({ field }) => (
                    <FormItem><FormLabel>CVSS Score</FormLabel><FormControl><Input type="number" step="0.1" min="0" max="10" placeholder="7.5" {...field} value={field.value ?? ""} onChange={e => {
                      const v = e.target.value ? parseFloat(e.target.value) : undefined;
                      field.onChange(v);
                      if (v !== undefined) {
                        const sev = v >= 9 ? "critical" : v >= 7 ? "high" : v >= 4 ? "medium" : v >= 0.1 ? "low" : "info";
                        form.setValue("severity", sev as any);
                      }
                    }} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="affectedComponent" render={({ field }) => (
                  <FormItem><FormLabel>Affected Component</FormLabel><FormControl><Input placeholder="e.g. auth-service, login endpoint" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="assignedTo" render={({ field }) => (
                  <FormItem><FormLabel>Assign To</FormLabel><FormControl><Input placeholder="engineer@company.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="remediationSteps" render={({ field }) => (
                  <FormItem><FormLabel>Remediation Steps</FormLabel><FormControl><Textarea placeholder="Steps to remediate..." rows={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-vulnerability">
                  {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Add Vulnerability"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Bug, color: "text-foreground" },
          { label: "Open", value: stats?.byStatus?.open ?? 0, icon: AlertTriangle, color: "text-red-500" },
          { label: "Overdue", value: stats?.overdue ?? 0, icon: Clock, color: "text-orange-500" },
          { label: "Verified", value: stats?.byStatus?.verified ?? 0, icon: CheckCircle2, color: "text-green-500" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-vuln-${s.label.toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
                <s.icon className={cn("w-8 h-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FilterBar
        page="vulnerabilities"
        filters={vulnFilters}
        totalCount={vulns.length}
        filteredCount={filtered.length}
        filterState={filterState}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No vulnerabilities found</p>
          <p className="text-sm text-muted-foreground mt-1">Add vulnerabilities to track their remediation lifecycle</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const sc = statusConfig[v.status] || statusConfig.open;
            const sev = severityColor[v.severity] || severityColor.medium;
            return (
              <Card key={v.id} data-testid={`card-vuln-${v.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-xs", sev)}>{v.severity.toUpperCase()}</Badge>
                        <Badge variant="outline" className={cn("text-xs", sc.color)}>{sc.label}</Badge>
                        {v.cve && <Badge variant="secondary" className="text-xs font-mono">{v.cve}</Badge>}
                        {v.cvss && <Badge variant="secondary" className="text-xs">CVSS {v.cvss.toFixed(1)}</Badge>}
                      </div>
                      <p className="font-medium">{v.title}</p>
                      {v.affectedComponent && <p className="text-xs text-muted-foreground mt-0.5">Component: {v.affectedComponent}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <Progress value={workflowPct(v.status)} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{Math.round(workflowPct(v.status))}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {v.assignedTo && <p className="text-xs text-muted-foreground">{v.assignedTo}</p>}
                      {sc.next && (
                        <Button size="sm" variant="outline" onClick={() => advance(v)} disabled={updateMutation.isPending} data-testid={`button-advance-vuln-${v.id}`}>
                          {statusConfig[sc.next].label} <ArrowRight className="w-3 h-3 ml-1" />
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
    </div>
  );
}
