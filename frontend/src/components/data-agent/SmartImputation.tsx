import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import FeatureGate from "./FeatureGate";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
  onDataCleaned?: (data: Record<string, unknown>[]) => void;
}

interface ImputationStrategy {
  column: string;
  strategy: string;
  group_by: string | null;
  rationale: string;
  missing_count: number;
  missing_pct: number;
}

const SmartImputation = ({ data, columns, columnTypes, datasetName, onDataCleaned }: Props) => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<ImputationStrategy[]>([]);
  const [applied, setApplied] = useState(false);

  const missingStats = useMemo(() => {
    return columns.map(col => {
      const missing = data.filter(r => r[col] === null || r[col] === undefined || r[col] === "").length;
      return { column: col, missing, pct: ((missing / data.length) * 100) };
    }).filter(s => s.missing > 0);
  }, [data, columns]);

  const analyzeStrategies = async () => {
    setLoading(true);
    try {
      const schema = columns.map(c => `${c} (${columnTypes[c] || "unknown"}, missing: ${missingStats.find(m => m.column === c)?.missing || 0})`).join(", ");
      const sampleData = data.slice(0, 100);

      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "smart_imputation",
          data: sampleData,
          columns,
          datasetName,
          query: schema,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      const parsed = typeof result?.result === "string" ? JSON.parse(result.result) : result?.result;
      if (parsed?.strategies) {
        const enriched = parsed.strategies.map((s: any) => ({
          ...s,
          missing_count: missingStats.find(m => m.column === s.column)?.missing || 0,
          missing_pct: missingStats.find(m => m.column === s.column)?.pct || 0,
        }));
        setStrategies(enriched);
        toast.success(`Generated ${enriched.length} imputation strategies`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze imputation strategies");
    } finally {
      setLoading(false);
    }
  };

  const applyImputation = () => {
    if (!onDataCleaned) return;
    const cleaned = data.map(row => {
      const newRow = { ...row };
      strategies.forEach(s => {
        if (newRow[s.column] === null || newRow[s.column] === undefined || newRow[s.column] === "") {
          if (s.strategy === "median" || s.strategy === "mean") {
            const vals = data.filter(r => {
              if (s.group_by) {
                return r[s.group_by] === row[s.group_by] && r[s.column] != null && r[s.column] !== "";
              }
              return r[s.column] != null && r[s.column] !== "";
            }).map(r => Number(r[s.column])).filter(v => !isNaN(v));
            
            if (vals.length > 0) {
              if (s.strategy === "mean") {
                newRow[s.column] = vals.reduce((a, b) => a + b, 0) / vals.length;
              } else {
                vals.sort((a, b) => a - b);
                newRow[s.column] = vals[Math.floor(vals.length / 2)];
              }
            }
          } else if (s.strategy === "mode") {
            const freq: Record<string, number> = {};
            data.filter(r => r[s.column] != null && r[s.column] !== "").forEach(r => {
              const v = String(r[s.column]);
              freq[v] = (freq[v] || 0) + 1;
            });
            const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
            if (mode) newRow[s.column] = mode;
          }
        }
      });
      return newRow;
    });
    onDataCleaned(cleaned);
    setApplied(true);
    toast.success("Smart imputation applied successfully");
  };

  return (
    <FeatureGate feature="Smart Contextual Imputation" creditCost={2} requiredPlan="standard">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Smart Contextual Imputation
              <Badge variant="outline" className="ml-auto text-[10px]">PRO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Context-aware imputation using category-wise median/mean instead of global fill. 
              Detects categorical groupings for each numeric column.
            </p>

            {missingStats.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">No missing values detected in your dataset</span>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Column</th>
                        <th className="text-right p-2 font-medium">Missing</th>
                        <th className="text-right p-2 font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingStats.slice(0, 10).map(s => (
                        <tr key={s.column} className="border-t border-border/30">
                          <td className="p-2 font-mono">{s.column}</td>
                          <td className="p-2 text-right">{s.missing}</td>
                          <td className="p-2 text-right">
                            <span className={s.pct > 20 ? "text-destructive" : "text-warning"}>
                              {s.pct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button size="sm" onClick={analyzeStrategies} disabled={loading} className="w-full">
                  {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing...</> : "Generate Imputation Strategies"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {strategies.length > 0 && (
          <Card className="linear-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Imputation Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {strategies.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/50 bg-secondary/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold font-mono">{s.column}</span>
                    <Badge variant="secondary" className="text-[10px]">{s.strategy}</Badge>
                  </div>
                  {s.group_by && (
                    <p className="text-[10px] text-primary">Grouped by: {s.group_by}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{s.rationale}</p>
                </div>
              ))}

              {!applied && onDataCleaned && (
                <Button size="sm" onClick={applyImputation} className="w-full" variant="default">
                  Apply Smart Imputation
                </Button>
              )}
              {applied && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Imputation applied successfully</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
};

export default SmartImputation;
