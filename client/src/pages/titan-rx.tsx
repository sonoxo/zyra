import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  Orbit,
  RadioTower,
  RefreshCcw,
  Satellite,
  ShieldCheck,
  Thermometer,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TITAN_RX_CONTROL_BOUNDARY,
  TITAN_RX_PLATFORM_REGISTRY,
  runTitanScenario,
  type TitanReadiness,
  type TitanScenario,
} from "@shared/titan-rx-readiness";

const scenarios: { value: TitanScenario; label: string }[] = [
  { value: "communications_loss", label: "Communications Loss" },
  { value: "power_degradation", label: "Power Degradation" },
  { value: "thermal_fault", label: "Thermal Fault" },
  { value: "sensor_degradation", label: "Sensor Degradation" },
  { value: "software_mismatch", label: "Software Mismatch" },
  { value: "maintenance_overdue", label: "Maintenance Overdue" },
  { value: "supply_shortage", label: "Supply Shortage" },
  { value: "site_isolation", label: "Site Isolation" },
  { value: "recovery_failover", label: "Recovery / Failover" },
];

function tone(state: TitanReadiness) {
  if (state === "READY") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  if (state === "LIMITED") return "border-amber-400/30 bg-amber-500/10 text-amber-300";
  if (state === "MAINTENANCE") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-300";
  if (state === "FAULT") return "border-red-400/30 bg-red-500/10 text-red-300";
  if (state === "OFFLINE") return "border-zinc-400/20 bg-zinc-500/10 text-zinc-300";
  return "border-slate-400/20 bg-slate-500/10 text-slate-300";
}

function MatrixBackdrop() {
  const rows = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 24 }, (_, j) => "01TITANRX<>[]{}//\\*+"[(i * 3 + j * 7) % 20]).join("\n"),
      opacity: 0.04 + (i % 5) * 0.018,
    })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 flex justify-between font-mono text-[9px] leading-4 text-emerald-400">
        {rows.map((row) => (
          <pre key={row.id} className="animate-pulse whitespace-pre" style={{ opacity: row.opacity }}>
            {row.text}
          </pre>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_38%),linear-gradient(to_bottom,rgba(2,7,6,.68),rgba(2,7,6,.95))]" />
    </div>
  );
}

