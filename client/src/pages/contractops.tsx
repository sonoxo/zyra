import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Gauge,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RegistrationControl } from "@/components/contractops/RegistrationControl";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/lib/auth";

type ContractOpsSummary = {
  cage: { status: string; identifier: string | null; verificationSource: string | null };
  opportunityCount: number;
  submissionReadyCount: number;
  evidenceReadyCount: number;
  scoredCount: number;
  bidCount: number;
  noBidCount: number;
  evidenceRule: boolean;
};

type EvidenceMatch = {
  requirement: string;
  state: "SUPPORTED_CANDIDATE" | "GAP";
  topScore: number;
  candidates: Array<{ label: string; domain: string; score: number }>;
};

type BidAssessment = {
  advisoryOnly: true;
  overallScore: number;
  recommendation: "BID_CANDIDATE" | "HUMAN_REVIEW" | "NO_BID_RISK";
  dimensions: {
    technicalFitProxy: number;
    evidenceCoverage: number;
    registrationReadiness: number;
    deadlineReadiness: number;
  };
  blockers: string[];
  notes: string[];
  deadlineState: string;
  humanDecision?: {
    decision: "BID" | "NO_BID";
    rationale: string;
    decidedAt: string;
    decidedByUserId: string;
  };
};

type ContractOpsOpportunity = {
  id: string;
  title: string;
  agency: string;
  sourceUrl: string;
  solicitationNumber: string | null;
  deadline: string | null;
  naics: string | null;
  psc: string | null;
  setAside: string | null;
  summary: string | null;
  requirements: string[];
  evidenceMatches: EvidenceMatch[];
  bidAssessment: BidAssessment | null;
  status: string;
  bidDecision: "UNDER_REVIEW" | "BID" | "NO_BID";
  evidenceCoverageReady: boolean;
  createdAt: string;
};

const credentialDomains = [
  "Palantir Foundry / AIP",
  "Cybersecurity",
  "Artificial Intelligence",
  "Business Intelligence",
  "Data Science",
  "Linux / Systems",
  "Application Development",
];

const workflow = [
  ["1", "Record registrations", "Keep SAM / UEI / CAGE and related states separate. Never invent identifiers."],
  ["2", "Capture an opportunity", "Store the agency, source, deadline, solicitation metadata, and requirements."],
  ["3", "Match capabilities", "Connect each requirement to a ZYRA capability instead of relying on vague proposal language."],
  ["4", "Attach evidence", "Use issuer credentials, RVIA repository evidence, commits, demos, reports, and provenance."],
  ["5", "Score Bid / No-Bid", "Separate technical fit, evidence coverage, registration readiness, and deadline risk."],
  ["6", "Build the proposal", "Draft only what can be supported and flag missing proof before review."],
  ["7", "Human review", "A person approves readiness. ContractOps does not silently submit to government portals."],
];

const emptyForm = {
  title: "",
  agency: "",
  sourceUrl: "",
  solicitationNumber: "",
  deadline: "",
  naics: "",
  psc: "",
  setAside: "",
  summary: "",
  requirementsText: "",
};

