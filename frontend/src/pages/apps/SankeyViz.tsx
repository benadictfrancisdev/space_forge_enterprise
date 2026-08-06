import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { JourneyDefinition, SankeyData } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { SankeyVizEngine } from "@/components/enterprise/SankeyVizEngine";

const FLOW_TYPES = [
  { value: "customer", label: "Customer Journey" },
  { value: "order", label: "Sales / Order Funnel" },
  { value: "employee", label: "Operational Workflow" },
  { value: "ticket", label: "Ticket Lifecycle" },
  { value: "custom", label: "Financial / Custom Flow" },
];

export default function SankeyViz() {
  const { datasets } = usePlatformDatasets();
  const [journeys, setJourneys] = useState<JourneyDefinition[]>([]);
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [journeyId, setJourneyId] = useState("");
  const [flowType, setFlowType] = useState("customer");
  const [sankey, setSankey] = useState<SankeyData & { flow_label?: string; flow_type?: string } | null>(null);

  useEffect(() => {
    platformClient.listJourneys().then(setJourneys).catch(() => setJourneys([]));
  }, []);

  const load = async () => {
    if (!datasetId) return;
    const data = await platformClient.visualizeSankey({
      journey_id: journeyId || undefined,
      dataset_id: datasetId,
      flow_type: flowType,
    });
    setSankey(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sankey Flow Visualization</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Reusable flow engine consuming Journey Analytics APIs — no duplicated business logic.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flow Configuration</CardTitle>
          <CardDescription>Customer journeys, sales funnels, operations, inventory, and financial flows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <Select value={flowType} onValueChange={setFlowType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Flow type" /></SelectTrigger>
            <SelectContent>
              {FLOW_TYPES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
            value={journeyId}
            onChange={(e) => setJourneyId(e.target.value)}
          >
            <option value="">Journey (optional)</option>
            {journeys.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
          <PlatformDatasetPicker datasets={datasets} value={datasetId} onChange={setDatasetId} />
          <Button onClick={load} disabled={!datasetId}>Visualize Flow</Button>
        </CardContent>
      </Card>

      {sankey && <SankeyVizEngine data={sankey} />}
    </div>
  );
}