export default function TitanRxPage() {
  const platform = TITAN_RX_PLATFORM_REGISTRY[0];
  const [scenario, setScenario] = useState<TitanScenario>("communications_loss");
  const [reviewed, setReviewed] = useState(false);
  const result = runTitanScenario(scenario);

  const healthTiles = [
    ["Power", platform.powerHealth, BatteryCharging],
    ["Thermal", platform.thermalHealth, Thermometer],
    ["Communications", platform.communicationsHealth, RadioTower],
    ["Sensors", platform.sensorHealth, Satellite],
  ] as const;

  return (
    <div className="relative min-h-full overflow-hidden bg-[#020706] text-foreground">
      <MatrixBackdrop />
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-emerald-400/20 bg-black/60 p-5 shadow-[0_0_60px_rgba(16,185,129,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">TITAN RX</Badge>
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">SPACE DEFENSE READINESS DIGITAL TWIN</Badge>
                <Badge variant="outline" className="border-violet-400/30 text-violet-300">SIMULATION / TRAINING</Badge>
              </div>
              <h1 className="font-mono text-3xl font-black tracking-tight text-emerald-100 md:text-4xl">TITAN RX // SPACE DEFENSE READINESS MATRIX</h1>
              <p className="mt-2 max-w-4xl text-sm text-emerald-100/65">
                Evidence-first mission assurance for platform readiness, maintenance, power, thermal, communications, sensor health,
                logistics, crew qualification, safety interlocks, recovery simulation, public orbital context, and human-governed review.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-black/70 p-3 font-mono text-xs text-emerald-100/70">
              OBSERVE → VERIFY → SIMULATE → COMPARE → HUMAN REVIEW → GOLDEN SHIELD → RECOVERY → ETHER → REALITY DELTA
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Platform", platform.callsign, Cpu, "text-cyan-300"],
            ["Readiness", platform.readiness, Gauge, "text-emerald-300"],
            ["Safety Interlock", platform.safetyInterlockState, ShieldCheck, "text-amber-300"],
            ["Evidence", platform.evidenceState, Database, "text-violet-300"],
          ].map(([label, value, Icon, color]: any) => (
            <Card key={label} className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
                  <div className={`mt-1 font-mono text-sm font-bold ${color}`}>{value}</div>
                </div>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {healthTiles.map(([label, value, Icon]) => (
            <Card key={label} className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-100">{label}</span>
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-emerald-400/70" style={{ width: `${value ?? 0}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-xs text-emerald-200">{value == null ? "UNKNOWN" : `${value}%`}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="border-emerald-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-emerald-200"><Wrench className="h-5 w-5" /> Platform Registry + Subsystems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {platform.subsystems.map((subsystem) => (
                  <div key={subsystem.id} className="rounded-xl border border-emerald-400/10 bg-black/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-emerald-100">{subsystem.label}</span>
                      <Badge variant="outline" className={tone(subsystem.state)}>{subsystem.state}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full bg-cyan-400/70" style={{ width: `${subsystem.health ?? 0}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-cyan-200">{subsystem.health == null ? "UNKNOWN" : `${subsystem.health}%`}</span>
                    </div>
                    <div className="mt-2 font-mono text-[9px] text-muted-foreground">EVIDENCE: {subsystem.evidence}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2 font-mono text-[10px] text-emerald-100/60">
                <div>SW BASELINE // {platform.softwareBaseline}</div>
                <div>FW BASELINE // {platform.firmwareBaseline}</div>
                <div>SUPPLY // {platform.supplyStatus}</div>
                <div>CREW QUALIFICATION // {platform.crewQualificationState}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-cyan-200"><Orbit className="h-5 w-5" /> Public Orbital Awareness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[310px] overflow-hidden rounded-xl border border-cyan-400/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.10),transparent_42%),linear-gradient(rgba(16,185,129,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,.04)_1px,transparent_1px)] bg-[size:auto,28px_28px,28px_28px]">
                <div className="absolute inset-8 rounded-full border border-cyan-400/20" />
                <div className="absolute inset-20 rounded-full border border-emerald-400/15" />
                <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30 bg-cyan-500/5" />
                <div className="absolute left-[23%] top-[30%] rounded-lg border border-emerald-400/25 bg-black/80 px-2 py-1 font-mono text-[10px] text-emerald-200">PUBLIC CATALOG</div>
                <div className="absolute right-[16%] top-[62%] rounded-lg border border-cyan-400/25 bg-black/80 px-2 py-1 font-mono text-[10px] text-cyan-200">SIMULATED LINK</div>
                <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-violet-400/15 bg-black/75 p-2 font-mono text-[9px] text-violet-100/60">
                  PUBLIC / SIMULATED CONTEXT ONLY • SOURCE FRESHNESS REQUIRED • UNKNOWN REMAINS UNKNOWN
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="border-violet-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-violet-200"><RefreshCcw className="h-5 w-5" /> Mission Twin Scenario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {scenarios.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={scenario === item.value ? "default" : "outline"}
                    className={scenario === item.value ? "justify-start bg-violet-500 text-white hover:bg-violet-400" : "justify-start"}
                    onClick={() => { setScenario(item.value); setReviewed(false); }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3">
                <div className="font-mono text-xs text-violet-200">EXPECTED STATE // {result.expectedState}</div>
                <div className="mt-2 text-xs text-violet-100/60">Affected: {result.affected.join(" • ")}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-400/20 bg-black/55 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-amber-200"><UserCheck className="h-5 w-5" /> Human Review + Golden Shield</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.recommendedActions.map((action) => (
                <div key={action} className="flex items-start gap-2 rounded-lg border border-amber-400/10 bg-amber-500/5 p-2 text-xs text-amber-100/70">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {action}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setReviewed(true)} className="bg-amber-500 text-black hover:bg-amber-400">Record Human Review</Button>
                <Badge variant="outline" className={reviewed ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}>
                  {reviewed ? "REVIEW RECORDED" : "REVIEW REQUIRED"}
                </Badge>
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">SHIELD: {result.goldenShieldDecision}</Badge>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">REALITY DELTA // {result.realityDelta}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-emerald-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-emerald-200"><Database className="h-4 w-4" /> ETHER Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-2 font-mono text-[10px] text-emerald-100/60">
              <div>[ETHER] registry snapshot // SIMULATED</div>
              <div>[ETHER] scenario // {scenario}</div>
              <div>[ETHER] review // {reviewed ? "RECORDED" : "PENDING"}</div>
              <div>[ETHER] outcome // NOT OBSERVED</div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-cyan-200"><Activity className="h-4 w-4" /> Recovery Domain</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-cyan-100/65">
              <div>• approved continuity-channel simulation</div>
              <div>• backup-readiness verification</div>
              <div>• maintenance prioritization</div>
              <div>• software rollback preparation</div>
              <div>• governed recovery / failover simulation</div>
            </CardContent>
          </Card>

          <Card className="border-red-400/15 bg-black/55 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2 font-mono text-sm text-red-200"><AlertTriangle className="h-4 w-4" /> Execution Isolation</CardTitle></CardHeader>
            <CardContent className="space-y-2 font-mono text-[10px] text-red-100/60">
              <div>EXTERNAL HARDWARE CONTROL // {String(TITAN_RX_CONTROL_BOUNDARY.externalHardwareControl).toUpperCase()}</div>
              <div>EXECUTION DOMAIN // {TITAN_RX_CONTROL_BOUNDARY.executionDomain}</div>
              <div>DEVICE FIRING INTERFACE // ABSENT</div>
              <div>REAL-WORLD EFFECTOR PATH // ABSENT</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
