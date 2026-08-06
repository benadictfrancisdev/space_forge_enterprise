import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { PlatformInsightBundle } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import {
  GovernanceScoreCard,
  InsightKPIGrid,
  RecommendationsList,
} from "@/components/enterprise/InsightPanels";
import { ExecutiveBriefCard } from "@/components/enterprise/DecisionResultView";
import { toast } from "sonner";
import { GoldenPathPanel } from "@/components/enterprise/GoldenPathPanel";

export default function ExecutiveInsights() {
  const { datasets, loading } = usePlatformDatasets();
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [bundle, setBundle] = useState<PlatformInsightBundle | null>(null);
  const [busy, setBusy] = useState(false);

  const runPrepare = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const { job } = await platformClient.prepareDataset(datasetId);
      const finished = await platformClient.pollJob(job.id);
      if (finished.status !== "succeeded") throw new Error(finished.error || "Pipeline failed");
      toast.success("Platform pipeline complete");
      setBundle(await platformClient.getInsightBundle(datasetId, true));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prepare failed");
    } finally {
      setBusy(false);
    }
  };

  const loadBundle = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      setBundle(await platformClient.getInsightBundle(datasetId, true));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(false);
    }
  };

  const scheduleBrief = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const { job } = await platformClient.scheduleExecutiveBrief(datasetId, "daily");
      await platformClient.pollJob(job.id);
      toast.success("Executive brief scheduled and delivered");
      setBundle(await platformClient.getInsightBundle(datasetId, true));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Performance Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">
          KPI health, governance posture, and verified executive narratives.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dataset</CardTitle>
          <CardDescription>Run Track 12 pipeline → load platform insight bundle.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <PlatformDatasetPicker
            datasets={datasets}
            value={datasetId}
            onChange={setDatasetId}
            loading={loading}
          />
          <Button onClick={runPrepare} disabled={!datasetId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Prepare & Analyze
          </Button>
          <Button variant="outline" onClick={loadBundle} disabled={!datasetId || busy}>
            Load Bundle
          </Button>
          <Button variant="secondary" onClick={scheduleBrief} disabled={!datasetId || busy}>
            <Mail className="h-4 w-4 mr-2" />
            Send Brief Now
          </Button>
        </CardContent>
      </Card>

      {datasetId && (
        <GoldenPathPanel datasetId={datasetId} onComplete={() => loadBundle()} />
      )}

      {bundle && (
        <div className="space-y-4">
          <GovernanceScoreCard governance={bundle.governance} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Company Health</CardTitle></CardHeader>
              <CardContent><InsightKPIGrid kpis={bundle.kpis} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Strategic Recommendations</CardTitle></CardHeader>
              <CardContent>
                <RecommendationsList items={bundle.recommendations} />
              </CardContent>
            </Card>
          </div>
          <ExecutiveBriefCard brief={bundle.executive_brief} />
        </div>
      )}
    </div>
  );
}
