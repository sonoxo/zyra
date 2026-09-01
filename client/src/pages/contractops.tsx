import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Gauge,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
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
import { ProposalWorkspace } from "@/components/contractops/ProposalWorkspace";
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
  requirements: string[];
  evidenceMatches: EvidenceMatch[];
  bidAssessment: BidAssessment | null;
  status: string;
  bidDecision: "UNDER_REVIEW" | "BID" | "NO_BID";
  evidenceCoverageReady: boolean;
};

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

function formatDeadline(value: string | null) {
  if (!value) return "No deadline recorded";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ContractOpsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [decisionState, setDecisionState] = useState<{ opportunityId: string; decision: "BID" | "NO_BID"; rationale: string } | null>(null);

  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });
  const canDecide = user?.role === "owner" || user?.role === "admin";
  const { data: summary, isLoading: summaryLoading } = useQuery<ContractOpsSummary>({ queryKey: ["/api/contractops/summary"] });
  const { data: opportunityData, isLoading: opportunitiesLoading } = useQuery<{ opportunities: ContractOpsOpportunity[] }>({ queryKey: ["/api/contractops/opportunities"] });
  const opportunities = opportunityData?.opportunities ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
    qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
    qc.invalidateQueries({ queryKey: ["/api/contractops/proposals"] });
  };

  const captureMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/contractops/opportunities", {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        naics: form.naics || undefined,
        psc: form.psc || undefined,
        solicitationNumber: form.solicitationNumber || undefined,
        setAside: form.setAside || undefined,
        summary: form.summary || undefined,
        requirementsText: form.requirementsText || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      refresh();
      setForm(emptyForm);
      setDialogOpen(false);
      toast({ title: "Opportunity captured", description: "The official source metadata and requirement lines were stored in ContractOps." });
    },
    onError: (error: any) => toast({ title: "Could not capture opportunity", description: error?.message || "Check the required fields.", variant: "destructive" }),
  });

  const evidenceMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest("POST", `/api/contractops/opportunities/${opportunityId}/evidence-match`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refresh();
      toast({ title: `Evidence coverage ${data?.matrix?.coveragePercent ?? 0}%`, description: `${data?.matrix?.gapCount ?? 0} unresolved evidence gap(s).` });
    },
    onError: (error: any) => toast({ title: "Evidence matching failed", description: error?.message || "Add requirements first.", variant: "destructive" }),
  });

  const scoreMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest("POST", `/api/contractops/opportunities/${opportunityId}/score`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refresh();
      toast({ title: `Advisory readiness ${data?.assessment?.overallScore ?? 0}%`, description: "The score is advisory only. Final BID / NO BID remains human-controlled." });
    },
    onError: (error: any) => toast({ title: "Readiness scoring failed", description: error?.message || "Capture requirements first.", variant: "destructive" }),
  });

  const decisionMutation = useMutation({
    mutationFn: async (state: NonNullable<typeof decisionState>) => {
      const response = await apiRequest("PUT", `/api/contractops/opportunities/${state.opportunityId}/decision`, { decision: state.decision, rationale: state.rationale });
      return response.json();
    },
    onSuccess: (data) => {
      refresh();
      setDecisionState(null);
      toast({ title: `Human decision: ${data?.humanDecision?.decision || "RECORDED"}`, description: "The decision and rationale were audited. No government portal action occurred." });
    },
    onError: (error: any) => toast({ title: "Decision could not be recorded", description: error?.message || "Owner/admin access is required.", variant: "destructive" }),
  });

  const readinessCards = [
    { label: "CAGE", value: summary?.cage.status || "PENDING", detail: summary?.cage.identifier ? `Verified identifier: ${summary.cage.identifier}` : "Waiting for issued + verified identifier", tone: "text-amber-500" },
    { label: "Opportunities", value: String(summary?.opportunityCount ?? 0), detail: "Persisted opportunity records", tone: "text-cyan-500" },
    { label: "Submission Ready", value: String(summary?.submissionReadyCount ?? 0), detail: "Internal packages that passed human review", tone: "text-violet-500" },
    { label: "Evidence Rule", value: summary?.evidenceRule === false ? "OFF" : "ON", detail: "Material claims require traceable proof", tone: "text-green-500" },
  ];

  return (
    <div className="space-y-6" data-testid="contractops-page">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 md:p-8 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#22d3ee_0,transparent_35%),radial-gradient(circle_at_85%_30%,#a855f7_0,transparent_35%)]" />
        <div className="relative max-w-5xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className="bg-cyan-400/15 text-cyan-200 border-cyan-300/30">NXYZ</Badge>
            <Badge className="bg-violet-400/15 text-violet-200 border-violet-300/30">ZYRA ECOSYSTEM</Badge>
            <Badge className="bg-amber-400/15 text-amber-200 border-amber-300/30">FEDERAL READINESS</Badge>
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 border border-white/10"><Landmark className="h-8 w-8 text-cyan-300" /></div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">NXYZ ContractOps</h1>
              <p className="mt-2 text-sm md:text-base text-slate-200 max-w-3xl leading-relaxed">Registration control → opportunity intake → evidence matching → advisory scoring → human BID decision → governed proposal workspace → internal submission readiness.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200"><strong className="text-white">Control rule:</strong> ContractOps may organize and draft from recorded evidence, but it does not invent registration identifiers, certify eligibility, sign representations, commit pricing, or submit to an agency portal.</div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-cyan-300 text-slate-950 hover:bg-cyan-200 font-black"><Plus className="h-4 w-4 mr-2" />Capture opportunity</Button></DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Capture a federal opportunity</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Opportunity title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Agency *</Label><Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} /></div>
                  <div><Label>Solicitation number</Label><Input value={form.solicitationNumber} onChange={(e) => setForm({ ...form, solicitationNumber: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Official source URL *</Label><Input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://..." /></div>
                  <div><Label>Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                  <div><Label>Set-aside</Label><Input value={form.setAside} onChange={(e) => setForm({ ...form, setAside: e.target.value })} /></div>
                  <div><Label>NAICS</Label><Input value={form.naics} onChange={(e) => setForm({ ...form, naics: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6 digits" /></div>
                  <div><Label>PSC</Label><Input value={form.psc} onChange={(e) => setForm({ ...form, psc: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Summary</Label><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Requirements — one per line</Label><Textarea rows={6} value={form.requirementsText} onChange={(e) => setForm({ ...form, requirementsText: e.target.value })} placeholder={"Secure cloud deployment\nAI/ML capability\nTechnical data ingestion\nHuman review workflow"} /></div>
                </div>
                <Button className="w-full" disabled={captureMutation.isPending || !form.title || !form.agency || !form.sourceUrl} onClick={() => captureMutation.mutate()}>{captureMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save opportunity</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readinessCards.map((item) => <Card key={item.label}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{item.label}</div><div className={`mt-1 text-2xl font-black ${item.tone}`}>{summaryLoading ? "…" : item.value}</div><div className="mt-1 text-xs text-muted-foreground">{item.detail}</div></CardContent></Card>)}
      </section>

      <RegistrationControl canEdit={canDecide} />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4 text-cyan-500" />Opportunity Qualification Queue</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {opportunitiesLoading ? <div className="text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading opportunities…</div> : opportunities.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No opportunity has been captured. ContractOps does not seed fake federal records.</div>
          ) : opportunities.map((opportunity) => {
            const matches = Array.isArray(opportunity.evidenceMatches) ? opportunity.evidenceMatches : [];
            const assessment = opportunity.bidAssessment;
            return (
              <div key={opportunity.id} className="rounded-xl border p-4 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 items-center"><span className="font-semibold">{opportunity.title}</span><Badge variant="outline">{opportunity.status.replace(/_/g, " ")}</Badge><Badge variant="outline" className={opportunity.bidDecision === "BID" ? "text-green-600" : opportunity.bidDecision === "NO_BID" ? "text-red-600" : "text-amber-600"}>{opportunity.bidDecision.replace(/_/g, " ")}</Badge></div>
                    <div className="mt-1 text-xs text-muted-foreground">{opportunity.agency}{opportunity.solicitationNumber ? ` · ${opportunity.solicitationNumber}` : ""}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>{formatDeadline(opportunity.deadline)}</span>{opportunity.naics && <span>NAICS {opportunity.naics}</span>}{opportunity.psc && <span>PSC {opportunity.psc}</span>}<span>{opportunity.requirements?.length || 0} requirements</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!opportunity.requirements?.length || evidenceMutation.isPending} onClick={() => evidenceMutation.mutate(opportunity.id)}><BadgeCheck className="h-3.5 w-3.5 mr-1" />Match evidence</Button>
                    <Button size="sm" disabled={!opportunity.requirements?.length || scoreMutation.isPending} onClick={() => scoreMutation.mutate(opportunity.id)}><Gauge className="h-3.5 w-3.5 mr-1" />Score</Button>
                    <Button size="sm" variant="outline" asChild><a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3.5 w-3.5 ml-1" /></a></Button>
                  </div>
                </div>

                {matches.length > 0 && <div className="grid gap-2 md:grid-cols-2">{matches.slice(0, 6).map((match, index) => <div key={index} className="rounded-lg bg-muted/40 p-3"><div className="flex gap-2 justify-between"><span className="text-xs font-medium">{match.requirement}</span><Badge variant="outline" className={match.state === "GAP" ? "text-red-600" : "text-green-600"}>{match.state === "GAP" ? "GAP" : `${match.topScore}%`}</Badge></div><div className="mt-1 text-[11px] text-muted-foreground">{match.candidates?.[0] ? `${match.candidates[0].label} · ${match.candidates[0].domain}` : "No evidence candidate resolved."}</div></div>)}</div>}

                {assessment && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3"><div className={`text-3xl font-black ${scoreTone(assessment.overallScore)}`}>{assessment.overallScore}</div><div><div className="text-xs font-bold">ADVISORY READINESS / 100</div><div className="text-[11px] text-muted-foreground">{assessment.recommendation.replace(/_/g, " ")} · human decision required</div></div></div>
                      {canDecide && opportunity.bidDecision === "UNDER_REVIEW" && <div className="flex gap-2"><Button size="sm" variant="outline" className="text-green-600" onClick={() => setDecisionState({ opportunityId: opportunity.id, decision: "BID", rationale: "" })}><ThumbsUp className="h-3.5 w-3.5 mr-1" />BID</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => setDecisionState({ opportunityId: opportunity.id, decision: "NO_BID", rationale: "" })}><ThumbsDown className="h-3.5 w-3.5 mr-1" />NO BID</Button></div>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2"><ScoreBar label="Technical fit proxy · 35%" value={assessment.dimensions.technicalFitProxy} /><ScoreBar label="Evidence coverage · 30%" value={assessment.dimensions.evidenceCoverage} /><ScoreBar label="Registration readiness · 20%" value={assessment.dimensions.registrationReadiness} /><ScoreBar label="Deadline readiness · 15%" value={assessment.dimensions.deadlineReadiness} /></div>
                    {assessment.blockers?.length > 0 && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground">{assessment.blockers.map((blocker, index) => <div key={index}>• {blocker}</div>)}</div>}
                    {assessment.humanDecision && <div className="text-xs"><strong>Human decision:</strong> {assessment.humanDecision.decision} — {assessment.humanDecision.rationale}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ProposalWorkspace />

      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><FileSearch className="h-5 w-5 text-cyan-500" /><div className="mt-3 font-semibold">Opportunity Intake</div><p className="mt-1 text-xs text-muted-foreground">Persisted source metadata and normalized requirements.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
        <Card><CardContent className="p-5"><FileCheck2 className="h-5 w-5 text-violet-500" /><div className="mt-3 font-semibold">Evidence + Scoring</div><p className="mt-1 text-xs text-muted-foreground">Evidence matching, transparent weighted readiness, and human BID / NO BID.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
        <Card><CardContent className="p-5"><CalendarClock className="h-5 w-5 text-amber-500" /><div className="mt-3 font-semibold">Proposal Control</div><p className="mt-1 text-xs text-muted-foreground">Database-backed sections, blockers, readiness refresh, human review, and internal SUBMISSION_READY state.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
      </section>

      <Card><CardContent className="p-5"><div className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-primary mt-0.5" /><div><div className="font-semibold">Human-in-command federal workflow</div><div className="text-xs text-muted-foreground mt-1">ContractOps organizes evidence and readiness. External submission, certifications, signatures, pricing commitments, representations, and agency interactions remain human-controlled.</div></div></div></CardContent></Card>

      <Dialog open={Boolean(decisionState)} onOpenChange={(open) => { if (!open) setDecisionState(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record human {decisionState?.decision === "BID" ? "BID" : "NO BID"} decision</DialogTitle></DialogHeader>
          <div className="space-y-3"><p className="text-sm text-muted-foreground">This is an internal capture decision. It does not submit to an agency or government portal.</p><div><Label>Decision rationale *</Label><Textarea rows={5} value={decisionState?.rationale || ""} onChange={(e) => decisionState && setDecisionState({ ...decisionState, rationale: e.target.value })} /></div><Button className="w-full" disabled={!decisionState || decisionState.rationale.trim().length < 3 || decisionMutation.isPending} onClick={() => decisionState && decisionMutation.mutate(decisionState)}>{decisionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record decision</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
