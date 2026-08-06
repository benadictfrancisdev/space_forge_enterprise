import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Activity, Download, Brain } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDataMemory } from "@/hooks/useDataMemory";
import { usePdfExport } from "@/hooks/usePdfExport";
import ForecastChatbot from "./ForecastChatbot";
import EnterpriseInsightView from "./EnterpriseInsightView";
import { isUniversalEnvelope, type UniversalEnvelope } from "@/lib/outputEnvelope";
import { recordFinding } from "@/lib/insightMemory";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface ForecastPoint {
  period: string;
  predicted: number;
  lower: number;
  upper: number;
  is_forecast: boolean;
}

interface ForecastResult {
  target_column: string;
  method: string;
  confidence_score: number;
  horizon: string;
  trend_direction: string;
  trend_description: string;
  seasonality: { detected: boolean; period: string; description: string };
  chart_data: ForecastPoint[];
  summary: string;
  anomalies: Array<{ period: string; description: string; severity: string }>;
  recommendations: string[];
}

const AutoMLForecasting = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const { saveMemory } = useDataMemory(datasetName);
  const { exportToPdf } = usePdfExport();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [rawResult, setRawResult] = useState<Record<string, unknown> | null>(null);
  const [enterprise, setEnterprise] = useState<UniversalEnvelope | null>(null);
  const [horizon, setHorizon] = useState("30");
  const [targetCol, setTargetCol] = useState("");

  const numericCols = useMemo(
    () => columns.filter((c) => columnTypes[c] === "numeric"),
    [columns, columnTypes]
  );

  const runForecast = async () => {
    if (!targetCol) { toast.error("Select a target column"); return; }
    setLoading(true);
    try {
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "automl_forecast",
          data: data.slice(0, 500),
          columns,
          columnTypes,
          datasetName,
          targetColumn: targetCol,
          horizon,
          userId: user?.id,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      setResult(res);
      setRawResult(res);
      const env = (res as any)?.enterprise;
      if (isUniversalEnvelope(env)) { setEnterprise(env); recordFinding(datasetName, "forecast", env); } else { setEnterprise(null); }

      await saveMemory({
        contextType: "automl_forecast",
        title: `Forecast ${targetCol} (${horizon}d) â€” ${res.trend_direction}`,
        content: { target: targetCol, horizon, trend: res.trend_direction, confidence: res.confidence_score },
        tags: ["forecast", "automl"],
        importance: "high",
      });
    } catch (e: any) {
      toast.error(e.message || "Forecast failed");
    } finally {
      setLoading(false);
    }
  };

  const lastHistorical = result?.chart_data?.findIndex((d) => d.is_forecast) ?? -1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AutoML Forecasting
              </CardTitle>
              <CardDescription>Zero-config ensemble forecasting with confidence bands</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={targetCol} onValueChange={setTargetCol}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Target column" /></SelectTrigger>
                <SelectContent>
                  {numericCols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={runForecast} disabled={loading || !targetCol}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
                {loading ? "Forecasting..." : "Run Forecast"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Method</div>
                <div className="font-semibold text-sm">{result.method}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="font-semibold text-sm text-primary">{result.confidence_score}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Trend</div>
                <div className="font-semibold text-sm flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {result.trend_direction}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Seasonality</div>
                <Badge variant={result.seasonality.detected ? "default" : "secondary"}>
                  {result.seasonality.detected ? result.seasonality.period : "None"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={result.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Area type="monotone" dataKey="upper" stackId="1" stroke="none" fill="hsl(var(--primary) / 0.1)" />
                  <Area type="monotone" dataKey="predicted" stackId="2" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lower" stackId="3" stroke="none" fill="transparent" />
                  {lastHistorical > 0 && (
                    <ReferenceLine x={result.chart_data[lastHistorical - 1]?.period} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Forecast â†’" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary + Recommendations */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-1">Recommendations</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {result.recommendations.map((r, i) => <li key={i}>â€¢ {r}</li>)}
                  </ul>
                </div>
              )}
              {result.anomalies.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-1">Anomalies Detected</h4>
                  {result.anomalies.map((a, i) => (
                    <Badge key={i} variant="outline" className="mr-1 mb-1 text-[10px]">{a.period}: {a.description}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast Chatbot */}
          <ForecastChatbot
            forecastResult={rawResult}
            datasetName={datasetName}
            targetColumn={targetCol}
            columns={columns}
          />
        </>
      )}
    </div>
  );
};

export default AutoMLForecasting;
