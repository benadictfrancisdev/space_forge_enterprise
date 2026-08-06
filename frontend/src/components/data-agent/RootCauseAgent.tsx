import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { Search, Loader2, RefreshCw, ArrowDown, ArrowUp, Minus } from "lucide-react";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface WaterfallItem {
  dimension: string;
  dimension_value: string;
  contribution: number;
  contribution_pct: number;
  direction: "positive" | "negative";
  explanation: string;
}

interface RootCauseResult {
  summary: string;
  kpi_analyzed: string;
  kpi_total_change: number;
  kpi_change_pct: number;
  waterfall: WaterfallItem[];
  root_causes: { cause: string; impact: string; confidence: "high" | "medium" | "low"; evidence: string }[];
  drill_downs: { dimension: string; top_contributor: string; contribution_pct: number; explanation: string }[];
  recommendations: string[];
}

const RootCauseAgent = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const [result, setResult] = useState<RootCauseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const numericCols = columns.filter(c => columnTypes[c] === "numeric");
  const [targetKpi, setTargetKpi] = useState(numericCols[0] || "");

  const run = async () => {
    if (!targetKpi) { toast.error("Select a KPI to investigate"); return; }
    setLoading(true);
    try {
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "root_cause_analysis",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          targetKpi,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);
      setResult(res);
      toast.success("Root cause analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to run root cause analysis");
    } finally {
      setLoading(false);
    }
  };

  const maxContrib = result?.waterfall ? Math.max(...result.waterfall.map(w => Math.abs(w.contribution))) : 1;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Root Cause Agent
              </CardTitle>
              <CardDescription className="mt-1">
                Automatic waterfall contribution analysis â€” no manual slicing needed
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={targetKpi} onValueChange={setTargetKpi}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Select KPI" />
                </SelectTrigger>
                <SelectContent>
                  {numericCols.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {result ? "Re-analyze" : "Investigate"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-sm text-foreground/90 leading-relaxed">{result.summary}</p>
              {result.kpi_total_change != null && (
                <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">KPI Total Change:</span>
                  <span className={`text-sm font-bold ${result.kpi_change_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {result.kpi_change_pct >= 0 ? "+" : ""}{result.kpi_change_pct?.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">({result.kpi_total_change?.toLocaleString()})</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waterfall */}
          {result.waterfall?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contribution Waterfall</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {result.waterfall.map((w, i) => {
                      const barWidth = Math.round((Math.abs(w.contribution) / maxContrib) * 100);
                      const isNeg = w.direction === "negative";
                      return (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <div className="w-32 shrink-0 truncate font-medium">
                            {w.dimension}={w.dimension_value}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-5 bg-muted/30 rounded overflow-hidden relative">
                              <div
                                className={`h-full rounded ${isNeg ? "bg-red-500/70" : "bg-green-500/70"}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-1 w-24 shrink-0">
                              {isNeg ? <ArrowDown className="w-3 h-3 text-red-500" /> : <ArrowUp className="w-3 h-3 text-green-500" />}
                              <span className={isNeg ? "text-red-500" : "text-green-500"}>
                                {isNeg ? "" : "+"}{w.contribution?.toLocaleString()} ({w.contribution_pct?.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Root Causes */}
          {result.root_causes?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identified Root Causes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.root_causes.map((rc, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{rc.cause}</span>
                        <Badge variant={rc.confidence === "high" ? "default" : "secondary"} className="text-[9px]">{rc.confidence}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rc.impact}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 italic">Evidence: {rc.evidence}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className="text-[9px] shrink-0">#{i + 1}</Badge>
                      <span className="text-muted-foreground">{r}</span>
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

export default RootCauseAgent;
