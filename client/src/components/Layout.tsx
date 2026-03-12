import { Link, useLocation } from "wouter";
import {
  Shield, LayoutDashboard, Search, CheckSquare,
  FileText, GitBranch, FolderOpen, Settings,
  Bell, Sun, Moon, LogOut, ChevronDown,
  Activity, Zap, Globe, Plug, Building2,
  CreditCard, Key, BarChart3, Crosshair,
  Cloud, Rss, GitMerge, Flame, Bug, Package,
  KeyRound, TriangleAlert, Radar, TrendingUp,
  Users, ClipboardList, Rocket, Check, X,
  GraduationCap, Building, Eye, Map, Fish, Box,
  Cpu, GitFork, ScanSearch, Bot, DatabaseZap,
  Share2, Database, BarChart2, Layers
} from "lucide-react";
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
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

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
      { href: "/attack-paths", label: "Attack Path Modeling", icon: GitFork },
      { href: "/threat-hunting", label: "Threat Hunting", icon: ScanSearch },
      { href: "/security-copilot", label: "Security Copilot", icon: Bot },
      { href: "/security-events", label: "Security Data Lake", icon: Database },
      { href: "/security-graph", label: "Security Graph", icon: Share2 },
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

function NotificationBell({ orgId }: { orgId: string | undefined }) {
  const qc = useQueryClient();

  const { data } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
    enabled: !!orgId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id?: string) => apiRequest("POST", "/api/notifications/read", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

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
            items.slice(0, 20).map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markReadMutation.mutate(n.id)}
                className={cn(
                  "px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", SEVERITY_COLORS[n.severity] ?? "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data: user } = useQuery<AuthUser>({ queryKey: ["/api/auth/me"] });

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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
                <Shield className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-sidebar-foreground tracking-tight">Sentinel Forge</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                  {user?.organization?.plan ? `${user.organization.plan} plan` : "Active"}
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
                  <NavItem key={item.href} {...item} />
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
            <Badge variant="outline" className="text-xs h-4 px-1.5 shrink-0 border-green-500/30 text-green-600 dark:text-green-400">
              Active
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
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
