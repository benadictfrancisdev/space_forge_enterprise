import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Zap, CheckCircle2, AlertTriangle, TrendingUp, Brain, BarChart3, Target, Activity } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDataMemory } from "@/hooks/useDataMemory";
import { computeLocalStats } from "@/utils/localStats";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
  onNavigate?: (tab: string) => void;
}

interface PipelineStep {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  result?: Record<string, unknown>;
  error?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  brain: <Brain className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  trend: <TrendingUp className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
};

const WorkflowOrchestrator = ({ data, columns, columnTypes, datasetName, onNavigate }: Props) => {
  const { user } = useAuth();
  const { saveMemory, getContextForPrompt } = useDataMemory(datasetName);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [summary, setSummary] = useState("");
  const [progress, setProgress] = useState(0);

  const detectIntent = useCallback(() => {
    const hasDateCol = columns.some((c) => {
      const vals = data.slice(0, 5).map((r) => String(r[c] || ""));
      return vals.some((v) => /^\d{4}[-/]\d{2}/.test(v) || /\d{2}[-/]\d{2}[-/]\d{4}/.test(v));
    });
    const hasNumeric = Object.values(columnTypes).filter((t) => t === "numeric").length >= 2;
    const rowCount = data.length;

    const pipeline: PipelineStep[] = [
      { id: "summary", label: "Auto-Narrative Summary", icon: "brain", status: "pending" },
      { id: "anomaly", label: "Anomaly Detection", icon: "alert", status: "pending" },
    ];

    if (hasNumeric) {
      pipeline.push({ id: "stats", label: "Statistical Analysis", icon: "chart", status: "pending" });
    }
    if (hasDateCol && hasNumeric) {
      pipeline.push({ id: "forecast", label: "AutoML Forecast", icon: "trend", status: "pending" });
    }
    if (rowCount > 20) {
      pipeline.push({ id: "decisions", label: "Decision Intelligence", icon: "target", status: "pending" });
    }

    return pipeline;
  }, [data, columns, columnTypes]);

  const runPipeline = async () => {
    const pipeline = detectIntent();
    setSteps(pipeline);
    setRunning(true);
    setSummary("");
    setProgress(0);

    const memoryContext = getContextForPrompt();
    const total = pipeline.length;
    const results: Record<string, unknown> = {};

    // â”€â”€â”€ Pre-compute local stats (NO AI call) â”€â”€â”€
    const localStats = computeLocalStats(data, columns, columnTypes);
    results["localStats"] = localStats;

    // â”€â”€â”€ Run pipeline steps â€” batch independent steps in parallel â”€â”€â”€
    const independentSteps = pipeline.filter(s => ["summary", "anomaly", "stats"].includes(s.id));
    const dependentSteps = pipeline.filter(s => !["summary", "anomaly", "stats"].includes(s.id));

    // Mark independent steps as running
    setSteps((prev) => prev.map((s) =>
      independentSteps.some(is => is.id === s.id) ? { ...s, status: "running" } : s
    ));

    // Run independent steps in parallel
    const parallelResults = await Promise.allSettled(
      independentSteps.map(async (step) => {
        const actionMap: Record<string, string> = {
          summary: "executive_narrative",
          anomaly: "anomaly",
          stats: "analyze",
        };

        const body: Record<string, unknown> = {
          action: actionMap[step.id] || step.id,
          data: data.slice(0, 100), // reduced from 200
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          businessContext: memoryContext,
          preComputedStats: localStats, // send local stats to reduce AI work
        };

        const { data: res, error } = await backend.functions.invoke("data-agent", { body });
        if (error) throw new Error(error.message || "AI service unavailable");
        if (res?.error) throw new Error(res.error);
        return { stepId: step.id, result: res };
      })
    );

    // Process parallel results
    for (const result of parallelResults) {
      if (result.status === "fulfilled") {
        const { stepId, result: res } = result.value;
        results[stepId] = res;
        setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, status: "done", result: res } : s));
      } else {
        const stepId = independentSteps[parallelResults.indexOf(result)]?.id;
        if (stepId) {
          setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, status: "error", error: result.reason?.message } : s));
        }
      }
    }

    setProgress(Math.round((independentSteps.length / total) * 100));

    // Run dependent steps sequentially
    for (const step of dependentSteps) {
      setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "running" } : s));

      try {
        const body: Record<string, unknown> = {
          action: step.id === "forecast" ? "automl_forecast" : step.id === "decisions" ? "decision_intelligence" : step.id,
          data: data.slice(0, 100),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          businessContext: memoryContext,
          preComputedStats: localStats,
        };

        if (step.id === "forecast") {
          const numCols = columns.filter((c) => columnTypes[c] === "numeric");
          body.targetColumn = numCols[0];
          body.horizon = "30";
        }

        const { data: res, error } = await backend.functions.invoke("data-agent", { body });
        if (error) throw new Error(error.message || "AI service unavailable");
        if (res?.error) throw new Error(res.error);

        results[step.id] = res;
        setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "done", result: res } : s));
      } catch (err: any) {
        setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, status: "error", error: err.message } : s));
      }

      setProgress(Math.round(((independentSteps.length + dependentSteps.indexOf(step) + 1) / total) * 100));
    }

    setProgress(100);
    setRunning(false);

    // Build summary from results
    const parts: string[] = [];
    parts.push(`Data quality: ${localStats.dataQualityScore}%. ${localStats.topCorrelations.length} correlations found locally.`);
    if (results.summary) parts.push((results.summary as any)?.narrative?.slice(0, 200) || "Narrative generated.");
    if (results.anomaly) {
      const anomalies = (results.anomaly as any)?.anomalies || [];
      parts.push(`${anomalies.length} anomalies detected.`);
    }
    if (results.decisions) {
      const decs = (results.decisions as any)?.decisions || [];
      parts.push(`${decs.length} action recommendations generated.`);
    }
    if (results.forecast) {
      parts.push(`Forecast: ${(results.forecast as any)?.trend_direction || "stable"} trend.`);
    }
    setSummary(parts.join(" "));

    await saveMemory({
      contextType: "orchestrator_run",
      title: `Pipeline run: ${pipeline.map((p) => p.label).join(", ")}`,
      content: { stepsRun: pipeline.length, completedSteps: pipeline.filter((p) => p.status === "done").length },
      tags: ["orchestrator", "pipeline"],
      importance: "high",
    });

    toast.success("Pipeline complete!");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Workflow Orchestrator
              </CardTitle>
              <CardDescription>Intent-based auto-routing â€” uploads your data, detects what's needed, runs everything in parallel</CardDescription>
            </div>
            <Button onClick={runPipeline} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              {running ? "Running Pipeline..." : "Auto-Analyze"}
            </Button>
          </div>
          {running && <Progress value={progress} className="mt-3" />}
        </CardHeader>
      </Card>

      {steps.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className={`mt-0.5 ${step.status === "done" ? "text-green-500" : step.status === "running" ? "text-primary animate-pulse" : step.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {step.status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       step.status === "done" ? <CheckCircle2 className="w-4 h-4" /> :
                       step.status === "error" ? <AlertTriangle className="w-4 h-4" /> :
                       iconMap[step.icon] || <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{step.label}</span>
                        <Badge variant={step.status === "done" ? "default" : step.status === "error" ? "destructive" : "secondary"} className="text-[10px]">
                          {step.status}
                        </Badge>
                      </div>
                      {step.status === "done" && step.result && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {String((step.result as any).summary || (step.result as any).narrative?.toString().slice(0, 120) || "Complete")}
                        </p>
                      )}
                      {step.error && <p className="text-xs text-destructive mt-1">{step.error}</p>}
                    </div>
                    {step.status === "done" && onNavigate && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                        const navMap: Record<string, string> = {
                          summary: "narrative", anomaly: "anomaly_watch", stats: "analyze",
                          forecast: "automl_forecast", decisions: "decision_intel",
                        };
                        onNavigate(navMap[step.id] || step.id);
                      }}>
                        View â†’
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="text-sm font-semibold mb-2">Unified Results</h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkflowOrchestrator;
