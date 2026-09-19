import { NavLink, useLocation, Outlet } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Command,
  LayoutDashboard,
  Plug,
  Search,
  Settings as SettingsIcon,
  Table2,
  ChevronsLeft,
  ChevronsRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { WorkspacePageFrame } from "@/components/layout/WorkspacePageFrame";
import { EVENT_ENGINE_NAV, workspacePath } from "@/config/workspaceNav";

const LEGACY_NAV = [
  { to: "/app/events", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/events/explorer", label: "Event Explorer", icon: Table2 },
  { to: "/app/events/sources", label: "Data Sources", icon: Plug },
  { to: "/app/events/monitoring", label: "Monitoring", icon: Activity },
  { to: "/app/events/search", label: "Search", icon: Search },
  { to: "/app/events/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/events/settings", label: "Settings", icon: SettingsIcon },
];

interface Props {
  title?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}

function useUnifiedWorkspace() {
  const { pathname } = useLocation();
  return pathname === "/v2" || pathname.startsWith("/v2/");
}

export function AppShell({ title, breadcrumbs, actions, children }: Props) {
  const unified = useUnifiedWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navItems = unified ? EVENT_ENGINE_NAV : LEGACY_NAV;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (unified) {
    return (
      <WorkspacePageFrame title={title} breadcrumbs={breadcrumbs} actions={actions}>
        {children}
      </WorkspacePageFrame>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/70 bg-card/40 transition-all duration-200",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b border-border/60">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Logo className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-tight truncate">SpaceForge</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {!collapsed && (
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Event Engine
            </div>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                  isActive && "bg-muted text-foreground font-medium"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-border/60">
          <NavLink
            to={unified ? workspacePath("/data-agent") : "/data-agent"}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70"
          >
            {!collapsed && "Data Agent Workspace"}
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-2 text-sm min-w-0">
            {breadcrumbs?.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-border">/</span>}
                {b.to ? (
                  <NavLink to={b.to} className="text-muted-foreground hover:text-foreground truncate">
                    {b.label}
                  </NavLink>
                ) : (
                  <span className="text-foreground font-medium truncate">{b.label}</span>
                )}
              </span>
            ))}
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto hidden md:flex items-center gap-2 h-8 pl-3 pr-2 text-xs text-muted-foreground bg-muted/60 hover:bg-muted rounded-md border border-border/60 min-w-[220px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search events, sources, entities…</span>
            <kbd className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border/60 text-[10px]">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>
          <button className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </header>

        {(title || actions) && (
          <div className="px-4 lg:px-6 py-5 border-b border-border/50 flex flex-wrap items-end justify-between gap-3">
            <div>
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children ?? <Outlet />}</main>
      </div>

      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-start justify-center pt-24"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 rounded-lg border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 h-11 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <kbd className="text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            <div className="p-2 text-xs text-muted-foreground">
              Global search will be available once events are ingested.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
