import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Zap, CheckCircle2, AlertTriangle, Brain, BarChart3, TrendingUp, Target, Eye, BookOpen, Activity, Info } from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { useDataMemory } from "@/hooks/useDataMemory";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
  onComplete: (results: PipelineResults) => void;
  autoStart?: boolean;
}

export interface PipelineResults {
  schemaIntel: Record<string, unknown> | null;
  autoProfile: Record<string, unknown> | null;
  anomalyWatch: Record<string, unknown> | null;
  trendIntel: Record<string, unknown> | null;
  autoNarrative: Record<string, unknown> | null;
  decisionIntel: Record<string, unknown> | null;
  prioritised: Record<string, unknown> | null;
}

interface AgentStep {
  id: keyof PipelineResults;
  label: string;
  icon: React.ReactNode;
  action: string;
  status: "pending" | "running" | "done" | "error";
  result?: Record<string, unknown>;
  error?: string;
}

const AutonomousPipeline = ({ data, columns, columnTypes, datasetName, onComplete, autoStart }: Props) => {
  const { user } = useAuth();
  const { saveMemory } = useDataMemory(datasetName);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const buildSteps = useCallback((): AgentStep[] => {
    const hasDateCol = columns.some((c) => {
      const vals = data.slice(0, 5).map((r) => String(r[c] || ""));
      return vals.some((v) => /^\d{4}[-/]\d{2}/.test(v) || /\d{2}[-/]\d{2}[-/]\d{4}/.test(v));
    });
    const hasNumeric = Object.values(columnTypes).filter((t) => t === "numeric").length >= 2;

    const pipeline: AgentStep[] = [
      { id: "autoProfile", label: "Statistical Profiling", icon: <BarChart3 className="w-4 h-4" />, action: "auto_profile", status: "pending" },
      { id: "anomalyWatch", label: "Anomaly Detection", icon: <Eye className="w-4 h-4" />, action: "proactive_anomaly_watch", status: "pending" },
      { id: "autoNarrative", label: "Executive Narrative", icon: <BookOpen className="w-4 h-4" />, action: "auto_narrative", status: "pending" },
      { id: "decisionIntel", label: "Decision Intelligence", icon: <Target className="w-4 h-4" />, action: "decision_intelligence", status: "pending" },
    ];

    if (hasDateCol && hasNumeric) {
      pipeline.splice(2, 0, { id: "trendIntel", label: "Trend Intelligence", icon: <TrendingUp className="w-4 h-4" />, action: "trend_intelligence_auto", status: "pending" });
    }

    return pipeline;
  }, [data, columns, columnTypes]);

  const runPipeline = useCallback(async () => {
    if (running || hasRun) return;
    const pipeline = buildSteps();
    setSteps(pipeline);
    setRunning(true);
    setProgress(5);

    // Run schema intel locally (no AI call)
    const schemaIntel = runSchemaIntel();

    // Run all AI agents in parallel
    const agentPromises = pipeline.map(async (step) => {
      setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "running" } : s));
      try {
        const body: Record<string, unknown> = {
          action: step.action,
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
        };
        const { data: res, error } = await backend.functions.invoke("data-agent", { body });
        if (error) throw new Error(error.message || "AI service unavailable");
        if (res?.error) throw new Error(res.error);
        setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "done", result: res } : s));
        return { id: step.id, result: res };
      } catch (err: any) {
        const errMsg = err?.message || err?.context?.body?.error || "AI service unavailable";
        // For autoProfile, fall back to local computation
        if (step.id === "autoProfile") {
          const localProfile = runLocalProfile();
          setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "done", result: localProfile, error: "Used local fallback" } : s));
          return { id: step.id, result: localProfile };
        }
        setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "error", error: errMsg } : s));
        return { id: step.id, result: null };
      }
    });

    // Progress ticker
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 1500);

    const settled = await Promise.allSettled(agentPromises);
    clearInterval(ticker);
    setProgress(90);

    const agentResults: Record<string, Record<string, unknown> | null> = {};
    settled.forEach((s) => {
      if (s.status === "fulfilled" && s.value) {
        agentResults[s.value.id] = s.value.result;
      }
    });

    // Run insight prioritisation with combined results
    let prioritised: Record<string, unknown> | null = null;
    try {
      const { data: priRes } = await backend.functions.invoke("data-agent", {
        body: {
          action: "insight_prioritisation",
          data: data.slice(0, 50),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          agentResults: {
            profile: agentResults.autoProfile,
            anomaly: agentResults.anomalyWatch,
            trend: agentResults.trendIntel,
            narrative: agentResults.autoNarrative,
            decisions: agentResults.decisionIntel,
          },
        },
      });
      prioritised = priRes;
    } catch {}

    setProgress(100);
    setRunning(false);
    setHasRun(true);

    const results: PipelineResults = {
      schemaIntel,
      autoProfile: agentResults.autoProfile || null,
      anomalyWatch: agentResults.anomalyWatch || null,
      trendIntel: agentResults.trendIntel || null,
      autoNarrative: agentResults.autoNarrative || null,
      decisionIntel: agentResults.decisionIntel || null,
      prioritised,
    };

    onComplete(results);

    await saveMemory({
      contextType: "autonomous_pipeline",
      title: `Autonomous pipeline run on ${datasetName}`,
      content: { agents: pipeline.length, completed: pipeline.filter((p) => p.status !== "error").length },
      tags: ["autonomous", "pipeline"],
      importance: "high",
    });
  }, [running, hasRun, data, columns, columnTypes, datasetName, user?.id, buildSteps, onComplete, saveMemory]);

  const runLocalProfile = (): Record<string, unknown> => {
    const summary = summarizeDataset(data, columns);
    const numericStats = summary.columns
      .filter((c) => c.type === "numeric")
      .map((c) => {
        const ns = c as { column: string; mean: number; median: number; stdDev: number; min: number; max: number; p25: number; p75: number; count: number; missing: number };
        return {
          column: ns.column,
          mean: ns.mean,
          median: ns.median,
          std: ns.stdDev,
          min: ns.min,
          max: ns.max,
          q1: ns.p25,
          q3: ns.p75,
        };
      });
    const categoricalStats = summary.columns
      .filter((c) => c.type === "categorical")
      .map((c) => {
        const cs = c as { column: string; uniqueCount: number; topValues: { value: string; count: number; pct: number }[] };
        return { column: cs.column, unique_count: cs.uniqueCount, top_values: cs.topValues };
      });
    return {
      _local: true,
      row_count: summary.rowCount,
      column_count: summary.columnCount,
      numeric_stats: numericStats,
      categorical_stats: categoricalStats,
      column_types: summary.columns.map((c) => ({ name: c.column, type: c.type, missing: c.missing })),
    };
  };

  const runSchemaIntel = (): Record<string, unknown> => {
    const colMeta = columns.map((col) => {
      const vals = data.slice(0, 50).map((r) => r[col]);
      const nonNull = vals.filter((v) => v !== null && v !== undefined && v !== "");
      const numericCount = nonNull.filter((v) => !isNaN(Number(v))).length;
      const isDate = nonNull.some((v) => /^\d{4}[-/]\d{2}/.test(String(v)));
      const completeness = Math.round((nonNull.length / vals.length) * 100);
      let type = "text";
      if (isDate) type = "datetime";
      else if (numericCount > nonNull.length * 0.8) type = "metric";
      else if (nonNull.length > 0 && new Set(nonNull.map(String)).size < Math.min(20, nonNull.length * 0.5)) type = "dimension";
      return { name: col, type, completeness, uniqueValues: new Set(nonNull.map(String)).size };
    });
    const healthScore = Math.round(colMeta.reduce((s, c) => s + c.completeness, 0) / colMeta.length);
    return { columns: colMeta, healthScore, rowCount: data.length };
  };

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && !hasRun && !running && data.length > 0) {
      const timer = setTimeout(() => runPipeline(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasRun, running, data.length, runPipeline]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Autonomous Intelligence Pipeline
            </CardTitle>
            <CardDescription>AI analyses your data automatically â€” no prompts needed</CardDescription>
          </div>
          {!hasRun && (
            <Button onClick={runPipeline} disabled={running} size="sm">
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              {running ? "Analyzing..." : "Run Pipeline"}
            </Button>
          )}
        </div>
        {running && <Progress value={progress} className="mt-3" />}
      </CardHeader>

      {steps.length > 0 && (
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border bg-card text-sm"
              >
                <div className={`shrink-0 ${step.status === "done" ? "text-green-500" : step.status === "running" ? "text-primary animate-pulse" : step.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {step.status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   step.status === "done" ? <CheckCircle2 className="w-4 h-4" /> :
                   step.status === "error" ? <AlertTriangle className="w-4 h-4" /> :
                   step.icon}
                </div>
                <span className="truncate flex-1 font-medium">{step.label}</span>
                {step.error && step.status === "error" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-destructive/70 shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {step.error}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Badge variant={step.status === "done" ? "default" : step.status === "error" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                  {step.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AutonomousPipeline;
