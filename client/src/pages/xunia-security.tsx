import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Radar,
  Crosshair,
  FlaskConical,
  LockKeyhole,
  Loader2,
  Play,
  Square,
  Repeat2,
  Wifi,
  WifiOff,
  TimerReset,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TargetType = "url" | "host" | "cidr" | "path" | "image" | "cloud";
type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface CatalogTool {
  id: string;
  name: string;
  check: string;
  risk: "PASSIVE" | "DISCOVERY" | "SAFE_ACTIVE" | "LAB_ACTIVE";
  freeOpenSource: true;
  targetTypes: TargetType[];
  phases: string[];
}

interface CatalogResponse {
  platform: string;
  modes: Array<"ASSESS" | "PENTEST" | "SIMULATE">;
  destructiveActions: "DENIED";
  schemaVersion: string;
  tools: CatalogTool[];
}

interface SecurityManifest {
  schemaVersion: "xunia.security.engagement/v1";
  engagementId: string;
  owner: string;
  mode: "ASSESS" | "PENTEST" | "SIMULATE";
  startsAt: string;
  endsAt: string;
  targets: Array<{ type: TargetType; value: string }>;
  exclusions: Array<{ type: TargetType; value: string }>;
  allowedChecks: string[];
  maxRequestsPerSecond: number;
  maxConcurrency: number;
  destructiveAllowed: false;
  authorizationReference: string;
}

interface PlanResponse {
  platform: string;
  plan: {
    engagementId: string;
    mode: string;
    authorizationReference: string;
    destructiveActions: "DENIED";
    steps: Array<{ order: number; tool: CatalogTool; target: { type: TargetType; value: string }; status: "PLANNED" }>;
  };
}

interface RuntimeHealth {
  status: string;
  platform?: string;
  workers?: number;
  runtime?: string;
  startCommand?: string;
}

interface RuntimeJob {
  id: string;
  engagement_id: string;
  status: JobStatus;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  parent_job_id?: string | null;
  error?: string | null;
  manifest: SecurityManifest;
}

const modeCards = [
  { mode: "ASSESS", icon: Radar, description: "Passive and discovery checks only" },
  { mode: "PENTEST", icon: Crosshair, description: "Authorized safe-active validation" },
  { mode: "SIMULATE", icon: FlaskConical, description: "Lab-oriented security simulation" },
] as const;

const targetPlaceholders: Record<TargetType, string> = {
  url: "https://staging.example.com",
  host: "app.staging.example.com",
  cidr: "10.20.0.0/24",
  path: "/workspace/repository",
  image: "registry.example.com/app:staging",
  cloud: "aws:security-audit-account",
};

function statusVariant(status: JobStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "RUNNING") return "secondary";
  return "outline";
}

