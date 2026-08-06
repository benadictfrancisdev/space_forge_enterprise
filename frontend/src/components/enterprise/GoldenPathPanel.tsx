import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { platformClient } from "@/platform/track13/platformClient";
import { toast } from "sonner";

type Props = {
  datasetId: string;
  onComplete?: () => void;
};

/**
 * One-click golden path: pipeline → insight bundle (Sprint 3).
 */
export function GoldenPathPanel({ datasetId, onComplete }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const { job } = await platformClient.prepareDataset(datasetId);
      const finished = await platformClient.pollJob(job.id);
      if (finished.status !== "succeeded") {
        throw new Error(finished.error || "Pipeline failed");
      }
      await platformClient.getInsightBundle(datasetId, true);
      toast.success("Golden path complete — data is ready for all enterprise apps");
      onComplete?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Golden path failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Complete platform setup
        </CardTitle>
        <CardDescription className="text-xs">
          Run the full pipeline (profile → quality → rules → analytics → intelligence) on this dataset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" onClick={run} disabled={!datasetId || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Run Golden Path
        </Button>
      </CardContent>
    </Card>
  );
}
