import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Binary,
  CheckCircle2,
  Cpu,
  Eye,
  Lock,
  MousePointer2,
  Network,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react";
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

const BINARY_COLUMNS = [
  "0101100100110110",
  "1010011101010011",
  "0011011011001010",
  "1100100101110101",
  "0110101100101100",
  "1001110011010010",
  "0010110101101101",
  "1110001010010110",
  "0100111011010011",
  "1011010001101010",
];

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

function CinematicRuntime() {
  return (
    <section
      className="relative overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[#05030c] shadow-2xl shadow-purple-950/30"
      data-testid="zyra-eyes-cinematic-runtime"
    >
      <style>{`
        @keyframes zyra-scan { 0% { transform: translateY(-8px); opacity: .15; } 45% { opacity: 1; } 100% { transform: translateY(238px); opacity: .12; } }
        @keyframes zyra-flow { to { stroke-dashoffset: -72; } }
        @keyframes zyra-spin { to { transform: rotate(360deg); } }
        @keyframes zyra-breathe { 0%,100% { transform: scale(.92); opacity:.45; } 50% { transform: scale(1.08); opacity:1; } }
        @keyframes zyra-rain { 0% { transform: translateY(-110%); opacity:0; } 15% { opacity:.33; } 80% { opacity:.18; } 100% { transform: translateY(720px); opacity:0; } }
        @keyframes zyra-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
        @keyframes zyra-ping { 0% { transform: scale(.65); opacity:.8; } 100% { transform: scale(2.1); opacity:0; } }
        @keyframes zyra-grid { from { background-position: 0 0; } to { background-position: 40px 40px; } }
      `}</style>

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,246,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(45,246,255,.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          animation: "zyra-grid 9s linear infinite",
        }}
      />
      <div className="absolute -left-24 top-14 h-80 w-80 rounded-full bg-purple-600/20 blur-[110px]" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-64 w-96 rounded-full bg-fuchsia-500/10 blur-[110px]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {BINARY_COLUMNS.map((bits, index) => (
          <div
            key={bits + index}
            className="absolute top-0 font-mono text-[10px] leading-4 tracking-[0.28em] text-cyan-300/35"
            style={{
              left: `${4 + index * 10}%`,
              writingMode: "vertical-rl",
              animation: `zyra-rain ${5 + (index % 4)}s linear ${index * 0.42}s infinite`,
            }}
          >
            {bits.repeat(4)}
          </div>
        ))}
      </div>

      <div className="relative z-10 p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/10">LIVE PERCEPTION</Badge>
              <Badge className="border-purple-300/30 bg-purple-300/10 text-purple-200 hover:bg-purple-300/10">RVIA CORE</Badge>
              <Badge className="border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200 hover:bg-fuchsia-300/10">POLICY GATED</Badge>
              <Badge className="border-lime-300/30 bg-lime-300/10 text-lime-200 hover:bg-lime-300/10">EVIDENCE VERIFIED</Badge>
            </div>
            <div className="font-mono text-xs tracking-[0.42em] text-cyan-300">ZYRA // EYES // RVIA</div>
            <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              THE COMPUTER BECOMES A SIGNAL.
              <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                RVIA TURNS THE SIGNAL INTO A GOVERNED ACTION.
              </span>
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Watch pixels collapse into VA binary language, flow through GPT-DOUG-LLM-MAX + ZYRA + XUNIA + NXYZ, hit the US-CZ authorization gate, and terminate in an auditable action instead of an opaque AI guess.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:w-[330px]">
            {[
              ["6", "VISIBLE STAGES"],
              ["4", "CORE SYSTEMS"],
              ["1", "HUMAN GATE"],
              ["0", "AUTH BYPASSES"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className="font-mono text-2xl font-black text-white">{value}</div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[24px] border border-cyan-300/20 bg-[#07111b]/90 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs tracking-[0.25em] text-cyan-300">01 // SEE</div>
                <div className="mt-1 text-sm text-slate-400">screen → grayscale → signal</div>
              </div>
              <Eye className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="relative mt-5 h-60 overflow-hidden rounded-2xl border border-purple-400/20 bg-black">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_38%,rgba(45,246,255,.72),rgba(141,107,255,.24)_17%,transparent_40%)]" />
              <div className="absolute left-[62%] top-[30%] h-20 w-20 rounded-full border border-cyan-200/50 shadow-[0_0_60px_rgba(45,246,255,.7)]" style={{ animation: "zyra-breathe 2.8s ease-in-out infinite" }} />
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200 to-transparent shadow-[0_0_18px_rgba(45,246,255,1)]" style={{ animation: "zyra-scan 3.1s linear infinite" }} />
              <div className="absolute bottom-3 left-3 font-mono text-[10px] tracking-[0.2em] text-cyan-200/70">LOCAL SENSOR // FRAME ACTIVE</div>
            </div>

            <div className="mt-4 rounded-xl border border-lime-300/15 bg-black/55 p-3 font-mono text-xs leading-5 tracking-[0.25em] text-lime-300">
              0011000011110010<br />
              0011100111110010<br />
              0000011111000000<br />
              1100011111000011
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-fuchsia-300">
              <Activity className="h-3.5 w-3.5" /> VA_BINARY_STREAM = ACTIVE
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[24px] border border-purple-300/20 bg-[#0a0713]/90 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs tracking-[0.25em] text-purple-300">02 // RVIA CORE</div>
                <div className="mt-1 text-sm text-slate-400">reason → route → plan</div>
              </div>
              <Network className="h-5 w-5 text-purple-300" />
            </div>

            <div className="relative mx-auto mt-8 h-[390px] max-w-[430px]">
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-purple-300/30" style={{ animation: "zyra-spin 18s linear infinite" }} />
              <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 bg-purple-500/10 shadow-[0_0_80px_rgba(141,107,255,.28)]" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff_0%,#2df6ff_10%,#8d6bff_38%,transparent_70%)]" style={{ animation: "zyra-breathe 2.25s ease-in-out infinite" }} />
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-3xl font-black text-white">RVIA</div>
                <div className="mt-1 font-mono text-[9px] tracking-[0.18em] text-cyan-200">UNIFIED RUNTIME</div>
              </div>

              <CoreNode className="left-1/2 top-0 -translate-x-1/2" label="LLM" icon={Cpu} accent="fuchsia" delay="0s" />
              <CoreNode className="left-0 top-1/2 -translate-y-1/2" label="ZYRA" icon={ShieldCheck} accent="cyan" delay=".7s" />
              <CoreNode className="right-0 top-1/2 -translate-y-1/2" label="XUNIA" icon={Zap} accent="purple" delay="1.1s" />
              <CoreNode className="bottom-0 left-1/2 -translate-x-1/2" label="NXYZ" icon={Network} accent="lime" delay="1.7s" />

              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 430 390" aria-hidden="true">
                <g fill="none" stroke="url(#rviaLine)" strokeWidth="2" strokeDasharray="8 12" opacity="0.65" style={{ animation: "zyra-flow 1.2s linear infinite" }}>
                  <path d="M215 62 L215 132" />
                  <path d="M77 195 L147 195" />
                  <path d="M283 195 L353 195" />
                  <path d="M215 258 L215 328" />
                </g>
                <defs>
                  <linearGradient id="rviaLine" x1="0" x2="1">
                    <stop offset="0" stopColor="#8d6bff" />
                    <stop offset=".5" stopColor="#ff4fd8" />
                    <stop offset="1" stopColor="#2df6ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="rounded-[24px] border border-fuchsia-300/20 bg-[#0d0812]/90 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs tracking-[0.25em] text-fuchsia-300">03 // GOVERN + ACT</div>
                <div className="mt-1 text-sm text-slate-400">policy → approval → action → proof</div>
              </div>
              <Lock className="h-5 w-5 text-fuchsia-300" />
            </div>

            <div className="mt-5 space-y-3">
              <RuntimeStage
                icon={ShieldCheck}
                title="US-CZ POLICY GATE"
                detail="authorization required"
                tone="lime"
                live
              />
              <RuntimeStage
                icon={CheckCircle2}
                title="HUMAN APPROVAL"
                detail="one-time exact-action token"
                tone="fuchsia"
              />
              <RuntimeStage
                icon={MousePointer2}
                title="ACTION VECTOR"
                detail="MOVE(1422, 438)"
                tone="cyan"
                moving
              />
              <RuntimeStage
                icon={Activity}
                title="EVIDENCE HASH"
                detail="verified postcondition"
                tone="lime"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="font-mono text-[10px] tracking-[0.2em] text-slate-500">EXECUTION PRINCIPLE</div>
              <div className="mt-2 text-lg font-bold text-white">Capability is not authority.</div>
              <div className="mt-2 text-xs leading-5 text-slate-400">Every consequential path remains bounded by ownership, authorization, policy, human approval and postcondition evidence.</div>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-slate-500">
            <Zap className="h-3.5 w-3.5 text-cyan-300" /> REAL-TIME OPERATING LOOP
          </div>
          <div className="flex min-w-max items-center gap-2 overflow-x-auto pb-1 font-mono text-xs font-bold text-slate-200 sm:text-sm">
            {[
              "OBSERVE",
              "ENCODE",
              "REASON",
              "AUTHORIZE",
              "ACT",
              "VERIFY",
              "REMEMBER",
            ].map((stage, index, stages) => (
              <div key={stage} className="flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">{stage}</span>
                {index < stages.length - 1 && <span className="text-cyan-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CoreNode({
  className,
  label,
  icon: Icon,
  accent,
  delay,
}: {
  className: string;
  label: string;
  icon: any;
  accent: "cyan" | "fuchsia" | "purple" | "lime";
  delay: string;
}) {
  const tones = {
    cyan: "border-cyan-300/50 text-cyan-200 shadow-cyan-400/20",
    fuchsia: "border-fuchsia-300/50 text-fuchsia-200 shadow-fuchsia-400/20",
    purple: "border-purple-300/50 text-purple-200 shadow-purple-400/20",
    lime: "border-lime-300/50 text-lime-200 shadow-lime-400/20",
  };
  return (
    <div className={`absolute ${className}`} style={{ animation: `zyra-float 3.2s ease-in-out ${delay} infinite` }}>
      <div className={`relative flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full border bg-black/80 shadow-lg ${tones[accent]}`}>
        <div className="absolute inset-0 rounded-full border border-current opacity-25" style={{ animation: `zyra-ping 2.8s ease-out ${delay} infinite` }} />
        <Icon className="h-4 w-4" />
        <span className="mt-1 font-mono text-[9px] font-bold tracking-[0.1em]">{label}</span>
      </div>
    </div>
  );
}

function RuntimeStage({
  icon: Icon,
  title,
  detail,
  tone,
  live = false,
  moving = false,
}: {
  icon: any;
  title: string;
  detail: string;
  tone: "cyan" | "fuchsia" | "lime";
  live?: boolean;
  moving?: boolean;
}) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/[0.055] text-cyan-200",
    fuchsia: "border-fuchsia-300/20 bg-fuchsia-300/[0.055] text-fuchsia-200",
    lime: "border-lime-300/20 bg-lime-300/[0.055] text-lime-200",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          {live && <span className="absolute inset-0 rounded-full bg-lime-300/60" style={{ animation: "zyra-ping 1.8s ease-out infinite" }} />}
          <Icon className="relative h-5 w-5" />
        </div>
        <div>
          <div className="font-mono text-xs font-bold tracking-[0.12em]">{title}</div>
          <div className="mt-1 font-mono text-[10px] text-slate-400">{detail}</div>
        </div>
      </div>
      {moving && (
        <div className="mt-3 h-[2px] overflow-hidden rounded-full bg-cyan-300/15">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-200 to-transparent shadow-[0_0_12px_rgba(45,246,255,.9)]" style={{ animation: "zyra-flow 1s linear infinite" }} />
        </div>
      )}
    </div>
  );
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
    <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8" data-testid="zyra-eyes-page">
      <CinematicRuntime />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <Badge variant="outline">VA / RVIA</Badge>
            <Badge variant="secondary">SIMULATION FIRST</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Interactive ZYRA Eyes Lab</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Move from the cinematic architecture into a real binary simulation: threshold a sampled frame, generate a VA grid, let RVIA propose an exact action, and inspect the policy boundary.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2 font-mono text-xs text-muted-foreground">
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
          <Card key={title} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Icon className="mb-1 h-5 w-5 text-primary" />
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
              <Play className="h-4 w-4" />
              {planMutation.isPending ? "Running RVIA…" : "Run simulation"}
            </Button>

            <div className="min-h-52 overflow-x-auto rounded-xl border bg-black/90 p-4 shadow-inner shadow-cyan-500/5">
              <div className="whitespace-pre font-mono text-xs leading-5 tracking-[0.35em] text-green-400 sm:text-sm">
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
                    <p className="mt-2 text-muted-foreground">{result.rationale}</p>
                  </div>
                  <div className="break-all font-mono text-xs text-muted-foreground">
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
              <p className="pt-2 text-xs text-muted-foreground">
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
      <div className="mt-1 font-mono font-semibold">{value}</div>
    </div>
  );
}

function PolicyRow({ label, ok, warning = false }: { label: string; ok: boolean; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span>{label}</span>
      <Badge variant={ok && !warning ? "default" : "outline"}>{ok ? (warning ? "ENABLED" : "YES") : "NO"}</Badge>
    </div>
  );
}
