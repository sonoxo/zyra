import {
  BadgeCheck,
  Building2,
  CalendarClock,
  FileCheck2,
  FileSearch,
  Landmark,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const readinessCards = [
  { label: "CAGE", value: "PENDING", detail: "Waiting for issued + verified identifier", tone: "text-amber-500" },
  { label: "Opportunities", value: "0", detail: "Capture a real opportunity to begin", tone: "text-cyan-500" },
  { label: "Submission Ready", value: "0", detail: "Human review is required", tone: "text-violet-500" },
  { label: "Evidence Rule", value: "ON", detail: "Material claims require traceable proof", tone: "text-green-500" },
];

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

export default function ContractOpsPage() {
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
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
            <strong className="text-white">Beginner rule:</strong> if Zyra cannot trace a material proposal claim to evidence, ContractOps does not mark that claim ready.
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readinessCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className={`mt-1 text-2xl font-black ${item.tone}`}>{item.value}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.detail}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" />How the ecosystem works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflow.map(([number, title, text]) => (
              <div key={number} className="flex gap-3 rounded-xl border p-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">{number}</div>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="h-4 w-4 text-green-500" />ZYRA evidence domains</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                ContractOps can use the existing evidence-tiered ZYRA credential ledger when a credential actually supports the requirement. Credentials do not automatically grant authorization.
              </p>
              <div className="flex flex-wrap gap-2">
                {credentialDomains.map((domain) => <Badge key={domain} variant="outline">{domain}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-cyan-500" />Hard guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>• Never invent SAM, UEI, CAGE, or other registration identifiers.</div>
              <div>• Registration state becomes ACTIVE only after a verification source exists.</div>
              <div>• RVIA badges are repository credentials, not government authority or clearance.</div>
              <div>• Material proposal claims require traceable evidence.</div>
              <div>• External submission remains human-controlled.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><FileSearch className="h-5 w-5 text-cyan-500" /><div className="mt-3 font-semibold">Opportunity Intake</div><p className="mt-1 text-xs text-muted-foreground">Capture real source URLs, deadlines, NAICS/PSC fields, set-asides, and requirements.</p><Button className="mt-4 w-full" variant="outline" disabled>Phase 2</Button></CardContent></Card>
        <Card><CardContent className="p-5"><FileCheck2 className="h-5 w-5 text-violet-500" /><div className="mt-3 font-semibold">Evidence Matching</div><p className="mt-1 text-xs text-muted-foreground">Map requirements to ZYRA capabilities, credentials, repository proof, demos, and provenance.</p><Button className="mt-4 w-full" variant="outline" disabled>Phase 3</Button></CardContent></Card>
        <Card><CardContent className="p-5"><CalendarClock className="h-5 w-5 text-amber-500" /><div className="mt-3 font-semibold">Proposal Control</div><p className="mt-1 text-xs text-muted-foreground">Draft sections, expose blockers, review claims, and track readiness before a human submits.</p><Button className="mt-4 w-full" variant="outline" disabled>Phase 4</Button></CardContent></Card>
      </section>

      <Card>
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3"><Building2 className="h-5 w-5 text-primary mt-0.5" /><div><div className="font-semibold">Foundation implemented</div><div className="text-xs text-muted-foreground">Domain types + ontology + beginner dashboard + evidence/authorization guardrails are checked into the ZYRA repository.</div></div></div>
          <Badge variant="outline" className="w-fit">v0.1 foundation</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
