import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { PlatformInsightBundle } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { ScientistContextView } from "@/components/enterprise/ScientistContextView";
import { toast } from "sonner";

type ScientistContext = {
  insight: PlatformInsightBundle;
  columns: Array<{ name: string; type: string; pii: boolean }>;
};

export default function AIScientistApp() {
  const { datasets, loading } = usePlatformDatasets();
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [context, setContext] = useState<ScientistContext | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const data = await platformClient.getScientistContext(datasetId);
      setContext(data as ScientistContext);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Scientist 2.0</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Semantic layer, glossary, metrics, and verified analytics — not raw CSV chat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enterprise Context</CardTitle>
          <CardDescription>Load verified insight bundle + column intelligence.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <PlatformDatasetPicker
            datasets={datasets}
            value={datasetId}
            onChange={setDatasetId}
            loading={loading}
          />
          <Button onClick={load} disabled={!datasetId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load Enterprise Context
          </Button>
        </CardContent>
      </Card>

      {context && (
        <ScientistContextView insight={context.insight} columns={context.columns} />
      )}
    </div>
  );
}
