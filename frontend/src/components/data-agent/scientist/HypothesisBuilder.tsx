import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, CheckCircle, XCircle, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const HypothesisBuilder = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [results, setResults] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const test = async () => {
    if (!hypothesis.trim()) { toast.error("Enter a hypothesis"); return; }
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("scientist_hypothesis", {
        data: data.slice(0, 200), columns, datasetName, hypothesis,
      });
      if (error) throw new Error(error);
      setResults(result);
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!results) return;
    exportToPdf({
      title: "Hypothesis Test Results",
      subtitle: hypothesis,
      datasetName,
      sections: [
        { title: "Result", content: results.decision === "reject" ? "Null Hypothesis Rejected" : "Failed to Reject Null Hypothesis", type: "text" },
      ],
      statistics: {
        "Test": results.test_selected || "N/A",
        "p-value": results.p_value?.toFixed(4) ?? "N/A",
        "Effect Size": results.effect_size?.value?.toFixed(3) ?? "N/A",
        "Effect Interpretation": results.effect_size?.interpretation || "N/A",
        "Confidence Interval": results.confidence_interval ? `[${results.confidence_interval.lower?.toFixed(2)}, ${results.confidence_interval.upper?.toFixed(2)}]` : "N/A",
      },
      recommendations: results.recommendations || [],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Hypothesis Builder</h2>
          <p className="text-sm text-muted-foreground">Write a hypothesis, get statistical validation</p>
        </div>
        {results && (
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            placeholder="e.g., H1: Higher price leads to lower churn rate"
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            rows={3}
          />
          <Button onClick={test} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
            {loading ? "Testing..." : "Test Hypothesis"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                {results.decision === "reject" ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                Result: {results.decision === "reject" ? "Null Hypothesis Rejected" : "Failed to Reject Null Hypothesis"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Test</p>
                  <p className="text-sm font-medium text-foreground">{results.test_selected}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">p-value</p>
                  <p className="text-sm font-medium text-foreground">{results.p_value?.toFixed(4) ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Effect Size</p>
                  <p className="text-sm font-medium text-foreground">{results.effect_size?.value?.toFixed(3) ?? "N/A"} ({results.effect_size?.interpretation ?? ""})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-sm font-medium text-foreground">{results.confidence_interval ? `[${results.confidence_interval.lower?.toFixed(2)}, ${results.confidence_interval.upper?.toFixed(2)}]` : "N/A"}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{results.interpretation}</p>
            </CardContent>
          </Card>

          {results.recommendations && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {results.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default HypothesisBuilder;
