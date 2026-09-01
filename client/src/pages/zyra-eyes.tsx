import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Binary, Eye, MousePointer2, Play, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

type Action = { type: "MOVE" | "LEFT_CLICK"; x: number; y: number };
type PlanResult = {
  vision: {
    rows: string[];
    density: number;
    transitions: number;
    centroid: { x: number; y: number } | null;
    brightest: { x: number; y: number; value: number };
    darkest: { x: number; y: number; value: number };
    frameHash: string;
  };
  action: Action;
  rationale: string;
};

const SAMPLE_WIDTH = 16;
const SAMPLE_HEIGHT = 10;

function samplePixels(): number[] {
  const values: number[] = [];
  for (let y = 0; y < SAMPLE_HEIGHT; y += 1) {
    for (let x = 0; x < SAMPLE_WIDTH; x += 1) {
      const dx = x - 10;
      const dy = y - 4;
      const hotspot = Math.max(0, 255 - (dx * dx + dy * dy) * 20);
      const stripe = x % 5 === 0 ? 65 : 0;
      values.push(Math.min(255, 28 + hotspot + stripe));
    }
  }
  return values;
}

export default function ZyraEyesPage() {
  const [threshold, setThreshold] = useState(128);
  const [goal, setGoal] = useState<"BRIGHTEST_REGION" | "DARKEST_REGION" | "CENTER_OF_MASS">("BRIGHTEST_REGION");
  const [result, setResult] = useState<PlanResult | null>(null);
  const pixels = useMemo(samplePixels, []);

  const { data: status } = useQuery<any>({ queryKey: ["/api/zyra-eyes/status"] });

  const planMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/zyra-eyes/plan", {
        width: SAMPLE_WIDTH,
        height: SAMPLE_HEIGHT,
        pixels,
        threshold,
        goal,
        screenWidth: 1920,
        screenHeight: 1080,
        action: "MOVE",
      });
      return response.json() as Promise<PlanResult>;
    },
    onSuccess: setResult,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="zyra-eyes-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-6 h-6 text-primary" />
            <Badge variant="outline">VA / RVIA</Badge>
            <Badge variant="secondary">SIMULATION FIRST</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ZYRA Eyes — Daredevil Binary Runtime</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Turn pixels into a binary sensory language, let RVIA reason over the pattern, pass the plan through US-CZ policy, then simulate or explicitly approve a local action.
          </p>
        </div>
        <div className="text-xs text-muted-foreground border rounded-lg px-3 py-2 font-mono">
          GOD_MODE = owner-supervised maximum capability, never a policy bypass
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["1. SEE", "Pixels become grayscale samples", Eye],
          ["2. ENCODE", "VA converts samples into 0 / 1", Binary],
          ["3. GOVERN", "ZYRA + US-CZ gate the plan", ShieldCheck],
          ["4. ACT", "Simulation or approved local action", MousePointer2],
        ].map(([title, text, Icon]: any) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <Icon className="w-5 h-5 text-primary mb-1" />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Binary Vision Simulator</CardTitle>
            <CardDescription>Sample frame → threshold → 16 × 10 VA grid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Threshold: {threshold}</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Goal</span>
                <select
                  value={goal}
                  onChange={(event) => setGoal(event.target.value as typeof goal)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="BRIGHTEST_REGION">Brightest region</option>
                  <option value="DARKEST_REGION">Darkest region</option>
                  <option value="CENTER_OF_MASS">Binary center of mass</option>
                </select>
              </label>
            </div>

            <Button onClick={() => planMutation.mutate()} disabled={planMutation.isPending} className="gap-2">
              <Play className="w-4 h-4" />
              {planMutation.isPending ? "Running RVIA…" : "Run simulation"}
            </Button>

            <div className="rounded-xl border bg-black/90 p-4 overflow-x-auto min-h-52">
              <div className="font-mono text-xs sm:text-sm leading-5 tracking-[0.35em] text-green-400 whitespace-pre">
                {(result?.vision.rows ?? Array.from({ length: SAMPLE_HEIGHT }, () => "·".repeat(SAMPLE_WIDTH))).join("\n")}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>RVIA plan</CardTitle>
              <CardDescription>What the runtime inferred from the binary field</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {result ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Binary density" value={`${Math.round(result.vision.density * 100)}%`} />
                    <Metric label="Transitions" value={String(result.vision.transitions)} />
                    <Metric label="Target X" value={String(result.action.x)} />
                    <Metric label="Target Y" value={String(result.action.y)} />
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="font-medium">Proposed action</div>
                    <code className="text-primary">{result.action.type}({result.action.x}, {result.action.y})</code>
                    <p className="text-muted-foreground mt-2">{result.rationale}</p>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground break-all">
                    frame: {result.vision.frameHash}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Run the simulator to generate a plan.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Control boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <PolicyRow label="Local only" ok={status?.policy?.localOnly !== false} />
              <PolicyRow label="Simulation default" ok={status?.policy?.simulationDefault !== false} />
              <PolicyRow label="Human approval required" ok={status?.policy?.humanApprovalRequired !== false} />
              <PolicyRow label="Native control enabled" ok={status?.nativeEnabled === true} warning />
              <p className="text-xs text-muted-foreground pt-2">
                Native desktop control is isolated in the local Python plugin and requires explicit owner authorization on each run.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold mt-1">{value}</div>
    </div>
  );
}

function PolicyRow({ label, ok, warning = false }: { label: string; ok: boolean; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 py-2">
      <span>{label}</span>
      <Badge variant={ok && !warning ? "default" : "outline"}>{ok ? (warning ? "ENABLED" : "YES") : "NO"}</Badge>
    </div>
  );
}
