import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  insertPipelineConfigSchema, 
  insertAlertRuleSchema,
  type PipelineConfig,
  type MonitoringConfig,
  type AlertRule
} from "@shared/schema";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  Activity, 
  Bell, 
  Shield, 
  Code, 
  Box, 
  Server,
  Play,
  Clock,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { SiGithub, SiGitlab, SiBitbucket, SiDocker } from "react-icons/si";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DevSecOpsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pipelines");

  // Queries
  const { data: pipelines, isLoading: isLoadingPipelines } = useQuery<PipelineConfig[]>({
    queryKey: ["/api/pipelines"],
  });

  const { data: monitoringConfigs, isLoading: isLoadingMonitoring } = useQuery<MonitoringConfig[]>({
    queryKey: ["/api/monitoring/configs"],
  });

  const { data: alertRules, isLoading: isLoadingAlerts } = useQuery<AlertRule[]>({
    queryKey: ["/api/alerts/rules"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">DevSecOps & Monitoring</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Automate security in your CI/CD pipelines and configure continuous system monitoring.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pipelines" data-testid="tab-pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines" className="mt-6">
          <PipelineIntegrations 
            pipelines={pipelines || []} 
            isLoading={isLoadingPipelines} 
          />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <ContinuousMonitoring 
            configs={monitoringConfigs || []} 
            isLoading={isLoadingMonitoring} 
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertRules 
            rules={alertRules || []} 
            isLoading={isLoadingAlerts} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Tab 1: Pipeline Integrations ---

function PipelineIntegrations({ pipelines, isLoading }: { pipelines: PipelineConfig[], isLoading: boolean }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<PipelineConfig | null>(null);
  const [webhookDocConfig, setWebhookDocConfig] = useState<PipelineConfig | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pipelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      toast({ title: "Pipeline deleted successfully" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pipeline Integrations</h2>
        <Dialog open={isAddDialogOpen || !!editingPipeline} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingPipeline(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-pipeline" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingPipeline ? "Edit Pipeline" : "Add Pipeline Integration"}</DialogTitle>
              <DialogDescription>
                {editingPipeline ? "Update your pipeline configuration." : "Connect your CI/CD pipeline to automate security scanning."}
              </DialogDescription>
            </DialogHeader>
            <AddPipelineForm 
              pipeline={editingPipeline || undefined} 
              onSuccess={() => {
                setIsAddDialogOpen(false);
                setEditingPipeline(null);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
              <CardTitle className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={pipeline.provider} />
                  <span data-testid={`text-pipeline-name-${pipeline.id}`}>{pipeline.name}</span>
                </div>
              </CardTitle>
              <Badge variant={pipeline.isActive ? "default" : "secondary"}>
                {pipeline.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground truncate" data-testid={`text-pipeline-repo-${pipeline.id}`}>
                  {pipeline.repositoryUrl}
                </p>
                <div className="flex flex-wrap gap-1">
                  {pipeline.scanTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-[10px]">
                      {type}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last triggered: {pipeline.lastTriggeredAt ? new Date(pipeline.lastTriggeredAt).toLocaleString() : "Never"}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => setWebhookDocConfig(pipeline)}
                data-testid={`button-get-webhook-${pipeline.id}`}
              >
                <Terminal className="mr-2 h-3 w-3" />
                Webhook
              </Button>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setEditingPipeline(pipeline)}
                  data-testid={`button-edit-pipeline-${pipeline.id}`}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteMutation.mutate(pipeline.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-pipeline-${pipeline.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>


      {pipelines.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Box className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No pipelines configured</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Add your first CI/CD pipeline integration to start automating security scans.
            </p>
          </CardContent>
        </Card>
      )}

      <WebhookDocsDialog 
        config={webhookDocConfig} 
        onOpenChange={(open) => !open && setWebhookDocConfig(null)} 
      />
    </div>
  );
}

function AddPipelineForm({ onSuccess, pipeline }: { onSuccess: () => void, pipeline?: PipelineConfig }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertPipelineConfigSchema.extend({
      scanTypes: z.array(z.string()).min(1, "Select at least one scan type")
    })),
    defaultValues: pipeline ? {
      name: pipeline.name,
      provider: pipeline.provider,
      repositoryUrl: pipeline.repositoryUrl || "",
      branch: pipeline.branch,
      scanTypes: pipeline.scanTypes,
      failOnCritical: pipeline.failOnCritical,
      failOnHigh: pipeline.failOnHigh,
      isActive: pipeline.isActive,
    } : {
      name: "",
      provider: "github_actions",
      repositoryUrl: "",
      branch: "main",
      scanTypes: ["sast", "sca"],
      failOnCritical: true,
      failOnHigh: false,
      isActive: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (pipeline) {
        await apiRequest("PUT", `/api/pipelines/${pipeline.id}`, values);
      } else {
        await apiRequest("POST", "/api/pipelines", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      toast({ title: pipeline ? "Pipeline updated" : "Pipeline configuration saved" });
      onSuccess();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pipeline Name</FormLabel>
              <FormControl>
                <Input placeholder="Frontend CI" {...field} data-testid="input-pipeline-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="github_actions">GitHub Actions</SelectItem>
                    <SelectItem value="gitlab_ci">GitLab CI</SelectItem>
                    <SelectItem value="bitbucket">Bitbucket Pipelines</SelectItem>
                    <SelectItem value="jenkins">Jenkins</SelectItem>
                    <SelectItem value="docker">Docker Hub / Registry</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <FormControl>
                  <Input placeholder="main" {...field} data-testid="input-pipeline-branch" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="repositoryUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repository URL</FormLabel>
              <FormControl>
                <Input placeholder="https://github.com/org/repo" {...field} data-testid="input-repository-url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <FormLabel>Scan Types</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "sast", label: "Code (SAST)" },
              { id: "sca", label: "Dependencies (SCA)" },
              { id: "container", label: "Container Image" },
              { id: "iac", label: "Infrastructure (IaC)" },
            ].map((type) => (
              <FormField
                key={type.id}
                control={form.control}
                name="scanTypes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(type.id)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          return checked
                            ? field.onChange([...current, type.id])
                            : field.onChange(current.filter((v: string) => v !== type.id));
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      {type.label}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 p-4 border rounded-md bg-muted/30">
          <FormField
            control={form.control}
            name="failOnCritical"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="text-xs">Fail on Critical</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="failOnHigh"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="text-xs">Fail on High</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-pipeline">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Configure Integration
        </Button>
      </form>
    </Form>
  );
}

function WebhookDocsDialog({ config, onOpenChange }: { config: PipelineConfig | null, onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getYamlSnippet = (config: PipelineConfig) => {
    const webhookUrl = `${window.location.origin}/api/pipelines/webhook/${config.id}`;
    
    switch (config.provider) {
      case "github_actions":
        return `name: Zyra Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Zyra Scan
        run: |
          curl -X POST "${webhookUrl}" \\
            -H "X-Zyra-Secret: \${{ secrets.ZYRA_WEBHOOK_SECRET }}" \\
            -d '{"commit": "\${{ github.sha }}", "ref": "\${{ github.ref }}"}'`;
      case "gitlab_ci":
        return `zyra_scan:
  stage: test
  script:
    - curl -X POST "${webhookUrl}" \\
        -H "X-Zyra-Secret: $ZYRA_WEBHOOK_SECRET" \\
        -d "{\\\"commit\\\": \\\"$CI_COMMIT_SHA\\\", \\\"ref\\\": \\\"$CI_COMMIT_REF_NAME\\\"}"
  only:
    - main
    - merge_requests`;
      default:
        return `# Webhook URL: ${webhookUrl}\n# Header: X-Zyra-Secret: <your_secret>`;
    }
  };

  return (
    <Dialog open={!!config} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Webhook Integration</DialogTitle>
          <DialogDescription>
            Use this webhook to trigger scans from your CI/CD provider.
          </DialogDescription>
        </DialogHeader>
        {config && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <div className="flex gap-2">
                <Input readOnly value={`${window.location.origin}/api/pipelines/webhook/${config.id}`} className="bg-muted" />
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(`${window.location.origin}/api/pipelines/webhook/${config.id}`)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook Secret</label>
              <div className="flex gap-2">
                <Input readOnly value={config.webhookSecret || ""} className="bg-muted" />
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(config.webhookSecret || "")}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Store this in your CI environment secrets.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Example Integration YAML</label>
              <div className="relative group">
                <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                  <code>{getYamlSnippet(config)}</code>
                </pre>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(getYamlSnippet(config))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "github_actions": return <SiGithub className="h-4 w-4" />;
    case "gitlab_ci": return <SiGitlab className="h-4 w-4 text-orange-500" />;
    case "bitbucket": return <SiBitbucket className="h-4 w-4 text-blue-500" />;
    case "docker": return <SiDocker className="h-4 w-4 text-blue-400" />;
    default: return <Box className="h-4 w-4" />;
  }
}

// --- Tab 2: Continuous Monitoring ---

function ContinuousMonitoring({ configs, isLoading }: { configs: MonitoringConfig[], isLoading: boolean }) {
  const { toast } = useToast();
  const [localConfigs, setLocalConfigs] = useState<MonitoringConfig[]>([]);

  // Initialize local state when configs are loaded
  useState(() => {
    if (configs.length > 0) setLocalConfigs(configs);
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/monitoring/configs", localConfigs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/configs"] });
      toast({ title: "Monitoring configuration saved" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (type: string) => {
      await apiRequest("POST", "/api/monitoring/trigger", { type });
    },
    onSuccess: () => {
      toast({ title: "Monitoring scan triggered" });
    },
  });

  const updateConfig = (type: string, updates: Partial<MonitoringConfig>) => {
    setLocalConfigs(prev => {
      const existing = prev.find(c => c.type === type);
      if (existing) {
        return prev.map(c => c.type === type ? { ...c, ...updates } : c);
      }
      // If doesn't exist locally, we can't easily update without the full object
      // but the API expects an array of configs to upsert.
      // For simplicity in this UI, we assume we have placeholders for the 4 standard types.
      return prev;
    });
  };

  const monitoringModes = [
    {
      type: "realtime",
      title: "Real-time Commit Scanning",
      description: "Instantly scan every code commit and pull request for secrets and vulnerabilities.",
      icon: Activity,
    },
    {
      type: "daily",
      title: "Daily Security Scan",
      description: "Full automated scan of all active repositories and cloud resources every 24 hours.",
      icon: Clock,
    },
    {
      type: "weekly",
      title: "Weekly Full Audit",
      description: "Deep security audit including dependency analysis and configuration review.",
      icon: Shield,
    },
    {
      type: "monthly",
      title: "Monthly Infrastructure Review",
      description: "Comprehensive review of cloud infrastructure, IAM policies, and compliance status.",
      icon: Server,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no configs from server, use defaults for display
  const displayConfigs = monitoringModes.map(mode => {
    const config = (localConfigs.length > 0 ? localConfigs : configs).find(c => c.type === mode.type);
    return {
      ...mode,
      config: config || { 
        id: mode.type, 
        type: mode.type, 
        name: mode.title, 
        isEnabled: false, 
        targetType: "all",
        lastRunAt: null,
        nextRunAt: null
      } as MonitoringConfig
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Continuous Monitoring</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated security monitoring for your connected systems.
          </p>
        </div>
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          data-testid="button-save-monitoring"
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {displayConfigs.map((mode) => (
          <Card key={mode.type} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
              <div className="flex items-center gap-2">
                <mode.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">{mode.title}</CardTitle>
              </div>
              <Switch 
                checked={mode.config.isEnabled} 
                onCheckedChange={(checked) => {
                  const existing = localConfigs.find(c => c.type === mode.type);
                  if (existing) {
                    updateConfig(mode.type, { isEnabled: checked });
                  } else {
                    const newConfig = { ...mode.config, isEnabled: checked };
                    setLocalConfigs(prev => [...prev, newConfig]);
                  }
                }}
                data-testid={`switch-monitor-${mode.type}`}
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {mode.description}
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Target Type</span>
                  <Select 
                    value={mode.config.targetType} 
                    onValueChange={(val) => {
                      const existing = localConfigs.find(c => c.type === mode.type);
                      if (existing) {
                        updateConfig(mode.type, { targetType: val });
                      } else {
                        setLocalConfigs(prev => [...prev, { ...mode.config, targetType: val }]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assets</SelectItem>
                      <SelectItem value="code">Code Only</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure Only</SelectItem>
                      <SelectItem value="dependencies">Dependencies Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Next Run</span>
                  <div className="h-8 flex items-center px-3 border rounded-md bg-muted/20">
                    {mode.config.nextRunAt ? new Date(mode.config.nextRunAt).toLocaleDateString() : "Not scheduled"}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 py-3">
              <span className="text-xs text-muted-foreground">
                Last run: {mode.config.lastRunAt ? new Date(mode.config.lastRunAt).toLocaleString() : "Never"}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => triggerMutation.mutate(mode.type)}
                disabled={triggerMutation.isPending}
                data-testid={`button-trigger-monitor-${mode.type}`}
              >
                <Play className="mr-2 h-3 w-3" />
                Run Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Tab 3: Alert Rules ---

function AlertRules({ rules, isLoading }: { rules: AlertRule[], isLoading: boolean }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alerts/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: "Alert rule deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      await apiRequest("PUT", `/api/alerts/rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Security Alert Rules</h2>
        <Dialog open={isAddDialogOpen || !!editingRule} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingRule(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-alert-rule" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Alert Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Alert Rule" : "Create Alert Rule"}</DialogTitle>
              <DialogDescription>
                Define triggers and notification channels for security events.
              </DialogDescription>
            </DialogHeader>
            <AddAlertRuleForm 
              rule={editingRule || undefined} 
              onSuccess={() => {
                setIsAddDialogOpen(false);
                setEditingRule(null);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule Name</TableHead>
              <TableHead>Trigger Event</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span data-testid={`text-rule-name-${rule.id}`}>{rule.name}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{rule.description}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {rule.trigger.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {rule.channels.map((channel) => (
                      <Badge key={channel} variant="secondary" className="text-[10px] capitalize">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={rule.isActive} 
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, isActive: checked })}
                    data-testid={`switch-rule-${rule.id}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingRule(rule)}
                      data-testid={`button-edit-rule-${rule.id}`}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(rule.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No alert rules defined. Create your first rule to get notified.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AddAlertRuleForm({ onSuccess, rule }: { onSuccess: () => void, rule?: AlertRule }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertAlertRuleSchema),
    defaultValues: rule ? {
      name: rule.name,
      description: rule.description || "",
      trigger: rule.trigger,
      channels: rule.channels,
      webhookUrl: rule.webhookUrl || "",
      slackChannel: rule.slackChannel || "",
      isActive: rule.isActive,
      config: rule.config || {},
    } : {
      name: "",
      description: "",
      trigger: "critical_vuln",
      channels: ["email"],
      webhookUrl: "",
      slackChannel: "",
      isActive: true,
      config: {},
    },
  });

  const selectedChannels = form.watch("channels") || [];

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (rule) {
        await apiRequest("PUT", `/api/alerts/rules/${rule.id}`, values);
      } else {
        await apiRequest("POST", "/api/alerts/rules", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/rules"] });
      toast({ title: rule ? "Alert rule updated" : "Alert rule created" });
      onSuccess();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rule Name</FormLabel>
              <FormControl>
                <Input placeholder="Critical Vulnerability Alert" {...field} data-testid="input-rule-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="trigger"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trigger Event</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="critical_vuln">Critical Vulnerability Detected</SelectItem>
                  <SelectItem value="high_cve">New High CVE Published</SelectItem>
                  <SelectItem value="infra_misconfiguration">Infrastructure Misconfiguration</SelectItem>
                  <SelectItem value="scan_complete">Scan Completed</SelectItem>
                  <SelectItem value="pentest_complete">Pentest Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <FormLabel>Notification Channels</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "email", label: "Email" },
              { id: "slack", label: "Slack" },
              { id: "webhook", label: "Webhook" },
              { id: "siem", label: "SIEM / Syslog" },
            ].map((channel) => (
              <FormField
                key={channel.id}
                control={form.control}
                name="channels"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(channel.id)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          return checked
                            ? field.onChange([...current, channel.id])
                            : field.onChange(current.filter((v: string) => v !== channel.id));
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      {channel.label}
                    </FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {selectedChannels.includes("slack") && (
          <FormField
            control={form.control}
            name="slackChannel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slack Channel</FormLabel>
                <FormControl>
                  <Input placeholder="#security-alerts" {...field} data-testid="input-slack-channel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedChannels.includes("webhook") && (
          <FormField
            control={form.control}
            name="webhookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://api.company.com/webhook" {...field} data-testid="input-webhook-url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-alert-rule">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Alert Rule
        </Button>
      </form>
    </Form>
  );
}

