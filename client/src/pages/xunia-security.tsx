import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck, Radar, Crosshair, FlaskConical, LockKeyhole, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TargetType = "url" | "host" | "cidr" | "path" | "image" | "cloud";

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

export default function XuniaSecurityPage() {
  const [mode, setMode] = useState<"ASSESS" | "PENTEST" | "SIMULATE">("ASSESS");
  const [targetType, setTargetType] = useState<TargetType>("url");
  const [target, setTarget] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState("");

  const { data: catalog, isLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/xunia/security/catalog"],
  });

  const allowedChecks = useMemo(() => {
    if (!catalog) return [];
    return catalog.tools
      .filter((tool) => tool.targetTypes.includes(targetType))
      .filter((tool) => mode !== "ASSESS" || tool.risk === "PASSIVE" || tool.risk === "DISCOVERY")
      .filter((tool) => mode !== "PENTEST" || tool.risk !== "LAB_ACTIVE")
      .map((tool) => tool.check);
  }, [catalog, mode, targetType]);

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!target.trim()) throw new Error("Authorized target is required");
      if (!authorizationReference.trim()) throw new Error("Authorization reference is required");
      if (!allowedChecks.length) throw new Error("No compatible security tools are available for this target and mode");
      const now = new Date();
      const endsAt = new Date(now.getTime() + 60 * 60 * 1000);
      const body = {
        schemaVersion: "xunia.security.engagement/v1",
        engagementId: `zyra-${Date.now()}`,
        owner: "zyra-authenticated-operator",
        mode,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        targets: [{ type: targetType, value: target.trim() }],
        exclusions: [],
        allowedChecks,
        maxRequestsPerSecond: 10,
        maxConcurrency: 4,
        destructiveAllowed: false,
        authorizationReference: authorizationReference.trim(),
      };
      const response = await apiRequest("POST", "/api/xunia/security/plan", body);
      return (await response.json()) as PlanResponse;
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="xunia-security-command-center">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">XUNIA Security Command Center</h1>
            <p className="text-muted-foreground">Governed assessment, authorized pentesting, and lab simulation</p>
          </div>
        </div>
      </div>

      <Alert>
        <LockKeyhole className="h-4 w-4" />
        <AlertTitle>Authorization enforced by design</AlertTitle>
        <AlertDescription>
          Every plan requires an engagement window, explicit typed target scope, an authorization reference, and deny-by-default destructive controls.
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
            <CardDescription>Create a non-destructive security execution plan.</CardDescription>
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
              <Select value={targetType} onValueChange={(value) => { setTargetType(value as TargetType); setTarget(""); }}>
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
              <Input id="target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder={targetPlaceholders[targetType]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorization">Authorization reference</Label>
              <Input id="authorization" value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} placeholder="SOW-2026-001 / written approval ID" />
            </div>
            <Button className="w-full" disabled={createPlan.isPending || isLoading} onClick={() => createPlan.mutate()}>
              {createPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Authorize & Build Plan
            </Button>
            {createPlan.error ? <p className="text-sm text-destructive">{createPlan.error.message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Free / Open-Source Security Fleet</CardTitle>
            <CardDescription>{catalog ? `${catalog.tools.length} adapters registered` : "Loading catalog..."}</CardDescription>
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
                  {createPlan.data.plan.steps.length === 0 ? <p className="text-sm text-muted-foreground">No authorized tools matched this mode and target class.</p> : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Create an engagement plan to see the exact tools Zyra is allowed to invoke.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
