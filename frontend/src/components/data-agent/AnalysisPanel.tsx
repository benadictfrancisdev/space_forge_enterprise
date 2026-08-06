import { useState, useEffect } from "react";
import { backend } from "@/platform";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Lightbulb,
  TrendingUp,
  Target,
  Loader2,
  AlertTriangle,
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  Brain,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { DatasetState } from "@/pages/DataAgent";
import { computeDatasetProfile, type DatasetProfile } from "@/lib/statisticsEngine";

interface AnalysisPanelProps {
  dataset: DatasetState;
}

interface InsightsResult {
  key_findings?: string[];
  trends?: string[];
  anomalies?: string;
  recommendations?: string[];
  data_quality_issues?: string[];
  next_steps?: string[];
  raw_response?: string;
}

interface EdaResult {
  basic_info?: {
    total_rows: number;
    total_columns: number;
    columns: string[];
    duplicate_rows: number;
  };
  column_info?: Array<{
    name: string;
    type: string;
    missing_count: number;
    missing_pct: number;
    unique_count: number;
  }>;
  numeric_stats?: Array<{
    column: string;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    skewness: number;
  }>;
  categorical_stats?: Array<{
    column: string;
    top_values: Array<{ value: string; count: number; pct: number }>;
  }>;
  data_quality_score?: number;
  numeric_columns?: string[];
  categorical_columns?: string[];
}

interface CorrelationsResult {
  columns?: string[];
  top_correlations?: Array<{
    column1: string;
    column2: string;
    correlation: number;
    strength: string;
    direction: string;
  }>;
  summary?: string;
}

interface AnomalyResult {
  anomaly_count?: number;
  anomaly_rate?: number;
  severity_summary?: { critical: number; high: number; medium: number; low: number };
  anomalies?: Array<{
    description: string;
    severity: string;
    affected_columns: string[];
    recommendation: string;
  }>;
  summary?: string;
}

interface FullAnalysis {
  insights: InsightsResult | null;
  eda: EdaResult | null;
  correlations: CorrelationsResult | null;
  anomalies: AnomalyResult | null;
}

