import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard, Check, Star, Zap, Crown,
  Users, ScanSearch, GitBranch, Loader2,
  FileText, Calendar, ExternalLink, CheckCircle2, XCircle, Info
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Subscription } from "@shared/schema";

interface UsageData {
  users: { current: number; limit: number };
  scans: { current: number; limit: number };
  repositories: { current: number; limit: number };
}

interface PlanInfo {
  name: string;
  price: number;
  features: string[];
  maxUsers: number;
  maxScansPerMonth: number;
  maxRepositories: number;
  popular?: boolean;
}

const plans: PlanInfo[] = [
  {
    name: "starter",
    price: 0,
    maxUsers: 5,
    maxScansPerMonth: 50,
    maxRepositories: 10,
    features: [
      "Vulnerability scanning",
      "SBOM supply chain",
      "Secrets detection",
      "Security dashboard",
      "5 users",
      "50 scans/month",
    ],
  },
  {
    name: "professional",
    price: 99,
    maxUsers: 25,
    maxScansPerMonth: 500,
    maxRepositories: 50,
    popular: true,
    features: [
      "Everything in Starter",
      "Incident response",
      "Attack surface monitoring",
      "Container security",
      "Vendor risk tracking",
      "25 users",
    ],
  },
  {
    name: "enterprise",
    price: 499,
    maxUsers: -1,
    maxScansPerMonth: -1,
    maxRepositories: -1,
    features: [
      "Everything in Professional",
      "SSO & SAML",
      "Audit logs",
      "SOC2 compliance",
      "Unlimited everything",
      "Priority support",
    ],
  },
];

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "trialing": return "secondary";
    case "past_due": return "destructive";
    case "canceled": return "outline";
    default: return "secondary";
  }
}

function getUsageColor(percent: number): string {
  if (percent > 80) return "bg-red-500";
  if (percent > 60) return "bg-yellow-500";
  return "bg-green-500";
}

