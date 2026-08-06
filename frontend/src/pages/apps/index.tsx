import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

const EnterpriseAppsLayout = lazy(() => import("./EnterpriseAppsLayout"));
const ExecutiveInsights = lazy(() => import("./ExecutiveInsights"));
const JourneyAnalytics = lazy(() => import("./JourneyAnalytics"));
const SankeyViz = lazy(() => import("./SankeyViz"));
const OperationalIntelligenceApp = lazy(() => import("./OperationalIntelligenceApp"));
const DecisionIntelligenceApp = lazy(() => import("./DecisionIntelligenceApp"));
const AIScientistApp = lazy(() => import("./AIScientistApp"));
const ForecastStudioApp = lazy(() => import("./ForecastStudioApp"));
const EnterpriseReportingApp = lazy(() => import("./EnterpriseReportingApp"));

const Loader = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export default function EnterpriseAppsRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<EnterpriseAppsLayout />}>
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
      </Routes>
    </Suspense>
  );
}
