import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp,
  Shield, Building, Lock, FileCheck, Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from "recharts";
import type { ComplianceMapping } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

const FRAMEWORKS = [
  { id: "SOC2", name: "SOC 2 Type II", icon: Building, color: "#3b82f6", desc: "Service Organization Control 2" },
  { id: "HIPAA", name: "HIPAA", icon: Shield, color: "#8b5cf6", desc: "Health Insurance Portability and Accountability Act" },
  { id: "ISO27001", name: "ISO 27001", icon: Globe, color: "#06b6d4", desc: "Information Security Management" },
  { id: "PCI-DSS", name: "PCI DSS", icon: Lock, color: "#f97316", desc: "Payment Card Industry Data Security Standard" },
  { id: "FedRAMP", name: "FedRAMP", icon: FileCheck, color: "#10b981", desc: "Federal Risk and Authorization Management Program" },
  { id: "GDPR", name: "GDPR", icon: CheckSquare, color: "#ec4899", desc: "General Data Protection Regulation" },
];

const STATUS_CONFIG = {
  compliant: { color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: CheckSquare },
  partial: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertTriangle },
  "non-compliant": { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle },
  unknown: { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", icon: Info },
};

function FrameworkCard({ framework, mappings }: { framework: typeof FRAMEWORKS[0]; mappings: ComplianceMapping[] }) {
  const [expanded, setExpanded] = useState(false);
  const fwMappings = mappings.filter((m) => m.framework === framework.id);
  const avgCoverage = fwMappings.length > 0
    ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
    : 0;
  const compliantCount = fwMappings.filter((m) => m.status === "compliant").length;
  const partialCount = fwMappings.filter((m) => m.status === "partial").length;
  const nonCompliantCount = fwMappings.filter((m) => m.status === "non-compliant").length;
  const overallStatus = compliantCount === fwMappings.length ? "compliant" :
    nonCompliantCount > fwMappings.length / 2 ? "non-compliant" : "partial";
  const cfg = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.unknown;
  const StatusIcon = cfg.icon;

  return (
    <Card data-testid={`framework-card-${framework.id}`} className={cn("border-card-border overflow-hidden transition-all", expanded && "shadow-md")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 text-left hover:bg-accent/20 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: framework.color + "15" }}>
          <framework.icon className="w-5.5 h-5.5" style={{ color: framework.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground text-sm">{framework.name}</span>
            <Badge className={cn("text-xs h-5 px-1.5 border", cfg.bg, cfg.color, cfg.border)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {overallStatus}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-2">{framework.desc}</div>
          <div className="flex items-center gap-2">
            <Progress value={avgCoverage} className="h-1.5 flex-1" />
            <span className="text-xs font-medium text-foreground shrink-0">{avgCoverage}%</span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="flex items-center gap-2 justify-end text-xs mb-1">
            <span className="text-green-500 font-medium">{compliantCount}✓</span>
            <span className="text-yellow-500 font-medium">{partialCount}△</span>
            <span className="text-red-500 font-medium">{nonCompliantCount}✕</span>
          </div>
          <div className="text-xs text-muted-foreground">{fwMappings.length} controls</div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 ml-auto" /> :
                      <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />}
        </div>
      </button>
      {expanded && fwMappings.length > 0 && (
        <div className="border-t border-border">
          <div className="p-4 grid grid-cols-1 gap-2">
            {fwMappings.map((mapping) => {
              const mCfg = STATUS_CONFIG[mapping.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unknown;
              const MIcon = mCfg.icon;
              return (
                <div
                  key={mapping.id}
                  data-testid={`control-${mapping.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <MIcon className={cn("w-4 h-4 shrink-0", mCfg.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-muted-foreground">{mapping.controlId}</span>
                      <span className="text-sm font-medium text-foreground truncate">{mapping.controlName}</span>
                    </div>
                    {mapping.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mapping.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-medium text-foreground">{mapping.coverage}%</div>
                    </div>
                    <Badge className={cn("text-xs h-4.5 px-1.5 border", mCfg.bg, mCfg.color, mCfg.border)}>
                      {mapping.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Compliance() {
  const { data: mappings = [], isLoading } = useQuery<ComplianceMapping[]>({ queryKey: ["/api/compliance"] });

  const radarData = FRAMEWORKS.map((fw) => {
    const fwMappings = mappings.filter((m) => m.framework === fw.id);
    const avg = fwMappings.length > 0
      ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
      : 0;
    return { subject: fw.id, coverage: avg, fullMark: 100 };
  });

  const overallScore = radarData.length > 0
    ? Math.round(radarData.reduce((acc, d) => acc + d.coverage, 0) / radarData.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Compliance Frameworks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track coverage across SOC2, HIPAA, ISO27001, PCI-DSS, FedRAMP, GDPR</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-card-border rounded-xl">
          <div className={cn("text-2xl font-bold", overallScore >= 80 ? "text-green-500" : overallScore >= 60 ? "text-yellow-500" : "text-red-500")}>
            {overallScore}%
          </div>
          <div className="text-xs text-muted-foreground">Overall<br />Coverage</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {FRAMEWORKS.map((fw) => {
                const fwMappings = mappings.filter((m) => m.framework === fw.id);
                const avg = fwMappings.length > 0
                  ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
                  : 0;
                return (
                  <div key={fw.id} className="p-4 rounded-xl border border-card-border bg-card flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: fw.color + "15" }}>
                        <fw.icon className="w-3.5 h-3.5" style={{ color: fw.color }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{fw.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={avg} className="h-1.5 flex-1" />
                      <span className="text-xs font-bold text-foreground">{avg}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              ) : (
                FRAMEWORKS.map((fw) => (
                  <FrameworkCard key={fw.id} framework={fw} mappings={mappings} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Coverage Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="Coverage"
                      dataKey="coverage"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--popover-border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Compliance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: "Compliant controls", value: mappings.filter((m) => m.status === "compliant").length, color: "text-green-500" },
                  { label: "Partial controls", value: mappings.filter((m) => m.status === "partial").length, color: "text-yellow-500" },
                  { label: "Non-compliant", value: mappings.filter((m) => m.status === "non-compliant").length, color: "text-red-500" },
                  { label: "Total controls", value: mappings.length, color: "text-foreground" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn("font-bold text-sm", item.color)}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
