import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Binoculars,
  Bot,
  Building2,
  Eye,
  GitBranch,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { routeMission } from "@shared/mission-router";

const doors = [
  {
    id: "protect",
    title: "Protect Something",
    description: "Scan code, cloud, containers, attack surface, secrets, and vulnerabilities.",
    route: "/scans",
    icon: ShieldCheck,
  },
  {
    id: "investigate",
    title: "Investigate Something",
    description: "Move through threat intelligence, CVEs, evidence, and graph relationships.",
    route: "/threat-intel",
    icon: Radar,
  },
  {
    id: "see",
    title: "See With ZYRA",
    description: "Explore the governed ZYRA Eyes perception-to-action architecture.",
    route: "/zyra-eyes",
    icon: Eye,
  },
  {
    id: "build",
    title: "Build Something",
    description: "Start from repositories and integrations without exposing the full platform at once.",
    route: "/repositories",
    icon: GitBranch,
  },
  {
    id: "federal",
    title: "Government / Contracting",
    description: "Use NXYZ ContractOps for evidence-backed federal readiness and proposal workflows.",
    route: "/contractops",
    icon: Building2,
  },
  {
    id: "operate",
    title: "Run an Operation",
    description: "Coordinate governed work from the command center with human control intact.",
    route: "/command-center",
    icon: Bot,
  },
];

export default function MissionHomePage() {
  const [, navigate] = useLocation();
  const [mission, setMission] = useState("");
  const [routed, setRouted] = useState(false);

  const suggestion = useMemo(() => routeMission(mission), [mission]);

  const routeCurrentMission = () => {
    setRouted(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 md:p-8" data-testid="mission-home">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-8 shadow-sm md:px-10 md:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_45%)]" />
        <div className="relative max-w-4xl space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Mission-first ZYRA
            </Badge>
            <Badge variant="outline">Human-controlled routing</Badge>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              North star
            </p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Give ZYRA a mission.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              Describe the outcome you want. ZYRA will suggest the safest existing surface to start from.
              Routing does not execute tools, approve actions, bypass policy, or create government authorization.
            </p>
          </div>

          <div className="rounded-2xl border bg-background/80 p-3 shadow-inner md:p-4">
            <label htmlFor="mission-input" className="mb-2 block text-sm font-semibold">
              What do you want to accomplish?
            </label>
            <textarea
              id="mission-input"
              data-testid="mission-input"
              value={mission}
              onChange={(event) => {
                setMission(event.target.value);
                setRouted(false);
              }}
              placeholder="Example: Investigate this threat indicator and show me the evidence trail"
              className="min-h-28 w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Suggestion only. A human still chooses the destination and authorizes any consequential action.
              </p>
              <Button onClick={routeCurrentMission} disabled={!mission.trim()} className="gap-2" data-testid="button-route-mission">
                Route mission
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {routed && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4" data-testid="mission-suggestion">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Binoculars className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">Recommended start: {suggestion.label}</span>
                    <Badge variant="outline">{suggestion.confidence}</Badge>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{suggestion.reason}</p>
                </div>
                <Button onClick={() => navigate(suggestion.route)} className="shrink-0 gap-2">
                  Open {suggestion.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Beginner doors</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Start with an outcome, not a module list.</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doors.map((door) => {
            const Icon = door.icon;
            return (
              <button
                key={door.id}
                type="button"
                onClick={() => navigate(door.route)}
                className="group rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                data-testid={`mission-door-${door.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl border bg-muted/40 p-2.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="mt-5 text-base font-bold">{door.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{door.description}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
