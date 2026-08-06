import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Loader2, 
  Sparkles, 
  Database,
  Hash,
  Type,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  Target,
  RefreshCw,
  Lightbulb,
  Grid3X3,
  Shield,
  Wand2
} from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { DataQualityAlerts } from "./DataQualityAlerts";
import DataCleaningSuggestions from "./DataCleaningSuggestions";

interface DataProfilingPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onChartSuggestion?: (suggestion: ChartSuggestion) => void;
  onDataCleaned?: (cleanedData: Record<string, unknown>[]) => void;
}

interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "text" | "boolean" | "mixed";
  detectedType: string;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: { value: string; count: number }[];
  quality: "excellent" | "good" | "fair" | "poor";
  qualityScore: number;
}

interface Correlation {
  column1: string;
  column2: string;
  coefficient: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative" | "none";
}

interface ChartSuggestion {
  type: "bar" | "line" | "pie" | "scatter" | "area" | "histogram" | "heatmap";
  title: string;
  description: string;
  columns: string[];
  confidence: number;
  reason: string;
}

interface LLMInsight {
  title: string;
  content: string;
  type: "insight" | "warning" | "recommendation" | "pattern";
  priority: "high" | "medium" | "low";
}

export const DataProfilingPanel = ({
  data,
  columns,
  columnTypes,
  datasetName,
  onChartSuggestion,
  onDataCleaned
}: DataProfilingPanelProps) => {
  const [isProfileRunning, setIsProfileRunning] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);
  const [columnProfiles, setColumnProfiles] = useState<ColumnProfile[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [chartSuggestions, setChartSuggestions] = useState<ChartSuggestion[]>([]);
  const [llmInsights, setLlmInsights] = useState<LLMInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState("columns");

  // Detect column types with more granularity
  const detectColumnType = useCallback((columnName: string): ColumnProfile["type"] => {
    const values = data.map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== "");
    if (values.length === 0) return "mixed";

    const sampleSize = Math.min(values.length, 100);
    const sample = values.slice(0, sampleSize);

    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    sample.forEach(val => {
      const strVal = String(val).toLowerCase();
      if (!isNaN(Number(val)) && strVal !== "") numericCount++;
      if (strVal === "true" || strVal === "false" || strVal === "yes" || strVal === "no" || strVal === "1" || strVal === "0") booleanCount++;
      if (Date.parse(String(val)) && String(val).match(/\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}/)) dateCount++;
    });

    const threshold = sampleSize * 0.8;
    if (numericCount >= threshold) return "numeric";
    if (dateCount >= threshold) return "date";
    if (booleanCount >= threshold) return "boolean";

    const uniqueValues = new Set(sample.map(v => String(v)));
    if (uniqueValues.size <= sampleSize * 0.5 && uniqueValues.size <= 50) return "categorical";

    return "text";
  }, [data]);

  // Calculate column profile
  const profileColumn = useCallback((columnName: string): ColumnProfile => {
    const values = data.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== "");
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    const type = detectColumnType(columnName);

    const profile: ColumnProfile = {
      name: columnName,
      type,
      detectedType: type,
      nullCount: values.length - nonNullValues.length,
      nullPercentage: ((values.length - nonNullValues.length) / values.length) * 100,
      uniqueCount: uniqueValues.size,
      uniquePercentage: (uniqueValues.size / nonNullValues.length) * 100,
      quality: "good",
      qualityScore: 100
    };

    // Calculate numeric statistics
    if (type === "numeric") {
      const numericValues = nonNullValues.map(v => Number(v)).filter(v => !isNaN(v));
      if (numericValues.length > 0) {
        profile.min = Math.min(...numericValues);
        profile.max = Math.max(...numericValues);
        profile.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        profile.median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        
        const squaredDiffs = numericValues.map(v => Math.pow(v - profile.mean!, 2));
        profile.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length);
      }
    }

    // Calculate top values for categorical
    if (type === "categorical" || type === "text") {
      const valueCounts: Record<string, number> = {};
      nonNullValues.forEach(v => {
        const key = String(v);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });
      profile.topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
    }

    // Calculate quality score
    let qualityScore = 100;
    if (profile.nullPercentage > 50) qualityScore -= 40;
    else if (profile.nullPercentage > 20) qualityScore -= 20;
    else if (profile.nullPercentage > 5) qualityScore -= 10;

    if (profile.uniquePercentage > 95 && type !== "text") qualityScore -= 10;

    profile.qualityScore = Math.max(0, qualityScore);
    profile.quality = qualityScore >= 80 ? "excellent" : qualityScore >= 60 ? "good" : qualityScore >= 40 ? "fair" : "poor";

    return profile;
  }, [data, detectColumnType]);

  // Calculate correlations between numeric columns
  const calculateCorrelations = useCallback((): Correlation[] => {
    const numericCols = columns.filter(col => 
      columnProfiles.find(p => p.name === col)?.type === "numeric"
    );

    const correlations: Correlation[] = [];

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];

        const values1: number[] = [];
        const values2: number[] = [];

        data.forEach(row => {
          const v1 = Number(row[col1]);
          const v2 = Number(row[col2]);
          if (!isNaN(v1) && !isNaN(v2)) {
            values1.push(v1);
            values2.push(v2);
          }
        });

        if (values1.length < 3) continue;

        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;

        for (let k = 0; k < values1.length; k++) {
          const diff1 = values1[k] - mean1;
          const diff2 = values2[k] - mean2;
          numerator += diff1 * diff2;
          denom1 += diff1 * diff1;
          denom2 += diff2 * diff2;
        }

        const coefficient = denom1 === 0 || denom2 === 0 ? 0 : numerator / Math.sqrt(denom1 * denom2);
        const absCoef = Math.abs(coefficient);

        correlations.push({
          column1: col1,
          column2: col2,
          coefficient,
          strength: absCoef >= 0.7 ? "strong" : absCoef >= 0.4 ? "moderate" : absCoef >= 0.2 ? "weak" : "none",
          direction: coefficient > 0.1 ? "positive" : coefficient < -0.1 ? "negative" : "none"
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }, [columns, columnProfiles, data]);

  // Generate auto chart suggestions
  const generateChartSuggestions = useCallback((): ChartSuggestion[] => {
    const suggestions: ChartSuggestion[] = [];
    const numericProfiles = columnProfiles.filter(p => p.type === "numeric");
    const categoricalProfiles = columnProfiles.filter(p => p.type === "categorical");
    const dateProfiles = columnProfiles.filter(p => p.type === "date");

    // Bar charts for categorical vs numeric
    if (categoricalProfiles.length > 0 && numericProfiles.length > 0) {
      const cat = categoricalProfiles[0];
      const num = numericProfiles[0];
      suggestions.push({
        type: "bar",
        title: `${num.name} by ${cat.name}`,
        description: `Compare ${num.name} values across different ${cat.name} categories`,
        columns: [cat.name, num.name],
        confidence: 0.9,
        reason: `${cat.name} has ${cat.uniqueCount} categories - perfect for bar chart comparison`
      });
    }

    // Line charts for time series
    if (dateProfiles.length > 0 && numericProfiles.length > 0) {
      suggestions.push({
        type: "line",
        title: `${numericProfiles[0].name} Over Time`,
        description: `Track ${numericProfiles[0].name} trends over the date range`,
        columns: [dateProfiles[0].name, numericProfiles[0].name],
        confidence: 0.95,
        reason: "Time series data detected - line chart shows trends effectively"
      });
    }

    // Scatter for correlated numerics
    const strongCorrelations = correlations.filter(c => c.strength === "strong");
    if (strongCorrelations.length > 0) {
      const corr = strongCorrelations[0];
      suggestions.push({
        type: "scatter",
        title: `${corr.column1} vs ${corr.column2}`,
        description: `Explore the ${corr.direction} correlation (r=${corr.coefficient.toFixed(2)})`,
        columns: [corr.column1, corr.column2],
        confidence: 0.85,
        reason: `Strong ${corr.direction} correlation detected (${corr.coefficient.toFixed(2)})`
      });
    }

    // Pie for low-cardinality categorical
    const lowCardCat = categoricalProfiles.find(p => p.uniqueCount <= 8);
    if (lowCardCat) {
      suggestions.push({
        type: "pie",
        title: `${lowCardCat.name} Distribution`,
        description: `Show the proportion of each ${lowCardCat.name} category`,
        columns: [lowCardCat.name],
        confidence: 0.8,
        reason: `Only ${lowCardCat.uniqueCount} categories - ideal for pie chart`
      });
    }

    // Histogram for numeric distributions
    if (numericProfiles.length > 0) {
      const num = numericProfiles[0];
      suggestions.push({
        type: "histogram",
        title: `${num.name} Distribution`,
        description: `Analyze the frequency distribution of ${num.name}`,
        columns: [num.name],
        confidence: 0.75,
        reason: `Show how ${num.name} values are distributed (range: ${num.min?.toFixed(1)} - ${num.max?.toFixed(1)})`
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [columnProfiles, correlations]);

  // Generate LLM insights
  const generateLLMInsights = useCallback(async () => {
    setIsGeneratingInsights(true);
    
    try {
      const profileSummary = {
        datasetName,
        rowCount: data.length,
        columnCount: columns.length,
        columns: columnProfiles.map(p => ({
          name: p.name,
          type: p.type,
          nullPercentage: p.nullPercentage.toFixed(1),
          uniqueCount: p.uniqueCount,
          quality: p.quality,
          ...(p.type === "numeric" && { min: p.min, max: p.max, mean: p.mean?.toFixed(2), stdDev: p.stdDev?.toFixed(2) })
        })),
        topCorrelations: correlations.slice(0, 5).map(c => ({
          columns: `${c.column1} & ${c.column2}`,
          coefficient: c.coefficient.toFixed(2),
          strength: c.strength
        })),
        chartSuggestions: chartSuggestions.slice(0, 3).map(s => s.title)
      };

      const { data: response, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'nlp-query',
          data: data.slice(0, 50),
          query: `Analyze this dataset profile and provide 3-5 key insights. Focus on: data quality issues, interesting patterns, correlations, and actionable recommendations. Dataset summary: ${JSON.stringify(profileSummary)}`,
          context: { columns, columnTypes, datasetName }
        }
      });

      if (error) throw error;
      if (response?.error) throw new Error(typeof response.error === "string" ? response.error : "AI service error");

      // Parse LLM response into structured insights
      const insightText = response.response || response.answer || "";
      const insights: LLMInsight[] = [];

      // Extract insights from response
      const lines = insightText.split(/\n+/).filter((line: string) => line.trim());
      lines.forEach((line: string, idx: number) => {
        if (line.trim().length > 20) {
          let type: LLMInsight["type"] = "insight";
          let priority: LLMInsight["priority"] = "medium";

          const lowerLine = line.toLowerCase();
          if (lowerLine.includes("warning") || lowerLine.includes("issue") || lowerLine.includes("missing")) {
            type = "warning";
            priority = "high";
          } else if (lowerLine.includes("recommend") || lowerLine.includes("suggest") || lowerLine.includes("consider")) {
            type = "recommendation";
          } else if (lowerLine.includes("pattern") || lowerLine.includes("trend") || lowerLine.includes("correlation")) {
            type = "pattern";
          }

          insights.push({
            title: `Insight ${idx + 1}`,
            content: line.replace(/^[\d\.\-\*]+\s*/, "").trim(),
            type,
            priority
          });
        }
      });

      setLlmInsights(insights.slice(0, 5));
      toast.success("AI insights generated successfully");
    } catch (error) {
      console.error("Error generating insights:", error);
      // Generate fallback insights based on profile
      const fallbackInsights: LLMInsight[] = [];
      
      const poorQualityCols = columnProfiles.filter(p => p.quality === "poor" || p.quality === "fair");
      if (poorQualityCols.length > 0) {
        fallbackInsights.push({
          title: "Data Quality Alert",
          content: `${poorQualityCols.length} column(s) have quality concerns: ${poorQualityCols.map(p => p.name).join(", ")}. Consider cleaning these before analysis.`,
          type: "warning",
          priority: "high"
        });
      }

      const strongCorrs = correlations.filter(c => c.strength === "strong");
      if (strongCorrs.length > 0) {
        fallbackInsights.push({
          title: "Strong Correlations Found",
          content: `Found ${strongCorrs.length} strong correlation(s). Strongest: ${strongCorrs[0].column1} & ${strongCorrs[0].column2} (r=${strongCorrs[0].coefficient.toFixed(2)}).`,
          type: "pattern",
          priority: "medium"
        });
      }

      if (chartSuggestions.length > 0) {
        fallbackInsights.push({
          title: "Recommended Visualization",
          content: `Based on your data structure, a ${chartSuggestions[0].type} chart would be most effective: "${chartSuggestions[0].title}".`,
          type: "recommendation",
          priority: "medium"
        });
      }

      setLlmInsights(fallbackInsights);
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [data, columns, columnTypes, datasetName, columnProfiles, correlations, chartSuggestions]);

  // Run full profiling
  const runProfiling = useCallback(async () => {
    setIsProfileRunning(true);
    setProfileProgress(0);

    // Profile columns
    const profiles: ColumnProfile[] = [];
    for (let i = 0; i < columns.length; i++) {
      profiles.push(profileColumn(columns[i]));
      setProfileProgress(((i + 1) / columns.length) * 50);
      await new Promise(r => setTimeout(r, 50)); // Small delay for UI updates
    }
    setColumnProfiles(profiles);

    // Calculate correlations
    setProfileProgress(60);
    await new Promise(r => setTimeout(r, 100));
    
    // Need to set profiles first, then calc correlations
    const corrs = calculateCorrelationsFromProfiles(profiles);
    setCorrelations(corrs);
    setProfileProgress(80);

    // Generate chart suggestions
    const suggestions = generateChartSuggestionsFromData(profiles, corrs);
    setChartSuggestions(suggestions);
    setProfileProgress(100);

    setIsProfileRunning(false);
    toast.success(`Profiled ${columns.length} columns with ${data.length.toLocaleString()} rows`);
  }, [columns, profileColumn, data.length]);

  // Helper functions that use profiles directly
  const calculateCorrelationsFromProfiles = (profiles: ColumnProfile[]): Correlation[] => {
    const numericCols = columns.filter(col => 
      profiles.find(p => p.name === col)?.type === "numeric"
    );

    const correlations: Correlation[] = [];

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];

        const values1: number[] = [];
        const values2: number[] = [];

        data.forEach(row => {
          const v1 = Number(row[col1]);
          const v2 = Number(row[col2]);
          if (!isNaN(v1) && !isNaN(v2)) {
            values1.push(v1);
            values2.push(v2);
          }
        });

        if (values1.length < 3) continue;

        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;

        for (let k = 0; k < values1.length; k++) {
          const diff1 = values1[k] - mean1;
          const diff2 = values2[k] - mean2;
          numerator += diff1 * diff2;
          denom1 += diff1 * diff1;
          denom2 += diff2 * diff2;
        }

        const coefficient = denom1 === 0 || denom2 === 0 ? 0 : numerator / Math.sqrt(denom1 * denom2);
        const absCoef = Math.abs(coefficient);

        correlations.push({
          column1: col1,
          column2: col2,
          coefficient,
          strength: absCoef >= 0.7 ? "strong" : absCoef >= 0.4 ? "moderate" : absCoef >= 0.2 ? "weak" : "none",
          direction: coefficient > 0.1 ? "positive" : coefficient < -0.1 ? "negative" : "none"
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  };

  const generateChartSuggestionsFromData = (profiles: ColumnProfile[], corrs: Correlation[]): ChartSuggestion[] => {
    const suggestions: ChartSuggestion[] = [];
    const numericProfiles = profiles.filter(p => p.type === "numeric");
    const categoricalProfiles = profiles.filter(p => p.type === "categorical");
    const dateProfiles = profiles.filter(p => p.type === "date");

    if (categoricalProfiles.length > 0 && numericProfiles.length > 0) {
      suggestions.push({
        type: "bar",
        title: `${numericProfiles[0].name} by ${categoricalProfiles[0].name}`,
        description: `Compare values across categories`,
        columns: [categoricalProfiles[0].name, numericProfiles[0].name],
        confidence: 0.9,
        reason: `${categoricalProfiles[0].uniqueCount} categories detected`
      });
    }

    if (dateProfiles.length > 0 && numericProfiles.length > 0) {
      suggestions.push({
        type: "line",
        title: `${numericProfiles[0].name} Over Time`,
        description: `Track trends over time`,
        columns: [dateProfiles[0].name, numericProfiles[0].name],
        confidence: 0.95,
        reason: "Time series data detected"
      });
    }

    const strongCorrelations = corrs.filter(c => c.strength === "strong");
    if (strongCorrelations.length > 0) {
      suggestions.push({
        type: "scatter",
        title: `${strongCorrelations[0].column1} vs ${strongCorrelations[0].column2}`,
        description: `Correlation analysis`,
        columns: [strongCorrelations[0].column1, strongCorrelations[0].column2],
        confidence: 0.85,
        reason: `Strong correlation (${strongCorrelations[0].coefficient.toFixed(2)})`
      });
    }

    return suggestions;
  };

  const getTypeIcon = (type: ColumnProfile["type"]) => {
    switch (type) {
      case "numeric": return <Hash className="h-4 w-4" />;
      case "categorical": return <Type className="h-4 w-4" />;
      case "date": return <Calendar className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getQualityColor = (quality: ColumnProfile["quality"]) => {
    switch (quality) {
      case "excellent": return "text-green-500 bg-green-500/10";
      case "good": return "text-blue-500 bg-blue-500/10";
      case "fair": return "text-yellow-500 bg-yellow-500/10";
      case "poor": return "text-red-500 bg-red-500/10";
    }
  };

  const getInsightIcon = (type: LLMInsight["type"]) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "recommendation": return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case "pattern": return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
  };

  const getChartIcon = (type: ChartSuggestion["type"]) => {
    switch (type) {
      case "bar": return <BarChart3 className="h-4 w-4" />;
      case "line": return <LineChart className="h-4 w-4" />;
      case "pie": return <PieChart className="h-4 w-4" />;
      case "scatter": return <ScatterChart className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/30">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Real-Time Data Profiling
                <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-600">
                  <Zap className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Automatic column detection, correlation analysis & smart chart recommendations
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateLLMInsights}
              disabled={isGeneratingInsights || columnProfiles.length === 0}
              className="gap-2"
            >
              {isGeneratingInsights ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Insights
            </Button>
            <Button
              onClick={runProfiling}
              disabled={isProfileRunning}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 gap-2"
            >
              {isProfileRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Profiling...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {isProfileRunning && (
          <div className="mt-4 space-y-2">
            <Progress value={profileProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Analyzing {columns.length} columns...
            </p>
          </div>
        )}
      </CardHeader>

      {columnProfiles.length > 0 && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full max-w-2xl mb-4">
              <TabsTrigger value="columns" className="gap-1">
                <Database className="h-3 w-3" />
                Columns
              </TabsTrigger>
              <TabsTrigger value="correlations" className="gap-1">
                <Target className="h-3 w-3" />
                Correlations
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1">
                <Grid3X3 className="h-3 w-3" />
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-1">
                <Shield className="h-3 w-3" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1">
                <BarChart3 className="h-3 w-3" />
                Charts
              </TabsTrigger>
              <TabsTrigger value="cleaning" className="gap-1">
                <Wand2 className="h-3 w-3" />
                Cleaning
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {columnProfiles.map((profile) => (
                    <Card key={profile.name} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getQualityColor(profile.quality)}`}>
                            {getTypeIcon(profile.type)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{profile.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{profile.type}</Badge>
                              <Badge className={`text-xs ${getQualityColor(profile.quality)}`}>
                                {profile.quality} ({profile.qualityScore}%)
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{profile.uniqueCount.toLocaleString()} unique</p>
                          <p>{profile.nullPercentage.toFixed(1)}% null</p>
                        </div>
                      </div>

                      {profile.type === "numeric" && profile.mean !== undefined && (
                        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Min</p>
                            <p className="text-sm font-medium">{profile.min?.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Max</p>
                            <p className="text-sm font-medium">{profile.max?.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Mean</p>
                            <p className="text-sm font-medium">{profile.mean?.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Std Dev</p>
                            <p className="text-sm font-medium">{profile.stdDev?.toFixed(2)}</p>
                          </div>
                        </div>
                      )}

                      {profile.topValues && profile.topValues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                          {profile.topValues.map((tv) => (
                            <Badge key={tv.value} variant="secondary" className="text-xs">
                              {tv.value} ({tv.count})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="correlations">
              <ScrollArea className="h-[400px]">
                {correlations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No numeric column pairs found for correlation analysis</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {correlations.map((corr, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {corr.direction === "positive" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : corr.direction === "negative" ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Target className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {corr.column1} â†” {corr.column2}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={corr.strength === "strong" ? "default" : corr.strength === "moderate" ? "secondary" : "outline"}>
                              {corr.strength}
                            </Badge>
                            <span className={`text-sm font-mono ${
                              corr.coefficient > 0 ? "text-green-500" : corr.coefficient < 0 ? "text-red-500" : "text-muted-foreground"
                            }`}>
                              r = {corr.coefficient.toFixed(3)}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={Math.abs(corr.coefficient) * 100} 
                          className="h-1 mt-2"
                        />
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="heatmap">
              <CorrelationHeatmap 
                correlations={correlations}
                numericColumns={columns.filter(col => 
                  columnProfiles.find(p => p.name === col)?.type === "numeric"
                )}
              />
            </TabsContent>

            <TabsContent value="quality">
              <DataQualityAlerts 
                columnProfiles={columnProfiles}
                data={data}
              />
            </TabsContent>

            <TabsContent value="charts">
              <ScrollArea className="h-[400px]">
                {chartSuggestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Run profiling to generate chart suggestions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chartSuggestions.map((suggestion, idx) => (
                      <Card 
                        key={idx} 
                        className="p-4 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                        onClick={() => onChartSuggestion?.(suggestion)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {getChartIcon(suggestion.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(suggestion.confidence * 100)}% match
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                            <p className="text-xs text-primary mt-2">{suggestion.reason}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="cleaning">
              <DataCleaningSuggestions
                data={data}
                columns={columns}
                onDataCleaned={(cleanedData) => onDataCleaned?.(cleanedData)}
              />
            </TabsContent>

            <TabsContent value="insights">
              <ScrollArea className="h-[400px]">
                {llmInsights.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Generate Insights" to get AI-powered analysis</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {llmInsights.map((insight, idx) => (
                      <Card key={idx} className={`p-4 ${
                        insight.priority === "high" ? "border-yellow-500/50 bg-yellow-500/5" : ""
                      }`}>
                        <div className="flex items-start gap-3">
                          {getInsightIcon(insight.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={insight.type === "warning" ? "destructive" : "secondary"} className="text-xs">
                                {insight.type}
                              </Badge>
                              {insight.priority === "high" && (
                                <Badge variant="outline" className="text-xs text-yellow-600">
                                  High Priority
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-2">{insight.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default DataProfilingPanel;
