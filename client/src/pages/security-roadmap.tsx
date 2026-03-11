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
import { Progress } from "@/components/ui/progress";
import { Map, Plus, Trash2, CheckCircle2, Clock, PlayCircle, Loader2, Flag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { RemediationTask } from "@shared/schema";

const taskSchema = z.object({
  title: z.string().min(2, "Title required"),
  description: z.string().optional(),
  owner: z.string().optional(),
  priority: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  targetDate: z.string().optional(),
});

const PRIORITIES = [
  { value: "critical", label: "Critical", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "high", label: "High", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "low", label: "Low", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  open: { label: "Open", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: PlayCircle, color: "text-blue-500" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-500" },
};

const CATEGORIES = ["vulnerability", "compliance", "infrastructure", "access_control", "monitoring", "training", "policy"];

export default function SecurityRoadmapPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/roadmap/stats"] });
  const { data: tasks = [], isLoading } = useQuery<RemediationTask[]>({ queryKey: ["/api/roadmap/tasks"] });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", owner: "", priority: "medium", category: "vulnerability", status: "open", targetDate: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (payload.targetDate) payload.targetDate = new Date(payload.targetDate).toISOString();
      return apiRequest("POST", "/api/roadmap/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/stats"] });
      setIsOpen(false);
      form.reset();
      toast({ title: "Task created" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/roadmap/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/roadmap/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap/stats"] });
    },
  });

  const filtered = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);

  const grouped = {
    open: filtered.filter(t => t.status === "open"),
    in_progress: filtered.filter(t => t.status === "in_progress"),
    completed: filtered.filter(t => t.status === "completed"),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Roadmap</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan and track remediation tasks across your security program</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task"><Plus className="w-4 h-4 mr-1.5" />Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Remediation Task</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl>
                    <Input data-testid="input-task-title" placeholder="Rotate compromised API keys" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl>
                    <Textarea data-testid="input-task-desc" placeholder="Details..." rows={2} {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="owner" render={({ field }) => (
                  <FormItem><FormLabel>Owner</FormLabel><FormControl>
                    <Input data-testid="input-task-owner" placeholder="security@company.com" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="targetDate" render={({ field }) => (
                  <FormItem><FormLabel>Target Date</FormLabel><FormControl>
                    <Input type="date" data-testid="input-task-date" {...field} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Task
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          <div className="text-xs text-muted-foreground">Total Tasks</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-yellow-500">{stats?.open ?? 0}</div>
          <div className="text-xs text-muted-foreground">Open</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-500">{stats?.inProgress ?? 0}</div>
          <div className="text-xs text-muted-foreground">In Progress</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-green-500">{stats?.completed ?? 0}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </CardContent></Card>
      </div>

      {(stats?.total ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{stats?.progress ?? 0}%</span>
            </div>
            <Progress value={stats?.progress ?? 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Map className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No tasks yet.</p>
          <p className="text-sm text-muted-foreground/60">Create remediation tasks to build your security roadmap.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["open", "in_progress", "completed"] as const).map(col => {
            const cfg = STATUS_CONFIG[col];
            const StatusIcon = cfg.icon;
            return (
              <div key={col}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className={cn("w-4 h-4", cfg.color)} />
                  <span className="text-sm font-semibold">{cfg.label}</span>
                  <Badge variant="secondary" className="text-xs">{grouped[col].length}</Badge>
                </div>
                <div className="space-y-2">
                  {grouped[col].map(task => {
                    const priorityCfg = PRIORITIES.find(p => p.value === task.priority);
                    return (
                      <Card key={task.id} data-testid={`card-task-${task.id}`} className="group">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge variant="outline" className={cn("text-[10px] h-4 px-1", priorityCfg?.color ?? "")}>{task.priority}</Badge>
                                <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">{task.category.replace("_", " ")}</Badge>
                              </div>
                              <p className="text-sm font-medium leading-tight mb-1">{task.title}</p>
                              {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{task.description}</p>}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {task.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.owner}</span>}
                                {task.targetDate && <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{format(new Date(task.targetDate), "MMM d")}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col === "open" && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateStatusMutation.mutate({ id: task.id, status: "in_progress" })} title="Start" data-testid={`button-start-${task.id}`}>
                                  <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                                </Button>
                              )}
                              {col === "in_progress" && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateStatusMutation.mutate({ id: task.id, status: "completed" })} title="Complete" data-testid={`button-complete-${task.id}`}>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {grouped[col].length === 0 && (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">No {cfg.label.toLowerCase()} tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
