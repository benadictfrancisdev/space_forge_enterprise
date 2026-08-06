import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { JourneyDefinition, JourneyAnalysisBundle } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { JourneyBuilder } from "@/components/enterprise/JourneyBuilder";
import { JourneyAnalysisView } from "@/components/enterprise/JourneyAnalysisView";
import { djangoApi } from "@/platform/djangoAdapter";
import { toast } from "sonner";

export default function JourneyAnalytics() {
  const { datasets } = usePlatformDatasets();
  const [journeys, setJourneys] = useState<JourneyDefinition[]>([]);
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [journeyId, setJourneyId] = useState("");
  const [analysis, setAnalysis] = useState<JourneyAnalysisBundle | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshJourneys = () =>
    platformClient.listJourneys().then(setJourneys).catch(() => setJourneys([]));

  useEffect(() => {
    refreshJourneys();
  }, []);

  const seedTemplates = async () => {
    const tenant = await djangoApi.ensureTenant();
    if (!tenant.data?.workspaceId) return;
    const n = await platformClient.seedJourneyTemplates(tenant.data.workspaceId);
    toast.success(`Seeded ${n} templates`);
    refreshJourneys();
  };

  const analyze = async () => {
    if (!journeyId || !datasetId) return;
    setBusy(true);
    try {
      setAnalysis(await platformClient.analyzeJourney(journeyId, datasetId));
      setAiSummary(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const explain = async () => {
    if (!journeyId || !datasetId) return;
    setBusy(true);
    try {
      setAiSummary(await platformClient.explainJourney(journeyId, datasetId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journey Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Funnel, cohort, drop-off, and time-in-stage — orchestrated over platform analytics.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journey Builder</CardTitle>
          <CardDescription>Define stages and department ownership.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <JourneyBuilder defaultDatasetId={datasetId} onCreated={refreshJourneys} />
          <Button variant="outline" size="sm" onClick={seedTemplates}>Seed Industry Templates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Analyze Journey</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
            value={journeyId}
            onChange={(e) => setJourneyId(e.target.value)}
          >
            <option value="">Select journey</option>
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
          <PlatformDatasetPicker datasets={datasets} value={datasetId} onChange={setDatasetId} />
          <Button onClick={analyze} disabled={!journeyId || !datasetId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Analyze
          </Button>
          <Button variant="secondary" onClick={explain} disabled={!journeyId || !datasetId || busy}>
            AI Journey Summary
          </Button>
        </CardContent>
      </Card>

      {analysis && <JourneyAnalysisView analysis={analysis} aiSummary={aiSummary} />}
    </div>
  );
}
