import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Rocket, ChevronRight, PartyPopper, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface OnboardingStep {
  step: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
  completedAt: string | null;
}

interface OnboardingData {
  steps: OnboardingStep[];
  allDone: boolean;
  completedCount: number;
  totalCount: number;
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<OnboardingData>({ queryKey: ["/api/onboarding"] });

  const completeMutation = useMutation({
    mutationFn: (step: string) => apiRequest("POST", `/api/onboarding/${step}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    },
  });

  const progress = data ? Math.round((data.completedCount / data.totalCount) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Rocket className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Getting Started</h1>
          <p className="text-sm text-muted-foreground">Complete these steps to fully activate Zyra</p>
        </div>
      </div>

      {data && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold">{data.completedCount} of {data.totalCount} steps complete</span>
                {data.allDone && (
                  <Badge className="ml-2 bg-green-500 text-white text-xs" data-testid="badge-all-done">
                    <PartyPopper className="w-3 h-3 mr-1" />All done!
                  </Badge>
                )}
              </div>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {data?.allDone && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-8 h-8 text-green-500" />
              <PartyPopper className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">Zyra platform fully operational.</h2>
            <p className="text-sm text-muted-foreground">All setup steps are complete. Your enterprise security platform is ready.</p>
            <Button className="mt-4" asChild data-testid="button-go-dashboard">
              <Link href="/dashboard">Go to Dashboard <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {data?.steps.map((step, idx) => (
            <Card key={step.step} data-testid={`step-${step.step}`} className={cn(step.completed && "opacity-70")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 text-sm font-bold",
                    step.completed ? "border-green-500 bg-green-500/10 text-green-500" : "border-border text-muted-foreground"
                  )}>
                    {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold text-sm", step.completed && "line-through text-muted-foreground")}>
                        {step.label}
                      </span>
                      {step.completed && step.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(step.completedAt), "MMM d")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                  {!step.completed && (
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild data-testid={`button-go-${step.step}`}>
                        <Link href={step.href}>Go <ChevronRight className="w-3.5 h-3.5 ml-1" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => completeMutation.mutate(step.step)} disabled={completeMutation.isPending} data-testid={`button-mark-${step.step}`}>
                        Mark done
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
