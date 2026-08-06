import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import FeatureGate from "./FeatureGate";
import KPICard from "./charts/KPICard";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface TimeKPI {
  metric: string;
  ytd: number;
  mtd: number;
  yoy_delta_pct: number;
  mom_delta_pct: number;
  trend_color: "green" | "red" | "neutral";
  best_period: string;
  worst_period: string;
}

const TimeIntelligenceEngine = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<TimeKPI[]>([]);
  const [selectedDateCol, setSelectedDateCol] = useState("");
  const [selectedMetricCol, setSelectedMetricCol] = useState("");

  const dateColumns = useMemo(() => {
    return columns.filter(col => {
      const samples = data.slice(0, 20).map(r => r[col]);
      return samples.some(v => {
        if (!v || typeof v !== "string") return false;
        const d = new Date(v as string);
        return !isNaN(d.getTime()) && v.toString().length > 6;
      });
    });
  }, [data, columns]);

  const numericColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);

  const runAnalysis = async () => {
    if (!selectedDateCol || !selectedMetricCol) {
      toast.error("Select both a date and metric column");
      return;
    }
    setLoading(true);
    try {
      const sampleData = data.slice(0, 200).map(r => ({
        [selectedDateCol]: r[selectedDateCol],
        [selectedMetricCol]: r[selectedMetricCol],
      }));

      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "time_intelligence",
          data: sampleData,
          columns: [selectedDateCol, selectedMetricCol],
          datasetName,
          targetColumn: selectedMetricCol,
          featureColumns: [selectedDateCol],
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      const parsed = typeof result?.result === "string" ? JSON.parse(result.result) : result?.result;
      if (parsed?.kpis) {
        setKpis(parsed.kpis);
        toast.success(`Generated ${parsed.kpis.length} time-intelligence KPIs`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate time intelligence");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureGate feature="Time Intelligence Engine" creditCost={2} requiredPlan="standard">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Time Intelligence Engine
              <Badge variant="outline" className="ml-auto text-[10px]">PRO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Auto-detect date columns â†’ generate YTD, MTD, YoY KPIs with delta comparison cards.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Column</label>
                <Select value={selectedDateCol} onValueChange={setSelectedDateCol}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select date column" /></SelectTrigger>
                  <SelectContent>
                    {dateColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    {dateColumns.length === 0 && <SelectItem value="_none" disabled>No date columns detected</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric Column</label>
                <Select value={selectedMetricCol} onValueChange={setSelectedMetricCol}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select metric" /></SelectTrigger>
                  <SelectContent>
                    {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button size="sm" onClick={runAnalysis} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Analyzing...</> : "Generate Time KPIs"}
            </Button>
          </CardContent>
        </Card>

        {kpis.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.map((kpi, i) => (
              <Card key={i} className="linear-card">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.metric}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">YTD</p>
                      <p className="text-sm font-semibold">{kpi.ytd?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">MTD</p>
                      <p className="text-sm font-semibold">{kpi.mtd?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpi.yoy_delta_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {kpi.yoy_delta_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.yoy_delta_pct?.toFixed(1)}% YoY
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpi.mom_delta_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {kpi.mom_delta_pct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.mom_delta_pct?.toFixed(1)}% MoM
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Best: {kpi.best_period} Â· Worst: {kpi.worst_period}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
};

export default TimeIntelligenceEngine;
