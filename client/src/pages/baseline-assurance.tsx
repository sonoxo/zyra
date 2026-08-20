import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Radio,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
  CircleHelp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface ExpectedSignal {
  field: string;
  operator: "equals" | "contains" | "endsWith";
  value: string;
}

interface BaselineScenario {
  scenarioId: string;
  name: string;
  description: string;
  category: "process" | "identity" | "file" | "network";
  expectedSignals: ExpectedSignal[];
  safeSyntheticEvent: Record<string, string>;
  detectionTemplate: Record<string, unknown>;
}

interface ScenariosResponse {
  dataMode: "SIMULATED";
  executionMode: "DEFENSIVE_VALIDATION_ONLY";
  scenarios: BaselineScenario[];
}

interface StageResult {
  stage: "SYNTHETIC_TRIGGER" | "TELEMETRY_VERIFICATION" | "DETECTION_SCORING" | "GAP_PATCHING";
  status: "PASS" | "FAIL" | "UNKNOWN";
  evidence: string[];
}

interface EvaluationResponse {
  scenario: BaselineScenario;
  syntheticTrigger: Record<string, string>;
  evaluation: {
    scenarioId: string;
    score: number;
    state: "OBSERVED" | "MISSING" | "UNKNOWN";
    stages: StageResult[];
    matchedSignals: number;
    expectedSignals: number;
    suggestedDetectionRule: Record<string, unknown> | null;
    limitations: string[];
  };
}

const stageMeta = {
  SYNTHETIC_TRIGGER: { label: "Synthetic Trigger", icon: FlaskConical },
  TELEMETRY_VERIFICATION: { label: "Telemetry Verification", icon: Radio },
  DETECTION_SCORING: { label: "Detection Scoring", icon: Gauge },
  GAP_PATCHING: { label: "Gap Patching", icon: Wrench },
};

function statusBadge(status: StageResult["status"]) {
  if (status === "PASS") {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">PASS</Badge>;
  }
  if (status === "FAIL") {
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">GAP</Badge>;
  }
  return <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">UNKNOWN</Badge>;
}

export default function BaselineAssurancePage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EvaluationResponse | null>(null);

  const { data, isLoading } = useQuery<ScenariosResponse>({
    queryKey: ["/api/bas/scenarios"],
  });

  const scenarios = data?.scenarios ?? [];
  const selected = useMemo(
    () => scenarios.find((item) => item.scenarioId === selectedScenarioId) ?? scenarios[0],
    [scenarios, selectedScenarioId],
  );

  const evaluateMutation = useMutation({
    mutationFn: async ({ scenario, withTelemetry }: { scenario: BaselineScenario; withTelemetry: boolean }) => {
      const body = {
        scenarioId: scenario.scenarioId,
        observations: withTelemetry
          ? [
              {
                source: "zyra-bas-local-fixture",
                observedAt: new Date().toISOString(),
                fields: scenario.safeSyntheticEvent,
              },
            ]
          : [],
      };
      const response = await apiRequest("POST", "/api/bas/evaluate", body);
      return (await response.json()) as EvaluationResponse;
    },
    onSuccess: (result) => setLastResult(result),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Activity className="w-5 h-5 animate-pulse" />
          Loading detection assurance...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="baseline-assurance-page">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400">ZYRA BAS</Badge>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">DEFENSIVE VALIDATION ONLY</Badge>
            <Badge variant="outline">SIMULATED</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Baseline Assurance Pipeline</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Continuous defensive validation for synthetic triggers, telemetry visibility, detection scoring, and analyst-reviewed gap patching.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          No exploits, destructive actions, or adversary execution are performed.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {Object.entries(stageMeta).map(([key, meta], index) => {
          const Icon = meta.icon;
          return (
            <Card key={key} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <p className="font-medium mt-4">{meta.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenarios.map((scenario) => {
              const active = selected?.scenarioId === scenario.scenarioId;
              return (
                <button
                  key={scenario.scenarioId}
                  type="button"
                  onClick={() => setSelectedScenarioId(scenario.scenarioId)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active ? "border-cyan-500/50 bg-cyan-500/10" : "hover:bg-muted/40"
                  }`}
                  data-testid={`bas-scenario-${scenario.scenarioId}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{scenario.name}</span>
                    <Badge variant="outline" className="uppercase text-[10px]">{scenario.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{scenario.description}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selected && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>{selected.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">{selected.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{selected.expectedSignals.length} EXPECTED SIGNALS</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Safe synthetic fixture
                  </div>
                  <pre className="overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(selected.safeSyntheticEvent, null, 2)}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => evaluateMutation.mutate({ scenario: selected, withTelemetry: true })}
                    disabled={evaluateMutation.isPending}
                    data-testid="bas-evaluate-fixture"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Validate With Synthetic Telemetry
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => evaluateMutation.mutate({ scenario: selected, withTelemetry: false })}
                    disabled={evaluateMutation.isPending}
                    data-testid="bas-evaluate-no-telemetry"
                  >
                    <CircleHelp className="w-4 h-4 mr-2" />
                    Test Missing Telemetry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {lastResult && (
            <Card data-testid="bas-evaluation-result">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base">Detection Assurance Result</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{lastResult.evaluation.state}</Badge>
                    <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
                      {lastResult.evaluation.score}% COVERAGE
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {lastResult.evaluation.stages.map((stage) => {
                    const meta = stageMeta[stage.stage];
                    const Icon = meta.icon;
                    return (
                      <div key={stage.stage} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium">{meta.label}</span>
                          </div>
                          {statusBadge(stage.status)}
                        </div>
                        <div className="mt-3 space-y-1">
                          {stage.evidence.map((item) => (
                            <p key={item} className="text-xs text-muted-foreground">{item}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {lastResult.evaluation.suggestedDetectionRule && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-300 mb-3">
                      <Wrench className="w-4 h-4" />
                      Analyst Review: Suggested Detection Template
                    </div>
                    <pre className="overflow-x-auto text-xs text-muted-foreground">
                      {JSON.stringify(lastResult.evaluation.suggestedDetectionRule, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Truth Contract</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {lastResult.evaluation.limitations.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        {lastResult.evaluation.state === "OBSERVED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
                        ) : lastResult.evaluation.state === "MISSING" ? (
                          <XCircle className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />
                        ) : (
                          <CircleHelp className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                        )}
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
