import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Cpu,
  Database,
  Globe2,
  MapPinned,
  Orbit,
  RadioTower,
  Satellite,
  Shield,
  ShieldCheck,
  Snowflake,
  TriangleAlert,
  Workflow,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const glyphs = "01ZXRYAEGIS<>[]{}//\\*+";

function MatrixBackdrop() {
  const columns = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 24 }, (_, j) => glyphs[(i * 7 + j * 11) % glyphs.length]).join("\n"),
      delay: `${(i % 9) * 0.17}s`,
      duration: `${4 + (i % 6) * 0.65}s`,
      opacity: 0.08 + (i % 5) * 0.025,
    })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.08),transparent_34%)]" />
      <div className="absolute inset-0 flex justify-between px-2 font-mono text-[10px] leading-4 text-emerald-400">
        {columns.map((column) => (
          <pre
            key={column.id}
            className="whitespace-pre text-center animate-pulse"
            style={{ animationDelay: column.delay, animationDuration: column.duration, opacity: column.opacity }}
          >
            {column.text}
          </pre>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
    </div>
  );
}

const statusTiles = [
  { label: "Golden Shield", value: "ENFORCED", icon: ShieldCheck, tone: "text-emerald-300" },
  { label: "Mission Twin", value: "STANDBY", icon: Workflow, tone: "text-cyan-300" },
  { label: "ETHER", value: "EVIDENCE READY", icon: Database, tone: "text-violet-300" },
  { label: "MITO", value: "HUMAN-GATED", icon: Cpu, tone: "text-amber-300" },
];

const safeFeeds = [
  {
    title: "Public Geospatial Scout",
    icon: MapPinned,
    status: "SAFE DATA MODE",
    description: "Public, non-sensitive geospatial overlays for infrastructure resilience, weather, logistics, research facilities, and simulated exercises.",
  },
  {
    title: "Orbital Awareness",
    icon: Satellite,
    status: "PUBLIC / SIMULATED",
    description: "Visualization-ready orbital context for public ephemeris and simulated satellites. No targeting, weapon cueing, or protected mission telemetry.",
  },
  {
    title: "Antarctica Research Watch",
    icon: Snowflake,
    status: "RESEARCH MODE",
    description: "Climate, communications, logistics, and public research-station awareness for continuity planning and scientific operations.",
  },
  {
    title: "Critical Infrastructure",
    icon: Zap,
    status: "RESILIENCE ONLY",
    description: "High-level dependency and continuity modeling for authorized infrastructure data without exposing exploitable operational details.",
  },
];

const eventStream = [
  "[ETHER] War Room interface initialized",
  "[SHIELD] Execution path requires proof-carrying action",
  "[SCOUT] Geospatial layer restricted to public/simulated data",
  "[ORBIT] Orbital view running in awareness-only mode",
  "[AEGIS] Targeting / weapon-control pathways unavailable",
  "[MITO] Defensive execution remains human-authorized",
];

export default function WarRoomPage() {
  const [mode, setMode] = useState<"LIVE" | "SIMULATION">("SIMULATION");

  return (
    <div className="relative min-h-full overflow-hidden bg-[#020706] text-foreground">
      <MatrixBackdrop />

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <div className="rounded-2xl border border-emerald-400/20 bg-black/55 p-5 shadow-[0_0_50px_rgba(16,185,129,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10">
                  AEGIS WAR ROOM
                </Badge>
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">
                  DEFENSIVE DECISION SUPPORT
                </Badge>
                <Badge variant="outline" className="border-amber-400/30 text-amber-300">
                  HUMAN AUTHORITY REQUIRED
                </Badge>
              </div>
              <h1 className="font-mono text-2xl font-black tracking-tight text-emerald-100 md:text-4xl">
                XRAYCLOUD // COMMAND RESILIENCE MATRIX
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-emerald-100/65 md:text-base">
                Cyberpunk command visualization for defensive mission assurance, infrastructure resilience, public geospatial awareness,
                evidence, continuity planning, and governed AI recommendations.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-black/70 p-2">
              <Button
                size="sm"
                variant={mode === "SIMULATION" ? "default" : "outline"}
                onClick={() => setMode("SIMULATION")}
                className={cn(mode === "SIMULATION" && "bg-emerald-500 text-black hover:bg-emerald-400")}
              >
                SIMULATION
              </Button>
              <Button
                size="sm"
                variant={mode === "LIVE" ? "default" : "outline"}
                onClick={() => setMode("LIVE")}
                className={cn(mode === "LIVE" && "bg-cyan-500 text-black hover:bg-cyan-400")}
              >
                LIVE VIEW
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {mode === "SIMULATION"
              ? "Simulation mode: visualization uses demonstration state only; no external systems are controlled."
              : "Live view is display-only until verified authorized data connectors are configured; unknown data remains UNKNOWN."}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusTiles.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
                  <div className={cn("mt-1 font-mono text-sm font-bold", tone)}>{value}</div>
                </div>
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-2">
                  <Icon className={cn("h-5 w-5", tone)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-cyan-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader className="border-b border-cyan-400/10">
              <CardTitle className="flex items-center gap-2 font-mono text-cyan-200">
                <Globe2 className="h-5 w-5" /> Scout // Geospatial + Orbital Awareness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative min-h-[430px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.10),transparent_50%),linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]">
                <div className="absolute inset-6 rounded-full border border-cyan-400/15" />
                <div className="absolute inset-20 rounded-full border border-emerald-400/10" />
                <div className="absolute left-[48%] top-[43%] h-28 w-28 rounded-full border border-cyan-300/20 bg-cyan-400/5 shadow-[0_0_60px_rgba(34,211,238,0.12)]" />
                <div className="absolute left-[51%] top-[46%] h-16 w-16 rounded-full border border-emerald-300/20 bg-emerald-400/5" />

                {[
                  ["PUBLIC SATCOM", "18%", "24%", Satellite],
                  ["ANTARCTICA RESEARCH", "70%", "70%", Snowflake],
                  ["RESILIENCE REGION", "23%", "67%", Shield],
                  ["SIMULATED AIR NODE", "76%", "30%", RadioTower],
                ].map(([label, top, left, Icon]: any) => (
                  <div key={label} className="absolute" style={{ top, left }}>
                    <div className="group relative flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-black/80 px-2 py-1.5 font-mono text-[10px] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.15)]">
                      <Icon className="h-3.5 w-3.5 text-cyan-300" />
                      {label}
                      <span className="absolute -left-1 -top-1 h-2 w-2 animate-ping rounded-full bg-emerald-400/60" />
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-cyan-400/15 bg-black/70 p-3 font-mono text-[10px] text-cyan-100/65 backdrop-blur">
                  DATA POLICY: PUBLIC / SIMULATED / NON-SENSITIVE ONLY • NO TARGETING • NO LIVE WEAPON TELEMETRY • NO DRONE CONTROL
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-400/20 bg-black/60 backdrop-blur-xl">
            <CardHeader className="border-b border-emerald-400/10">
              <CardTitle className="flex items-center gap-2 font-mono text-emerald-200">
                <Activity className="h-5 w-5" /> ETHER Event Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {eventStream.map((event, index) => (
                <div key={event} className="flex gap-3 font-mono text-xs">
                  <span className="text-emerald-500/50">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-emerald-100/75">{event}</span>
                </div>
              ))}
              <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
                  <Bot className="h-4 w-4" /> GPT-DOUG-MAX
                </div>
                <p className="mt-2 text-xs leading-relaxed text-violet-100/60">
                  Recommendations remain advisory until Golden Shield, policy, authority, and human approval requirements are satisfied.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {safeFeeds.map(({ title, icon: Icon, status, description }) => (
            <Card key={title} className="border-emerald-400/15 bg-black/50 backdrop-blur-xl transition hover:border-cyan-400/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-2">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <Badge variant="outline" className="border-emerald-400/20 font-mono text-[9px] text-emerald-300">
                    {status}
                  </Badge>
                </div>
                <h3 className="mt-4 font-mono text-sm font-bold text-emerald-100">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-red-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm text-red-200">
                <TriangleAlert className="h-4 w-4" /> Weapon / Drone Control Boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-red-100/60">
              War Room may visualize authorized readiness and simulation data, but it does not provide target selection, weapon release,
              firing solutions, strike planning, autonomous lethal decisions, or direct drone flight / payload control.
            </CardContent>
          </Card>

          <Card className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm text-cyan-200">
                <Orbit className="h-4 w-4" /> Orbital / Space Boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-cyan-100/60">
              Public orbital data and simulated assets may be visualized for awareness and continuity. Protected telemetry, military cueing,
              targeting correlations, or unauthorized satellite control are excluded.
            </CardContent>
          </Card>

          <Card className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm text-emerald-200">
                <Shield className="h-4 w-4" /> Infrastructure Boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-emerald-100/60">
              Critical-infrastructure analysis is restricted to resilience, continuity, maintenance, and authorized defensive decision support;
              the interface must not expose actionable vulnerability or exploitation details.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
