import type { SankeyData } from "@/platform/track13/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SankeyFlowChart } from "./JourneyCharts";

type SankeyVizData = SankeyData & {
  flow_type?: string;
  flow_label?: string;
};

export function SankeyVizEngine({ data }: { data: SankeyVizData }) {
  const links = data.links ?? [];
  const nodes = data.nodes ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {data.flow_label ?? "Flow Visualization"}
          {data.flow_type && <Badge variant="outline" className="text-[10px]">{data.flow_type}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nodes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <Badge key={n.id} variant="secondary">{n.label}</Badge>
            ))}
          </div>
        )}
        <SankeyFlowChart links={links} />
      </CardContent>
    </Card>
  );
}
