import { Link } from "wouter";
import {
  Activity,
  BarChart3,
  Bot,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Cpu,
  GitBranch,
  ListTodo,
  Network,
  Radar,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "ZyraCopilot",
    description: "Open the AI security copilot and work with Zyra directly.",
    href: "/security-copilot",
    icon: Bot,
    status: "Available",
  },
  {
    title: "Mission Queue",
    description: "Create, assign, and track operational tasks from one place.",
    href: "/task-center",
    icon: ListTodo,
    status: "Available",
  },
  {
    title: "Repositories",
    description: "Jump into connected code assets and repository operations.",
    href: "/repositories",
    icon: GitBranch,
    status: "Available",
  },
  {
    title: "Analytics",
    description: "Review platform and security analytics across Zyra.",
    href: "/analytics",
    icon: BarChart3,
    status: "Available",
  },
  {
    title: "Platform Metrics",
    description: "Inspect platform telemetry and operational health metrics.",
    href: "/platform-metrics",
    icon: Activity,
    status: "Available",
  },
  {
    title: "Security Graph",
    description: "Explore relationships between assets, threats, and findings.",
    href: "/security-graph",
    icon: Network,
    status: "Available",
  },
  {
    title: "Threat Intelligence",
    description: "Review threat intelligence and tracked security signals.",
    href: "/threat-intel",
    icon: Radar,
    status: "Available",
  },
  {
    title: "Audit Logs",
    description: "Review platform actions and operational history.",
    href: "/audit-logs",
    icon: ClipboardList,
    status: "Available",
  },
];

const quickActions = [
  {
    label: "Launch mission",
    detail: "Open Task Center",
    href: "/task-center",
    icon: Rocket,
  },
  {
    label: "Open ZyraCopilot",
    detail: "Start an AI-assisted workflow",
    href: "/security-copilot",
    icon: Sparkles,
  },
  {
    label: "Review posture",
    detail: "Open Security Posture",
    href: "/posture",
    icon: ShieldCheck,
  },
];

export default function CommandCenterPage() {
  return (
    <div className="space-y-6" data-testid="page-command-center">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="gap-1.5">
                  <CircleDot className="w-3 h-3" />
                  Control Plane V1
                </Badge>
                <Badge variant="outline">{modules.length} modules</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    Zyra Command Center
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    One launch point for Zyra operations, intelligence, repositories, and AI workflows.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/task-center">
                <Button data-testid="button-launch-mission">
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch Mission
                </Button>
              </Link>
              <Link href="/security-copilot">
                <Button variant="outline" data-testid="button-open-copilot">
                  <Bot className="w-4 h-4 mr-2" />
                  Open ZyraCopilot
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="h-full border-card-border hover-elevate cursor-pointer transition-all" data-testid={`quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{action.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{action.detail}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Connected Zyra Modules</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Existing platform areas now exposed through a single control surface.
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <Activity className="w-3 h-3" />
              Command surface ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href}>
                  <div
                    className="group h-full rounded-xl border border-border p-4 hover:bg-accent/40 hover:border-primary/30 transition-colors cursor-pointer"
                    data-testid={`module-${module.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {module.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{module.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                      {module.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mt-4">
                      Open module
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
