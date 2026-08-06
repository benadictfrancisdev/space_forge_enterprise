import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlatformInsightBundle } from "@/platform/track13/contracts";
import {
  GovernanceScoreCard,
  InsightKPIGrid,
  RecommendationsList,
} from "./InsightPanels";

type ColumnMeta = { name: string; type: string; pii: boolean };

export function ScientistContextView({
  insight,
  columns,
}: {
  insight: PlatformInsightBundle;
  columns: ColumnMeta[];
}) {
  return (
    <div className="space-y-4">
      <GovernanceScoreCard governance={insight.governance} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Semantic Columns</CardTitle></CardHeader>
          <CardContent>
            {columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No column metadata.</p>
            ) : (
              <ul className="space-y-2">
                {columns.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                      {c.pii && <Badge variant="destructive" className="text-[10px]">PII</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Verified KPIs</CardTitle></CardHeader>
          <CardContent><InsightKPIGrid kpis={insight.kpis} /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
        <CardContent><RecommendationsList items={insight.recommendations} /></CardContent>
      </Card>
    </div>
  );
}