function getUsagePercent(current: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function PlanIcon({ plan }: { plan: string }) {
  switch (plan) {
    case "starter": return <Zap className="w-5 h-5" />;
    case "professional": return <Star className="w-5 h-5" />;
    case "enterprise": return <Crown className="w-5 h-5" />;
    default: return <CreditCard className="w-5 h-5" />;
  }
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function Billing() {
  const { toast } = useToast();
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "success") {
      setCheckoutStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
    } else if (status === "cancelled") {
      setCheckoutStatus("cancelled");
    }
    if (status) {
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["/api/billing/subscription"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
  });

  const { data: stripeStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/stripe/status"],
  });

  const stripeConfigured = stripeStatus?.configured ?? false;

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      await apiRequest("PUT", "/api/billing/subscription", { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
      toast({ title: "Plan updated", description: "Your subscription has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", { plan });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.message || "Failed to create checkout session");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Checkout Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePlanAction = (plan: string) => {
    const planInfo = plans.find(p => p.name === plan);
    if (!planInfo) return;

    if (planInfo.price === 0) {
      upgradeMutation.mutate(plan);
      return;
    }

    if (stripeConfigured) {
      checkoutMutation.mutate(plan);
    } else {
      upgradeMutation.mutate(plan);
    }
  };

  const isPending = upgradeMutation.isPending || checkoutMutation.isPending;
  const isLoading = subLoading || usageLoading;

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-billing-title">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your subscription and billing</p>
        </div>
        <BillingSkeleton />
      </div>
    );
  }

  const currentPlan = subscription?.plan || "starter";
  const currentStatus = subscription?.status || "active";

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-billing-title">Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your subscription and billing</p>
      </div>

      {checkoutStatus === "success" && (
        <Alert data-testid="alert-checkout-success">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Payment successful! Your plan has been upgraded. It may take a moment for changes to reflect.
          </AlertDescription>
        </Alert>
      )}

      {checkoutStatus === "cancelled" && (
        <Alert data-testid="alert-checkout-cancelled">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription>
            Checkout was cancelled. No charges were made. You can try again anytime.
          </AlertDescription>
        </Alert>
      )}

      <Card data-testid="card-current-plan">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Current Plan</CardTitle>
          <div className="flex items-center gap-2">
            {stripeConfigured && (
              <Badge variant="outline" className="text-xs gap-1" data-testid="badge-stripe-active">
                <CreditCard className="w-3 h-3" />
                Stripe Active
              </Badge>
            )}
            <Badge variant={getStatusVariant(currentStatus)} data-testid="badge-plan-status">
              {currentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <PlanIcon plan={currentPlan} />
            </div>
            <div>
              <div className="text-lg font-bold capitalize" data-testid="text-current-plan-name">
                {currentPlan}
              </div>
              <div className="text-sm text-muted-foreground">
                {plans.find((p) => p.name === currentPlan)?.price === 0
                  ? "Free"
                  : `$${plans.find((p) => p.name === currentPlan)?.price || 0}/month`}
              </div>
            </div>
          </div>
          {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-billing-period">
                {new Date(subscription.currentPeriodStart).toLocaleDateString()} &ndash;{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {plans
              .find((p) => p.name === currentPlan)
              ?.features.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span>{f}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {!stripeConfigured && (
        <Alert data-testid="alert-stripe-not-configured">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Stripe is not configured. Add <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable real payment processing.
            Plan changes will be applied directly without payment.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Plan Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            const currentIdx = plans.findIndex((p) => p.name === currentPlan);
            const planIdx = plans.findIndex((p) => p.name === plan.name);
            const isUpgrade = planIdx > currentIdx;

            return (
              <Card
                key={plan.name}
                className={plan.popular ? "border-primary" : ""}
                data-testid={`card-plan-${plan.name}`}
              >
                <CardHeader className="space-y-1 pb-3">
                  {plan.popular && (
                    <Badge variant="default" className="w-fit mb-1" data-testid="badge-popular">
                      Popular
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <PlanIcon plan={plan.name} />
                    <CardTitle className="text-base capitalize">{plan.name}</CardTitle>
                  </div>
                  <div className="text-2xl font-bold">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                    {plan.price > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    {isCurrent ? (
                      <Badge variant="outline" className="w-full justify-center py-1.5" data-testid={`badge-current-${plan.name}`}>
                        Current Plan
                      </Badge>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isUpgrade ? "default" : "outline"}
                        onClick={() => handlePlanAction(plan.name)}
                        disabled={isPending}
                        data-testid={`button-${isUpgrade ? "upgrade" : "downgrade"}-${plan.name}`}
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : isUpgrade && stripeConfigured && plan.price > 0 ? (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        ) : null}
                        {isUpgrade
                          ? stripeConfigured && plan.price > 0
                            ? "Upgrade via Stripe"
                            : "Upgrade"
                          : "Downgrade"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card data-testid="card-usage">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {usage && (
            <>
              <UsageBar
                icon={<Users className="w-4 h-4" />}
                label="Users"
                current={usage.users.current}
                limit={usage.users.limit}
                testId="usage-users"
              />
              <UsageBar
                icon={<ScanSearch className="w-4 h-4" />}
                label="Scans this month"
                current={usage.scans.current}
                limit={usage.scans.limit}
                testId="usage-scans"
              />
              <UsageBar
                icon={<GitBranch className="w-4 h-4" />}
                label="Repositories"
                current={usage.repositories.current}
                limit={usage.repositories.limit}
                testId="usage-repositories"
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-billing-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "Mar 1, 2026", amount: plans.find((p) => p.name === currentPlan)?.price || 0, status: "Paid" },
              { date: "Feb 1, 2026", amount: plans.find((p) => p.name === currentPlan)?.price || 0, status: "Paid" },
              { date: "Jan 1, 2026", amount: plans.find((p) => p.name === currentPlan)?.price || 0, status: "Paid" },
            ].map((invoice, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                data-testid={`row-invoice-${i}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{invoice.date}</div>
                    <div className="text-xs text-muted-foreground capitalize">{currentPlan} plan</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" data-testid={`text-invoice-amount-${i}`}>
                    {invoice.amount === 0 ? "Free" : `$${invoice.amount.toFixed(2)}`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageBar({
  icon,
  label,
  current,
  limit,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  testId: string;
}) {
  const isUnlimited = limit <= 0 || limit >= 9999;
  const percent = isUnlimited ? 0 : getUsagePercent(current, limit);
  const colorClass = getUsageColor(percent);

  return (
    <div className="space-y-1.5" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground" data-testid={`${testId}-count`}>
          {current} / {isUnlimited ? "Unlimited" : limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: isUnlimited ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}
