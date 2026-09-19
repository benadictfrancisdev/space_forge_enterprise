import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isApiConfigured } from "@/platform";
import { usePlatformBootstrap } from "@/hooks/usePlatformBootstrap";

/** Tenant/bootstrap banners for enterprise apps inside the unified workspace shell. */
export default function EnterpriseWorkspaceGate() {
  const { user } = useAuth();
  const apiReady = isApiConfigured();
  const { ready: tenantReady, error: tenantError } = usePlatformBootstrap();

  return (
    <div className="p-4 md:p-6 max-w-6xl">
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
          <p className="text-muted-foreground mt-1 text-xs">
            Set <code className="text-xs">VITE_API_BASE_URL</code> and run the Django backend.
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
            <Link to="/v2/data-agent">Upload data</Link>
          </Button>
        </div>
      )}
      <Outlet />
    </div>
  );
}
