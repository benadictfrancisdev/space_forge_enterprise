import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import WorkspaceHome from "@/pages/v2/WorkspaceHome";
import RulesIDE from "@/pages/v2/RulesIDE";
import MetricsView from "@/pages/v2/MetricsView";
import IncidentsView from "@/pages/v2/IncidentsView";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformBootstrap } from "@/hooks/usePlatformBootstrap";
import { useV2Theme } from "@/hooks/useRouteTheme";

export default function V2PlatformPage() {
  useV2Theme();
  const { user } = useAuth();
  const { ready, error, apiConfigured } = usePlatformBootstrap();
  const needsBootstrap = apiConfigured && user;
  const bootstrapping = needsBootstrap && !ready && !error;

  if (bootstrapping) {
    return (
      <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing workspace…
        </div>
      </div>
    );
  }

  if (needsBootstrap && error) {
    return (
      <div className="dark bg-background text-foreground min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm">
          <p className="font-medium">Workspace setup failed</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route index element={<WorkspaceHome />} />
        <Route path="rules" element={<RulesIDE />} />
        <Route path="incidents" element={<IncidentsView />} />
        <Route path="metrics" element={<MetricsView />} />
        <Route path="*" element={<Navigate to="/v2" replace />} />
      </Routes>
    </AppLayout>
  );
}
