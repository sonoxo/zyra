import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Cpu,
  Database,
  Eye,
  Gauge,
  HardDrive,
  Network,
  RadioTower,
  RotateCcw,
  Satellite,
  Shield,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Readiness = "READY" | "LIMITED" | "MAINTENANCE" | "UNKNOWN";

type SystemCard = {
  id: string;
  name: string;
  category: string;
  readiness: Readiness;
  health: number | null;
  evidence: string;
  icon: typeof Shield;
};

const systems: SystemCard[] = [
  { id: "tsc-sensor", name: "Sensor Fusion", category: "Awareness", readiness: "READY", health: 96, evidence: "SIMULATED / VERIFIED FIXTURE", icon: Eye },
  { id: "tsc-comms", name: "Communications Mesh", category: "Continuity", readiness: "LIMITED", health: 78, evidence: "SIMULATED / DEGRADED LINK", icon: RadioTower },
  { id: "tsc-maint", name: "Maintenance Readiness", category: "Sustainment", readiness: "READY", health: 91, evidence: "SIMULATED / VERIFIED FIXTURE", icon: Wrench },
  { id: "tsc-logistics", name: "Logistics Support", category: "Sustainment", readiness: "READY", health: 88, evidence: "SIMULATED / VERIFIED FIXTURE", icon: Boxes },
  { id: "tsc-orbit", name: "Orbital Awareness", category: "Public / Simulated", readiness: "UNKNOWN", health: null, evidence: "NO LIVE CONNECTOR", icon: Satellite },
  { id: "tsc-recovery", name: "Recovery Stack", category: "Resilience", readiness: "READY", health: 94, evidence: "SIMULATED / RESTORE FIXTURE", icon: RotateCcw },
];

const matrixGlyphs = "01TSCXRAYAEGIS<>[]{}//\\*+";

function MatrixField() {
  const cols = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    text: Array.from({ length: 20 }, (_, j) => matrixGlyphs[(i * 5 + j * 9) % matrixGlyphs.length]).join("\n"),
    opacity: 0.05 + (i % 5) * 0.02,
  })), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 flex justify-between font-mono text-[9px] leading-4 text-emerald-400">
        {cols.map((c) => <pre key={c.id} className="animate-pulse whitespace-pre" style={{ opacity: c.opacity }}>{c.text}</pre>)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#020706]/70 via-[#020706]/90 to-[#020706]" />
    </div>
  );
}

function readinessTone(readiness: Readiness) {
  if (readiness === "READY") return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
  if (readiness === "LIMITED") return "text-amber-300 border-amber-400/30 bg-amber-500/10";
  if (readiness === "MAINTENANCE") return "text-cyan-300 border-cyan-400/30 bg-cyan-500/10";
  return "text-slate-300 border-slate-400/20 bg-slate-500/10";
}

export default function TscPage() {
  const [mode, setMode] = useState<"SIMULATION" | "READINESS">("SIMULATION");

  return (
    <div className="relative min-h-full overflow-hidden bg-[#020706] text-foreground">
      <MatrixField />
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <div className="rounded-2xl border border-emerald-400/20 bg-black/60 p-5 shadow-[0_0_50px_rgba(16,185,129,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">TSC</Badge>
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">TACTICAL SUPPORT CONSOLE</Badge>
                <Badge variant="outline" className="border-amber-400/30 text-amber-300">DECISION SUPPORT ONLY</Badge>
              </div>
              <h1 className="font-mono text-3xl font-black text-emerald-100 md:text-4xl">XRAYCLOUD // TSC DEFENSIVE SYSTEMS</h1>
              <p className="mt-2 max-w-4xl text-sm text-emerald-100/65">
                Evidence-first readiness, maintenance, logistics, communications resilience, public/simulated awareness, recovery planning, and governed decision support.
              </p>
            </div>
            <div className="flex gap-2 rounded-xl border border-emerald-400/20 bg-black/70 p-2">
              <Button size="sm" variant={mode === "SIMULATION" ? "default" : "outline"} onClick={() => setMode("SIMULATION")} className={cn(mode === "SIMULATION" && "bg-emerald-500 text-black hover:bg-emerald-400")}>SIMULATION</Button>
              <Button size="sm" variant={mode === "READINESS" ? "default" : "outline"} onClick={() => setMode("READINESS")} className={cn(mode === "READINESS" && "bg-cyan-500 text-black hover:bg-cyan-400")}>READINESS</Button>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs text-red-100/70">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            TSC does not provide target selection, weapon release, fire control, strike planning, autonomous lethal decisions, offensive cyber execution, or direct drone flight/payload control.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Golden Shield", "ENFORCED", ShieldCheck, "text-emerald-300"],
            ["Mission Twin", mode, Cpu, "text-cyan-300"],
            ["ETHER Proof", "READY", Database, "text-violet-300"],
            ["Recovery", "HUMAN-GATED", RotateCcw, "text-amber-300"],
          ].map(([label, value, Icon, tone]: any) => (
            <Card key={label} className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
                  <div className={cn("mt-1 font-mono text-sm font-bold", tone)}>{value}</div>
                </div>
                <Icon className={cn("h-5 w-5", tone)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {systems.map(({ id, name, category, readiness, health, evidence, icon: Icon }) => (
            <Card key={id} className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-mono text-cyan-100"><Icon className="h-4 w-4 text-cyan-300" />{name}</span>
                  <Badge variant="outline" className={readinessTone(readiness)}>{readiness}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">{category}</div>
                <div className="mt-3 flex items-center gap-3">
                  <Gauge className="h-4 w-4 text-emerald-300" />
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-emerald-400/70" style={{ width: `${health ?? 0}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono text-xs text-emerald-200">{health == null ? "UNKNOWN" : `${health}%`}</span>
                </div>
                <div className="mt-3 font-mono text-[10px] text-emerald-100/50">EVIDENCE: {evidence}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-emerald-200"><Network className="h-4 w-4" /> Continuity Graph</CardTitle></CardHeader>
            <CardContent className="space-y-2 font-mono text-xs text-emerald-100/65">
              <div>IDENTITY → POLICY → MISSION</div>
              <div>MISSION → COMMS → SERVICES</div>
              <div>SERVICES → MAINTENANCE → LOGISTICS</div>
              <div>FAILURE → RECOVERY → VERIFY → ETHER</div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-cyan-200"><HardDrive className="h-4 w-4" /> Resilience Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-cyan-100/65">
              <div>• verify backup readiness</div>
              <div>• recommend safe failover</div>
              <div>• compare configuration drift</div>
              <div>• prioritize maintenance evidence</div>
              <div>• quarantine unsafe workloads through governed controls</div>
            </CardContent>
          </Card>

          <Card className="border-violet-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-violet-200"><Activity className="h-4 w-4" /> Truth Contract</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-violet-100/65">
              <div>FACT ≠ PREDICTION</div>
              <div>SIMULATION ≠ LIVE CONTROL</div>
              <div>EXIT=0 ≠ MISSION SUCCESS</div>
              <div>UNKNOWN stays UNKNOWN</div>
              <div>AI recommendation ≠ authorization</div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-emerald-400/15 bg-black/60 p-4 font-mono text-[11px] text-emerald-100/60">
          TSC STATUS // SUPPORT SYSTEM ONLINE // HUMAN AUTHORITY REQUIRED // GOVERNED BY GOLDEN SHIELD // EVIDENCE-FIRST // NON-LETHAL DECISION SUPPORT
        </div>
      </div>
    </div>
  );
}
