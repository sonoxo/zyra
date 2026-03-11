import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Bug, Plus, Trash2, CheckCircle2, DollarSign, AlertTriangle, Loader2, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { BountyReport } from "@shared/schema";

const reportSchema = z.object({
  researcherEmail: z.string().email("Valid email required"),
  title: z.string().min(5, "Title required"),
  vulnerability: z.string().min(10, "Description required"),
  severity: z.string().min(1),
  cvss: z.coerce.number().min(0).max(10).optional(),
  stepsToReproduce: z.string().optional(),
  reproducible: z.boolean().default(false),
});

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  triaged: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  accepted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-muted text-muted-foreground",
};

const REWARD_RANGES: Record<string, number> = {
  critical: 5000, high: 1000, medium: 250, low: 50,
};

export default function BugBountyPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/bounty/stats"] });
  const { data: reports = [], isLoading } = useQuery<BountyReport[]>({ queryKey: ["/api/bounty/reports"] });

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: { researcherEmail: "", title: "", vulnerability: "", severity: "medium", stepsToReproduce: "", reproducible: false },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/bounty/report", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/stats"] });
      setIsOpen(false);
      form.reset();
      toast({ title: "Report submitted", description: "Bug report has been received for triage." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/bounty/reports/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bounty/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bounty/stats"] });
    },
  });

  const filtered = statusFilter === "all" ? reports : reports.filter(r => r.status === statusFilter);

  const nextStatus = (status: string) => {
    const flow: Record<string, string> = { new: "triaged", triaged: "accepted", accepted: "resolved" };
    return flow[status];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bug Bounty Program</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Receive, triage and reward external vulnerability reports</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-report"><Plus className="w-4 h-4 mr-1.5" />Submit Report</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Submit Vulnerability Report</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="researcherEmail" render={({ field }) => (
                  <FormItem><FormLabel>Researcher Email</FormLabel><FormControl>
                    <Input data-testid="input-researcher-email" placeholder="researcher@example.com" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Vulnerability Title</FormLabel><FormControl>
                    <Input data-testid="input-vuln-title" placeholder="SQL Injection in /api/users endpoint" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="severity" render={({ field }) => (
                  <FormItem><FormLabel>Severity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger data-testid="select-severity"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cvss" render={({ field }) => (
                  <FormItem><FormLabel>CVSS Score (0-10)</FormLabel><FormControl>
                    <Input type="number" step="0.1" data-testid="input-cvss" placeholder="7.5" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="vulnerability" render={({ field }) => (
                  <FormItem><FormLabel>Vulnerability Description</FormLabel><FormControl>
                    <Textarea data-testid="input-vuln-desc" placeholder="Detailed description of the vulnerability..." rows={3} {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="stepsToReproduce" render={({ field }) => (
                  <FormItem><FormLabel>Steps to Reproduce</FormLabel><FormControl>
                    <Textarea data-testid="input-steps" placeholder="1. Go to...\n2. Enter..." rows={3} {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-bounty">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Submit Report
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Bug className="w-4 h-4 text-blue-500" /></div>
            <div><div className="text-2xl font-bold">{stats?.total ?? 0}</div><div className="text-xs text-muted-foreground">Total Reports</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
            <div><div className="text-2xl font-bold text-red-500">{stats?.critical ?? 0}</div><div className="text-xs text-muted-foreground">Critical</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
            <div><div className="text-2xl font-bold text-green-500">{stats?.resolved ?? 0}</div><div className="text-xs text-muted-foreground">Resolved</div></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><DollarSign className="w-4 h-4 text-yellow-500" /></div>
            <div><div className="text-2xl font-bold">${(stats?.totalReward ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Rewards</div></div>
          </div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        {["all", "new", "triaged", "accepted", "resolved"].map(f => (
          <Button key={f} variant={statusFilter === f ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(f)} className="capitalize" data-testid={`filter-${f}`}>{f}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Bug className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No reports yet.</p>
          <p className="text-sm text-muted-foreground/60">External researchers can submit vulnerability reports here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <Card key={report.id} data-testid={`card-report-${report.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{report.title}</span>
                      <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[report.severity] ?? "")}>{report.severity}</Badge>
                      <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[report.status] ?? "")}>{report.status}</Badge>
                      {report.cvss && <Badge variant="secondary" className="text-xs">CVSS {report.cvss}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{report.vulnerability}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.researcherEmail}</span>
                      <span>{format(new Date(report.createdAt), "MMM d, yyyy")}</span>
                      {report.reward && <span className="flex items-center gap-1 text-green-600"><DollarSign className="w-3 h-3" />${report.reward.toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {nextStatus(report.status) && (
                      <Button variant="outline" size="sm" data-testid={`button-advance-${report.id}`}
                        onClick={() => updateMutation.mutate({
                          id: report.id,
                          data: {
                            status: nextStatus(report.status),
                            ...(nextStatus(report.status) === "accepted" && { reward: REWARD_RANGES[report.severity] }),
                          }
                        })}
                      >
                        {nextStatus(report.status) === "triaged" ? "Triage" : nextStatus(report.status) === "accepted" ? "Accept" : "Resolve"}
                      </Button>
                    )}
                    {report.status === "new" && (
                      <Button variant="ghost" size="sm" data-testid={`button-reject-${report.id}`}
                        onClick={() => updateMutation.mutate({ id: report.id, data: { status: "rejected" } })}
                      >
                        Reject
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(report.id)} data-testid={`button-delete-report-${report.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
