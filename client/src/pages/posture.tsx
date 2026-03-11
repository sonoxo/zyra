import { useQuery, useMutation } from "@tanstack/react-query";
import type { PostureScore } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Shield, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const categoryConfig = [
  { key: "scanScore", label: "Security Scans", color: "#6366f1" },
  { key: "pentestScore", label: "Pentesting", color: "#f43f5e" },
  { key: "cloudScore", label: "Cloud Security", color: "#3b82f6" },
  { key: "complianceScore", label: "Compliance", color: "#22c55e" },
  { key: "incidentScore", label: "Incident Response", color: "#f59e0b" },
  { key: "vulnerabilityScore", label: "Vulnerability Mgmt", color: "#8b5cf6" },
];

function scoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function PosturePage() {
  const { toast } = useToast();

  const { data: history = [], isLoading } = useQuery<PostureScore[]>({ queryKey: ["/api/posture"] });
  const { data: current } = useQuery<PostureScore>({ queryKey: ["/api/posture/current"] });

  const snapshotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/posture/snapshot"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posture"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posture/current"] });
      toast({ title: "Posture snapshot taken", description: "Daily security posture score recorded." });
    },
  });

  const TrendIcon = current?.trend === "up" ? TrendingUp : current?.trend === "down" ? TrendingDown : Minus;
  const trendColor = current?.trend === "up" ? "text-green-500" : current?.trend === "down" ? "text-red-500" : "text-muted-foreground";

  const radarData = categoryConfig.map(c => ({
    subject: c.label.split(" ")[0],
    score: (current as any)?.[c.key] ?? 0,
    fullMark: 100,
  }));

  const chartData = history.map(s => ({
    date: s.date,
    Overall: s.overallScore,
    Scans: s.scanScore,
    Pentest: s.pentestScore,
    Cloud: s.cloudScore,
    Compliance: s.complianceScore,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-posture">Security Posture Score</h1>
          <p className="text-muted-foreground text-sm mt-1">Historical security posture trending across all modules — daily snapshots with category breakdown</p>
        </div>
        <Button onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending} data-testid="button-snapshot">
          {snapshotMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Taking Snapshot...</> : <><Camera className="w-4 h-4 mr-2" />Take Snapshot</>}
        </Button>
      </div>

      {current && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-sm">Current Overall Score</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round" className={scoreBg(current.overallScore)}
                    strokeDasharray={`${(current.overallScore / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-4xl font-bold", scoreColor(current.overallScore))}>{current.overallScore}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendIcon className={cn("w-4 h-4", trendColor)} />
                <span className={cn("text-sm font-medium capitalize", trendColor)}>{current.trend}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(current.createdAt), "MMM d, yyyy HH:mm")}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {categoryConfig.map(c => {
                const score = (current as any)[c.key] as number;
                return (
                  <div key={c.key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 shrink-0">{c.label}</span>
                    <Progress value={score} className="flex-1 h-2" style={{ "--tw-progress-fill": c.color } as any} />
                    <span className={cn("text-xs font-bold w-8 text-right", scoreColor(score))}>{score}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">30-Day Score Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="Overall" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Scans" stroke="#22c55e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Pentest" stroke="#f43f5e" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Cloud" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Compliance" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {current && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Security Radar</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Snapshot History</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto" data-testid="posture-history">
              {history.slice(0, 10).map(s => {
                const TI = s.trend === "up" ? TrendingUp : s.trend === "down" ? TrendingDown : Minus;
                const tc = s.trend === "up" ? "text-green-500" : s.trend === "down" ? "text-red-500" : "text-muted-foreground";
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50" data-testid={`row-posture-${s.id}`}>
                    <div className="flex items-center gap-2">
                      <TI className={cn("w-4 h-4", tc)} />
                      <span className="text-sm">{s.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-lg font-bold", scoreColor(s.overallScore))}>{s.overallScore}</span>
                      <Badge variant="outline" className={cn("text-xs capitalize", tc.replace("text-", "border-"))}>{s.trend}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {history.length === 0 && !isLoading && (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-medium">No posture history yet</p>
          <p className="text-sm text-muted-foreground mt-1">Take daily snapshots to track your security posture over time</p>
        </CardContent></Card>
      )}
    </div>
  );
}
