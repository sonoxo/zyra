import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileJson2, FilePenLine, Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/lib/auth";

type Opportunity = {
  id: string;
  title: string;
  agency: string;
  bidDecision: string;
  status: string;
};

type ProposalSection = {
  id: string;
  key: string;
  title: string;
  ordinal: number;
  content: string;
  status: "DRAFT" | "EVIDENCE_NEEDED" | "READY";
  requirementRefs: string[];
  evidenceRefs: string[];
};

type ProposalReadiness = {
  ready: boolean;
  policy: string;
  blockers: string[];
  readySectionCount: number;
  requiredSectionCount: number;
  evidenceGapCount: number;
  registrationFlags: string[];
  warning: string;
};

type Proposal = {
  id: string;
  opportunityId: string;
  title: string;
  status: string;
  reviewDecision: string;
  blockers: string[];
  readiness: ProposalReadiness | Record<string, never>;
  reviewNotes: string | null;
  sections: ProposalSection[];
};

type SubmissionPackageResponse = {
  manifest: {
    packageId: string;
    generatedAt: string;
    internalStatus: "SUBMISSION_READY";
    externalSubmissionPerformed: false;
    [key: string]: unknown;
  };
  markdown: string;
};

type PackageFormat = "markdown" | "json";

function proposalStatusTone(status: string) {
  if (status === "SUBMISSION_READY") return "bg-green-500/10 text-green-600 border-green-500/20";
  if (status === "REJECTED") return "bg-red-500/10 text-red-600 border-red-500/20";
  if (status === "REVIEW_CHANGES") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-violet-500/10 text-violet-600 border-violet-500/20";
}

function saveBrowserFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function SectionEditor({
  proposalId,
  section,
  canEdit,
  onSaved,
}: {
  proposalId: string;
  section: ProposalSection;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState(section.content);
  const [status, setStatus] = useState<ProposalSection["status"]>(section.status);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/contractops/proposals/${proposalId}/sections/${section.id}`, { content, status });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: `${section.title} saved`, description: status === "READY" ? "Section is marked READY for the human review gate." : "Draft state and content were saved." });
      onSaved();
    },
    onError: (error: any) => toast({ title: "Section could not be saved", description: error?.message || "Check the section and try again.", variant: "destructive" }),
  });

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{section.ordinal / 10}. {section.title}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Requirements linked: {section.requirementRefs?.length || 0} · Evidence refs: {section.evidenceRefs?.length || 0}</div>
        </div>
        <Badge variant="outline" className={status === "READY" ? "text-green-600 border-green-500/30" : status === "EVIDENCE_NEEDED" ? "text-amber-600 border-amber-500/30" : ""}>{status.replace(/_/g, " ")}</Badge>
      </div>
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} disabled={!canEdit} className="font-mono text-xs leading-relaxed" aria-label={`${section.title} content`} />
      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={status} onChange={(event) => setStatus(event.target.value as ProposalSection["status"])} className="h-9 rounded-md border bg-background px-3 text-xs" aria-label={`${section.title} status`}>
            <option value="DRAFT">Draft</option>
            <option value="EVIDENCE_NEEDED">Evidence needed</option>
            <option value="READY">Ready</option>
          </select>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || (content === section.content && status === section.status)}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Save section
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProposalWorkspace() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [reviewState, setReviewState] = useState<{ proposalId: string; decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED"; notes: string } | null>(null);
  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });
  const { data: opportunityData } = useQuery<{ opportunities: Opportunity[] }>({ queryKey: ["/api/contractops/opportunities"] });
  const { data: proposalData, isLoading } = useQuery<{ proposals: Proposal[] }>({ queryKey: ["/api/contractops/proposals"] });

  const proposals = proposalData?.proposals ?? [];
  const canEdit = user?.role === "owner" || user?.role === "admin" || user?.role === "analyst";
  const canReview = user?.role === "owner" || user?.role === "admin";
  const canExport = canEdit;
  const availableBids = useMemo(() => {
    const existing = new Set(proposals.map((proposal) => proposal.opportunityId));
    return (opportunityData?.opportunities ?? []).filter((opportunity) => opportunity.bidDecision === "BID" && !existing.has(opportunity.id));
  }, [opportunityData?.opportunities, proposals]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/contractops/proposals"] });
    qc.invalidateQueries({ queryKey: ["/api/contractops/opportunities"] });
    qc.invalidateQueries({ queryKey: ["/api/contractops/summary"] });
  };

  const createMutation = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await apiRequest("POST", `/api/contractops/opportunities/${opportunityId}/proposal`, {});
      return response.json();
    },
    onSuccess: () => {
      refreshAll();
      toast({ title: "Proposal workspace created", description: "ContractOps generated governed draft sections from captured requirements and evidence. No external submission occurred." });
    },
    onError: (error: any) => toast({ title: "Proposal could not be created", description: error?.message || "A confirmed human BID decision is required.", variant: "destructive" }),
  });

  const readinessMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      const response = await apiRequest("POST", `/api/contractops/proposals/${proposalId}/refresh-readiness`, {});
      return response.json();
    },
    onSuccess: (data) => {
      refreshAll();
      const readiness = data?.readiness as ProposalReadiness | undefined;
      toast({ title: readiness?.ready ? "Proposal gate is clear" : "Readiness refreshed", description: readiness?.ready ? "Owner/admin may perform final internal approval." : `${readiness?.blockers?.length || 0} blocker${readiness?.blockers?.length === 1 ? "" : "s"} remain.` });
    },
    onError: (error: any) => toast({ title: "Readiness could not refresh", description: error?.message || "Try again.", variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async (state: NonNullable<typeof reviewState>) => {
      const response = await apiRequest("PUT", `/api/contractops/proposals/${state.proposalId}/review`, { decision: state.decision, notes: state.notes });
      return response.json();
    },
    onSuccess: (data) => {
      refreshAll();
      setReviewState(null);
      toast({
        title: `Proposal review: ${data?.proposal?.reviewDecision || "RECORDED"}`,
        description: data?.proposal?.status === "SUBMISSION_READY"
          ? "Internally marked SUBMISSION_READY. ContractOps did not submit to any government portal."
          : "Review decision and notes were recorded in the audit trail.",
      });
    },
    onError: (error: any) => toast({ title: "Review could not be recorded", description: error?.message || "Resolve readiness blockers or check authorization.", variant: "destructive" }),
  });

  const packageMutation = useMutation({
    mutationFn: async ({ proposalId, format }: { proposalId: string; format: PackageFormat }) => {
      const response = await apiRequest("POST", `/api/contractops/proposals/${proposalId}/package`, {});
      const data = await response.json() as SubmissionPackageResponse;
      return { data, format };
    },
    onSuccess: ({ data, format }) => {
      const packageId = data.manifest.packageId || "nxyz-contractops-package";
      if (format === "markdown") {
        saveBrowserFile(`${packageId}.md`, data.markdown, "text/markdown;charset=utf-8");
      } else {
        saveBrowserFile(`${packageId}.json`, JSON.stringify(data.manifest, null, 2), "application/json;charset=utf-8");
      }
      toast({
        title: format === "markdown" ? "Markdown package downloaded" : "JSON manifest downloaded",
        description: "This is an internal reviewed export. No external agency or portal submission was performed.",
      });
    },
    onError: (error: any) => toast({ title: "Submission package could not be generated", description: error?.message || "The proposal must be internally approved and SUBMISSION_READY.", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><FilePenLine className="h-4 w-4 text-violet-500" />Proposal Workspace</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground max-w-3xl">Confirmed BID opportunities become evidence-aware proposal workspaces. Draft content is a framework for human validation, not an autonomous representation to an agency.</p>
          </div>
          {availableBids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableBids.slice(0, 3).map((opportunity) => (
                <Button key={opportunity.id} size="sm" variant="outline" disabled={createMutation.isPending} onClick={() => createMutation.mutate(opportunity.id)}>
                  {createMutation.isPending && createMutation.variables === opportunity.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FilePenLine className="h-3.5 w-3.5 mr-1" />}
                  Build: {opportunity.title.slice(0, 28)}{opportunity.title.length > 28 ? "…" : ""}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading proposal workspaces…</div>
        ) : proposals.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <FilePenLine className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <div className="mt-2 text-sm font-semibold">No proposal workspace yet</div>
            <p className="mt-1 text-xs text-muted-foreground">Run readiness scoring, record a human BID decision, then use the Build button here. No fake proposals are created.</p>
          </div>
        ) : proposals.map((proposal) => {
          const readiness = proposal.readiness as ProposalReadiness;
          const isReady = Boolean(readiness?.ready);
          const exportingThisProposal = packageMutation.isPending && packageMutation.variables?.proposalId === proposal.id;
          return (
            <div key={proposal.id} className="rounded-2xl border overflow-hidden">
              <div className="p-4 bg-muted/30 border-b">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{proposal.title}</div>
                      <Badge variant="outline" className={proposalStatusTone(proposal.status)}>{proposal.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">REVIEW: {proposal.reviewDecision.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">Sections ready: {readiness?.readySectionCount ?? 0}/{readiness?.requiredSectionCount ?? proposal.sections.length} · Evidence gaps: {readiness?.evidenceGapCount ?? 0}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={readinessMutation.isPending} onClick={() => readinessMutation.mutate(proposal.id)}><RefreshCw className={`h-3.5 w-3.5 mr-1 ${readinessMutation.isPending && readinessMutation.variables === proposal.id ? "animate-spin" : ""}`} />Refresh gate</Button>
                    {canReview && proposal.status !== "SUBMISSION_READY" && (
                      <Button size="sm" disabled={!isReady} onClick={() => setReviewState({ proposalId: proposal.id, decision: "APPROVED", notes: "" })}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve ready package</Button>
                    )}
                    {canExport && proposal.status === "SUBMISSION_READY" && proposal.reviewDecision === "APPROVED" && (
                      <>
                        <Button size="sm" variant="outline" disabled={exportingThisProposal} onClick={() => packageMutation.mutate({ proposalId: proposal.id, format: "markdown" })}>
                          {exportingThisProposal && packageMutation.variables?.format === "markdown" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}Markdown
                        </Button>
                        <Button size="sm" variant="outline" disabled={exportingThisProposal} onClick={() => packageMutation.mutate({ proposalId: proposal.id, format: "json" })}>
                          {exportingThisProposal && packageMutation.variables?.format === "json" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileJson2 className="h-3.5 w-3.5 mr-1" />}JSON
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!isReady && readiness?.blockers?.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300"><ShieldAlert className="h-4 w-4" />READINESS BLOCKERS</div>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">{readiness.blockers.map((blocker, index) => <div key={index}>• {blocker}</div>)}</div>
                    {readiness.registrationFlags?.length > 0 && <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">{readiness.registrationFlags.map((flag, index) => <div key={index}>↳ {flag}</div>)}</div>}
                  </div>
                )}
                {isReady && proposal.status !== "SUBMISSION_READY" && <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-300">Internal readiness gate clear. Owner/admin approval can mark this package SUBMISSION_READY; external submission still remains manual.</div>}
              </div>
              <div className="p-4 space-y-3">
                {proposal.sections.map((section) => <SectionEditor key={section.id} proposalId={proposal.id} section={section} canEdit={canEdit && proposal.status !== "SUBMISSION_READY"} onSaved={refreshAll} />)}
                {canReview && proposal.status !== "SUBMISSION_READY" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setReviewState({ proposalId: proposal.id, decision: "CHANGES_REQUESTED", notes: "" })}>Request changes</Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => setReviewState({ proposalId: proposal.id, decision: "REJECTED", notes: "" })}>Reject package</Button>
                  </div>
                )}
                {proposal.status === "SUBMISSION_READY" && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm">
                    <strong>SUBMISSION_READY:</strong> internal review passed. <span className="text-muted-foreground">Use Markdown or JSON to export the reviewed package and human checklist. No portal submission, certification, signature, pricing commitment, or agency representation is performed by ContractOps.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={Boolean(reviewState)} onOpenChange={(open) => { if (!open) setReviewState(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proposal review decision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This is an internal ContractOps review. APPROVED means the package clears the configured readiness gate; it does not submit or certify anything to an external agency.</p>
            <div><Label>Decision</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={reviewState?.decision || "CHANGES_REQUESTED"} onChange={(event) => reviewState && setReviewState({ ...reviewState, decision: event.target.value as NonNullable<typeof reviewState>["decision"] })}><option value="APPROVED">Approved</option><option value="CHANGES_REQUESTED">Changes requested</option><option value="REJECTED">Rejected</option></select></div>
            <div><Label>Review notes *</Label><Textarea rows={5} value={reviewState?.notes || ""} onChange={(event) => reviewState && setReviewState({ ...reviewState, notes: event.target.value })} placeholder="Record the human review rationale, blockers resolved, or changes required." /></div>
            <Button className="w-full" disabled={!reviewState || reviewState.notes.trim().length < 3 || reviewMutation.isPending} onClick={() => reviewState && reviewMutation.mutate(reviewState)}>{reviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Record review</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
