import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Trophy, Medal, Download } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const ModelArena = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [targetColumn, setTargetColumn] = useState("");
  const [results, setResults] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const train = async () => {
    if (!targetColumn) { toast.error("Select a target column"); return; }
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: { action: "scientist_arena", data: data.slice(0, 200), columns, datasetName, targetColumn },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setResults(result);
    } catch (e: any) {
      toast.error(e.message || "Training failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!results?.leaderboard) return;
    exportToPdf({
      title: "Model Arena Leaderboard",
      subtitle: `Target: ${targetColumn}`,
      datasetName,
      sections: [{
        title: "Leaderboard",
        content: "",
        type: "table",
        tableData: {
          headers: ["#", "Model", "Accuracy", "F1", "Precision", "Recall"],
          rows: results.leaderboard.map((m: any, i: number) => [
            String(i + 1), m.name || "",
            `${((m.accuracy ?? 0) * 100).toFixed(1)}%`,
            `${((m.f1 ?? 0) * 100).toFixed(1)}%`,
            `${((m.precision ?? 0) * 100).toFixed(1)}%`,
            `${((m.recall ?? 0) * 100).toFixed(1)}%`,
          ]),
        },
      }],
    });
  };

  const rankColors = ["text-yellow-500", "text-gray-400", "text-orange-600"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Model Arena</h2>
          <p className="text-sm text-muted-foreground">Train multiple models, auto-leaderboard with metrics</p>
        </div>
        {results?.leaderboard && (
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label>Target Column</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
            >
              <option value="">Select target...</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button onClick={train} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
            {loading ? "Training Models..." : "Start Arena"}
          </Button>
        </CardContent>
      </Card>

      {results?.leaderboard && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Model</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Accuracy</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">F1</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Precision</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Recall</th>
                  </tr>
                </thead>
                <tbody>
                  {results.leaderboard.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">
                        {i < 3 ? (
                          <Medal className={`w-4 h-4 ${rankColors[i]}`} />
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </td>
                      <td className="py-2 font-medium text-foreground">{m.name}</td>
                      <td className="py-2 text-right text-foreground">{((m.accuracy ?? 0) * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-foreground">{((m.f1 ?? 0) * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-muted-foreground">{((m.precision ?? 0) * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-muted-foreground">{((m.recall ?? 0) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {results?.summary && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModelArena;
