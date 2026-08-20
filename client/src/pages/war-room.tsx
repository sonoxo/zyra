import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

type ConnectorState = "CONNECTED" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN";

type WarRoomConnector = {
  id: string;
  label: string;
  category: "LOCAL" | "PUBLIC_WEATHER" | "PUBLIC_ORBITAL" | "PUBLIC_RESEARCH";
  state: ConnectorState;
  source: string;
  observedAt: string;
  detail?: Record<string, string | number | boolean | null>;
  error?: string;
};

type WarRoomStatus = {
  mode: string;
  execution: string;
  observedAt: string;
  connectors: WarRoomConnector[];
  summary: { total: number; connected: number; degraded: number; unavailable: number; unknown: number };
  components: Record<string, string>;
  allowedDecisionSupport: string[];
  blockedControlFunctions: string[];
};

function MatrixBackdrop() {
  const columns = useMemo(
    () => Array.from({ length: 34 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 24 }, (_, j) => glyphs[(i * 7 + j * 11) % glyphs.length]).join("\n"),
      delay: `${(i % 9) * 0.17}s`,
      duration: `${4 + (i % 6) * 0.65}s`,
      opacity: 0.08 + (i % 5) * 0.025,
    })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.08),transparent_34%)]" />
      <div className="absolute inset-0 flex justify-between px-2 font-mono text-[10px] leading-4 text-emerald-400">
        {columns.map(column => (
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

function stateClass(state: string) {
  if (state === "CONNECTED") return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
  if (state === "DEGRADED") return "text-amber-300 border-amber-400/30 bg-amber-500/10";
  if (state === "UNAVAILABLE") return "text-red-300 border-red-400/30 bg-red-500/10";
  return "text-slate-300 border-slate-400/30 bg-slate-500/10";
}

function detailLine(connector: WarRoomConnector) {
  if (connector.error) return connector.error;
  if (!connector.detail) return "No additional detail";
  return Object.entries(connector.detail)
    .map(([key, value]) => `${key}: ${value ?? "UNKNOWN"}`)
    .join(" • ");
}

export default function WarRoomPage() {
  const [mode, setMode] = useState<"LIVE" | "SIMULATION">("LIVE");
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<WarRoomStatus>({
    queryKey: ["/api/war-room/status"],
    refetchInterval: mode === "LIVE" ? 30_000 : false,
    retry: 1,
  });

  const connectorMap = new Map(data?.connectors.map(connector => [connector.id, connector]) ?? []);
  const weather = connectorMap.get("public-weather");
  const orbit = connectorMap.get("public-orbital");
  const antarctica = connectorMap.get("antarctica-public-weather");
  const local = connectorMap.get("zyra-local");

  const statusTiles = [
    { label: "War Room API", value: local?.state ?? (isLoading ? "CONNECTING" : "UNKNOWN"), icon: ShieldCheck },
    { label: "Public Data", value: data?.components.livePublicData ?? "UNKNOWN", icon: Globe2 },
    { label: "Golden Shield", value: data?.components.goldenShieldExecution ?? "UNKNOWN", icon: Shield },
    { label: "MITO", value: data?.components.mitoExecution ?? "UNKNOWN", icon: Cpu },
  ];

  return (
    <div className="relative min-h-full overflow-hidden bg-[#020706] text-foreground">
      <MatrixBackdrop />
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-emerald-400/20 bg-black/60 p-5 shadow-[0_0_50px_rgba(16,185,129,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">AEGIS WAR ROOM</Badge>
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">DEFENSIVE DECISION SUPPORT</Badge>
                <Badge variant="outline" className="border-amber-400/30 text-amber-300">NO WEAPON / DRONE CONTROL</Badge>
              </div>
              <h1 className="font-mono text-2xl font-black tracking-tight text-emerald-100 md:text-4xl">XRAYCLOUD // LIVE RESILIENCE MATRIX</h1>
              <p className="mt-2 max-w-4xl text-sm text-emerald-100/65 md:text-base">
                Evidence-aware defensive command visualization using authenticated local status plus public weather, orbital, and research context.
                Missing feeds remain UNKNOWN or UNAVAILABLE instead of being fabricated.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/20 bg-black/70 p-2">
              <Button size="sm" variant={mode === "LIVE" ? "default" : "outline"} onClick={() => setMode("LIVE")} className={cn(mode === "LIVE" && "bg-cyan-500 text-black hover:bg-cyan-400")}>LIVE VIEW</Button>
              <Button size="sm" variant={mode === "SIMULATION" ? "default" : "outline"} onClick={() => setMode("SIMULATION")} className={cn(mode === "SIMULATION" && "bg-emerald-500 text-black hover:bg-emerald-400")}>SIMULATION</Button>
              <Button size="sm" variant="outline" onClick={() => refetch()}>REFRESH</Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {mode === "LIVE"
              ? `Live display-only mode • last UI refresh ${dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "UNKNOWN"} • no external system control path exists.`
              : "Simulation mode is visualization-only and does not control external systems."}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statusTiles.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
                  <div className="mt-1 font-mono text-sm font-bold text-emerald-200">{value}</div>
                </div>
                <Icon className="h-5 w-5 text-cyan-300" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-cyan-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader className="border-b border-cyan-400/10">
              <CardTitle className="flex items-center gap-2 font-mono text-cyan-200"><Globe2 className="h-5 w-5" /> Scout // Public Awareness</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative min-h-[430px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.10),transparent_50%),linear-gradient(rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]">
                <div className="absolute inset-6 rounded-full border border-cyan-400/15" />
                <div className="absolute inset-20 rounded-full border border-emerald-400/10" />
                <div className="absolute left-[48%] top-[43%] h-28 w-28 rounded-full border border-cyan-300/20 bg-cyan-400/5 shadow-[0_0_60px_rgba(34,211,238,0.12)]" />
                {[
                  ["PUBLIC ORBIT", "18%", "24%", Satellite, orbit?.state ?? "UNKNOWN"],
                  ["ANTARCTICA RESEARCH", "70%", "70%", Snowflake, antarctica?.state ?? "UNKNOWN"],
                  ["PUBLIC WEATHER", "23%", "67%", Zap, weather?.state ?? "UNKNOWN"],
                  ["LOCAL CONTROL PLANE", "76%", "30%", RadioTower, local?.state ?? "UNKNOWN"],
                ].map(([label, top, left, Icon, state]: any) => (
                  <div key={label} className="absolute" style={{ top, left }}>
                    <div className="relative flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-black/85 px-2 py-1.5 font-mono text-[10px] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.15)]">
                      <Icon className="h-3.5 w-3.5 text-cyan-300" />{label}<span className="text-[8px] text-cyan-300">{state}</span>
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-cyan-400/15 bg-black/75 p-3 font-mono text-[10px] text-cyan-100/65 backdrop-blur">
                  PUBLIC / AGGREGATE / NON-SENSITIVE DISPLAY ONLY • NO TARGETING • NO WEAPON RELEASE • NO DIRECT DRONE CONTROL
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-400/20 bg-black/60 backdrop-blur-xl">
            <CardHeader className="border-b border-emerald-400/10">
              <CardTitle className="flex items-center gap-2 font-mono text-emerald-200"><Activity className="h-5 w-5" /> Live Connector Fabric</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {isLoading && <div className="font-mono text-xs text-cyan-200">CONNECTING...</div>}
              {isError && <div className="font-mono text-xs text-red-300">WAR ROOM API UNAVAILABLE</div>}
              {data?.connectors.map(connector => (
                <div key={connector.id} className="rounded-xl border border-emerald-400/15 bg-black/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-semibold text-emerald-100">{connector.label}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{detailLine(connector)}</div>
                    </div>
                    <Badge variant="outline" className={cn("font-mono text-[9px]", stateClass(connector.state))}>{connector.state}</Badge>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-200"><Bot className="h-4 w-4" /> GPT-DOUG-MAX</div>
                <p className="mt-2 text-xs leading-relaxed text-violet-100/60">Decision support remains advisory. This Zyra branch currently has no Golden Shield / MITO execution integration, so those states are shown truthfully as NOT_CONNECTED / DISABLED.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Public Geospatial Scout", icon: MapPinned, status: weather?.state ?? "UNKNOWN", description: "Public weather and resilience context only; no sensitive live operational locations." },
            { title: "Orbital Awareness", icon: Satellite, status: orbit?.state ?? "UNKNOWN", description: "Aggregate public orbital catalog awareness only; no cueing, protected telemetry, or satellite control." },
            { title: "Antarctica Research Watch", icon: Snowflake, status: antarctica?.state ?? "UNKNOWN", description: "Public research-region weather context for continuity and logistics planning." },
            { title: "Readiness Data Boundary", icon: Workflow, status: "SAFE", description: "Drone and weapon-system maintenance/readiness data may be displayed when authorized; control and engagement pathways remain excluded." },
          ].map(({ title, icon: Icon, status, description }) => (
            <Card key={title} className="border-emerald-400/15 bg-black/50 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-2"><Icon className="h-5 w-5 text-cyan-300" /></div>
                  <Badge variant="outline" className="border-emerald-400/20 font-mono text-[9px] text-emerald-300">{status}</Badge>
                </div>
                <h3 className="mt-4 font-mono text-sm font-bold text-emerald-100">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-red-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-red-200"><TriangleAlert className="h-4 w-4" /> Control Boundary</CardTitle></CardHeader>
            <CardContent className="text-xs leading-relaxed text-red-100/60">Target selection, weapon release, fire control, strike planning, direct drone flight/payload control, autonomous lethal action, and offensive cyber execution remain unavailable.</CardContent>
          </Card>
          <Card className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-cyan-200"><Orbit className="h-4 w-4" /> Space Boundary</CardTitle></CardHeader>
            <CardContent className="text-xs leading-relaxed text-cyan-100/60">Public aggregate orbital data may be visualized for awareness. Protected telemetry, military cueing, targeting correlations, and satellite control are excluded.</CardContent>
          </Card>
          <Card className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-emerald-200"><Database className="h-4 w-4" /> Data Honesty</CardTitle></CardHeader>
            <CardContent className="text-xs leading-relaxed text-emerald-100/60">External connector failure is surfaced as UNAVAILABLE. Missing integration is NOT_CONNECTED. No visual state is promoted to verified execution capability.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
