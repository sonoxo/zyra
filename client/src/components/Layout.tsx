import { useState, useEffect } from "react";
import { Link, useLocation, useLocation as useWouterLocation } from "wouter";
import {
  LayoutDashboard, Search, CheckSquare,
  FileText, GitBranch, FolderOpen, Settings,
  Bell, Sun, Moon, LogOut, ChevronDown, Menu,
  Activity, Zap, Globe, Plug, Building2,
  CreditCard, Key, BarChart3, Crosshair,
  Cloud, Rss, GitMerge, Flame, Bug, Package,
  KeyRound, TriangleAlert, Radar, TrendingUp,
  Users, ClipboardList, Rocket, Check, X, ListTodo,
  GraduationCap, Building, Eye, Map, Fish, Box,
  Cpu, GitFork, ScanSearch, Bot, DatabaseZap,
  Share2, Database, BarChart2, Layers, Clock, AlertTriangle, ShieldCheck, Shield, Radio
} from "lucide-react";
import zyraLogo from "@assets/ChatGPT_Image_Mar_30,_2026,_05_28_39_PM_1775166956477.png";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Notification, Subscription } from "@shared/schema";

interface SubscriptionWithTrial extends Subscription {
  trialDaysRemaining: number;
  trialExpired: boolean;
}

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/posture", label: "Security Posture", icon: TrendingUp },
      { href: "/onboarding", label: "Getting Started", icon: Rocket },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/scans", label: "Security Scans", icon: Search },
      { href: "/pentest", label: "AI Pentesting", icon: Crosshair },
      { href: "/cloud-security", label: "Cloud Security", icon: Cloud },
      { href: "/container-security", label: "Container Security", icon: Box },
      { href: "/threat-intel", label: "Threat Intel", icon: Rss },
      { href: "/attack-surface", label: "Attack Surface", icon: Radar },
      { href: "/secrets", label: "Secrets Scanning", icon: KeyRound },
      { href: "/dark-web", label: "Dark Web Monitor", icon: Eye },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/incidents", label: "Incident Response", icon: Flame },
      { href: "/vulnerabilities", label: "Vulnerabilities", icon: Bug },
      { href: "/risks", label: "Risk Register", icon: TriangleAlert },
      { href: "/sbom", label: "Supply Chain", icon: Package },
      { href: "/security-roadmap", label: "Security Roadmap", icon: Map },
      { href: "/bug-bounty", label: "Bug Bounty", icon: Fish },
      { href: "/soar", label: "SOAR Automation", icon: Zap },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/compliance", label: "Compliance", icon: CheckSquare },
      { href: "/devsecops", label: "DevSecOps", icon: GitMerge },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/security-awareness", label: "Security Awareness", icon: GraduationCap },
      { href: "/vendor-risk", label: "Vendor Risk", icon: Building },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/caasm", label: "CAASM", icon: Layers },
      { href: "/asset-inventory", label: "Asset Inventory", icon: Cpu },
      { href: "/cve-intelligence", label: "CVE Intelligence", icon: DatabaseZap },
      { href: "/attack-paths", label: "Exposure Management", icon: GitFork },
      { href: "/threat-hunting", label: "Threat Hunting", icon: ScanSearch },
      { href: "/security-copilot", label: "ZyraCopilot", icon: Bot },
      { href: "/security-events", label: "Security Data Lake", icon: Database },
      { href: "/security-graph", label: "Security Graph", icon: Share2 },
      { href: "/threat-simulation", label: "Threat Simulation", icon: Radio },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/repositories", label: "Repositories", icon: GitBranch },
      { href: "/documents", label: "Documents", icon: FolderOpen },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/task-center", label: "Task Center", icon: ListTodo },
      { href: "/admin", label: "Admin Panel", icon: ShieldCheck },
      { href: "/team", label: "Team", icon: Users },
      { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList },
      { href: "/platform-metrics", label: "Platform Metrics", icon: BarChart2 },
      { href: "/enterprise-readiness", label: "Enterprise Readiness", icon: Shield },
      { href: "/enterprise", label: "Enterprise / SSO", icon: Building2 },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/api-keys", label: "API Keys", icon: Key },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const [location] = useWouterLocation();
  const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <Link href={href}>
      <div
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-sidebar-primary-foreground" : "")} />
        <span>{label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/70" />
        )}
      </div>
    </Link>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  info: "bg-gray-400",
};

const NOTIFICATION_ROUTES: Record<string, string> = {
  incident: "/incidents",
  vulnerability: "/vulnerabilities",
  scan: "/scans",
  threat_intel: "/threat-intel",
  task: "/task-center",
};