function formatDeadline(value: string | null) {
  if (!value) return "No deadline recorded";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function scoreTone(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-bold ${scoreTone(value)}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function ContractOpsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [decisionState, setDecisionState] = useState<{ opportunityId: string; decision: "BID" | "NO_BID"; rationale: string } | null>(null);

  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });
  const canDecide = user?.role === "owner" || user?.role === "admin";
  const { data: summary, isLoading: summaryLoading } = useQuery<ContractOpsSummary>({
    queryKey: ["/api/contractops/summary"],
  });
  const { data: opportunitiesData, isLoading: opportunitiesLoading } = useQuery<{ opportunities: ContractOpsOpportunity[] }>({
    queryKey: ["/api/contractops/opportunities"],
  });

  const captureMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        naics: form.naics || undefined,
        psc: form.psc || undefined,
        solicitationNumber: form.solicitationNumber || undefined,
        setAside: form.setAside || undefined,
        summary: form.summary || undefined,
        requirementsText: form.requirementsText || undefined,
      };
      const response = await apiRequest("POST", "/api/contractops/opportunities", payload);
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
      setForm(emptyForm);
      setDialogOpen(false);
      toast({ title: "Opportunity captured", description: "ContractOps stored the source and requirements for review." });
    },
    onError: (error: any) => {
      toast({ title: "Could not capture opportunity", description: error?.message || "Check the required fields and try again.", variant: "destructive" });
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest("POST", `/api/contractops/opportunities/${opportunityId}/evidence-match`, {});
      return response.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
      const coverage = data?.matrix?.coveragePercent ?? 0;
      const gaps = data?.matrix?.gapCount ?? 0;
      toast({ title: `Evidence coverage ${coverage}%`, description: gaps ? `${gaps} requirement gap${gaps === 1 ? "" : "s"} still need proof.` : "Every captured requirement has at least one supporting evidence candidate." });
    },
    onError: (error: any) => {
      toast({ title: "Evidence matching could not run", description: error?.message || "Add requirements and try again.", variant: "destructive" });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest("POST", `/api/contractops/opportunities/${opportunityId}/score`, {});
      return response.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
      const assessment = data?.assessment as BidAssessment | undefined;
      toast({
        title: `Advisory readiness: ${assessment?.overallScore ?? 0}%`,
        description: `${(assessment?.recommendation || "HUMAN_REVIEW").replace(/_/g, " ")} — final BID / NO BID remains a human decision.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Readiness scoring could not run", description: error?.message || "Capture requirements first.", variant: "destructive" });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async (state: { opportunityId: string; decision: "BID" | "NO_BID"; rationale: string }) => {
      const response = await apiRequest("PUT", `/api/contractops/opportunities/${state.opportunityId}/decision`, {
        decision: state.decision,
        rationale: state.rationale,
      });
      return response.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
      setDecisionState(null);
      toast({ title: `Human decision recorded: ${data?.humanDecision?.decision || "RECORDED"}`, description: "The decision and rationale were added to the audit trail. No external submission was performed." });
    },
    onError: (error: any) => {
      toast({ title: "Could not record decision", description: error?.message || "Owner/admin authorization is required.", variant: "destructive" });
    },
  });

  const opportunities = opportunitiesData?.opportunities ?? [];
  const readinessCards = [
    { label: "CAGE", value: summary?.cage.status || "PENDING", detail: summary?.cage.identifier ? `Verified identifier: ${summary.cage.identifier}` : "Waiting for issued + verified identifier", tone: "text-amber-500" },
    { label: "Opportunities", value: String(summary?.opportunityCount ?? 0), detail: "Persisted federal opportunity records", tone: "text-cyan-500" },
    { label: "Scored", value: String(summary?.scoredCount ?? 0), detail: "Advisory readiness assessments completed", tone: "text-violet-500" },
    { label: "Evidence Rule", value: summary?.evidenceRule === false ? "OFF" : "ON", detail: "Material claims require traceable proof", tone: "text-green-500" },
  ];

  return (
    <div className="space-y-6" data-testid="contractops-page">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 md:p-8 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#22d3ee_0,transparent_35%),radial-gradient(circle_at_85%_30%,#a855f7_0,transparent_35%)]" />
        <div className="relative max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className="bg-cyan-400/15 text-cyan-200 border-cyan-300/30">NXYZ</Badge>
            <Badge className="bg-violet-400/15 text-violet-200 border-violet-300/30">ZYRA ECOSYSTEM</Badge>
            <Badge className="bg-amber-400/15 text-amber-200 border-amber-300/30">FEDERAL READINESS</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 border border-white/10"><Landmark className="h-8 w-8 text-cyan-300" /></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">NXYZ ContractOps</h1>
              <p className="mt-2 text-sm md:text-base text-slate-200 max-w-3xl leading-relaxed">
                Beginner-first federal opportunity readiness: registrations → requirements → ZYRA capabilities → evidence → advisory scoring → human decision → proposal readiness.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              <strong className="text-white">Beginner rule:</strong> a score is advice, not a federal eligibility determination. Humans make the final BID / NO BID decision and external submission remains outside autonomous execution.
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200 font-black"><Plus className="h-4 w-4 mr-2" />Capture opportunity</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Capture a federal opportunity</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Opportunity title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AI / data modernization support" /></div>
                  <div><Label>Agency *</Label><Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="Agency name" /></div>
                  <div><Label>Solicitation number</Label><Input value={form.solicitationNumber} onChange={(e) => setForm({ ...form, solicitationNumber: e.target.value })} placeholder="Solicitation / topic ID" /></div>
                  <div className="sm:col-span-2"><Label>Official source URL *</Label><Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://..." /></div>
                  <div><Label>Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                  <div><Label>Set-aside</Label><Input value={form.setAside} onChange={(e) => setForm({ ...form, setAside: e.target.value })} placeholder="Small business, STTR, etc." /></div>
                  <div><Label>NAICS</Label><Input value={form.naics} onChange={(e) => setForm({ ...form, naics: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6 digits" /></div>
                  <div><Label>PSC</Label><Input value={form.psc} onChange={(e) => setForm({ ...form, psc: e.target.value })} placeholder="Product/service code" /></div>
                  <div className="sm:col-span-2"><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What is the government asking for?" rows={3} /></div>
                  <div className="sm:col-span-2"><Label>Requirements — one per line</Label><Textarea value={form.requirementsText} onChange={(e) => setForm({ ...form, requirementsText: e.target.value })} placeholder={"Secure cloud deployment\nAI/ML capability\nTechnical data ingestion\nHuman review workflow"} rows={6} /></div>
                </div>
                <Button disabled={captureMutation.isPending || !form.title || !form.agency || !form.sourceUrl} onClick={() => captureMutation.mutate()} className="w-full">
                  {captureMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSearch className="h-4 w-4 mr-2" />}
                  Save opportunity to ContractOps
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readinessCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className={`mt-1 text-2xl font-black ${item.tone}`}>{summaryLoading ? "…" : item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <RegistrationControl canEdit={canDecide} />

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4 text-cyan-500" />Opportunity queue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {opportunitiesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading opportunities…</div>
            ) : opportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <FileSearch className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div className="mt-2 text-sm font-semibold">No opportunities captured yet</div>
                <p className="mt-1 text-xs text-muted-foreground">Use Capture opportunity to store the first real solicitation. ContractOps will not fabricate sample federal records.</p>
              </div>
            ) : opportunities.map((opportunity) => {
              const matches = Array.isArray(opportunity.evidenceMatches) ? opportunity.evidenceMatches : [];
              const gapCount = matches.filter((match) => match.state === "GAP").length;
              const assessment = opportunity.bidAssessment;
              return (
                <div key={opportunity.id} className="rounded-xl border p-4 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-sm">{opportunity.title}</div>
                        <Badge variant="outline" className="text-[10px]">{opportunity.status}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${opportunity.bidDecision === "BID" ? "text-green-600" : opportunity.bidDecision === "NO_BID" ? "text-red-600" : "text-amber-600"}`}>{opportunity.bidDecision.replace(/_/g, " ")}</Badge>
                        {opportunity.evidenceCoverageReady && <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">EVIDENCE READY</Badge>}
                        {!opportunity.evidenceCoverageReady && matches.length > 0 && <Badge variant="outline" className="text-[10px] text-orange-600">{gapCount} EVIDENCE GAP{gapCount === 1 ? "" : "S"}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{opportunity.agency}{opportunity.solicitationNumber ? ` · ${opportunity.solicitationNumber}` : ""}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Deadline: {formatDeadline(opportunity.deadline)}</span>
                        {opportunity.naics && <span>NAICS: {opportunity.naics}</span>}
                        {opportunity.psc && <span>PSC: {opportunity.psc}</span>}
                        <span>Requirements: {Array.isArray(opportunity.requirements) ? opportunity.requirements.length : 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={!opportunity.requirements?.length || (evidenceMutation.isPending && evidenceMutation.variables === opportunity.id)} onClick={() => evidenceMutation.mutate(opportunity.id)}>
                        {evidenceMutation.isPending && evidenceMutation.variables === opportunity.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5 mr-1" />}Match evidence
                      </Button>
                      <Button size="sm" disabled={!opportunity.requirements?.length || (scoreMutation.isPending && scoreMutation.variables === opportunity.id)} onClick={() => scoreMutation.mutate(opportunity.id)}>
                        {scoreMutation.isPending && scoreMutation.variables === opportunity.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Gauge className="h-3.5 w-3.5 mr-1" />}Score readiness
                      </Button>
                      <Button variant="outline" size="sm" asChild><a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3.5 w-3.5 ml-1" /></a></Button>
                    </div>
                  </div>

                  {matches.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requirement evidence matrix</div>
                      {matches.slice(0, 5).map((match, index) => (
                        <div key={`${opportunity.id}-match-${index}`} className="rounded-lg bg-muted/40 p-2.5">
                          <div className="flex items-start gap-2 justify-between">
                            <div className="text-xs font-medium leading-relaxed">{match.requirement}</div>
                            <Badge variant="outline" className={match.state === "GAP" ? "text-red-600 border-red-500/30" : "text-green-600 border-green-500/30"}>{match.state === "GAP" ? "GAP" : `${match.topScore}% MATCH`}</Badge>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{match.candidates?.length ? `Top evidence: ${match.candidates[0].label} · ${match.candidates[0].domain}` : "No supporting ZYRA evidence candidate found yet."}</div>
                        </div>
                      ))}
                      {matches.length > 5 && <div className="text-[11px] text-muted-foreground">+ {matches.length - 5} more requirement matches stored in ContractOps.</div>}
                    </div>
                  )}

                  {assessment && (
                    <div className="border-t pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`text-3xl font-black ${scoreTone(assessment.overallScore)}`}>{assessment.overallScore}</div>
                          <div><div className="text-xs font-bold">ADVISORY READINESS / 100</div><div className="text-[11px] text-muted-foreground">{assessment.recommendation.replace(/_/g, " ")} · human decision required</div></div>
                        </div>
                        {opportunity.bidDecision === "UNDER_REVIEW" && canDecide && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => setDecisionState({ opportunityId: opportunity.id, decision: "BID", rationale: "" })}><ThumbsUp className="h-3.5 w-3.5 mr-1" />BID</Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setDecisionState({ opportunityId: opportunity.id, decision: "NO_BID", rationale: "" })}><ThumbsDown className="h-3.5 w-3.5 mr-1" />NO BID</Button>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 mt-4 sm:grid-cols-2">
                        <ScoreBar label="Technical fit proxy · 35%" value={assessment.dimensions.technicalFitProxy} />
                        <ScoreBar label="Evidence coverage · 30%" value={assessment.dimensions.evidenceCoverage} />
                        <ScoreBar label="Recorded registration readiness · 20%" value={assessment.dimensions.registrationReadiness} />
                        <ScoreBar label="Deadline readiness · 15%" value={assessment.dimensions.deadlineReadiness} />
                      </div>
                      {assessment.blockers?.length > 0 && (
                        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">BLOCKERS / FLAGS</div>
                          <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">{assessment.blockers.map((blocker, index) => <div key={index}>• {blocker}</div>)}</div>
                        </div>
                      )}
                      {assessment.humanDecision && <div className="mt-3 text-xs"><strong>Human decision:</strong> {assessment.humanDecision.decision} — {assessment.humanDecision.rationale}</div>}
                      {!canDecide && opportunity.bidDecision === "UNDER_REVIEW" && <div className="mt-3 text-[11px] text-muted-foreground">Owner or admin authorization is required to record the final BID / NO BID decision.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="h-4 w-4 text-green-500" />ZYRA evidence domains</CardTitle></CardHeader>
            <CardContent><p className="text-xs text-muted-foreground mb-3">ContractOps uses issuer credentials and repository evidence as supporting evidence candidates when the requirement actually matches. Evidence never becomes government authorization automatically.</p><div className="flex flex-wrap gap-2">{credentialDomains.map((domain) => <Badge key={domain} variant="outline">{domain}</Badge>)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-cyan-500" />Hard guardrails</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>• Never invent SAM, UEI, CAGE, or other registration identifiers.</div>
              <div>• Registration state becomes ACTIVE only after a verification source exists.</div>
              <div>• RVIA badges are repository credentials, not government authority or clearance.</div>
              <div>• Readiness scores are advisory, transparent, and never final agency evaluations.</div>
              <div>• Final BID / NO BID is human-recorded with rationale.</div>
              <div>• External submission remains human-controlled.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" />How the ecosystem works</CardTitle></CardHeader>
          <CardContent className="space-y-3">{workflow.map(([number, title, text]) => <div key={number} className="flex gap-3 rounded-xl border p-3"><div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">{number}</div><div><div className="text-sm font-semibold">{title}</div><div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</div></div></div>)}</CardContent>
        </Card>
        <div className="space-y-4">
          <Card><CardContent className="p-5"><FileSearch className="h-5 w-5 text-cyan-500" /><div className="mt-3 font-semibold">Opportunity Intake</div><p className="mt-1 text-xs text-muted-foreground">Source URL, agency, deadline, NAICS/PSC, set-aside, summary, and normalized requirements persist in PostgreSQL.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
          <Card><CardContent className="p-5"><FileCheck2 className="h-5 w-5 text-violet-500" /><div className="mt-3 font-semibold">Evidence + Bid Scoring</div><p className="mt-1 text-xs text-muted-foreground">Requirement evidence matching and weighted advisory readiness scoring are live, with explicit blockers and human final decision.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
          <Card><CardContent className="p-5"><CalendarClock className="h-5 w-5 text-amber-500" /><div className="mt-3 font-semibold">Proposal Control</div><p className="mt-1 text-xs text-muted-foreground">Next: proposal sections, claim-to-evidence citations, blocker resolution, approval state, and submission-readiness package.</p><Badge variant="outline" className="mt-4">NEXT BUILD</Badge></CardContent></Card>
        </div>
      </section>

      <Card><CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between"><div className="flex items-start gap-3"><Building2 className="h-5 w-5 text-primary mt-0.5" /><div><div className="font-semibold">Operational ContractOps core</div><div className="text-xs text-muted-foreground">Organization-scoped PostgreSQL + authenticated API + registration control + audit logs + opportunity intake + evidence matrix + advisory scoring + human BID / NO BID decision.</div></div></div><Badge variant="outline" className="w-fit">v0.5 registration control</Badge></CardContent></Card>

      <Dialog open={Boolean(decisionState)} onOpenChange={(open) => { if (!open) setDecisionState(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record human {decisionState?.decision === "BID" ? "BID" : "NO BID"} decision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This records a human capture decision with rationale. It does not submit anything to an agency, portal, or external system.</p>
            <div><Label>Decision rationale *</Label><Textarea rows={5} value={decisionState?.rationale || ""} onChange={(e) => decisionState && setDecisionState({ ...decisionState, rationale: e.target.value })} placeholder="Why are we pursuing or declining this opportunity?" /></div>
            <Button className="w-full" disabled={!decisionState || decisionState.rationale.trim().length < 3 || decisionMutation.isPending} onClick={() => decisionState && decisionMutation.mutate(decisionState)}>
              {decisionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record {decisionState?.decision === "BID" ? "BID" : "NO BID"} decision
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
