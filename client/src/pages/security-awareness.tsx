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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Fish, Plus, Play, Trash2, Users, BarChart3,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Loader2, Mail, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingRecord, PhishingCampaign } from "@shared/schema";

const trainingSchema = z.object({
  userEmail: z.string().email("Valid email required"),
  course: z.string().min(2, "Course name required"),
});

const campaignSchema = z.object({
  name: z.string().min(2, "Campaign name required"),
  templateType: z.string().min(1, "Template required"),
  targetCount: z.coerce.number().min(1).default(25),
});

const COURSES = [
  "Security Fundamentals",
  "Phishing Awareness",
  "Password Management",
  "Data Handling & GDPR",
  "Social Engineering Defense",
  "Secure Remote Work",
  "Incident Reporting",
  "Cloud Security Basics",
];

const TEMPLATE_TYPES = [
  { value: "credential_harvest", label: "Credential Harvesting" },
  { value: "malicious_link", label: "Malicious Link" },
  { value: "attachment", label: "Malicious Attachment" },
  { value: "spear_phishing", label: "Spear Phishing" },
  { value: "ceo_fraud", label: "CEO Fraud / BEC" },
];

const severityColor = (score: number) =>
  score >= 60 ? "text-red-500" : score >= 30 ? "text-yellow-500" : "text-green-500";