function getNotificationPath(n: Notification): string | null {
  const base = NOTIFICATION_ROUTES[n.resourceType ?? ""];
  if (!base) return null;
  return n.resourceId ? `${base}/${n.resourceId}` : base;
}

function NotificationBell({ orgId }: { orgId: string | undefined }) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    enabled: !!orgId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id?: string) => apiRequest("POST", "/api/notifications/read", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    const path = getNotificationPath(n);
    if (path) navigate(path);
  };

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="notification-bell"
          className="relative p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button
              onClick={() => markReadMutation.mutate(undefined)}
              className="text-xs text-primary hover:underline"
              data-testid="button-mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
              No notifications yet
            </div>
          ) : (
            items.slice(0, 20).map(n => {
              const navPath = getNotificationPath(n);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.read && "bg-primary/5"
                  )}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", SEVERITY_COLORS[n.severity] ?? "bg-gray-400")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {navPath && <span className="text-[10px] text-primary/60">View →</span>}
                      </div>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavItem({ href, label, icon: Icon, onNavigate }: { href: string; label: string; icon: any; onNavigate: () => void }) {
  const [location] = useWouterLocation();
  const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <Link href={href}>
      <div
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-sidebar-primary-foreground" : "")} />
        <span>{label}</span>
      </div>
    </Link>
  );
}

function SidebarContent({ user, subscription, initials, isTrialing, isExpired, isActive, trialDaysRemaining, theme, toggleTheme, logoutMutation, onNavigate }: any) {
  return (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard">
          <div onClick={onNavigate} className="flex items-center gap-2.5 cursor-pointer group">
            <img src={zyraLogo} alt="Zyra" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div>
              <div className="text-sm font-bold text-sidebar-foreground tracking-tight">Zyra</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full inline-block",
                  isExpired ? "bg-red-500" : isTrialing ? "bg-blue-500" : "bg-green-500"
                )}></span>
                {isExpired ? "Trial Expired" :
                 isTrialing ? `Trial — ${trialDaysRemaining}d left` :
                 isActive && subscription?.plan ? `${subscription.plan} plan` : "Active"}
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                onNavigate
                  ? <MobileNavItem key={item.href} {...item} onNavigate={onNavigate} />
                  : <NavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Globe className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {user?.organization?.name || "Organization"}
            </span>
          </div>
          <NotificationBell orgId={user?.organizationId} />
          <Badge variant="outline" className={cn(
            "text-xs h-4 px-1.5 shrink-0",
            isExpired ? "border-red-500/30 text-red-600 dark:text-red-400" :
            isTrialing ? "border-blue-500/30 text-blue-600 dark:text-blue-400" :
            "border-green-500/30 text-green-600 dark:text-green-400"
          )}>
            {isExpired ? "Expired" : isTrialing ? "Trial" : "Active"}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-trigger"
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-sidebar-foreground truncate">
                  {user?.fullName || user?.username}
                </div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={toggleTheme} data-testid="toggle-theme">
              {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              className="text-destructive focus:text-destructive"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [location] = useWouterLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });
  const { data: subscription } = useQuery<SubscriptionWithTrial>({
    queryKey: ["/api/billing/subscription"],
    refetchInterval: 60000,
  });

  const isTrialing = subscription?.status === "trialing";
  const isExpired = subscription?.status === "expired" || subscription?.trialExpired;
  const isActive = subscription?.status === "active";
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      navigate("/auth");
    },
  });

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  const sidebarProps = { user, subscription, initials, isTrialing, isExpired, isActive, trialDaysRemaining, theme, toggleTheme, logoutMutation };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent {...sidebarProps} onNavigate={undefined} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarContent {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-background">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={zyraLogo} alt="Zyra" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-sm">Zyra</span>
          </div>
          <div className="ml-auto">
            <NotificationBell orgId={user?.organizationId} />
          </div>
        </div>

        {isTrialing && trialDaysRemaining <= 2 && !isExpired && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm">
                Your free trial ends in {trialDaysRemaining === 0 ? "less than a day" : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""}`}.
              </span>
            </div>
            <Link href="/billing">
              <Button size="sm" variant="default" className="h-7 text-xs" data-testid="button-trial-upgrade">
                Choose a plan
              </Button>
            </Link>
          </div>
        )}

        {isExpired && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-destructive font-medium text-xs sm:text-sm">
                Your free trial has ended. Select a plan to continue.
              </span>
            </div>
            <Link href="/billing">
              <Button size="sm" variant="destructive" className="h-7 text-xs" data-testid="button-expired-upgrade">
                Select a plan
              </Button>
            </Link>
          </div>
        )}

        <div className="flex-1 p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
