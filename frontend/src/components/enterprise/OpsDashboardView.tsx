import { Activity, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "./metrics/MetricCard";
import { GovernanceScoreCard } from "./InsightPanels";

type OpsDashboard = {
  job_health?: { recent?: number; failed?: number; running?: number };
  quality_failures?: number;
  governance?: Record<string, unknown> | null;
};

export function OpsDashboardView({ dashboard }: { dashboard: OpsDashboard }) {
  const health = dashboard.job_health ?? {};
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Recent Jobs"
          value={health.recent ?? 0}
          hint="Last 50 platform jobs"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          label="Running"
          value={health.running ?? 0}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          label="Failed"
          value={health.failed ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Quality Failures"
          value={dashboard.quality_failures ?? 0}
          icon={<Shield className="h-4 w-4" />}
        />
      </div>
      <GovernanceScoreCard governance={dashboard.governance} />
      {dashboard.governance && (
        <Card>
          <CardHeader><CardTitle className="text-base">Governance Detail</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-48 text-muted-foreground">
              {JSON.stringify(dashboard.governance, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
