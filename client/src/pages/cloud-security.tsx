import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CloudScanTarget, CloudScanResult, InsertCloudScanTarget } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCloudScanTargetSchema } from "@shared/schema";
import { 
  Shield, 
  Plus, 
  Play, 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Server,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SiAmazonwebservices, SiGooglecloud } from "react-icons/si";
import { Cloud as AzureIcon } from "lucide-react";

const providerIcons: Record<string, any> = {
  aws: { icon: SiAmazonwebservices, color: "text-[#FF9900]", label: "AWS" },
  gcp: { icon: SiGooglecloud, color: "text-[#4285F4]", label: "Google Cloud" },
  azure: { icon: AzureIcon, color: "text-[#0089D6]", label: "Azure" },
};

const severityConfig: Record<string, { color: string; icon: any }> = {
  critical: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertTriangle },
  high: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertCircle },
  medium: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Info },
  low: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Info },
  info: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: Info },
};

export default function CloudSecurityPage() {
  const { toast } = useToast();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: targets, isLoading: targetsLoading } = useQuery<CloudScanTarget[]>({
    queryKey: ["/api/cloud-security/targets"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<CloudScanResult[]>({
    queryKey: ["/api/cloud-security/results", selectedTargetId].filter(Boolean) as string[],
    enabled: !!selectedTargetId,
  });

  const { data: summary } = useQuery<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    totalChecks: number;
    affectedResources: number;
  }>({
    queryKey: ["/api/cloud-security/summary"],
  });

  const addTargetMutation = useMutation({
    mutationFn: async (data: InsertCloudScanTarget) => {
      const res = await apiRequest("POST", "/api/cloud-security/targets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-security/targets"] });
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Cloud target added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cloud-security/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-security/targets"] });
      if (selectedTargetId) setSelectedTargetId(null);
      toast({ title: "Success", description: "Cloud target deleted" });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/cloud-security/targets/${id}/scan`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-security/targets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-security/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cloud-security/summary"] });
      toast({ title: "Scan Started", description: "The cloud security scan is now running." });
    },
  });

  const form = useForm<InsertCloudScanTarget>({
    resolver: zodResolver(insertCloudScanTargetSchema),
    defaultValues: {
      name: "",
      provider: "aws",
      region: "us-east-1",
      description: "",
      isActive: true,
    },
  });

  const onSubmit = (data: InsertCloudScanTarget) => {
    addTargetMutation.mutate(data);
  };

  const filteredResults = results?.filter((r) => 
    severityFilter === "all" ? true : r.severity === severityFilter
  );

  const securityScore = summary ? Math.max(0, 100 - (summary.critical * 20 + summary.high * 10 + summary.medium * 5)) : 100;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Security Posture</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and secure your multi-cloud infrastructure
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-target">
              <Plus className="w-4 h-4 mr-2" />
              Add Cloud Target
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Cloud Target</DialogTitle>
              <DialogDescription>
                Sentinel Forge uses read-only access for security audits. Credentials are managed via IAM roles.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production AWS" {...field} data-testid="input-target-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aws">AWS</SelectItem>
                          <SelectItem value="gcp">Google Cloud</SelectItem>
                          <SelectItem value="azure">Azure</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input placeholder="us-east-1" {...field} data-testid="input-region" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Main production environment" 
                          {...field} 
                          data-testid="input-description" 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground flex gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <p>Credentials are managed through your cloud provider's IAM roles. Sentinel Forge uses read-only access for security audits.</p>
                </div>
                <Button type="submit" className="w-full" disabled={addTargetMutation.isPending} data-testid="button-submit-target">
                  {addTargetMutation.isPending ? "Adding..." : "Add Target"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-security-score">{securityScore}%</div>
            <Progress value={securityScore} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-critical-count">
              {summary?.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-checks">
              {summary?.totalChecks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Scanned across all targets</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected Resources</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-affected-resources">
              {summary?.affectedResources || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique cloud resources</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold">Cloud Targets</h2>
          {targetsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : targets?.length === 0 ? (
            <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-muted/50">
              <Shield className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-lg">No Cloud Targets</CardTitle>
              <CardDescription className="mt-2">
                Connect your AWS, GCP, or Azure accounts to start security scanning.
              </CardDescription>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                Add Your First Target
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {targets?.map((target) => {
                const ProviderIcon = providerIcons[target.provider]?.icon || Shield;
                const isSelected = selectedTargetId === target.id;
                
                return (
                  <Card 
                    key={target.id}
                    className={cn(
                      "cursor-pointer transition-all hover-elevate",
                      isSelected && "ring-2 ring-primary bg-accent/5"
                    )}
                    onClick={() => setSelectedTargetId(target.id)}
                    data-testid={`card-target-${target.id}`}
                  >
                    <CardHeader className="p-4 space-y-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-md bg-muted", providerIcons[target.provider]?.color)}>
                            <ProviderIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{target.name}</CardTitle>
                            <CardDescription className="text-xs">{target.region}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              scanMutation.mutate(target.id);
                            }}
                            disabled={scanMutation.isPending}
                            data-testid={`button-scan-${target.id}`}
                          >
                            <Play className={cn("h-4 w-4", scanMutation.isPending && "animate-spin")} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTargetMutation.mutate(target.id);
                            }}
                            data-testid={`button-delete-${target.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {target.lastScannedAt && (
                        <div className="mt-3 text-[10px] text-muted-foreground">
                          Last scanned: {new Date(target.lastScannedAt).toLocaleString()}
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {selectedTargetId 
                ? `Results: ${targets?.find(t => t.id === selectedTargetId)?.name}`
                : "Select a target to view results"
              }
            </h2>
            {selectedTargetId && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!selectedTargetId ? (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center bg-muted/20">
              <LayoutDashboard className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <CardDescription>
                Choose a cloud environment from the list to see detailed security findings and recommendations.
              </CardDescription>
            </Card>
          ) : resultsLoading ? (
            <Card className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
              ))}
            </Card>
          ) : !filteredResults || filteredResults.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-4 opacity-20" />
              <CardTitle className="text-lg">No findings found</CardTitle>
              <CardDescription className="mt-2">
                {severityFilter !== "all" 
                  ? `No ${severityFilter} issues detected for this target.`
                  : "Great job! No security issues detected for this environment."
                }
              </CardDescription>
            </Card>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow key={result.id} data-testid={`row-finding-${result.id}`}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <div className="flex flex-col">
                          <span>{result.checkName}</span>
                          <span className="text-[10px] text-muted-foreground">{result.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex flex-col">
                          <span>{result.resourceId}</span>
                          <span className="text-[10px] text-muted-foreground opacity-70">{result.resourceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] capitalize font-semibold", severityConfig[result.severity]?.color)}
                        >
                          {result.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {result.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8">Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={cn("capitalize", severityConfig[result.severity]?.color)}>
                                  {result.severity}
                                </Badge>
                                <Badge variant="outline">{result.category}</Badge>
                              </div>
                              <DialogTitle>{result.checkName}</DialogTitle>
                              <DialogDescription className="font-mono text-xs">
                                Resource: {result.resourceId} ({result.resourceType})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <section>
                                <h4 className="text-sm font-semibold mb-1">Description</h4>
                                <p className="text-sm text-muted-foreground">{result.description}</p>
                              </section>
                              {result.recommendation && (
                                <section className="p-3 bg-primary/5 border border-primary/10 rounded-md">
                                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-1 text-primary">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Recommendation
                                  </h4>
                                  <p className="text-sm">{result.recommendation}</p>
                                </section>
                              )}
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" size="sm" data-testid={`button-suppress-${result.id}`}>Suppress</Button>
                                <Button size="sm" data-testid={`button-resolve-${result.id}`}>Mark Resolved</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
