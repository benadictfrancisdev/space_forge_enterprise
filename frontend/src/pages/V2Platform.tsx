import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/app/layout/AppLayout";
import { CasualMode } from "@/features/v2_casual_mode/components/CasualMode";
import { IncidentsView } from "@/features/v2_incidents/components/IncidentsView";
import { MetricsView } from "@/features/v2_metrics/components/MetricsView";
import { RuleIDE } from "@/features/v2_rule_ide/components/RuleIDE";
import { useV2Theme } from "@/hooks/useRouteTheme";

export default function V2PlatformPage() {
  useV2Theme();

  return (
    <AppLayout>
      <Routes>
        <Route index element={<RuleIDE />} />
        <Route path="incidents" element={<IncidentsView />} />
        <Route path="metrics" element={<MetricsView />} />
        <Route path="casual" element={<CasualMode />} />
        <Route path="*" element={<Navigate to="/v2" replace />} />
      </Routes>
    </AppLayout>
  );
}
