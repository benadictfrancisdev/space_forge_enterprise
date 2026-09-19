import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { LogOut, Menu, X, Search, PanelRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import {
  WORKSPACE_BASE,
  WORKSPACE_NAV_GROUPS,
  workspaceBreadcrumbs,
  itemOrChildActive,
  type WorkspaceNavItem,
} from "@/config/workspaceNav";
import { CommandPalette } from "@/components/layout/CommandPalette";
import {
  WorkspaceInspectorPanel,
  WorkspaceInspectorProvider,
  useWorkspaceInspector,
} from "@/components/layout/WorkspaceInspector";
import { WorkspaceMobileNav } from "@/components/layout/WorkspaceMobileNav";
import { useTenantContext } from "@/hooks/useTenantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = workspaceBreadcrumbs(pathname);
  return (
    <nav
      className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0"
      data-testid="workspace-breadcrumbs"
      aria-label="Breadcrumb"
    >
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-2 min-w-0">
          {i > 0 && <span className="text-border">/</span>}
          {c.to ? (
            <Link to={c.to} className="hover:text-foreground truncate">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground truncate" aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

function SidebarItem({
  item,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();
  const active = itemOrChildActive(pathname, item);
  const [expanded, setExpanded] = useState(active);

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  return (
    <div>
      <NavLink
        to={item.to}
        end={item.end}
        onClick={() => {
          if (item.children?.length) setExpanded(true);
          onNavigate();
        }}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={() =>
          cn(
            "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-secondary",
            active &&
              "text-foreground bg-secondary/80 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-primary before:rounded-sm"
          )
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </NavLink>
      {item.children && expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-1">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              onClick={onNavigate}
              data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  isActive && "text-foreground bg-secondary/80"
                )
              }
            >
              <child.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function AppLayoutInner({ children }: { children?: ReactNode }) {
  const { user, signOut } = useAuth();
  const tenant = useTenantContext();
  const { open: inspectorOpen, setOpen: setInspectorOpen } = useWorkspaceInspector();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const showMobileDomains = !pathname.startsWith("/v2/data-agent");

  return (
    <div
      className="bg-background text-foreground min-h-screen md:h-screen md:flex md:overflow-hidden"
      data-testid="app-layout"
    >
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:m-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to main content
      </a>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-border bg-card transition-transform duration-200 md:static md:translate-x-0 md:shrink-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="workspace-sidebar"
        aria-label="Workspace"
      >
        <div className="h-12 flex items-center justify-between px-3 border-b border-border shrink-0">
          <Link to={WORKSPACE_BASE} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
              <span className="text-primary text-xs font-mono font-semibold">SF</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">SpaceForge</span>
          </Link>
          <button
            type="button"
            className="md:hidden p-1.5 rounded-md hover:bg-secondary"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-border shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 h-8 px-2 text-xs text-muted-foreground bg-background border border-border rounded-md hover:bg-secondary"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search workspace…</span>
            <kbd className="ml-auto hidden lg:inline text-[10px] font-mono border border-border rounded px-1">
              ⌘K
            </kbd>
          </button>
          {tenant.organization && (
            <Select
              value={tenant.organization.id}
              onValueChange={(id) => void tenant.selectOrganization(id)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Organization">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                {tenant.organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id} className="text-xs">
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {tenant.workspace && (
            <Select
              value={tenant.workspace.id}
              onValueChange={(id) => void tenant.selectWorkspace(id)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Workspace">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                {tenant.workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id} className="text-xs">
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {WORKSPACE_NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {group.title}
              </div>
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => (
                  <SidebarItem key={`${group.title}-${item.label}`} item={item} onNavigate={() => setMobileOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border shrink-0">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Environment · Default
          </div>
          <div className="px-3 py-2 text-xs text-muted-foreground truncate font-mono" data-testid="sidebar-user-email">
            {user?.email ?? "Not signed in"}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            data-testid="sidebar-logout-button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:min-h-0">
        <header className="h-12 shrink-0 border-b border-border bg-background flex items-center gap-3 px-3 md:px-4">
          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-secondary shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="hidden md:flex items-center gap-2 h-8 px-2 text-xs text-muted-foreground rounded-md hover:bg-secondary"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Command</span>
            </button>
            <a
              href="/docs"
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground"
              aria-label="Help and documentation"
            >
              <HelpCircle className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="hidden xl:inline-flex p-2 rounded-md hover:bg-secondary text-muted-foreground"
              onClick={() => setInspectorOpen(!inspectorOpen)}
              aria-label={inspectorOpen ? "Hide inspector" : "Show inspector"}
              aria-pressed={inspectorOpen}
            >
              <PanelRight className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 flex min-h-0 min-w-0">
          <main
            id="workspace-main"
            className={cn("flex-1 min-h-0 flex flex-col overflow-hidden", showMobileDomains && "pb-14 md:pb-0")}
            data-testid="workspace-main"
          >
            {children ?? <Outlet />}
          </main>
          <WorkspaceInspectorPanel />
        </div>
      </div>

      {showMobileDomains && <WorkspaceMobileNav onMore={() => setMobileOpen(true)} />}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <WorkspaceInspectorProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </WorkspaceInspectorProvider>
  );
}
