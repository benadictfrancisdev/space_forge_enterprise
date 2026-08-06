import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { ENTERPRISE_APPS, LEGACY_DATA_AGENT } from "@/config/enterpriseAppsNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnterpriseGlobalSearch } from "@/components/enterprise/EnterpriseGlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { isApiConfigured } from "@/platform";
import { usePlatformBootstrap } from "@/hooks/usePlatformBootstrap";

export default function EnterpriseAppsLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const apiReady = isApiConfigured();
  const { ready: tenantReady, error: tenantError } = usePlatformBootstrap();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="md:hidden fixed top-[52px] left-0 right-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur px-2 py-2 flex gap-1 overflow-x-auto">
        {ENTERPRISE_APPS.map((app) => {
          const active = location.pathname.startsWith(app.path);
          return (
            <Link
              key={app.id}
              to={app.path}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {app.label}
            </Link>
          );
        })}
      </div>

      <div className="flex pt-16">
        <aside className="hidden md:flex flex-col w-64 border-r border-border/60 min-h-[calc(100vh-64px)] p-4 space-y-1 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
            Enterprise Intelligence Suite
          </p>
          <EnterpriseGlobalSearch />
          {ENTERPRISE_APPS.map((app) => {
            const active = location.pathname.startsWith(app.path);
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.path}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{app.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 mt-4 border-t border-border/60">
            <Link
              to={LEGACY_DATA_AGENT.path}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <LEGACY_DATA_AGENT.icon className="h-4 w-4" />
              {LEGACY_DATA_AGENT.label}
            </Link>
          </div>
          <div className="px-2 pt-4">
            <Badge variant="outline" className="text-[10px]">Track 13 · Platform APIs</Badge>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6 max-w-6xl min-w-0 mt-10 md:mt-0">
          {!user && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <p className="font-medium">Sign in to use platform datasets and intelligence APIs.</p>
              <Button asChild size="sm" className="mt-2">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          )}
          {user && !apiReady && (
            <div className="mb-6 rounded-lg border border-border p-4 text-sm bg-muted/30">
              <p className="font-medium">Platform API not configured</p>
              <p className="text-muted-foreground mt-1">
                Set <code className="text-xs">VITE_API_BASE_URL</code> and run the Django backend to load datasets.
              </p>
            </div>
          )}
          {user && apiReady && tenantError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="font-medium">Platform tenant setup failed</p>
              <p className="text-muted-foreground mt-1">{tenantError}</p>
            </div>
          )}
          {user && apiReady && tenantReady && (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Enterprise Intelligence Suite</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload data in Data Agent, then run analysis here with platform orchestration.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/data-agent">Upload data</Link>
              </Button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
