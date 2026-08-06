import { useState, useEffect, useRef } from "react";
import { safeInvoke } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, TrendingUp, Target, RefreshCw, ChevronDown, ChevronUp, Sparkles, BarChart3 } from "lucide-react";
import { InsightCardExport } from "@/components/sharing/InsightCardExport";
import { toast } from "sonner";
import type { DatasetState } from "@/pages/DataAgent";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import type { NumericSummary, CategoricalSummary } from "@/lib/statisticalSummarizer";

interface AutoInsightGeneratorProps {
  dataset: DatasetState;
  onNavigateToAnalyze?: () => void;
}

interface InsightResult {
  summary: string;
  insights: Array<{ title: string; description: string; importance: string }>;
  patterns: Array<{ name: string; description: string }>;
  recommendations: Array<{ action: string; reason: string }>;
}

const AutoInsightGenerator = ({ dataset, onNavigateToAnalyze }: AutoInsightGeneratorProps) => {
  const [result, setResult] = useState<InsightResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggeredRef = useRef<string | null>(null);

  const buildLocalInsights = (): InsightResult => {
    const dataToAnalyze = dataset.cleanedData || dataset.rawData;
    const summary = summarizeDataset(dataToAnalyze, dataset.columns);
    const insights: InsightResult["insights"] = [];
    const patterns: InsightResult["patterns"] = [];
    const recommendations: InsightResult["recommendations"] = [];

    // Data size insight
    insights.push({
      title: "Dataset Overview",
      description: `${summary.rowCount.toLocaleString()} rows across ${summary.columnCount} columns.`,
      importance: "medium",
    });

    // Missing data insight
    const colsWithMissing = summary.columns.filter((c) => c.missing > 0);
    if (colsWithMissing.length > 0) {
      const worstCol = colsWithMissing.sort((a, b) => b.missing - a.missing)[0];
      const pct = Math.round((worstCol.missing / summary.rowCount) * 100);
      insights.push({
        title: "Missing Data Detected",
        description: `${colsWithMissing.length} column(s) have missing values. "${worstCol.column}" has the most at ${pct}%.`,
        importance: pct > 20 ? "high" : "medium",
      });
      recommendations.push({
        action: "Handle missing values",
        reason: `Column "${worstCol.column}" has ${pct}% missing data which could bias analysis results.`,
      });
    }

    // Numeric spread insights
    const numericCols = summary.columns.filter((c) => c.type === "numeric") as NumericSummary[];
    for (const nc of numericCols.slice(0, 3)) {
      const range = nc.max - nc.min;
      if (nc.stdDev > 0 && range > 0) {
        const cv = nc.stdDev / Math.abs(nc.mean || 1);
        if (cv > 1) {
          patterns.push({
            name: `High variance in "${nc.column}"`,
            description: `Coefficient of variation is ${(cv * 100).toFixed(0)}% — values are widely spread (range: ${nc.min}–${nc.max}).`,
          });
        }
      }
    }

    // Categorical dominance insights
    const catCols = summary.columns.filter((c) => c.type === "categorical") as CategoricalSummary[];
    for (const cc of catCols.slice(0, 3)) {
      if (cc.topValues.length > 0 && cc.topValues[0].pct > 50) {
        patterns.push({
          name: `Dominant value in "${cc.column}"`,
          description: `"${cc.topValues[0].value}" accounts for ${cc.topValues[0].pct}% of values.`,
        });
      }
    }

    if (numericCols.length >= 2) {
      recommendations.push({
        action: "Run correlation analysis",
        reason: `${numericCols.length} numeric columns detected — correlations may reveal relationships.`,
      });
    }

    return {
      summary: `Local analysis of "${dataset.name}": ${summary.rowCount} rows, ${summary.columnCount} columns (${numericCols.length} numeric, ${catCols.length} categorical). AI-powered insights unavailable.`,
      insights,
      patterns,
      recommendations,
    };
  };

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      const { data, error: fnError } = await safeInvoke("analyze", {
        data: dataToAnalyze.slice(0, 50),
        columns: dataset.columns.slice(0, 30),
        datasetName: dataset.name,
      });
      if (fnError) throw new Error(fnError);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch {
      // AI unavailable — fall back to local statistical insights
      const localResult = buildLocalInsights();
      setResult(localResult);
      toast.info("AI unavailable — showing local statistical insights");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger on dataset change — LOCAL ONLY (no AI call)
  // AI insights are only fetched on explicit refresh click to save credits
  useEffect(() => {
    const key = `${dataset.name}-${dataset.rawData.length}`;
    if (triggeredRef.current !== key) {
      triggeredRef.current = key;
      const localResult = buildLocalInsights();
      setResult(localResult);
    }
  }, [dataset.name, dataset.rawData.length]);

  const importanceBadgeClass = (importance: string) => {
    switch (importance.toLowerCase()) {
      case "high":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "medium":
        return "bg-accent/50 text-accent-foreground border-accent/30";
      default:
        return "bg-primary/15 text-primary border-primary/30";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/80 border-border/50 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Generating insights...</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/80 border-destructive/30 mb-6">
        <CardContent className="py-4 flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card className="bg-card/80 border-border/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Auto Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={isLoading} title="Fetch AI-powered insights (uses credits)">
              <RefreshCw className="w-4 h-4" />
              <span className="ml-1 text-xs">AI</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {result.summary && (
          <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          {/* Key insights */}
          {result.insights?.length > 0 && (
            <div className="space-y-2">
              {result.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Lightbulb className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{insight.title}</span>
                        <Badge variant="outline" className={importanceBadgeClass(insight.importance)}>
                          {insight.importance}
                        </Badge>
                      </div>
                      <InsightCardExport
                        compact
                        title={insight.title}
                        insight={insight.description}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patterns */}
          {result.patterns?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Patterns
              </h4>
              {result.patterns.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-2 pl-4 py-1">
                  <p className="text-xs text-muted-foreground flex-1 min-w-0">
                    <span className="font-medium text-foreground">{p.name}:</span> {p.description}
                  </p>
                  <InsightCardExport compact title={p.name} insight={p.description} />
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3" /> Recommendations
              </h4>
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-2 pl-4 py-1">
                  <p className="text-xs text-muted-foreground flex-1 min-w-0">
                    <span className="font-medium text-foreground">{r.action}</span> — {r.reason}
                  </p>
                  <InsightCardExport compact title={r.action} insight={r.reason} />
                </div>
              ))}
            </div>
          )}

          {/* Dive deeper */}
          {onNavigateToAnalyze && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onNavigateToAnalyze}>
                <BarChart3 className="w-4 h-4 mr-1" /> Dive Deeper
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AutoInsightGenerator;