export default function XuniaSecurityPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"ASSESS" | "PENTEST" | "SIMULATE">("ASSESS");
  const [targetType, setTargetType] = useState<TargetType>("url");
  const [target, setTarget] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [lastManifest, setLastManifest] = useState<SecurityManifest | null>(null);
  const [scheduleMinutes, setScheduleMinutes] = useState("15");

  const { data: catalog, isLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/xunia/security/catalog"],
  });

  const { data: health } = useQuery<RuntimeHealth>({
    queryKey: ["/api/xunia/security/runtime/health"],
    retry: false,
    refetchInterval: 5000,
  });

  const { data: jobsData } = useQuery<{ jobs: RuntimeJob[] }>({
    queryKey: ["/api/xunia/security/runtime/jobs"],
    retry: false,
    refetchInterval: 1000,
  });

  const allowedChecks = useMemo(() => {
    if (!catalog) return [];
    return catalog.tools
      .filter((tool) => tool.targetTypes.includes(targetType))
      .filter((tool) => mode !== "ASSESS" || tool.risk === "PASSIVE" || tool.risk === "DISCOVERY")
      .filter((tool) => mode !== "PENTEST" || tool.risk !== "LAB_ACTIVE")
      .map((tool) => tool.check);
  }, [catalog, mode, targetType]);

  const buildManifest = (): SecurityManifest => {
    if (!target.trim()) throw new Error("Authorized target is required");
    if (!authorizationReference.trim()) throw new Error("Authorization reference is required");
    if (!allowedChecks.length) throw new Error("No compatible security tools are available for this target and mode");
    const now = new Date();
    return {
      schemaVersion: "xunia.security.engagement/v1",
      engagementId: `zyra-${Date.now()}`,
      owner: "zyra-authenticated-operator",
      mode,
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      targets: [{ type: targetType, value: target.trim() }],
      exclusions: [],
      allowedChecks,
      maxRequestsPerSecond: 10,
      maxConcurrency: 4,
      destructiveAllowed: false,
      authorizationReference: authorizationReference.trim(),
    };
  };

  const createPlan = useMutation({
    mutationFn: async () => {
      const body = buildManifest();
      const response = await apiRequest("POST", "/api/xunia/security/plan", body);
      const result = (await response.json()) as PlanResponse;
      setLastManifest(body);
      return result;
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const body = lastManifest || buildManifest();
      const response = await apiRequest("POST", "/api/xunia/security/runtime/jobs", body);
      setLastManifest(body);
      return response.json() as Promise<{ jobId: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/xunia/security/runtime/jobs"] }),
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/xunia/security/runtime/jobs/${jobId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/xunia/security/runtime/jobs"] }),
  });

  const retestJob = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/xunia/security/runtime/jobs/${jobId}/retest`, {});
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/xunia/security/runtime/jobs"] }),
  });

  const scheduleRun = useMutation({
    mutationFn: async () => {
      const body = lastManifest || buildManifest();
      const minutes = Number(scheduleMinutes);
      if (!Number.isFinite(minutes) || minutes < 1) throw new Error("Schedule must be at least one minute");
      const response = await apiRequest("POST", "/api/xunia/security/runtime/schedules", {
        name: `${body.mode} ${body.targets[0].type} monitor`,
        intervalSeconds: Math.round(minutes * 60),
        manifest: body,
      });
      setLastManifest(body);
      return response.json();
    },
  });

  const jobs = jobsData?.jobs || [];
  const runtimeOnline = health?.status === "ok";

  return (
    <div className="p-6 space-y-6" data-testid="xunia-security-command-center">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">XUNIA Security Command Center</h1>
            <p className="text-muted-foreground">Free local realtime assessment, authorized pentesting, and retesting</p>
          </div>
        </div>
        <Badge variant={runtimeOnline ? "default" : "outline"} className="w-fit gap-2">
          {runtimeOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          Runtime {runtimeOnline ? `online · ${health?.workers || 0} workers` : "offline"}
        </Badge>
      </div>

      <Alert>
        <LockKeyhole className="h-4 w-4" />
        <AlertTitle>Authorization enforced by design</AlertTitle>
        <AlertDescription>
          Every run requires explicit typed scope and an authorization reference. The local worker reauthorizes each step, runs without a shell, and keeps destructive actions disabled.
          {!runtimeOnline ? " Start the free worker with: python xunia_realtime_runtime.py" : ""}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        {modeCards.map(({ mode: value, icon: Icon, description }) => (
          <Card key={value} className={mode === value ? "border-primary shadow-sm" : "cursor-pointer"} onClick={() => setMode(value)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5" /> {value}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Scope</CardTitle>
            <CardDescription>Plan, run, or schedule a bounded local security engagement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSESS">ASSESS</SelectItem>
                  <SelectItem value="PENTEST">PENTEST</SelectItem>
                  <SelectItem value="SIMULATE">SIMULATE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-type">Target class</Label>
              <Select value={targetType} onValueChange={(value) => { setTargetType(value as TargetType); setTarget(""); setLastManifest(null); }}>
                <SelectTrigger id="target-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">Web URL</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="cidr">CIDR</SelectItem>
                  <SelectItem value="path">Local source path</SelectItem>
                  <SelectItem value="image">Container image</SelectItem>
                  <SelectItem value="cloud">Cloud context</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Authorized target</Label>
              <Input id="target" value={target} onChange={(event) => { setTarget(event.target.value); setLastManifest(null); }} placeholder={targetPlaceholders[targetType]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorization">Authorization reference</Label>
              <Input id="authorization" value={authorizationReference} onChange={(event) => { setAuthorizationReference(event.target.value); setLastManifest(null); }} placeholder="SOW / written approval / local owner authorization" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={createPlan.isPending || isLoading} onClick={() => createPlan.mutate()}>
                {createPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Build Plan
              </Button>
              <Button disabled={!runtimeOnline || runNow.isPending || isLoading} onClick={() => runNow.mutate()}>
                {runNow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Run Now
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={scheduleMinutes} onChange={(event) => setScheduleMinutes(event.target.value)} inputMode="numeric" aria-label="Schedule minutes" />
              <Button variant="secondary" disabled={!runtimeOnline || scheduleRun.isPending} onClick={() => scheduleRun.mutate()}>
                <TimerReset className="mr-2 h-4 w-4" /> Every min
              </Button>
            </div>
            {[createPlan.error, runNow.error, scheduleRun.error].filter(Boolean).map((error, index) => (
              <p key={index} className="text-sm text-destructive">{(error as Error).message}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Free / Open-Source Security Fleet</CardTitle>
            <CardDescription>{catalog ? `${catalog.tools.length} adapters registered · compatible tools highlighted` : "Loading catalog..."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(catalog?.tools || []).map((tool) => (
                <Badge key={tool.id} variant={allowedChecks.includes(tool.check) ? "default" : "outline"}>
                  {tool.name} · {tool.risk}
                </Badge>
              ))}
            </div>

            {createPlan.data ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">Plan {createPlan.data.plan.engagementId}</p>
                    <p className="text-sm text-muted-foreground">{createPlan.data.plan.mode} · {createPlan.data.plan.authorizationReference}</p>
                  </div>
                  <Badge variant="outline">Destructive: {createPlan.data.plan.destructiveActions}</Badge>
                </div>
                <div className="space-y-2">
                  {createPlan.data.plan.steps.map((step) => (
                    <div key={`${step.order}-${step.tool.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span><strong>{step.order}. {step.tool.name}</strong> · {step.tool.check} · {step.target.type}</span>
                      <Badge variant="secondary">{step.tool.risk}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Build a plan to preview the exact governed steps before execution.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Realtime Worker Queue</CardTitle>
          <CardDescription>Refreshes every second from the local SQLite-backed runtime.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.slice(0, 20).map((job) => (
            <div key={job.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                  <strong className="truncate text-sm">{job.engagement_id}</strong>
                  <span className="text-xs text-muted-foreground">{job.manifest.mode} · {job.manifest.targets[0]?.type}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{job.manifest.targets[0]?.value}</p>
                {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
              </div>
              <div className="flex gap-2">
                {(job.status === "QUEUED" || job.status === "RUNNING") ? (
                  <Button size="sm" variant="outline" onClick={() => cancelJob.mutate(job.id)} disabled={cancelJob.isPending}>
                    <Square className="mr-1 h-3.5 w-3.5" /> Cancel
                  </Button>
                ) : null}
                {(job.status === "COMPLETED" || job.status === "FAILED") ? (
                  <Button size="sm" variant="outline" onClick={() => retestJob.mutate(job.id)} disabled={retestJob.isPending}>
                    <Repeat2 className="mr-1 h-3.5 w-3.5" /> Retest
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!jobs.length ? <p className="text-sm text-muted-foreground">No local runtime jobs yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
