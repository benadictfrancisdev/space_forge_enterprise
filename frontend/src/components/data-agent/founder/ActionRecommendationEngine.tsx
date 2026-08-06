import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ArrowRight, Download } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const ActionRecommendationEngine = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: { action: "founder_actions", data: data.slice(0, 200), columns, datasetName },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setActions(result);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!actions?.actions) return;
    exportToPdf({
      title: "Action Recommendations",
      datasetName,
      sections: [{
        title: "Recommended Actions",
        content: "",
        type: "table",
        tableData: {
          headers: ["Action", "Priority", "Predicted Impact", "Timeline"],
          rows: actions.actions.map((a: any) => [a.action || "", a.priority || "", a.predicted_impact || "", a.timeline || ""]),
        },
      }],
      recommendations: actions.actions.map((a: any) => `[${a.priority}] ${a.action}: ${a.reasoning}`),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Action Recommendations</h2>
          <p className="text-sm text-muted-foreground">Data-driven strategic moves with predicted impact</p>
        </div>
        <div className="flex gap-2">
          {actions?.actions && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {loading ? "Analyzing..." : "Get Actions"}
          </Button>
        </div>
      </div>

      {actions?.actions?.map((action: any, i: number) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{action.action}</span>
                  <Badge variant="outline">{action.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{action.reasoning}</p>
                {action.predicted_impact && (
                  <p className="text-xs text-primary mt-2 font-medium">
                    Predicted Impact: {action.predicted_impact}
                  </p>
                )}
                {action.timeline && (
                  <p className="text-xs text-muted-foreground mt-1">Timeline: {action.timeline}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActionRecommendationEngine;
