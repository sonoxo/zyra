import { Link, useLocation } from "wouter";
import {
  Shield, LayoutDashboard, Search, CheckSquare,
  FileText, GitBranch, FolderOpen, Settings,
  Bell, Sun, Moon, LogOut, ChevronDown,
  Activity, Zap, Globe
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scans", label: "Security Scans", icon: Search },
  { href: "/compliance", label: "Compliance", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
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
                <div className="text-sm font-bold text-sidebar-foreground tracking-tight">SentinelSecOps</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                  {user?.organization?.plan ? `${user.organization.plan} plan` : "Active"}
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
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
