import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { ForecastScenarioChart } from "@/components/enterprise/ForecastScenarioChart";
import { ExecutiveBriefCard } from "@/components/enterprise/DecisionResultView";
import { toast } from "sonner";

export default function ForecastStudioApp() {
  const { datasets, loading } = usePlatformDatasets();
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      setResult(await platformClient.forecastScenarios(datasetId, 7));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Forecast failed");
    } finally {
      setBusy(false);
    }
  };

  const scenarios = (result?.scenarios as Record<string, unknown>) ?? {};
  const narrative = result?.narrative as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forecast Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Expected, best, and worst-case scenarios from verified analytics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Builder</CardTitle>
          <CardDescription>7-period linear trend with scenario multipliers.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <PlatformDatasetPicker
            datasets={datasets}
            value={datasetId}
            onChange={setDatasetId}
            loading={loading}
          />
          <Button onClick={run} disabled={!datasetId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Scenarios
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Scenario Chart</CardTitle></CardHeader>
            <CardContent>
              <ForecastScenarioChart scenarios={scenarios as Parameters<typeof ForecastScenarioChart>[0]["scenarios"]} />
            </CardContent>
          </Card>
          {narrative && (
            <ExecutiveBriefCard brief={narrative} />
          )}
        </div>
      )}
    </div>
  );
}
