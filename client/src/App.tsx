import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Scans from "@/pages/scans";
import ScanDetail from "@/pages/scan-detail";
import Compliance from "@/pages/compliance";
import Reports from "@/pages/reports";
import ReportDetail from "@/pages/report-detail";
import Repositories from "@/pages/repositories";
import Documents from "@/pages/documents";
import Integrations from "@/pages/integrations";
import Enterprise from "@/pages/enterprise";
import Billing from "@/pages/billing";
import ApiKeysPage from "@/pages/api-keys";
import Analytics from "@/pages/analytics";
import PentestPage from "@/pages/pentest";
import CloudSecurityPage from "@/pages/cloud-security";
import ThreatIntelPage from "@/pages/threat-intel";
import DevSecOpsPage from "@/pages/devsecops";
import SettingsPage from "@/pages/settings";
import IncidentsPage from "@/pages/incidents";
import VulnerabilitiesPage from "@/pages/vulnerabilities";
import SbomPage from "@/pages/sbom";
import SecretsPage from "@/pages/secrets";
import RisksPage from "@/pages/risks";
import AttackSurfacePage from "@/pages/attack-surface";
import PosturePage from "@/pages/posture";
import SecurityAwarenessPage from "@/pages/security-awareness";
import VendorRiskPage from "@/pages/vendor-risk";
import DarkWebPage from "@/pages/dark-web";
import SecurityRoadmapPage from "@/pages/security-roadmap";
import BugBountyPage from "@/pages/bug-bounty";
import ContainerSecurityPage from "@/pages/container-security";
import OnboardingPage from "@/pages/onboarding";
import AssetInventoryPage from "@/pages/asset-inventory";
import AttackPathsPage from "@/pages/attack-paths";
import ThreatHuntingPage from "@/pages/threat-hunting";
import SecurityCopilotPage from "@/pages/security-copilot";
import CveIntelligencePage from "@/pages/cve-intelligence";
import CaasmPage from "@/pages/caasm";
import SoarPage from "@/pages/soar";
import SecurityEventsPage from "@/pages/security-events";
import SecurityGraphPage from "@/pages/security-graph";
import PlatformMetricsPage from "@/pages/platform-metrics";
import TeamPage from "@/pages/team";
import EnterpriseReadinessPage from "@/pages/enterprise-readiness";
import VerifyEmailPage from "@/pages/verify-email";
import Layout from "@/components/Layout";
import type { AuthUser } from "@/lib/auth";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element | null }) {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AuthRoute() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <AuthPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthRoute} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/scans/:id">{() => <ProtectedRoute component={ScanDetail} />}</Route>
      <Route path="/scans">{() => <ProtectedRoute component={Scans} />}</Route>
      <Route path="/compliance">{() => <ProtectedRoute component={Compliance} />}</Route>
      <Route path="/reports/:id">{() => <ProtectedRoute component={ReportDetail} />}</Route>
      <Route path="/reports">{() => <ProtectedRoute component={Reports} />}</Route>
      <Route path="/repositories">{() => <ProtectedRoute component={Repositories} />}</Route>
      <Route path="/documents">{() => <ProtectedRoute component={Documents} />}</Route>
      <Route path="/analytics">{() => <ProtectedRoute component={Analytics} />}</Route>
      <Route path="/pentest">{() => <ProtectedRoute component={PentestPage} />}</Route>
      <Route path="/cloud-security">{() => <ProtectedRoute component={CloudSecurityPage} />}</Route>
      <Route path="/threat-intel">{() => <ProtectedRoute component={ThreatIntelPage} />}</Route>
      <Route path="/devsecops">{() => <ProtectedRoute component={DevSecOpsPage} />}</Route>
      <Route path="/integrations">{() => <ProtectedRoute component={Integrations} />}</Route>
      <Route path="/enterprise">{() => <ProtectedRoute component={Enterprise} />}</Route>
      <Route path="/billing">{() => <ProtectedRoute component={Billing} />}</Route>
      <Route path="/api-keys">{() => <ProtectedRoute component={ApiKeysPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route path="/incidents">{() => <ProtectedRoute component={IncidentsPage} />}</Route>
      <Route path="/vulnerabilities">{() => <ProtectedRoute component={VulnerabilitiesPage} />}</Route>
      <Route path="/sbom">{() => <ProtectedRoute component={SbomPage} />}</Route>
      <Route path="/secrets">{() => <ProtectedRoute component={SecretsPage} />}</Route>
      <Route path="/risks">{() => <ProtectedRoute component={RisksPage} />}</Route>
      <Route path="/attack-surface">{() => <ProtectedRoute component={AttackSurfacePage} />}</Route>
      <Route path="/posture">{() => <ProtectedRoute component={PosturePage} />}</Route>
      <Route path="/security-awareness">{() => <ProtectedRoute component={SecurityAwarenessPage} />}</Route>
      <Route path="/vendor-risk">{() => <ProtectedRoute component={VendorRiskPage} />}</Route>
      <Route path="/dark-web">{() => <ProtectedRoute component={DarkWebPage} />}</Route>
      <Route path="/security-roadmap">{() => <ProtectedRoute component={SecurityRoadmapPage} />}</Route>
      <Route path="/bug-bounty">{() => <ProtectedRoute component={BugBountyPage} />}</Route>
      <Route path="/container-security">{() => <ProtectedRoute component={ContainerSecurityPage} />}</Route>
      <Route path="/onboarding">{() => <ProtectedRoute component={OnboardingPage} />}</Route>
      <Route path="/asset-inventory">{() => <ProtectedRoute component={AssetInventoryPage} />}</Route>
      <Route path="/attack-paths">{() => <ProtectedRoute component={AttackPathsPage} />}</Route>
      <Route path="/threat-hunting">{() => <ProtectedRoute component={ThreatHuntingPage} />}</Route>
      <Route path="/security-copilot">{() => <ProtectedRoute component={SecurityCopilotPage} />}</Route>
      <Route path="/cve-intelligence">{() => <ProtectedRoute component={CveIntelligencePage} />}</Route>
      <Route path="/caasm">{() => <ProtectedRoute component={CaasmPage} />}</Route>
      <Route path="/soar">{() => <ProtectedRoute component={SoarPage} />}</Route>
      <Route path="/security-events">{() => <ProtectedRoute component={SecurityEventsPage} />}</Route>
      <Route path="/security-graph">{() => <ProtectedRoute component={SecurityGraphPage} />}</Route>
      <Route path="/platform-metrics">{() => <ProtectedRoute component={PlatformMetricsPage} />}</Route>
      <Route path="/team">{() => <ProtectedRoute component={TeamPage} />}</Route>
      <Route path="/enterprise-readiness">{() => <ProtectedRoute component={EnterpriseReadinessPage} />}</Route>
      <Route path="/team-activity">{() => <Redirect to="/team" />}</Route>
      <Route path="/oncall-schedule">{() => <Redirect to="/team" />}</Route>
      <Route path="/approvals">{() => <Redirect to="/team" />}</Route>
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
