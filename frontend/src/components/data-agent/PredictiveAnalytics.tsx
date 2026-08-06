import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, TrendingUp, TrendingDown, Activity, Zap, Target,
  Clock, BarChart3, Sparkles, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Minus, Loader2, FileDown, Brain, CreditCard, LineChart,
} from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";
import { useEffect } from "react";
import {
  LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine, Legend,
} from "recharts";

interface PredictiveAnalyticsProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface ForecastResult {
  confidence_score: number;
  summary: string;
  trend: { direction: string; magnitude_percent: number; description: string };
  seasonality: { detected: boolean; period: string; description: string };
  forecasts: Array<{
    period: string;
    predicted_value: number;
    lower_bound: number;
    upper_bound: number;
    confidence_score: number;
  }>;
  anomalies: Array<{
    description: string;
    severity: string;
    affected_rows: string;
    confidence_score: number;
  }>;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    affected_columns: string[];
    confidence_score: number;
  }>;
  decomposition: {
    trend_component: string;
    seasonal_component: string;
    residual_component: string;
  };
  recommendations: Array<{
    action: string;
    rationale: string;
    expected_impact: string;
    priority: string;
    confidence_score: number;
  }>;
  narrative: string;
  credits_used: number;
  credits_remaining: number;
  tokens_used: number;
  cost_inr: number;
}

const PHASES = [
  "Validating dataset...",
  "Checking credits...",
  "Detecting time-series structure...",
  "Running trend decomposition...",
  "Analyzing seasonality...",
  "Generating AI forecast...",
  "Building confidence intervals...",
  "Compiling recommendations...",
];

