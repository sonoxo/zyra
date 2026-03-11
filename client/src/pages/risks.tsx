import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Risk } from "@shared/schema";
import { insertRiskSchema } from "@shared/schema";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TriangleAlert, Loader2, ShieldCheck, Grid2X2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = insertRiskSchema.extend({ organizationId: z.string().optional() });

function riskLevel(score: number) {
  if (score >= 20) return { label: "Critical", color: "bg-red-500/10 text-red-500 border-red-500/20" };
  if (score >= 12) return { label: "High", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
  if (score >= 6) return { label: "Medium", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" };
  return { label: "Low", color: "bg-green-500/10 text-green-500 border-green-500/20" };
}

const treatmentColors: Record<string, string> = {
  mitigate: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  accept: "bg-muted text-muted-foreground border-border",
  transfer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  avoid: "bg-red-500/10 text-red-500 border-red-500/20",
};

const MATRIX_SIZE = 5;

export default function RisksPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [view, setView] = useState<"list" | "matrix">("list");

  const { data: risks = [], isLoading } = useQuery<Risk[]>({ queryKey: ["/api/risks"] });
  const { data: matrix } = useQuery<any>({ queryKey: ["/api/risks/matrix"] });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", category: "technical", likelihood: 3, impact: 3, riskScore: 9, owner: "", treatment: "mitigate", mitigationPlan: "", status: "open" },
  });

  const likelihood = form.watch("likelihood") ?? 3;
  const impact = form.watch("impact") ?? 3;
  const previewScore = (likelihood) * (impact);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/risks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/matrix"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Risk added to register" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/risks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/matrix"] });
      toast({ title: "Risk updated" });
    },
  });

  const matrixCells = Array.from({ length: MATRIX_SIZE }, (_, row) =>
    Array.from({ length: MATRIX_SIZE }, (_, col) => {
      const l = MATRIX_SIZE - row;
      const i = col + 1;
      const score = l * i;
      const risksHere = risks.filter(r => r.likelihood === l && r.impact === i);
      return { l, i, score, risks: risksHere };
    })
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-risks">Risk Register</h1>
          <p className="text-muted-foreground text-sm mt-1">Track organizational security risks with likelihood × impact scoring and treatment plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "list" ? "matrix" : "list")} data-testid="button-toggle-view">
            <Grid2X2 className="w-4 h-4 mr-2" />{view === "list" ? "Risk Matrix" : "List View"}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-risk"><Plus className="w-4 h-4 mr-2" />Add Risk</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Risk</DialogTitle>
                <DialogDescription>Document a security risk with likelihood, impact, and treatment plan.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Risk Title</FormLabel><FormControl><Input placeholder="Brief risk description" data-testid="input-risk-title" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} placeholder="Detailed risk description..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? "technical"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["technical","operational","compliance","third_party","human","physical"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="treatment" render={({ field }) => (
                      <FormItem><FormLabel>Treatment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? "mitigate"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {["mitigate","accept","transfer","avoid"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="likelihood" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Likelihood (1–5)</FormLabel>
                        <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={String(field.value ?? 3)}>
                          <FormControl><SelectTrigger data-testid="select-likelihood"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 — Rare</SelectItem>
                            <SelectItem value="2">2 — Unlikely</SelectItem>
                            <SelectItem value="3">3 — Possible</SelectItem>
                            <SelectItem value="4">4 — Likely</SelectItem>
                            <SelectItem value="5">5 — Almost Certain</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="impact" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact (1–5)</FormLabel>
                        <Select onValueChange={v => field.onChange(parseInt(v))} defaultValue={String(field.value ?? 3)}>
                          <FormControl><SelectTrigger data-testid="select-impact"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 — Negligible</SelectItem>
                            <SelectItem value="2">2 — Minor</SelectItem>
                            <SelectItem value="3">3 — Moderate</SelectItem>
                            <SelectItem value="4">4 — Major</SelectItem>
                            <SelectItem value="5">5 — Catastrophic</SelectItem>
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Risk Score ({likelihood} × {impact})</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{previewScore}</span>
                      <Badge variant="outline" className={cn("text-xs", riskLevel(previewScore).color)}>{riskLevel(previewScore).label}</Badge>
                    </div>
                  </div>
                  <FormField control={form.control} name="owner" render={({ field }) => (
                    <FormItem><FormLabel>Risk Owner</FormLabel><FormControl><Input placeholder="owner@company.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mitigationPlan" render={({ field }) => (
                    <FormItem><FormLabel>Mitigation Plan</FormLabel><FormControl><Textarea rows={2} placeholder="Steps to mitigate this risk..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-risk">
                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : "Add to Register"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Critical", value: matrix?.summary?.critical ?? 0, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "High", value: matrix?.summary?.high ?? 0, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Medium", value: matrix?.summary?.medium ?? 0, color: "text-yellow-600", bg: "bg-yellow-500/10" },
          { label: "Low", value: matrix?.summary?.low ?? 0, color: "text-green-500", bg: "bg-green-500/10" },
        ].map(s => (
          <Card key={s.label} data-testid={`stat-risk-${s.label.toLowerCase()}`}>
            <CardContent className={cn("p-4", s.bg)}>
              <p className="text-xs text-muted-foreground">{s.label} Risk</p>
              <p className={cn("text-3xl font-bold mt-1", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {view === "matrix" ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Risk Heat Map (Likelihood × Impact)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-start gap-2">
              <div className="flex flex-col justify-around h-64 pr-2">
                {[5,4,3,2,1].map(l => <span key={l} className="text-xs text-muted-foreground text-right">{l}</span>)}
              </div>
              <div className="flex-1 space-y-1">
                {matrixCells.map((row, ri) => (
                  <div key={ri} className="flex gap-1">
                    {row.map(cell => {
                      const rl = riskLevel(cell.score);
                      return (
                        <div key={`${cell.l}-${cell.i}`} className={cn("flex-1 h-12 rounded flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-105", rl.color.replace("border-", "border ").replace("/20", "/30"))}>
                          {cell.risks.length > 0 ? cell.risks.length : ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex justify-around pt-1">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-xs text-muted-foreground">{i}</span>)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>← Likelihood (1-5) →</span>
              <span>Impact (1-5) ↑</span>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : risks.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No risks registered</p>
          <p className="text-sm text-muted-foreground mt-1">Start building your risk register by adding organizational security risks</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>L × I</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map(r => {
                const rl = riskLevel(r.riskScore);
                return (
                  <TableRow key={r.id} data-testid={`row-risk-${r.id}`}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.title}</p>
                      {r.mitigationPlan && <p className="text-xs text-muted-foreground truncate max-w-48">{r.mitigationPlan}</p>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{r.category}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{r.likelihood} × {r.impact}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-bold", rl.color)}>{r.riskScore} — {rl.label}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", treatmentColors[r.treatment] || "")}>{r.treatment}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.owner || "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "open" ? "destructive" : "secondary"} className="text-xs">{r.status}</Badge></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={v => updateMutation.mutate({ id: r.id, data: { status: v } })}>
                        <SelectTrigger className="h-7 text-xs w-28" data-testid={`select-risk-status-${r.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["open","in_review","accepted","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
