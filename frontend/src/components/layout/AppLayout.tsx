import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { ReactNode } from "react";
import {
  LayoutGrid,
  AlertTriangle,
  Activity,
  Code2,
  Boxes,
  Database,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; end?: boolean };

const NAV: NavItem[] = [
  { to: "/v2", label: "Workspace", icon: LayoutGrid, end: true },
  { to: "/v2/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/v2/metrics", label: "Metrics", icon: Activity },
  { to: "/apps", label: "Enterprise Apps", icon: Boxes },
  { to: "/data-agent", label: "Data Agent", icon: Database },
  { to: "/app/events", label: "Event Engine", icon: Code2 },
];

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-2 text-xs font-mono text-muted-foreground" data-testid="workspace-breadcrumbs">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-border">/</span>}
          <span className={cn(i === parts.length - 1 && "text-foreground")}>{p}</span>
        </span>
      ))}
    </nav>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div
      className="dark bg-background text-foreground"
      style={{ ["--radius" as string]: "0.375rem" }}
      data-testid="app-layout"
    >
      <div className="h-screen flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col" data-testid="workspace-sidebar">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link to="/v2" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
                <span className="text-primary text-xs font-mono font-semibold">SF</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">SpaceForge</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    isActive &&
                      "text-foreground bg-transparent before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-primary before:rounded-sm"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate font-mono" data-testid="sidebar-user-email">
              {user?.email ?? "Not signed in"}
            </div>
            <button
              onClick={() => signOut()}
              data-testid="sidebar-logout-button"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 shrink-0 border-b border-border bg-background/80 backdrop-blur flex items-center px-6">
            <Breadcrumbs />
          </header>
          <main className="flex-1 overflow-y-auto" data-testid="workspace-main">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}