const AnalysisPanel = ({ dataset }: AnalysisPanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);

  // Persist & restore last full statistical analysis
  const history = useFeatureHistory("analyze", dataset.name);
  useEffect(() => {
    if (!analysis && history.latest?.output) {
      setAnalysis(history.latest.output as FullAnalysis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.latest?.id]);

  const normalizePct = (value?: number) => {
    if (value == null || Number.isNaN(value)) return 0;
    return value <= 1 ? value * 100 : value;
  };

  // Some AI responses return arrays of objects instead of strings.
  // This safely flattens any value to a readable string so React never
  // tries to render a raw object (avoids "Minified React error #31").
  const toText = (val: unknown): string => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map(toText).filter(Boolean).join(", ");
    if (typeof val === "object") {
      const o = val as Record<string, unknown>;
      // Common semantic keys returned by the AI
      const candidate =
        o.finding ?? o.recommendation ?? o.text ?? o.description ??
        o.message ?? o.summary ?? o.title ?? o.action ?? o.issue ??
        o.step ?? o.trend ?? o.insight ?? o.why ?? o.so_what ?? o.now_what ?? o.value;
      if (candidate != null && typeof candidate !== "object") return String(candidate);
      // Fallback: join "key: value" pairs (skip nested objects)
      try {
        return Object.entries(o)
          .filter(([, v]) => v != null && typeof v !== "object")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" â€¢ ") || JSON.stringify(o);
      } catch {
        return "";
      }
    }
    return String(val);
  };

  const toTextList = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(toText).filter((s) => s && s.trim().length > 0);
  };

  const callAgent = async (action: string, extra: Record<string, unknown> = {}) => {
    const dataToAnalyze = dataset.cleanedData || dataset.rawData;
    // Pre-compute local stats to send alongside reduced data â€” AI skips recalculating
    const profile = computeDatasetProfile(dataToAnalyze, dataset.columns);
    const preComputedStats = {
      totalRows: profile.rowCount,
      totalColumns: profile.columnCount,
      numericColumns: profile.numericStats.map(c => c.column),
      categoricalColumns: profile.categoricalStats.map(c => c.column),
      columnSummaries: [
        ...profile.numericStats.map(ns => ({
          name: ns.column,
          type: "numeric",
          mean: ns.mean,
          median: ns.median,
          std: ns.stdDev,
          min: ns.min,
          max: ns.max,
          missing: ns.missing,
        })),
        ...profile.categoricalStats.map(cs => ({
          name: cs.column,
          type: "categorical",
          uniqueCount: cs.unique,
          topValues: cs.topValues.slice(0, 3),
          missing: cs.missing,
        })),
      ].slice(0, 30),
    };
    const { data, error } = await backend.functions.invoke("data-agent", {
      body: {
        action,
        data: dataToAnalyze.slice(0, 50),
        columns: dataset.columns.slice(0, 30),
        datasetName: dataset.name,
        preComputedStats,
        ...extra,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");
    return data;
  };

  const buildLocalEda = (profile: DatasetProfile): EdaResult => {
    const orderedColumns = dataset.columns;
    const columnInfoMap = new Map<string, { name: string; type: string; missing_count: number; missing_pct: number; unique_count: number }>();

    profile.numericStats.forEach((c) => {
      columnInfoMap.set(c.column, {
        name: c.column,
        type: "numeric",
        missing_count: c.missing,
        missing_pct: c.missingPct,
        unique_count: c.unique,
      });
    });

    profile.categoricalStats.forEach((c) => {
      columnInfoMap.set(c.column, {
        name: c.column,
        type: "categorical",
        missing_count: c.missing,
        missing_pct: c.missingPct,
        unique_count: c.unique,
      });
    });

    profile.dateStats.forEach((c) => {
      columnInfoMap.set(c.column, {
        name: c.column,
        type: "date",
        missing_count: c.missing,
        missing_pct: c.missingPct,
        unique_count: c.count,
      });
    });

    const columnInfo = orderedColumns
      .map((col) => columnInfoMap.get(col))
      .filter((c): c is { name: string; type: string; missing_count: number; missing_pct: number; unique_count: number } => !!c);

    const numericStats = profile.numericStats.map((ns) => ({
      column: ns.column,
      mean: ns.mean,
      median: ns.median,
      std: ns.stdDev,
      min: ns.min,
      max: ns.max,
      q1: ns.p25,
      q3: ns.p75,
      skewness: ns.skewness,
    }));

    const categoricalStats = profile.categoricalStats.map((cs) => ({
      column: cs.column,
      top_values: cs.topValues,
    }));

    return {
      basic_info: {
        total_rows: profile.rowCount,
        total_columns: profile.columnCount,
        columns: orderedColumns,
        duplicate_rows: 0,
      },
      column_info: columnInfo,
      numeric_stats: numericStats,
      categorical_stats: categoricalStats,
      numeric_columns: numericStats.map((s) => s.column),
      categorical_columns: categoricalStats.map((s) => s.column),
      data_quality_score: profile.dataQualityScore,
    };
  };

  const buildLocalCorrelations = (profile: DatasetProfile): CorrelationsResult => {
    const top = profile.correlations.slice(0, 10).map((c) => ({
      column1: c.col1,
      column2: c.col2,
      correlation: c.pearson,
      strength: c.strength,
      direction: c.direction,
    }));

    const summary = top.length
      ? `Top local correlation: ${top[0].column1} â†” ${top[0].column2} (r=${top[0].correlation.toFixed(3)}).`
      : "No statistically meaningful correlations detected from local computation.";

    return {
      columns: dataset.columns,
      top_correlations: top,
      summary,
    };
  };

  const buildLocalAnomalies = (profile: DatasetProfile): AnomalyResult => {
    const anomalies: NonNullable<AnomalyResult["anomalies"]> = [];
    const severitySummary = { critical: 0, high: 0, medium: 0, low: 0 };

    profile.numericStats.forEach((stat) => {
      if (stat.outliers.count <= 0) return;
      const pct = stat.outliers.pct;
      const severity: "critical" | "high" | "medium" | "low" =
        pct >= 10 ? "critical" : pct >= 5 ? "high" : pct >= 2 ? "medium" : "low";
      severitySummary[severity] += 1;
      anomalies.push({
        description: `${stat.column} has ${stat.outliers.count} outliers (${pct}%) outside ${stat.outliers.lowerBound} to ${stat.outliers.upperBound}.`,
        severity,
        affected_columns: [stat.column],
        recommendation: `Review extreme values in ${stat.column} and validate source quality before modeling.`,
      });
    });

    return {
      anomaly_count: profile.anomalySummary.totalOutliers,
      anomaly_rate: profile.anomalySummary.outlierRate,
      severity_summary: severitySummary,
      anomalies,
      summary: anomalies.length
        ? `Detected ${profile.anomalySummary.totalOutliers} local outliers across ${profile.anomalySummary.affectedColumns.length} columns.`
        : "No significant local anomalies detected.",
    };
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setProgressLabel("Starting comprehensive analysis...");

    const result: FullAnalysis = { insights: null, eda: null, correlations: null, anomalies: null };
    let aiAvailable = true;
    const profile = computeDatasetProfile(dataset.cleanedData || dataset.rawData, dataset.columns);

    try {
      // Step 1: Deterministic local statistics (always available)
      setProgressLabel("Computing local statistics...");
      setProgress(20);
      result.eda = buildLocalEda(profile);
      result.correlations = buildLocalCorrelations(profile);
      result.anomalies = buildLocalAnomalies(profile);
      setProgress(40);

      // Step 2: AI Insights (skip if AI is unavailable)
      if (aiAvailable) {
        setProgressLabel("Generating AI Insights...");
        try {
          const insightsData = await callAgent("insights", {
            focusAreas: ["patterns", "outliers", "business value", "data quality"],
          });
          let insights = insightsData?.insights || insightsData;
          // Salvage: if model returned a fenced JSON blob, parse it client-side
          if (insights?.raw_response && (!insights.key_findings || insights.key_findings.length === 0)) {
            const raw = String(insights.raw_response);
            const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
            try {
              const reparsed = JSON.parse(stripped);
              if (reparsed && typeof reparsed === "object") {
                insights = { ...reparsed, raw_response: undefined };
              }
            } catch {
              // try greedy { ... } extraction
              const first = raw.indexOf("{");
              const last = raw.lastIndexOf("}");
              if (first !== -1 && last > first) {
                try {
                  const reparsed = JSON.parse(raw.slice(first, last + 1));
                  if (reparsed && typeof reparsed === "object") {
                    insights = { ...reparsed, raw_response: undefined };
                  }
                } catch { /* keep raw_response */ }
              }
            }
          }
          result.insights = insights;
        } catch {
          result.insights = null;
          aiAvailable = false;
        }
      }
      setProgress(65);

      // Step 3: Correlations
      if (aiAvailable) {
        setProgressLabel("Analyzing Correlations...");
        try {
          const corrData = await callAgent("correlations");
          if (corrData?.top_correlations?.length) result.correlations = corrData;
        } catch {
          // Keep local correlation output
        }
      }
      setProgress(82);

      // Step 4: Anomaly Detection
      if (aiAvailable) {
        setProgressLabel("Detecting Anomalies...");
        try {
          const anomalyData = await callAgent("anomaly");
          if (anomalyData?.anomalies?.length || anomalyData?.anomaly_count != null) result.anomalies = anomalyData;
        } catch {
          // Keep local anomaly output
        }
      }
      setProgress(100);
      setProgressLabel(aiAvailable ? "Analysis complete!" : "Local analysis complete (AI unavailable)");

      setAnalysis(result);
      if (aiAvailable) {
        toast.success("Comprehensive analysis complete!");
      } else {
        toast.info("AI service unavailable â€” showing local statistical analysis");
      }
      // Save to history (best-effort)
      history.save(result, { rows: dataset.rawData.length, columns: dataset.columns.length }).catch(() => {});
    } catch (error) {
      // Even if everything fails, try local EDA
      result.eda = buildLocalEda(profile);
      result.correlations = buildLocalCorrelations(profile);
      result.anomalies = buildLocalAnomalies(profile);
      setAnalysis(result);
      toast.info("AI service unavailable â€” showing local statistical analysis");
      history.save(result, { rows: dataset.rawData.length, columns: dataset.columns.length, fallback: true }).catch(() => {});
    } finally {
      setTimeout(() => setIsAnalyzing(false), 500);
    }
  };

  const severityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical": return "text-red-500 bg-red-500/10 border-red-500/30";
      case "high": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      default: return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    }
  };

  const qualityScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">AI Data Scientist</h3>
          <p className="text-muted-foreground max-w-md">
            Run a comprehensive analysis: EDA, AI insights, correlation mapping, and anomaly detection â€” all powered by AI.
          </p>
        </div>

        {isAnalyzing ? (
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{progressLabel}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <Button
            size="lg"
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Run Full Analysis
          </Button>
        )}
      </div>
    );
  }

  const { insights, eda, correlations, anomalies } = analysis;

  return (
    <div className="space-y-6">
      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Database className="w-4 h-4" />}
          label="Rows Ã— Columns"
          value={`${eda?.basic_info?.total_rows ?? dataset.rawData.length} Ã— ${eda?.basic_info?.total_columns ?? dataset.columns.length}`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Data Quality"
          value={eda?.data_quality_score != null ? `${eda.data_quality_score}%` : "N/A"}
          valueClass={eda?.data_quality_score != null ? qualityScoreColor(eda.data_quality_score) : ""}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Anomalies"
          value={anomalies?.anomaly_count?.toString() ?? "0"}
          valueClass={anomalies?.anomaly_count && anomalies.anomaly_count > 0 ? "text-orange-400" : "text-green-400"}
        />
        <SummaryCard
          icon={<Lightbulb className="w-4 h-4" />}
          label="Key Findings"
          value={insights?.key_findings?.length?.toString() ?? "0"}
        />
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="insights" className="text-xs sm:text-sm">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Insights
          </TabsTrigger>
          <TabsTrigger value="eda" className="text-xs sm:text-sm">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />EDA
          </TabsTrigger>
          <TabsTrigger value="correlations" className="text-xs sm:text-sm">
            <Activity className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Correlations
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="text-xs sm:text-sm">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Anomalies
          </TabsTrigger>
        </TabsList>

        {/* ===== INSIGHTS TAB ===== */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          {insights?.key_findings && insights.key_findings.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {toTextList(insights.key_findings).map((finding, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">{finding}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insights?.trends && insights.trends.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {toTextList(insights.trends).map((trend, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowUpRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{trend}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insights?.recommendations && insights.recommendations.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {toTextList(insights.recommendations).map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-sm text-foreground">
                    {rec}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insights?.data_quality_issues && insights.data_quality_issues.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-orange-400" />
                  Data Quality Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {toTextList(insights.data_quality_issues).map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {insights?.next_steps && insights.next_steps.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                  Suggested Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                  {toTextList(insights.next_steps).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {insights?.raw_response && !insights.key_findings && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(insights.raw_response)
                    .replace(/```(?:json)?/gi, "")
                    .replace(/```/g, "")
                    .trim()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== EDA TAB ===== */}
        <TabsContent value="eda" className="space-y-4 mt-4">
          {eda?.column_info && eda.column_info.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Column Profiling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Column</th>
                        <th className="text-left py-2 pr-4 font-medium">Type</th>
                        <th className="text-right py-2 pr-4 font-medium">Missing</th>
                        <th className="text-right py-2 font-medium">Unique</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eda.column_info.map((col, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="py-2 pr-4 font-medium text-foreground">{toText(col.name)}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline" className="text-xs">{toText(col.type)}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className={col.missing_count > 0 ? "text-orange-400" : "text-green-400"}>
                              {col.missing_count} ({normalizePct(col.missing_pct).toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-2 text-right text-muted-foreground">{col.unique_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {eda?.numeric_stats && eda.numeric_stats.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Numeric Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Column</th>
                        <th className="text-right py-2 pr-3 font-medium">Mean</th>
                        <th className="text-right py-2 pr-3 font-medium">Median</th>
                        <th className="text-right py-2 pr-3 font-medium">Std</th>
                        <th className="text-right py-2 pr-3 font-medium">Min</th>
                        <th className="text-right py-2 font-medium">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eda.numeric_stats.map((stat, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="py-2 pr-3 font-medium text-foreground">{stat.column}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{stat.mean?.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{stat.median?.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{stat.std?.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{stat.min}</td>
                          <td className="py-2 text-right text-muted-foreground">{stat.max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {eda?.categorical_stats && eda.categorical_stats.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Categorical Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eda.categorical_stats.map((cat, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-medium text-foreground mb-2">{cat.column}</h4>
                    <div className="flex flex-wrap gap-2">
                      {cat.top_values?.map((tv, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {tv.value}: {tv.count} ({normalizePct(tv.pct).toFixed(1)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== CORRELATIONS TAB ===== */}
        <TabsContent value="correlations" className="space-y-4 mt-4">
          {correlations?.summary && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{correlations.summary}</p>
              </CardContent>
            </Card>
          )}

          {correlations?.top_correlations && correlations.top_correlations.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Top Correlations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {correlations.top_correlations.map((corr, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-2">
                      {corr.direction === "positive" ? (
                        <ArrowUpRight className="w-4 h-4 text-green-400" />
                      ) : corr.direction === "negative" ? (
                        <ArrowDownRight className="w-4 h-4 text-red-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {corr.column1} â†” {corr.column2}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{corr.strength}</Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {corr.correlation?.toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== ANOMALIES TAB ===== */}
        <TabsContent value="anomalies" className="space-y-4 mt-4">
          {anomalies?.summary && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed">{anomalies.summary}</p>
              </CardContent>
            </Card>
          )}

          {anomalies?.severity_summary && (
            <div className="grid grid-cols-4 gap-2">
              {(["critical", "high", "medium", "low"] as const).map((level) => (
                <Card key={level} className="bg-card/50 border-border/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground capitalize">{level}</p>
                    <p className={`text-lg font-bold ${severityColor(level).split(" ")[0]}`}>
                      {anomalies.severity_summary?.[level] ?? 0}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {anomalies?.anomalies && anomalies.anomalies.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Detected Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {anomalies.anomalies.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${severityColor(toText(a.severity))}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={severityColor(toText(a.severity))} variant="outline">
                        {toText(a.severity)}
                      </Badge>
                      {a.affected_columns?.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Columns: {a.affected_columns.map(toText).join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-1">{toText(a.description)}</p>
                    {a.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ðŸ’¡ {toText(a.recommendation)}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Re-analyze button */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Re-analyze
        </Button>
      </div>
    </div>
  );
};

// Small summary card component
const SummaryCard = ({
  icon,
  label,
  value,
  valueClass = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <Card className="bg-card/50 border-border/50">
    <CardContent className="p-3 sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold ${valueClass || "text-foreground"}`}>{value}</p>
    </CardContent>
  </Card>
);

export default AnalysisPanel;
