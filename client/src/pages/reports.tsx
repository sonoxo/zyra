import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText, Plus, Download, Eye, CheckCircle, RefreshCw,
  AlertTriangle, ChevronRight, Shield, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Report } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

const FRAMEWORKS = ["SOC2", "HIPAA", "ISO27001", "PCI-DSS", "FedRAMP", "GDPR"];

const FRAMEWORK_COLORS: Record<string, string> = {
  SOC2: "#3b82f6",
  HIPAA: "#8b5cf6",
  ISO27001: "#06b6d4",
  "PCI-DSS": "#f97316",
  FedRAMP: "#10b981",
  GDPR: "#ec4899",
};

function ReportCard({ report }: { report: Report }) {
  return (
    <Link href={`/reports/${report.id}`}>
      <div
        data-testid={`report-card-${report.id}`}
        className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 cursor-pointer transition-all group"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          report.status === "ready" ? "bg-green-500/10" :
          report.status === "generating" ? "bg-blue-500/10" : "bg-red-500/10"
        )}>
          {report.status === "ready" ? <FileText className="w-5 h-5 text-green-500" /> :
           report.status === "generating" ? <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" /> :
           <AlertTriangle className="w-5 h-5 text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground mb-1 truncate">{report.title}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(report.frameworks || []).map((fw: string) => (
              <div key={fw} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: FRAMEWORK_COLORS[fw] || "#6b7280" }} />
                <span className="text-xs text-muted-foreground">{fw}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : ""}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {report.securityScore !== null && report.securityScore !== undefined && (
            <div className="text-right">
              <div className={cn(
                "text-lg font-bold",
                (report.securityScore ?? 0) >= 80 ? "text-green-500" :
                (report.securityScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-500"
              )}>{report.securityScore}</div>
              <div className="text-xs text-muted-foreground">score</div>
            </div>
          )}
          {report.totalVulnerabilities > 0 && (
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{report.totalVulnerabilities}</div>
              <div className="text-xs text-muted-foreground">findings</div>
            </div>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              report.status === "ready" ? "border-green-500/30 text-green-600 dark:text-green-400" :
              report.status === "generating" ? "border-blue-500/30 text-blue-500" :
              "border-red-500/30 text-red-500"
            )}
          >
            {report.status}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
        </div>
      </div>
    </Link>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["SOC2", "HIPAA"]);

  const { data: reports = [], isLoading } = useQuery<Report[]>({ queryKey: ["/api/reports"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", {
        title: title || `Security Audit Report — ${new Date().toLocaleDateString()}`,
        frameworks: selectedFrameworks,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      setShowNew(false);
      setTitle("");
      toast({ title: "Report generation started", description: "Your audit report is being generated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate report", variant: "destructive" }),
  });

  const toggleFramework = (fw: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Security Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Automated audit reports with compliance mapping</p>
        </div>
        <Button onClick={() => setShowNew(true)} data-testid="button-new-report" className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Report
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-muted-foreground opacity-50" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">No reports yet</p>
            <p className="text-sm text-muted-foreground mb-4">Generate your first security audit report</p>
            <Button onClick={() => setShowNew(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate First Report
            </Button>
          </div>
        ) : (
          reports.map((r) => <ReportCard key={r.id} report={r} />)
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Generate Security Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Report title <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                data-testid="input-report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q1 2026 Security Audit"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Compliance frameworks to include</Label>
              <div className="grid grid-cols-2 gap-2">
                {FRAMEWORKS.map((fw) => (
                  <label
                    key={fw}
                    data-testid={`checkbox-fw-${fw}`}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedFrameworks.includes(fw)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={selectedFrameworks.includes(fw)}
                      onCheckedChange={() => toggleFramework(fw)}
                    />
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: FRAMEWORK_COLORS[fw] }} />
                      <span className="text-sm font-medium">{fw}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              data-testid="button-generate-report"
              onClick={() => createMutation.mutate()}
              disabled={selectedFrameworks.length === 0 || createMutation.isPending}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              {createMutation.isPending ? "Generating..." : "Generate Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
