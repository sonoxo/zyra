import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Cloud,
  Code2,
  FileCheck2,
  GitBranch,
  GraduationCap,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TerminalSquare,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const readinessPillars = [
  {
    label: "Production engineering",
    score: 88,
    icon: Code2,
    evidence: "TypeScript, React, Express, API design, PostgreSQL, Drizzle, CI/CD",
  },
  {
    label: "Cloud & DevSecOps",
    score: 91,
    icon: Cloud,
    evidence: "Cloud security, containers, supply chain, CodeQL, deployment workflows",
  },
  {
    label: "AI engineering",
    score: 86,
    icon: Bot,
    evidence: "ZyraCopilot, agent workflows, model integration, evaluation and automation",
  },
  {
    label: "Cybersecurity",
    score: 94,
    icon: ShieldCheck,
    evidence: "Threat intel, incident response, vulnerability management, attack surface",
  },
  {
    label: "Portfolio proof",
    score: 82,
    icon: GitBranch,
    evidence: "Public repository, architecture docs, security controls, deployable product surface",
  },
  {
    label: "Interview readiness",
    score: 72,
    icon: Users,
    evidence: "Translate Zyra architecture into concise system-design and behavioral stories",
  },
];

const roleTracks = [
  {
    title: "AI / Software Engineer",
    icon: Sparkles,
    fit: "Strong",
    focus: ["TypeScript + React", "API architecture", "LLM/agent integration", "Testing + evaluation"],
  },
  {
    title: "Cloud / DevSecOps Engineer",
    icon: Network,
    fit: "Strong",
    focus: ["CI/CD", "Cloud controls", "Containers", "Observability + incident response"],
  },
  {
    title: "Cybersecurity Engineer",
    icon: ShieldCheck,
    fit: "Strong",
    focus: ["Vulnerability management", "Threat intelligence", "Security automation", "Risk + compliance"],
  },
  {
    title: "Platform Engineer",
    icon: TerminalSquare,
    fit: "Growing",
    focus: ["Reliability", "Developer experience", "Deployment", "Operational runbooks"],
  },
];

const proofRoutes = [
  { label: "Repositories", href: "/repositories", icon: GitBranch, detail: "Show working source and engineering history." },
  { label: "DevSecOps", href: "/devsecops", icon: Rocket, detail: "Show secure delivery and automation practices." },
  { label: "Cloud Security", href: "/cloud-security", icon: Cloud, detail: "Show cloud control and posture engineering." },
  { label: "Security Copilot", href: "/security-copilot", icon: Bot, detail: "Show applied AI capability inside the platform." },
  { label: "Reports", href: "/reports", icon: FileCheck2, detail: "Show the ability to communicate technical outcomes." },
  { label: "Enterprise Readiness", href: "/enterprise-readiness", icon: BadgeCheck, detail: "Show production and enterprise thinking." },
];

const hiringChecklist = [
  "Keep the main branch buildable and type-safe.",
  "Pin one production demo and one architecture walkthrough.",
  "Document the problem, constraints, architecture, tradeoffs, and measurable result for each flagship feature.",
  "Turn security findings and reliability work into STAR-format interview stories.",
  "Use issue/PR history as evidence of debugging, review, and engineering iteration.",
  "Keep secrets, credentials, customer data, and unverifiable claims out of public portfolio material.",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden" aria-label={`${score}% readiness`}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
    </div>
  );
}

export default function JobReadinessPage() {
  const overall = Math.round(readinessPillars.reduce((sum, item) => sum + item.score, 0) / readinessPillars.length);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" data-testid="job-readiness-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="gap-1">
              <BriefcaseBusiness className="w-3.5 h-3.5" /> Career Launch
            </Badge>
            <Badge variant="secondary">Employer-facing</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Zyra Job Readiness</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Turn the Zyra ecosystem into verifiable evidence for AI, software, cloud, DevSecOps,
            platform, and cybersecurity roles. The goal is not just to claim skills—it is to point to working proof.
          </p>
        </div>
        <div className="rounded-xl border bg-card px-5 py-4 min-w-48">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current readiness</div>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold">{overall}</span>
            <span className="text-sm text-muted-foreground mb-1">/ 100</span>
          </div>
          <ScoreBar score={overall} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {readinessPillars.map(({ label, score, icon: Icon, evidence }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <span className="text-sm font-semibold">{score}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScoreBar score={score} />
              <p className="text-xs text-muted-foreground leading-relaxed">{evidence}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> Target roles
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Map the existing platform to real engineering job families.</p>
              </div>
              <Badge variant="outline">4 tracks</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {roleTracks.map(({ title, icon: Icon, fit, focus }) => (
              <div key={title} className="rounded-xl border p-4 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className="w-4 h-4 text-primary" /> {title}
                  </div>
                  <Badge variant={fit === "Strong" ? "default" : "secondary"}>{fit}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {focus.map(item => <Badge key={item} variant="outline" className="font-normal">{item}</Badge>)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Hiring checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hiringChecklist.map(item => (
              <div key={item} className="flex gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="w-5 h-5 text-primary" /> Portfolio proof inside Zyra
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every tile points to an existing product area that can become interview evidence, screenshots, demo material, or a case study.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {proofRoutes.map(({ label, href, icon: Icon, detail }) => (
            <Link key={href} href={href}>
              <div className="group h-full rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-primary" />
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="font-semibold mt-3">{label}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Definition of job-ready</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              A recruiter can open the repository, understand what Zyra solves, verify the build and security posture,
              see production-minded engineering decisions, and trace your contribution to concrete code and outcomes.
            </p>
          </div>
          <Link href="/repositories">
            <Button className="shrink-0">
              Review proof <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