export default function SecurityAwarenessPage() {
  const { toast } = useToast();
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const { data: stats } = useQuery<any>({ queryKey: ["/api/security-awareness/stats"] });
  const { data: training = [], isLoading: trainingLoading } = useQuery<TrainingRecord[]>({ queryKey: ["/api/security-awareness/training"] });
  const { data: campaigns = [], isLoading: campaignLoading } = useQuery<PhishingCampaign[]>({ queryKey: ["/api/security-awareness/campaigns"] });

  const trainingForm = useForm<z.infer<typeof trainingSchema>>({
    resolver: zodResolver(trainingSchema),
    defaultValues: { userEmail: "", course: "" },
  });

  const campaignForm = useForm<z.infer<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", templateType: "credential_harvest", targetCount: 25 },
  });

  const createTrainingMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/security-awareness/training", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/stats"] });
      setTrainingOpen(false);
      trainingForm.reset();
      toast({ title: "Training record created" });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiRequest("PUT", `/api/security-awareness/training/${id}`, { completed, completedAt: completed ? new Date() : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/stats"] });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/security-awareness/training/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/stats"] });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/security-awareness/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/campaigns"] });
      setCampaignOpen(false);
      campaignForm.reset();
      toast({ title: "Campaign created" });
    },
  });

  const launchCampaignMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/security-awareness/campaigns/${id}/launch`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/stats"] });
      toast({ title: "Campaign simulation complete", description: "Results have been recorded." });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/security-awareness/campaigns/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/security-awareness/campaigns"] }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Awareness</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track employee training and run phishing simulations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="w-4 h-4 text-blue-500" /></div>
              <div>
                <div className="text-2xl font-bold">{stats?.totalEmployees ?? 0}</div>
                <div className="text-xs text-muted-foreground">Total Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
              <div>
                <div className="text-2xl font-bold">{stats?.completionRate ?? 0}%</div>
                <div className="text-xs text-muted-foreground">Training Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><Fish className="w-4 h-4 text-orange-500" /></div>
              <div>
                <div className={cn("text-2xl font-bold", severityColor(stats?.avgPhishingScore ?? 0))}>{stats?.avgPhishingScore ?? 0}%</div>
                <div className="text-xs text-muted-foreground">Avg Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><Target className="w-4 h-4 text-purple-500" /></div>
              <div>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <div className="text-xs text-muted-foreground">Total Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training" data-testid="tab-training"><GraduationCap className="w-4 h-4 mr-1.5" />Training Records</TabsTrigger>
          <TabsTrigger value="phishing" data-testid="tab-phishing"><Fish className="w-4 h-4 mr-1.5" />Phishing Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{training.length} training records</p>
            <Dialog open={trainingOpen} onOpenChange={setTrainingOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-training"><Plus className="w-4 h-4 mr-1.5" />Add Record</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Training Record</DialogTitle></DialogHeader>
                <Form {...trainingForm}>
                  <form onSubmit={trainingForm.handleSubmit(d => createTrainingMutation.mutate(d))} className="space-y-4">
                    <FormField control={trainingForm.control} name="userEmail" render={({ field }) => (
                      <FormItem><FormLabel>Employee Email</FormLabel><FormControl>
                        <Input data-testid="input-user-email" placeholder="user@company.com" {...field} />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={trainingForm.control} name="course" render={({ field }) => (
                      <FormItem><FormLabel>Course</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-course"><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                          <SelectContent>{COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createTrainingMutation.isPending} data-testid="button-submit-training">
                      {createTrainingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Record
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {trainingLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : training.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No training records yet.</p>
                <p className="text-sm text-muted-foreground/60">Add employee training assignments to track completion.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {training.map(record => (
                    <div key={record.id} data-testid={`row-training-${record.id}`} className="flex items-center gap-4 p-4">
                      <div className={cn("p-2 rounded-full", record.completed ? "bg-green-500/10" : "bg-muted")}>
                        {record.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{record.userEmail}</div>
                        <div className="text-xs text-muted-foreground">{record.course}</div>
                      </div>
                      <Badge variant="outline" className={record.completed ? "text-green-600 border-green-500/30" : "text-yellow-600 border-yellow-500/30"}>
                        {record.completed ? "Completed" : "Pending"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => markCompleteMutation.mutate({ id: record.id, completed: !record.completed })}
                          data-testid={`button-toggle-${record.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteTrainingMutation.mutate(record.id)}
                          data-testid={`button-delete-training-${record.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="phishing" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
            <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-campaign"><Plus className="w-4 h-4 mr-1.5" />New Campaign</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Phishing Campaign</DialogTitle></DialogHeader>
                <Form {...campaignForm}>
                  <form onSubmit={campaignForm.handleSubmit(d => createCampaignMutation.mutate(d))} className="space-y-4">
                    <FormField control={campaignForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Campaign Name</FormLabel><FormControl>
                        <Input data-testid="input-campaign-name" placeholder="Q1 Phishing Test" {...field} />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={campaignForm.control} name="templateType" render={({ field }) => (
                      <FormItem><FormLabel>Template Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-template"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                    <FormField control={campaignForm.control} name="targetCount" render={({ field }) => (
                      <FormItem><FormLabel>Target Employee Count</FormLabel><FormControl>
                        <Input type="number" data-testid="input-target-count" {...field} />
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={createCampaignMutation.isPending} data-testid="button-submit-campaign">
                      {createCampaignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Campaign
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {campaignLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Fish className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No phishing campaigns yet.</p>
                <p className="text-sm text-muted-foreground/60">Create a campaign to simulate phishing attacks and measure human risk.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {campaigns.map(campaign => (
                <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{campaign.name}</h3>
                          <Badge variant="outline" className={cn("text-xs",
                            campaign.status === "completed" ? "text-green-600 border-green-500/30" :
                            campaign.status === "active" ? "text-blue-600 border-blue-500/30" :
                            "text-muted-foreground"
                          )}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {TEMPLATE_TYPES.find(t => t.value === campaign.templateType)?.label ?? campaign.templateType}
                          {" · "}{campaign.targetCount} targets
                        </p>
                        {campaign.status === "completed" && (
                          <div className="space-y-2">
                            <div className="flex gap-6 text-xs">
                              <span className="text-red-500"><strong>{campaign.clickedCount}</strong> clicked</span>
                              <span className="text-green-500"><strong>{campaign.reportedCount}</strong> reported</span>
                              <span className="text-muted-foreground"><strong>{campaign.ignoredCount}</strong> ignored</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Human Risk Score:</span>
                              <span className={cn("text-xs font-bold", severityColor(campaign.humanRiskScore))}>{campaign.humanRiskScore}%</span>
                              <Progress value={campaign.humanRiskScore} className="h-1.5 flex-1" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {campaign.status !== "completed" && (
                          <Button size="sm" variant="outline" data-testid={`button-launch-${campaign.id}`}
                            onClick={() => launchCampaignMutation.mutate(campaign.id)}
                            disabled={launchCampaignMutation.isPending}
                          >
                            {launchCampaignMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                            Launch
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                          data-testid={`button-delete-campaign-${campaign.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
