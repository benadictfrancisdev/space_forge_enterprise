import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import WorkspaceHome from "@/pages/v2/WorkspaceHome";
import RulesIDE from "@/pages/v2/RulesIDE";
import MetricsView from "@/pages/v2/MetricsView";
import IncidentsView from "@/pages/v2/IncidentsView";
import WorkspaceAnalytics from "@/pages/v2/WorkspaceAnalytics";
import Dashboards from "@/pages/Dashboards";
import DataAgent from "@/pages/DataAgent";
import EnterpriseWorkspaceGate from "@/pages/apps/EnterpriseWorkspaceGate";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformBootstrap } from "@/hooks/usePlatformBootstrap";
import { useV2Theme } from "@/hooks/useRouteTheme";
import { DECISION_INTELLIGENCE_PATH } from "@/config/workspaceNav";
import WorkspaceNotFound from "@/pages/v2/WorkspaceNotFound";

const ExecutiveInsights = lazy(() => import("@/pages/apps/ExecutiveInsights"));
const JourneyAnalytics = lazy(() => import("@/pages/apps/JourneyAnalytics"));
const SankeyViz = lazy(() => import("@/pages/apps/SankeyViz"));
const OperationalIntelligenceApp = lazy(() => import("@/pages/apps/OperationalIntelligenceApp"));
const DecisionIntelligenceApp = lazy(() => import("@/pages/apps/DecisionIntelligenceApp"));
const AIScientistApp = lazy(() => import("@/pages/apps/AIScientistApp"));
const ForecastStudioApp = lazy(() => import("@/pages/apps/ForecastStudioApp"));
const EnterpriseReportingApp = lazy(() => import("@/pages/apps/EnterpriseReportingApp"));

const EventsDashboard = lazy(() => import("@/features/events/pages/EventsDashboard"));
const EventsExplorer = lazy(() => import("@/features/events/pages/EventsExplorer"));
const EventDetails = lazy(() => import("@/features/events/pages/EventDetails"));
const EventSources = lazy(() => import("@/features/events/pages/EventSources"));
const EventMonitoring = lazy(() => import("@/features/events/pages/EventMonitoring"));
const EventSearch = lazy(() => import("@/features/events/pages/EventSearch"));
const EventAnalytics = lazy(() => import("@/features/events/pages/EventAnalytics"));
const EventSettings = lazy(() => import("@/features/events/pages/EventSettings"));

const RouteLoader = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export default function V2PlatformPage() {
  useV2Theme();
  const { user } = useAuth();
  const { ready, error, apiConfigured } = usePlatformBootstrap();
  const needsBootstrap = apiConfigured && user;
  const bootstrapping = needsBootstrap && !ready && !error;

  if (bootstrapping) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing workspace…
        </div>
      </div>
    );
  }

  if (needsBootstrap && error) {
    return (
      <div className="bg-background text-foreground min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm">
          <p className="font-medium">Workspace setup failed</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route index element={<WorkspaceHome />} />
          <Route path="rules" element={<RulesIDE />} />
          <Route path="incidents" element={<IncidentsView />} />
          <Route path="metrics" element={<MetricsView />} />
          <Route path="analytics/*" element={<WorkspaceAnalytics />} />
          <Route path="dashboards" element={<div className="p-4 md:p-6"><Dashboards /></div>} />
          <Route path="data-agent" element={<DataAgent embedded />} />

          <Route path="apps" element={<EnterpriseWorkspaceGate />}>
            <Route index element={<Navigate to="executive" replace />} />
            <Route path="executive" element={<ExecutiveInsights />} />
            <Route path="journey" element={<JourneyAnalytics />} />
            <Route path="sankey" element={<SankeyViz />} />
            <Route path="operations" element={<OperationalIntelligenceApp />} />
            <Route path="decisions" element={<DecisionIntelligenceApp />} />
            <Route path="scientist" element={<AIScientistApp />} />
            <Route path="forecast" element={<ForecastStudioApp />} />
            <Route path="reporting" element={<EnterpriseReportingApp />} />
          </Route>

          <Route path="events" element={<EventsDashboard />} />
          <Route path="events/explorer" element={<EventsExplorer />} />
          <Route path="events/explorer/:eventId" element={<EventDetails />} />
          <Route path="events/sources" element={<EventSources />} />
          <Route path="events/monitoring" element={<EventMonitoring />} />
          <Route path="events/search" element={<EventSearch />} />
          <Route path="events/analytics" element={<EventAnalytics />} />
          <Route path="events/settings" element={<EventSettings />} />

          {/* Legacy decision route alias inside workspace */}
          <Route path="decisions" element={<Navigate to={DECISION_INTELLIGENCE_PATH} replace />} />

          <Route path="*" element={<WorkspaceNotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
