import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard, Check, Star, Crown, Clock,
  Users, ScanSearch, GitBranch, Loader2,
  FileText, Calendar, ExternalLink, CheckCircle2, XCircle, Info, AlertTriangle, ShieldAlert
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Subscription } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";

interface SubscriptionWithTrial extends Subscription {
  trialDaysRemaining: number;
  trialExpired: boolean;
}

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
    name: "professional",
    price: 99,
    maxUsers: 25,
    maxScansPerMonth: 500,
    maxRepositories: 50,
    popular: true,
    features: [
      "All scan tools (Semgrep, Trivy, Bandit, ZAP)",
      "All compliance frameworks",
      "Incident response",
      "Attack surface monitoring",
      "Container security",
      "Priority support",
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
      "Advanced RBAC",
      "Audit log export",
      "Multi-region deployment",
      "SLA guarantee",
      "Unlimited everything",
      "Dedicated support",
    ],
  },
];

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "trialing": return "secondary";
    case "expired":
    case "past_due": return "destructive";
    case "canceled": return "outline";
    default: return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active": return "Active";
    case "trialing": return "Free Trial";
    case "expired": return "Trial Expired";
    case "past_due": return "Past Due";
    case "canceled": return "Canceled";
    default: return status;
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

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

  const { data: currentUser } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isViewer = currentUser?.role === "viewer";

  useEffect(() => {
    if (isViewer) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const sessionId = params.get("session_id");

    if (status === "success" && sessionId) {
      setCheckoutStatus("success");
      apiRequest("GET", `/api/stripe/session/${sessionId}`)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
        })
        .catch(() => {});
    } else if (status === "cancelled") {
      setCheckoutStatus("cancelled");
    }

    if (status) {
      window.history.replaceState({}, "", "/billing");
    }
  }, [isViewer]);

  const canFetchBilling = !!currentUser && !isViewer;

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionWithTrial>({
    queryKey: ["/api/billing/subscription"],
    enabled: canFetchBilling,
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/billing/usage"],
    enabled: canFetchBilling,
  });

  const { data: stripeStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/stripe/status"],
    enabled: canFetchBilling,
  });

  if (isViewer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center" data-testid="billing-access-denied">
        <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Billing information is only available to organization owners, admins, and analysts.
        </p>
      </div>
    );
  }

  const stripeConfigured = stripeStatus?.configured ?? false;

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      await apiRequest("PUT", "/api/billing/subscription", { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/usage"] });
      toast({ title: "Plan updated", description: "Your subscription has been activated." });
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
  const currentStatus = subscription?.status || "trialing";
  const isTrialing = currentStatus === "trialing";
  const isExpired = currentStatus === "expired" || subscription?.trialExpired;
  const isActive = currentStatus === "active";
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;

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
            Payment successful! Your subscription is now active. Welcome to Zyra.
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

      {isExpired && (
        <Alert variant="destructive" data-testid="alert-trial-expired">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Your free trial has ended. Select a plan below to continue using Zyra.</span>
          </AlertDescription>
        </Alert>
      )}

      {isTrialing && trialDaysRemaining <= 1 && !isExpired && (
        <Alert data-testid="alert-trial-ending">
          <Clock className="h-4 w-4 text-orange-500" />
          <AlertDescription>
            Your trial ends {trialDaysRemaining === 0 ? "today" : "tomorrow"}. Choose a plan to keep access to all features.
          </AlertDescription>
        </Alert>
      )}

      <Card data-testid="card-current-plan">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Current Plan</CardTitle>
          <div className="flex items-center gap-2">
            {isActive && stripeConfigured && (
              <Badge variant="outline" className="text-xs gap-1" data-testid="badge-stripe-active">
                <CreditCard className="w-3 h-3" />
                Stripe Active
              </Badge>
            )}
            <Badge variant={getStatusVariant(currentStatus)} data-testid="badge-plan-status">
              {getStatusLabel(currentStatus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              isExpired ? "bg-destructive/10 text-destructive" :
              isTrialing ? "bg-blue-500/10 text-blue-500" :
              "bg-primary/10 text-primary"
            }`}>
              {isExpired ? <AlertTriangle className="w-5 h-5" /> :
               isTrialing ? <Clock className="w-5 h-5" /> :
               currentPlan === "enterprise" ? <Crown className="w-5 h-5" /> :
               <Star className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-lg font-bold capitalize" data-testid="text-current-plan-name">
                {isTrialing || isExpired ? "Free Trial" : currentPlan}
              </div>
              <div className="text-sm text-muted-foreground">
                {isExpired ? "Expired — please select a plan" :
                 isTrialing ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining` :
                 `$${plans.find((p) => p.name === currentPlan)?.price || 0}/month`}
              </div>
            </div>
          </div>

          {isTrialing && !isExpired && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trial progress</span>
                <span className="font-medium">{3 - trialDaysRemaining} of 3 days used</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${trialDaysRemaining <= 1 ? "bg-orange-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.round(((3 - trialDaysRemaining) / 3) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {isActive && subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span data-testid="text-billing-period">
                {new Date(subscription.currentPeriodStart).toLocaleDateString()} &ndash;{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!stripeConfigured && (
        <Alert data-testid="alert-stripe-not-configured">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Stripe is not configured. Add <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable payment processing.
            Plan changes will be applied directly without payment for now.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-1">Choose Your Plan</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isTrialing || isExpired
            ? "Select a plan to continue using Zyra after your trial ends."
            : "Upgrade or change your subscription plan."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isCurrent = isActive && currentPlan === plan.name;

            return (
              <Card
                key={plan.name}
                className={`${plan.popular ? "border-primary" : ""} ${isExpired ? "shadow-md" : ""}`}
                data-testid={`card-plan-${plan.name}`}
              >
                <CardHeader className="space-y-1 pb-3">
                  {plan.popular && (
                    <Badge variant="default" className="w-fit mb-1" data-testid="badge-popular">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    {plan.name === "enterprise" ? <Crown className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                    <CardTitle className="text-base capitalize">{plan.name}</CardTitle>
                  </div>
                  <div className="text-2xl font-bold">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
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
                        variant="default"
                        onClick={() => handlePlanAction(plan.name)}
                        disabled={isPending}
                        data-testid={`button-select-${plan.name}`}
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : stripeConfigured ? (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        ) : null}
                        {isTrialing || isExpired
                          ? stripeConfigured ? "Subscribe via Stripe" : "Select Plan"
                          : stripeConfigured ? "Switch via Stripe" : "Switch Plan"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {isActive && usage && (
        <Card data-testid="card-usage">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
          </CardContent>
        </Card>
      )}
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
