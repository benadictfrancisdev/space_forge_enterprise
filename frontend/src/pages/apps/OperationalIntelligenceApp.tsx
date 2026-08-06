import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { platformClient } from "@/platform/track13/platformClient";
import { OpsDashboardView } from "@/components/enterprise/OpsDashboardView";

export default function OperationalIntelligenceApp() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformClient.getOpsDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operational Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Job health, quality failures, and governance posture across the platform.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading operations dashboard…
        </div>
      ) : dashboard ? (
        <OpsDashboardView dashboard={dashboard} />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load operations dashboard.</p>
      )}
    </div>
  );
}
