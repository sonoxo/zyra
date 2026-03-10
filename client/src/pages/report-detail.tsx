import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Download, FileText, Shield, AlertTriangle,
  CheckCircle, TrendingUp, Target, Layers, RefreshCw,
  ArrowUpDown, ChevronUp, ChevronDown, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Report, ScanFinding, ComplianceMapping } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const FRAMEWORK_COLORS: Record<string, string> = {
  SOC2: "#3b82f6",
  HIPAA: "#8b5cf6",
  ISO27001: "#06b6d4",
  "PCI-DSS": "#f97316",
  FedRAMP: "#10b981",
  GDPR: "#ec4899",
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

type SortField = "title" | "severity" | "category" | "filePath";
type SortDir = "asc" | "desc";

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const reportId = params?.id;
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: ["/api/reports", reportId],
    enabled: !!reportId,
    refetchInterval: (query) => {
      const data = query.state.data as Report | undefined;
      return data?.status === "generating" ? 3000 : false;
    },
  });

  const { data: findings = [] } = useQuery<ScanFinding[]>({
    queryKey: ["/api/scans", "org-findings"],
    queryFn: async () => {
      const res = await fetch("/api/scans");
      if (!res.ok) return [];
      const scans = await res.json();
      const allFindings: ScanFinding[] = [];
      for (const scan of scans) {
        const fRes = await fetch(`/api/scans/${scan.id}/findings`);
        if (fRes.ok) {
          const f = await fRes.json();
          allFindings.push(...f);
        }
      }
      return allFindings;
    },
    enabled: !!reportId && report?.status === "ready",
  });

  const { data: complianceMappings = [] } = useQuery<ComplianceMapping[]>({
    queryKey: ["/api/compliance"],
    enabled: !!reportId && report?.status === "ready",
  });

  const sortedFindings = useMemo(() => {
    const sorted = [...findings];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === "severity") {
        cmp = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      } else if (sortField === "title") {
        cmp = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "category") {
        cmp = (a.category || "").localeCompare(b.category || "");
      } else if (sortField === "filePath") {
        cmp = (a.filePath || "").localeCompare(b.filePath || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [findings, sortField, sortDir]);

  const frameworkImpacts = useMemo(() => {
    const frameworks = ["SOC2", "HIPAA", "ISO27001", "PCI-DSS", "FedRAMP", "GDPR"];
    return frameworks.map((fw) => {
      const fwMappings = complianceMappings.filter((m) => m.framework === fw);
      const avgCoverage = fwMappings.length > 0
        ? Math.round(fwMappings.reduce((acc, m) => acc + m.coverage, 0) / fwMappings.length)
        : 0;
      const status = avgCoverage >= 80 ? "compliant" : avgCoverage >= 50 ? "partial" : "non-compliant";
      const relatedFindings = findings.filter((f) =>
        (f.complianceFrameworks || []).includes(fw)
      );
      const controlCount = fwMappings.length;
      const passedControls = fwMappings.filter((m) => m.coverage >= 80).length;
      return {
        framework: fw,
        coverage: avgCoverage,
        status,
        totalControls: controlCount,
        passedControls,
        criticalFindings: relatedFindings.filter((f) => f.severity === "critical").length,
        highFindings: relatedFindings.filter((f) => f.severity === "high").length,
        totalFindings: relatedFindings.length,
      };
    });
  }, [complianceMappings, findings]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export successful", description: "Report exported as JSON" });
  };

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      const response = await fetch(`/api/reports/${reportId}/export/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.title.replace(/\s+/g, "_")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF exported", description: "Report downloaded as PDF" });
      } else {
        toast({ title: "PDF export", description: "PDF generation not available in this environment. Try JSON export.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Export error", description: "Failed to export PDF", variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;
    try {
      const response = await fetch(`/api/reports/${reportId}/export/csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.title.replace(/\s+/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV exported", description: "Report downloaded as CSV" });
      } else {
        toast({ title: "CSV export failed", description: "Failed to generate CSV export", variant: "destructive" });
      }
    } catch {
      toast({ title: "Export error", description: "Failed to export CSV", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!report) return null;

  const vulnData = [
    { name: "Critical", value: report.criticalCount, color: "#ef4444" },
    { name: "High", value: report.highCount, color: "#f97316" },
    { name: "Medium", value: report.mediumCount, color: "#eab308" },
    { name: "Low", value: report.lowCount, color: "#3b82f6" },
  ];

  const complianceSummary = (report.complianceSummary as any[]) || [];
  const recommendations = (report.recommendations as any[]) || [];

  const severityBadgeClass = (sev: string) => {
    switch (sev) {
      case "critical": return "border-red-500/30 text-red-600 dark:text-red-400";
      case "high": return "border-orange-500/30 text-orange-600 dark:text-orange-400";
      case "medium": return "border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
      case "low": return "border-blue-500/30 text-blue-500";
      default: return "border-muted-foreground/30 text-muted-foreground";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background/95 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground -ml-2" data-testid="button-back-reports">
              <ArrowLeft className="w-3.5 h-3.5" />
              Reports
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-report-title">{report.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {(report.frameworks || []).map((fw: string) => (
                  <Badge key={fw} variant="outline" className="text-xs px-1.5" style={{ borderColor: FRAMEWORK_COLORS[fw] + "50", color: FRAMEWORK_COLORS[fw] }}>
                    {fw}
                  </Badge>
                ))}
              </div>
              {report.generatedAt && <><span>·</span><span>{format(new Date(report.generatedAt), "MMM d, yyyy")}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {report.status === "ready" && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" data-testid="button-export-csv">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-2" data-testid="button-export-json">
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </Button>
                <Button size="sm" onClick={handleExportPDF} className="gap-2" data-testid="button-export-pdf">
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {report.status === "generating" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
          <p className="text-base font-medium text-foreground">Generating report...</p>
          <p className="text-sm text-muted-foreground">Analyzing findings and mapping to compliance frameworks</p>
        </div>
      )}

      {report.status === "ready" && (
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList data-testid="tabs-report-detail">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="findings" data-testid="tab-findings">Findings</TabsTrigger>
              <TabsTrigger value="compliance" data-testid="tab-compliance-impact">Compliance Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: Shield, label: "Security Score", value: report.securityScore ?? "N/A", color: (report.securityScore ?? 0) >= 80 ? "text-green-500" : (report.securityScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-500" },
                  { icon: AlertTriangle, label: "Total Vulnerabilities", value: report.totalVulnerabilities, color: "text-foreground" },
                  { icon: Target, label: "Critical Issues", value: report.criticalCount, color: "text-red-500" },
                  { icon: Layers, label: "Frameworks", value: report.frameworks?.length ?? 0, color: "text-foreground" },
                ].map((item) => (
                  <Card key={item.label} className="border-card-border" data-testid={`card-stat-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className={cn("text-2xl font-bold", item.color)}>{item.value}</div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {report.executiveSummary && (
                <Card className="border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-executive-summary">{report.executiveSummary}</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="border-card-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Vulnerability Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={vulnData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--popover-border))",
                            borderRadius: "8px",
                            fontSize: "12px"
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {vulnData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-card-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Compliance Coverage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {complianceSummary.length > 0 ? complianceSummary.map((fw: any) => (
                      <div key={fw.framework} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: FRAMEWORK_COLORS[fw.framework] }} />
                            <span className="font-medium text-foreground">{fw.framework}</span>
                          </div>
                          <span className="text-muted-foreground">{fw.coverage}%</span>
                        </div>
                        <Progress value={fw.coverage} className="h-1.5" />
                      </div>
                    )) : (
                      (report.frameworks || []).map((fw: string) => (
                        <div key={fw} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: FRAMEWORK_COLORS[fw] }} />
                              <span className="font-medium text-foreground">{fw}</span>
                            </div>
                            <span className="text-muted-foreground">Analyzed</span>
                          </div>
                          <Progress value={75} className="h-1.5" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {recommendations.length > 0 && (
                <Card className="border-card-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Mitigation Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.map((rec: any, i: number) => (
                      <div key={i} data-testid={`recommendation-${i}`} className="flex items-start gap-3 p-3 rounded-md border border-border">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                          rec.priority === "high" ? "bg-red-500/15 text-red-500" :
                          rec.priority === "medium" ? "bg-yellow-500/15 text-yellow-500" :
                          "bg-blue-500/15 text-blue-500"
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{rec.title}</div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.description}</p>
                          {rec.frameworks && rec.frameworks.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {rec.frameworks.map((fw: string) => (
                                <Badge key={fw} variant="outline" className="text-xs px-1">{fw}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-xs shrink-0",
                            rec.priority === "high" ? "border-red-500/30 text-red-600 dark:text-red-400" :
                            rec.priority === "medium" ? "border-yellow-500/30 text-yellow-600 dark:text-yellow-400" :
                            "border-blue-500/30 text-blue-500"
                          )}
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="findings">
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                      Findings ({findings.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {findings.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No findings recorded</p>
                      <p className="text-xs text-muted-foreground mt-1">Run a scan to generate findings</p>
                    </div>
                  ) : (
                    <Table data-testid="table-findings">
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button
                              className="flex items-center text-xs font-medium cursor-pointer"
                              onClick={() => handleSort("title")}
                              data-testid="sort-title"
                            >
                              Title <SortIcon field="title" />
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="flex items-center text-xs font-medium cursor-pointer"
                              onClick={() => handleSort("severity")}
                              data-testid="sort-severity"
                            >
                              Severity <SortIcon field="severity" />
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="flex items-center text-xs font-medium cursor-pointer"
                              onClick={() => handleSort("category")}
                              data-testid="sort-category"
                            >
                              Category <SortIcon field="category" />
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="flex items-center text-xs font-medium cursor-pointer"
                              onClick={() => handleSort("filePath")}
                              data-testid="sort-file"
                            >
                              File <SortIcon field="filePath" />
                            </button>
                          </TableHead>
                          <TableHead className="text-xs font-medium">Remediation</TableHead>
                          <TableHead className="text-xs font-medium">Frameworks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedFindings.map((finding) => (
                          <TableRow key={finding.id} data-testid={`row-finding-${finding.id}`}>
                            <TableCell className="text-sm font-medium text-foreground max-w-[200px] truncate">
                              {finding.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs capitalize", severityBadgeClass(finding.severity))}>
                                {finding.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {finding.category || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono max-w-[180px] truncate">
                              {finding.filePath || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {finding.remediation || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {(finding.complianceFrameworks || []).map((fw) => (
                                  <Badge key={fw} variant="outline" className="text-xs px-1" style={{ borderColor: (FRAMEWORK_COLORS[fw] || "#888") + "50", color: FRAMEWORK_COLORS[fw] || "#888" }}>
                                    {fw}
                                  </Badge>
                                ))}
                                {(!finding.complianceFrameworks || finding.complianceFrameworks.length === 0) && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Framework Compliance Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {frameworkImpacts.length === 0 ? (
                    <div className="text-center py-12">
                      <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No compliance data</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {frameworkImpacts.map((fw) => (
                        <div
                          key={fw.framework}
                          className="p-4 rounded-md border border-border"
                          data-testid={`card-compliance-${fw.framework}`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: FRAMEWORK_COLORS[fw.framework] }} />
                              <span className="text-sm font-semibold text-foreground">{fw.framework}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs capitalize",
                                  fw.status === "compliant" ? "border-green-500/30 text-green-600 dark:text-green-400" :
                                  fw.status === "partial" ? "border-yellow-500/30 text-yellow-600 dark:text-yellow-400" :
                                  "border-red-500/30 text-red-600 dark:text-red-400"
                                )}
                                data-testid={`badge-status-${fw.framework}`}
                              >
                                {fw.status}
                              </Badge>
                            </div>
                            <span className="text-sm font-bold text-foreground" data-testid={`text-coverage-${fw.framework}`}>{fw.coverage}%</span>
                          </div>
                          <Progress value={fw.coverage} className="h-2 mb-3" />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Controls</span>
                              <div className="text-sm font-semibold text-foreground mt-0.5">{fw.passedControls}/{fw.totalControls}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Related Findings</span>
                              <div className="text-sm font-semibold text-foreground mt-0.5">{fw.totalFindings}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Critical</span>
                              <div className={cn("text-sm font-semibold mt-0.5", fw.criticalFindings > 0 ? "text-red-500" : "text-foreground")}>{fw.criticalFindings}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">High</span>
                              <div className={cn("text-sm font-semibold mt-0.5", fw.highFindings > 0 ? "text-orange-500" : "text-foreground")}>{fw.highFindings}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
