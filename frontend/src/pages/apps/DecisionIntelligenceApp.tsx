import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { DecisionAnalysisResult } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { DecisionResultView } from "@/components/enterprise/DecisionResultView";
import { toast } from "sonner";

export default function DecisionIntelligenceApp() {
  const { datasets, loading } = usePlatformDatasets();
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [problem, setProblem] = useState("Why did revenue change?");
  const [result, setResult] = useState<DecisionAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const data = await platformClient.analyzeDecision(datasetId, problem);
      setResult(data as DecisionAnalysisResult);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Decision Intelligence 2.0</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full reasoning chain from business rules → analytics → intelligence → AI — deterministic facts first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision Support</CardTitle>
          <CardDescription>
            Describe the business problem. Platform engines produce evidence; AI explains outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PlatformDatasetPicker
            datasets={datasets}
            value={datasetId}
            onChange={setDatasetId}
            loading={loading}
          />
          <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} />
          <Button onClick={analyze} disabled={!datasetId || busy || !problem.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Decision Analysis
          </Button>
        </CardContent>
      </Card>

      {result && <DecisionResultView result={result} />}
    </div>
  );
}
