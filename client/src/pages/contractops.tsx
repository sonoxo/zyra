import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ContractOpsSummary = {
  cage: { status: string; identifier: string | null; verificationSource: string | null };
  opportunityCount: number;
  submissionReadyCount: number;
  evidenceReadyCount: number;
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
  status: string;
  bidDecision: string;
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

export default function ContractOpsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

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
      toast({ title: "Opportunity captured", description: "ContractOps stored the source and requirement evidence for review." });
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

  const opportunities = opportunitiesData?.opportunities ?? [];
  const readinessCards = [
    { label: "CAGE", value: summary?.cage.status || "PENDING", detail: summary?.cage.identifier ? `Verified identifier: ${summary.cage.identifier}` : "Waiting for issued + verified identifier", tone: "text-amber-500" },
    { label: "Opportunities", value: String(summary?.opportunityCount ?? 0), detail: "Persisted federal opportunity records", tone: "text-cyan-500" },
    { label: "Evidence Ready", value: String(summary?.evidenceReadyCount ?? 0), detail: "Every captured requirement has a supporting candidate", tone: "text-violet-500" },
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
                Beginner-first federal opportunity readiness: registrations → requirements → ZYRA capabilities → evidence → proposal review → submission readiness.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              <strong className="text-white">Beginner rule:</strong> if Zyra cannot trace a material proposal claim to evidence, ContractOps does not mark that claim ready.
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

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileSearch className="h-4 w-4 text-cyan-500" />Opportunity queue</CardTitle>
          </CardHeader>
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
              return (
                <div key={opportunity.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-sm">{opportunity.title}</div>
                        <Badge variant="outline" className="text-[10px]">{opportunity.status}</Badge>
                        <Badge variant="outline" className="text-[10px] text-amber-600">{opportunity.bidDecision.replace(/_/g, " ")}</Badge>
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
                      <Button
                        variant="default"
                        size="sm"
                        disabled={!Array.isArray(opportunity.requirements) || opportunity.requirements.length === 0 || (evidenceMutation.isPending && evidenceMutation.variables === opportunity.id)}
                        onClick={() => evidenceMutation.mutate(opportunity.id)}
                      >
                        {evidenceMutation.isPending && evidenceMutation.variables === opportunity.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5 mr-1" />}
                        Match evidence
                      </Button>
                      <Button variant="outline" size="sm" asChild><a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3.5 w-3.5 ml-1" /></a></Button>
                    </div>
                  </div>

                  {matches.length > 0 && (
                    <div className="mt-4 border-t pt-3 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requirement evidence matrix</div>
                      {matches.slice(0, 5).map((match, index) => (
                        <div key={`${opportunity.id}-match-${index}`} className="rounded-lg bg-muted/40 p-2.5">
                          <div className="flex items-start gap-2 justify-between">
                            <div className="text-xs font-medium leading-relaxed">{match.requirement}</div>
                            <Badge variant="outline" className={match.state === "GAP" ? "text-red-600 border-red-500/30" : "text-green-600 border-green-500/30"}>{match.state === "GAP" ? "GAP" : `${match.topScore}% MATCH`}</Badge>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {match.candidates?.length ? `Top evidence: ${match.candidates[0].label} · ${match.candidates[0].domain}` : "No supporting ZYRA evidence candidate found yet."}
                          </div>
                        </div>
                      ))}
                      {matches.length > 5 && <div className="text-[11px] text-muted-foreground">+ {matches.length - 5} more requirement matches stored in ContractOps.</div>}
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
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">ContractOps uses issuer credentials and repository evidence as supporting evidence candidates when the requirement actually matches. Evidence never becomes government authorization automatically.</p>
              <div className="flex flex-wrap gap-2">{credentialDomains.map((domain) => <Badge key={domain} variant="outline">{domain}</Badge>)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-cyan-500" />Hard guardrails</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>• Never invent SAM, UEI, CAGE, or other registration identifiers.</div>
              <div>• Registration state becomes ACTIVE only after a verification source exists.</div>
              <div>• RVIA badges are repository credentials, not government authority or clearance.</div>
              <div>• Evidence matches are proposal-support candidates, not eligibility determinations.</div>
              <div>• External submission remains human-controlled.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" />How the ecosystem works</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {workflow.map(([number, title, text]) => (
              <div key={number} className="flex gap-3 rounded-xl border p-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">{number}</div>
                <div><div className="text-sm font-semibold">{title}</div><div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</div></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card><CardContent className="p-5"><FileSearch className="h-5 w-5 text-cyan-500" /><div className="mt-3 font-semibold">Opportunity Intake</div><p className="mt-1 text-xs text-muted-foreground">LIVE: source URL, agency, deadline, NAICS/PSC, set-aside, summary, and normalized requirement lines are stored in PostgreSQL.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
          <Card><CardContent className="p-5"><FileCheck2 className="h-5 w-5 text-violet-500" /><div className="mt-3 font-semibold">Evidence Matching</div><p className="mt-1 text-xs text-muted-foreground">LIVE: deterministic requirement matching uses the ZYRA credential/repository evidence catalog, persists the matrix, and exposes evidence gaps.</p><Badge className="mt-4 bg-green-500/10 text-green-600 border-green-500/20">IMPLEMENTED</Badge></CardContent></Card>
          <Card><CardContent className="p-5"><CalendarClock className="h-5 w-5 text-amber-500" /><div className="mt-3 font-semibold">Proposal Control</div><p className="mt-1 text-xs text-muted-foreground">Next: Bid / No-Bid scoring, proposal claims, blockers, approval state, and human-controlled submission readiness.</p><Badge variant="outline" className="mt-4">NEXT BUILD</Badge></CardContent></Card>
        </div>
      </section>

      <Card>
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3"><Building2 className="h-5 w-5 text-primary mt-0.5" /><div><div className="font-semibold">Operational ContractOps core</div><div className="text-xs text-muted-foreground">Organization-scoped PostgreSQL records + authenticated API + audit logging + opportunity intake + deterministic credential/repository evidence matching.</div></div></div>
          <Badge variant="outline" className="w-fit">v0.3 evidence matching</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