const PredictiveAnalytics = ({ data, columns, columnTypes, datasetName }: PredictiveAnalyticsProps) => {
  const { user } = useAuth();
  const { credits, deductCredits } = useCredits();
  const { exportToPdf } = usePdfExport();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [targetColumn, setTargetColumn] = useState("");
  const [horizon, setHorizon] = useState("next_3_periods");
  const [method, setMethod] = useState("auto");

  // Persist & restore the latest forecast for this dataset
  const history = useFeatureHistory("predict", datasetName);
  useEffect(() => {
    if (!result && history.latest?.output) {
      const restored = history.latest.output as ForecastResult;
      setResult(restored);
      const inputTarget = (history.latest.input_summary as Record<string, unknown>)?.targetColumn;
      if (typeof inputTarget === "string") setTargetColumn(inputTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.latest?.id]);

  const numericColumns = useMemo(
    () => columns.filter((c) => columnTypes[c] === "numeric"),
    [columns, columnTypes]
  );

  const dateColumns = useMemo(
    () => columns.filter((c) => columnTypes[c] === "date"),
    [columns, columnTypes]
  );

  // Build chart data from actual data + forecasts
  const chartData = useMemo(() => {
    if (!result || !targetColumn) return [];
    const target = targetColumn || numericColumns[0];
    const last20 = data.slice(-20).map((row, i) => ({
      index: `Row ${data.length - 20 + i + 1}`,
      actual: Number(row[target]) || 0,
    }));
    const forecasted = (result.forecasts || []).map((f) => ({
      index: f.period,
      predicted: f.predicted_value,
      lower: f.lower_bound,
      upper: f.upper_bound,
    }));
    return [...last20, ...forecasted];
  }, [result, data, targetColumn, numericColumns]);

  const runForecast = async () => {
    // Sign-in is now optional â€” anonymous mode works for everyone.
    // Only enforce credit gate when the user IS signed in.
    if (user && credits.balance < 1) {
      toast.error("Insufficient credits. You need at least 1 credit to forecast.");
      return;
    }

    // Pre-flight: need enough numeric data
    const target = targetColumn || numericColumns[0];
    if (!target) {
      toast.error("No numeric column found. Forecast needs at least one numeric column.");
      return;
    }
    const numericVals = data.map((r) => Number(r[target])).filter((v) => Number.isFinite(v));
    if (numericVals.length < 10) {
      toast.error(`Need at least 10 numeric rows for ${target}. Found ${numericVals.length}.`);
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    // Progress animation
    for (let i = 0; i < PHASES.length; i++) {
      setPhase(PHASES[i]);
      setProgress(((i + 1) / PHASES.length) * 90);
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      const { data: res, error } = await backend.functions.invoke("predictive-forecast", {
        body: {
          data: data.slice(0, 200),
          columns,
          datasetName,
          targetColumn: target,
          horizon,
          method,
        },
      });

      // Network/edge-level failure (rare now since edge always returns 200)
      if (error) {
        const msg = error.message || "Edge function unavailable";
        console.error("Forecast network error:", error);
        toast.error(msg);
        return;
      }

      // Application-level failure surfaced via { ok: false, error }
      if (res && (res.ok === false || (res.error && res.success !== true))) {
        const friendlyMsg =
          typeof res.error === "string"
            ? res.error
            : "Forecast failed. Please try again.";
        toast.error(friendlyMsg);
        return;
      }

      setResult(res as ForecastResult);
      setProgress(100);

      // Save to history (best-effort, non-blocking)
      history.save(res, { targetColumn: target, horizon, method }).catch(() => {});

      toast.success(
        `Forecast complete! Confidence: ${res.confidence_score}%${
          res.credits_used ? ` | Credits used: ${res.credits_used}` : ""
        }`
      );
    } catch (err: any) {
      console.error("Forecast error:", err);
      toast.error(err?.message || "Failed to generate forecast");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportToPdf({
      title: "Predictive Forecast Report",
      subtitle: `AI-Powered Forecast for ${datasetName}`,
      datasetName,
      statistics: {
        "Confidence Score": `${result.confidence_score}%`,
        "Trend": `${result.trend?.direction} (${result.trend?.magnitude_percent?.toFixed(1)}%)`,
        "Seasonality": result.seasonality?.detected ? result.seasonality.period : "Not detected",
        "Anomalies": result.anomalies?.length || 0,
        "Tokens Used": result.tokens_used,
        "Cost": `â‚¹${result.cost_inr?.toFixed(2)}`,
      },
      insights: (result.patterns || []).map((p) => ({
        title: p.title,
        description: p.description,
        importance: p.confidence_score > 80 ? "high" as const : "medium" as const,
      })),
      sections: [
        { title: "Executive Narrative", type: "text" as const, content: result.narrative },
        { title: "Trend Analysis", type: "text" as const, content: result.trend?.description },
        {
          title: "Forecasts",
          type: "table" as const,
          content: "",
          tableData: {
            headers: ["Period", "Predicted", "Lower", "Upper", "Confidence"],
            rows: (result.forecasts || []).map((f) => [
              f.period,
              f.predicted_value?.toFixed(2),
              f.lower_bound?.toFixed(2),
              f.upper_bound?.toFixed(2),
              `${f.confidence_score}%`,
            ]),
          },
        },
      ],
      recommendations: (result.recommendations || []).map((r) => `${r.action} â€” ${r.rationale}`),
    });
  };

  const getTrendIcon = (dir: string) => {
    if (dir === "up") return <ArrowUpRight className="h-4 w-4 text-primary" />;
    if (dir === "down") return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary shadow-lg">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Predictive Forecasting
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Time-series decomposition, trend analysis, and AI-driven predictions
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <CreditCard className="h-3 w-3 mr-1" />
                1 credit
              </Badge>
              {result && (
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Config */}
      {!result && !isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <Label className="text-xs">Target Column</Label>
                <Select value={targetColumn || numericColumns[0] || ""} onValueChange={setTargetColumn}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Forecast Horizon</Label>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next_period">Next Period</SelectItem>
                    <SelectItem value="next_3_periods">Next 3 Periods</SelectItem>
                    <SelectItem value="next_6_periods">Next 6 Periods</SelectItem>
                    <SelectItem value="next_12_periods">Next 12 Periods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="linear_regression">Linear Regression</SelectItem>
                    <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                    <SelectItem value="arima">ARIMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={runForecast} disabled={isAnalyzing || numericColumns.length === 0} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Generate AI Forecast (1 credit)
            </Button>
            {numericColumns.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Forecasting needs at least one numeric column with 10+ rows.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="py-12">
            <div className="max-w-md mx-auto space-y-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <h3 className="font-semibold">Generating AI Forecast...</h3>
                <p className="text-sm text-muted-foreground">{phase}</p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Forecast Confidence</p>
                <p className="text-2xl font-bold text-primary">{result.confidence_score}%</p>
                <Progress value={result.confidence_score} className="h-1 mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {result.confidence_score >= 80 ? "High reliability" : result.confidence_score >= 60 ? "Moderate reliability" : "Low â€” treat as directional"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Trend</p>
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(result.trend?.direction)}
                  <p className="text-2xl font-bold">
                    {Math.abs(result.trend?.magnitude_percent ?? 0).toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {result.trend?.direction === "up" ? "Upward trajectory" : result.trend?.direction === "down" ? "Downward trajectory" : "Stable / flat"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Seasonality</p>
                <p className="text-lg font-bold">{result.seasonality?.detected ? "Detected" : "Not detected"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.seasonality?.detected ? (result.seasonality.period || "Cyclical pattern") : "Treat as non-cyclical"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Forecast Horizon</p>
                <p className="text-2xl font-bold">{result.forecasts?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(result.forecasts?.length || 0) > 0 ? "Periods ahead" : "No projection"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Forecast chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary" />
                  Forecast Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="index" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [
                        typeof value === "number" ? value.toFixed(2) : value,
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 12, paddingTop: 8 }}
                      iconType="line"
                    />
                    <Area type="monotone" dataKey="upper" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1} fill="hsl(var(--primary) / 0.15)" name="Confidence (Upper)" />
                    <Area type="monotone" dataKey="lower" stroke="hsl(var(--primary) / 0.4)" strokeWidth={1} fill="hsl(var(--background))" name="Confidence (Lower)" />
                    <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} connectNulls name="Actual" />
                    <Line type="monotone" dataKey="predicted" stroke="hsl(var(--accent))" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 4, fill: "hsl(var(--accent))" }} connectNulls name="Forecast" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabbed detail panels */}
          <Tabs defaultValue="narrative" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="narrative">Narrative</TabsTrigger>
              <TabsTrigger value="forecasts">
                Forecasts ({result.forecasts?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="anomalies">
                Anomalies ({result.anomalies?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="actions">
                Actions ({result.recommendations?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="narrative" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-semibold text-primary mb-2">Executive Summary</h4>
                      <p className="text-sm leading-relaxed">{result.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Detailed Narrative</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{result.narrative}</p>
                    </div>
                    {result.decomposition && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Trend Component</p>
                          <p className="text-sm">{result.decomposition.trend_component}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Seasonal Component</p>
                          <p className="text-sm">{result.decomposition.seasonal_component}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Residual Component</p>
                          <p className="text-sm">{result.decomposition.residual_component}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forecasts" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(result.forecasts || []).map((f, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-sm">{f.period}</p>
                        <Badge variant="outline" className="text-xs">
                          {f.confidence_score}% confidence
                        </Badge>
                      </div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {f.predicted_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Lower: {f.lower_bound?.toFixed(2)}</span>
                        <span>Upper: {f.upper_bound?.toFixed(2)}</span>
                      </div>
                      <Progress value={f.confidence_score} className="h-1 mt-3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="anomalies" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {(result.anomalies || []).length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
                        <p className="font-semibold">No Anomalies Detected</p>
                        <p className="text-sm text-muted-foreground mt-1">Your data looks clean!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    (result.anomalies || []).map((a, i) => (
                      <Card key={i} className={`border-l-4 ${a.severity === "high" ? "border-l-destructive" : a.severity === "medium" ? "border-l-primary" : "border-l-muted-foreground"}`}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 ${a.severity === "high" ? "text-destructive" : "text-primary"}`} />
                              <div>
                                <p className="text-sm font-medium">{a.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">Affected: {a.affected_rows}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {a.confidence_score}%
                              </Badge>
                              <Badge variant={a.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                                {a.severity}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {(result.recommendations || []).map((r, i) => (
                    <Card key={i}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.priority === "high" ? "bg-primary/10" : "bg-muted"}`}>
                            <Sparkles className={`h-4 w-4 ${r.priority === "high" ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{r.action}</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">{r.confidence_score}%</Badge>
                                <Badge variant={r.priority === "high" ? "default" : "secondary"} className="text-[10px]">{r.priority}</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{r.rationale}</p>
                            <p className="text-xs text-primary mt-1 font-medium">Expected Impact: {r.expected_impact}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Run again */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => setResult(null)}>
              <Zap className="h-4 w-4 mr-2" />
              Run New Forecast
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
