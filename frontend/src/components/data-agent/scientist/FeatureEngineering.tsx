import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const FeatureEngineering = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("scientist_features", {
        data: data.slice(0, 200), columns, columnTypes, datasetName,
      });
      if (error) throw new Error(error);
      setResults(result);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!results) return;
    const sections: any[] = [];
    if (results.suggested_features) {
      sections.push({
        title: "Suggested Features",
        content: "",
        type: "table",
        tableData: {
          headers: ["Name", "Type", "Description", "Expected Impact"],
          rows: results.suggested_features.map((f: any) => [f.name || "", f.type || "", f.description || "", f.impact || ""]),
        },
      });
    }
    if (results.pca) {
      sections.push({ title: "PCA Analysis", content: results.pca.summary || "", type: "text" });
    }
    if (results.shap_explanation) {
      sections.push({
        title: "SHAP Feature Importance",
        content: "",
        type: "table",
        tableData: {
          headers: ["Feature", "Importance"],
          rows: results.shap_explanation.map((s: any) => [s.feature || "", `${((s.importance ?? 0) * 100).toFixed(0)}%`]),
        },
      });
    }
    exportToPdf({ title: "Feature Engineering Report", datasetName, sections });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Feature Engineering</h2>
          <p className="text-sm text-muted-foreground">Auto features, PCA, dimensionality reduction, SHAP</p>
        </div>
        <div className="flex gap-2">
          {results && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
            {loading ? "Analyzing..." : "Engineer Features"}
          </Button>
        </div>
      </div>

      {results && (
        <>
          {results.suggested_features && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Suggested Features</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.suggested_features.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                      <Badge variant="outline" className="mt-0.5">{f.type}</Badge>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                        <p className="text-xs text-primary mt-1">Expected impact: {f.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results.pca && (
            <Card>
              <CardHeader><CardTitle className="text-sm">PCA Analysis</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{results.pca.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.pca.components?.map((c: any, i: number) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">PC{i + 1}</p>
                      <p className="text-sm font-medium text-foreground">{((c.variance_explained ?? 0) * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {results.shap_explanation && (
            <Card>
              <CardHeader><CardTitle className="text-sm">SHAP Feature Importance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.shap_explanation.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 truncate">{s.feature}</span>
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${(s.importance ?? 0) * 100}%` }} />
                      </div>
                      <span className="text-xs text-foreground w-12 text-right">{((s.importance ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default FeatureEngineering;
