import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Beaker, Download } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const ExperimentDesign = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const design = async () => {
    if (!description.trim()) { toast.error("Describe the experiment"); return; }
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: { action: "scientist_experiment", data: data.slice(0, 200), columns, datasetName, description },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setResults(result);
    } catch (e: any) {
      toast.error(e.message || "Design failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!results) return;
    const sections: any[] = [
      { title: "Experiment Design", content: results.design_summary || "", type: "text" },
    ];
    if (results.sample_size || results.power || results.duration) {
      sections.push({
        title: "Parameters",
        content: "",
        type: "table",
        tableData: {
          headers: ["Parameter", "Value"],
          rows: [
            ...(results.sample_size ? [["Sample Size", String(results.sample_size)]] : []),
            ...(results.power ? [["Statistical Power", `${((results.power ?? 0) * 100).toFixed(0)}%`]] : []),
            ...(results.duration ? [["Duration", results.duration]] : []),
          ],
        },
      });
    }
    if (results.groups) {
      sections.push({
        title: "Groups",
        content: "",
        type: "table",
        tableData: {
          headers: ["Group", "Description", "Size"],
          rows: results.groups.map((g: any) => [g.name || "", g.description || "", g.size || ""]),
        },
      });
    }
    if (results.biases) {
      sections.push({ title: "Potential Biases", content: results.biases, type: "list" });
    }
    exportToPdf({ title: "Experiment Design Plan", subtitle: description, datasetName, sections });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Experiment Design</h2>
          <p className="text-sm text-muted-foreground">A/B test setup, sample size calculator, power analysis</p>
        </div>
        {results && (
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label>Experiment Description</Label>
            <Input
              placeholder="e.g., Test if new pricing increases conversion rate"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={design} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Beaker className="w-4 h-4 mr-2" />}
            {loading ? "Designing..." : "Design Experiment"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Experiment Plan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{results.design_summary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.sample_size && (
                  <div><p className="text-xs text-muted-foreground">Sample Size</p><p className="text-sm font-bold text-foreground">{results.sample_size}</p></div>
                )}
                {results.power && (
                  <div><p className="text-xs text-muted-foreground">Statistical Power</p><p className="text-sm font-bold text-foreground">{((results.power ?? 0) * 100).toFixed(0)}%</p></div>
                )}
                {results.duration && (
                  <div><p className="text-xs text-muted-foreground">Duration</p><p className="text-sm font-bold text-foreground">{results.duration}</p></div>
                )}
              </div>
            </CardContent>
          </Card>

          {results.groups && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.groups.map((g: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                    <p className="text-xs text-primary mt-1">Size: {g.size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.biases && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Potential Biases</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {results.biases.map((b: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">âš  {b}</li>
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

export default ExperimentDesign;
