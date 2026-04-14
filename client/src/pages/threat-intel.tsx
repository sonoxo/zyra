import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  ExternalLink,
  Calendar,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThreatIntelItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThreatIntelPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: threats, isLoading } = useQuery<ThreatIntelItem[]>({
    queryKey: ["/api/threat-intel"],
  });

  const { data: stats } = useQuery<{ 
    bySeverity: Record<string, number>, 
    bySource: Record<string, number>,
    total: number,
    critical: number,
    high: number,
    acknowledged: number
  }>({
    queryKey: ["/api/threat-intel/stats"],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/threat-intel/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel/stats"] });
      toast({
        title: "Database Refreshed",
        description: "Latest CVE data has been synchronized.",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await apiRequest("PUT", `/api/threat-intel/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threat-intel/stats"] });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-black";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-slate-500 text-white";
    }
  };

  const getCvssColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 9) return "text-red-600 font-bold";
    if (score >= 7) return "text-orange-600 font-bold";
    if (score >= 4) return "text-yellow-600 font-bold";
    return "text-blue-600 font-bold";
  };

  const filteredThreats = threats?.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (severityFilter !== "all" && t.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
    return true;
  }) || [];

  const chartData = stats?.bySeverity ? Object.entries(stats.bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value,
    color: name === "critical" ? "#ef4444" : name === "high" ? "#f97316" : name === "medium" ? "#eab308" : "#3b82f6"
  })) : [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Threat Intelligence</h1>
          <p className="text-muted-foreground">Monitor and manage global security vulnerabilities and CVEs</p>
        </div>
        <Button 
          data-testid="button-refresh-cve"
          onClick={() => refreshMutation.mutate()} 
          disabled={refreshMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh CVE Database
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-threats">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Total Threats</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-threats">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-critical-cves">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Critical CVEs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-critical-cves">{stats?.critical ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-high-severity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-high-severity">{stats?.high ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-acknowledged">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-acknowledged">{stats?.acknowledged ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-status-all">All</TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-status-active">Active</TabsTrigger>
                <TabsTrigger value="acknowledged" data-testid="tab-status-acknowledged">Acknowledged</TabsTrigger>
                <TabsTrigger value="resolved" data-testid="tab-status-resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-severity-filter">
                <SelectValue placeholder="Filter Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CVE Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">CVE ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>CVSS</TableHead>
                  <TableHead>Packages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredThreats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No threat items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredThreats.map((threat) => (
                    <>
                      <TableRow 
                        key={threat.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/threat-intel/${threat.id}`)}
                        data-testid={`row-threat-${threat.id}`}
                      >
                        <TableCell className="font-mono font-medium">{threat.cveId}</TableCell>
                        <TableCell className="font-medium">{threat.title}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(threat.severity)}>
                            {threat.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getCvssColor(threat.cvssScore)}>
                            {threat.cvssScore?.toFixed(1) || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {threat.affectedPackages.slice(0, 2).map((pkg, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] px-1.5 h-4">
                                {pkg}
                              </Badge>
                            ))}
                            {threat.affectedPackages.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                                +{threat.affectedPackages.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {threat.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {threat.status === "active" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                data-testid={`button-acknowledge-${threat.id}`}
                                onClick={() => updateStatusMutation.mutate({ id: threat.id, status: "acknowledged" })}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {threat.status !== "resolved" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                data-testid={`button-resolve-${threat.id}`}
                                onClick={() => updateStatusMutation.mutate({ id: threat.id, status: "resolved" })}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Severity Graph */}
          <Card>
            <CardHeader>
              <CardTitle>Affected Packages by Severity</CardTitle>
              <CardDescription>Distribution of active vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full" data-testid="chart-vulnerability-severity">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Threat Feed Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Threat Feed Timeline
              </CardTitle>
              <CardDescription>Recently published CVEs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y" data-testid="timeline-threat-feed">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))
                ) : threats?.slice(0, 10).map((threat) => (
                  <div key={threat.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{threat.cveId}</span>
                          <Badge variant="outline" className={`text-[9px] h-4 ${getSeverityColor(threat.severity)}`}>
                            {threat.severity}
                          </Badge>
                        </div>
                        <h5 className="text-sm font-medium line-clamp-1">{threat.title}</h5>
                        <p className="text-[10px] text-muted-foreground">
                          {threat.publishedAt ? format(new Date(threat.publishedAt), 'MMM dd, h:mm a') : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
