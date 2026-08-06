import type { JourneyAnalysisBundle } from "@/platform/track13/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CohortBarChart,
  DropOffTable,
  FunnelBarChart,
} from "./JourneyCharts";
import { ExecutiveBriefCard } from "./DecisionResultView";

export function JourneyAnalysisView({
  analysis,
  aiSummary,
}: {
  analysis: JourneyAnalysisBundle;
  aiSummary?: Record<string, unknown> | null;
}) {
  const funnelStages = analysis.funnel?.stages ?? [];
  const cohorts = analysis.cohort?.cohorts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline">{analysis.journey_type}</Badge>
        {analysis.owner_department && (
          <Badge variant="secondary">{analysis.owner_department}</Badge>
        )}
      </div>

      {funnelStages.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
          <CardContent><FunnelBarChart stages={funnelStages} /></CardContent>
        </Card>
      )}

      {analysis.drop_off_analysis?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Drop-off Analysis</CardTitle></CardHeader>
          <CardContent><DropOffTable drops={analysis.drop_off_analysis} /></CardContent>
        </Card>
      )}

      {cohorts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cohort Analysis</CardTitle></CardHeader>
          <CardContent><CohortBarChart cohorts={cohorts} /></CardContent>
        </Card>
      )}

      {analysis.time_in_stage?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Time in Stage</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {analysis.time_in_stage.map((t) => (
              <div key={t.stage} className="flex justify-between border-b border-border/40 pb-2">
                <span>{t.stage}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t.avg_hours != null ? `${t.avg_hours}h` : "—"} ({t.sample_size} samples)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {aiSummary?.ai_explanation && (
        <ExecutiveBriefCard brief={aiSummary.ai_explanation} />
      )}
    </div>
  );
}
