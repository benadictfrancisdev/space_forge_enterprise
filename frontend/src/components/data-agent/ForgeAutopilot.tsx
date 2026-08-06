import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, Radar, AlertTriangle, TrendingUp, ShieldAlert, Lightbulb, Zap,
  ChevronDown, Clock, ArrowRight, CheckCircle2, XCircle, BarChart3, Activity,
  RefreshCw, ThumbsUp, ThumbsDown, Pause, Play,
} from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AutopilotInsight {
  id: string;
  category: "anomaly" | "trend" | "risk" | "opportunity" | "performance_shift";
  urgency: number;
  business_value: number;
  confidence: number;
  what_happened: string;
  why_it_happened: string;
  recommended_action: string;
  expected_impact: string;
  supporting_evidence: string[];
  affected_metrics: string[];
  timeline: string;
  learned_from_past?: string | null;
}

interface AutopilotResult {
  autopilot_status: "monitoring" | "alert" | "critical";
  scan_summary: string;
  insights: AutopilotInsight[];
  data_health: {
    overall_score: number;
    completeness: number;
    freshness_note: string;
    quality_issues: string[];
  };
  next_scan_recommendation: string;
}

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  anomaly: { icon: AlertTriangle, color: "text-destructive", label: "Anomaly" },
  trend: { icon: TrendingUp, color: "text-primary", label: "Trend" },
  risk: { icon: ShieldAlert, color: "text-orange-500", label: "Risk" },
  opportunity: { icon: Lightbulb, color: "text-green-500", label: "Opportunity" },
  performance_shift: { icon: Activity, color: "text-blue-500", label: "Performance Shift" },
};

const TIMELINE_LABELS: Record<string, string> = {
  immediate: "Act Now",
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
};

const ForgeAutopilot = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutopilotResult | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, "positive" | "negative">>({});
  const [scanCount, setScanCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [phases, setPhases] = useState("");

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runScan = useCallback(async () => {
    if (loading || data.length === 0) return;
    setLoading(true);

    const scanPhases = ["Connecting to data sources...", "Scanning for anomalies...", "Analyzing trends...", "Evaluating risks...", "Identifying opportunities...", "Prioritizing insights...", "Generating recommendations..."];
    for (const phase of scanPhases) {
      setPhases(phase);
      await new Promise(r => setTimeout(r, 250));
    }

    try {
      // Build past decisions from feedback
      const pastDecisions = Object.entries(feedback).map(([id, fb]) => {
        const insight = result?.insights.find(i => i.id === id);
        return {
          decision: insight?.recommended_action || id,
          outcome: fb === "positive" ? "positive â€” user confirmed effective" : "negative â€” user indicated ineffective",
        };
      });

      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "forge_autopilot",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          pastDecisions,
        },
      });

      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);

      setResult(res);
      setScanCount(prev => prev + 1);

      // Save to business context memory
      if (user && res?.insights?.length > 0) {
        try {
          await backend.from("business_context_memory").insert({
            user_id: user.id,
            context_type: "forge_autopilot",
            dataset_name: datasetName,
            title: `Autopilot scan #${scanCount + 1}: ${res.scan_summary}`,
            content: { status: res.autopilot_status, insightCount: res.insights.length, topInsight: res.insights[0]?.what_happened },
            importance: res.autopilot_status === "critical" ? "high" : "medium",
            tags: ["autopilot", "continuous_monitoring"],
          });
        } catch { /* non-critical */ }
      }
    } catch (e: any) {
      console.error("Autopilot scan error:", e);
      toast.error(e.message || "Autopilot scan failed");
    } finally {
      setLoading(false);
      setPhases("");
    }
  }, [data, columns, columnTypes, datasetName, user, loading, feedback, result, scanCount]);

  // Continuous mode
  useEffect(() => {
    if (continuousMode) {
      intervalRef.current = setInterval(() => {
        runScan();
      }, 90000); // every 90s
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [continuousMode, runScan]);

  const handleFeedback = (insightId: string, type: "positive" | "negative") => {
    setFeedback(prev => ({ ...prev, [insightId]: type }));
    toast.success(type === "positive" ? "Feedback recorded â€” will reinforce this pattern" : "Feedback recorded â€” will adjust future recommendations");
  };

  const getStatusColor = (status?: string) => {
    if (status === "critical") return "bg-destructive text-destructive-foreground";
    if (status === "alert") return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
    return "bg-green-500/20 text-green-700 dark:text-green-300";
  };

  const getPriorityScore = (insight: AutopilotInsight) =>
    Math.round(insight.urgency * 0.4 + insight.business_value * 0.4 + insight.confidence * 20 * 0.2);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radar className="w-5 h-5 text-primary" />
                Forge Autopilot
              </CardTitle>
              <CardDescription>Continuous AI business analyst â€” monitors, detects, and recommends</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {result && (
                <Badge className={getStatusColor(result.autopilot_status)}>
                  {result.autopilot_status === "critical" ? "âš  Critical" : result.autopilot_status === "alert" ? "ðŸ”” Alert" : "âœ“ Monitoring"}
                </Badge>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{continuousMode ? "Live" : "Manual"}</span>
                <Switch checked={continuousMode} onCheckedChange={setContinuousMode} />
                {continuousMode && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>}
              </div>
              <Button onClick={runScan} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
                {loading ? "Scanning..." : "Run Scan"}
              </Button>
            </div>
          </div>
          {loading && phases && (
            <div className="mt-3 space-y-1">
              <Progress value={Math.random() * 40 + 50} className="h-1.5" />
              <p className="text-xs text-muted-foreground animate-pulse">{phases}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Data Health Card */}
      {result?.data_health && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Data Health</span>
              <span className="text-2xl font-bold text-primary">{result.data_health.overall_score}/100</span>
            </div>
            <Progress value={result.data_health.overall_score} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completeness: {result.data_health.completeness}%</span>
              <span>{result.data_health.freshness_note}</span>
            </div>
            {result.data_health.quality_issues.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {result.data_health.quality_issues.map((issue, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{issue}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan Summary */}
      {result && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{result.scan_summary}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {result.insights.length} insights</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Scan #{scanCount}</span>
              {result.next_scan_recommendation && (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Next: {result.next_scan_recommendation}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {result && result.insights.length > 0 && (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {result.insights.map((insight, i) => {
              const config = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.trend;
              const Icon = config.icon;
              const priority = getPriorityScore(insight);
              const isExpanded = expandedCards.has(insight.id || String(i));
              const fb = feedback[insight.id || String(i)];

              return (
                <Card key={insight.id || i} className="border-l-4" style={{
                  borderLeftColor: insight.urgency >= 8 ? "hsl(var(--destructive))" : insight.urgency >= 5 ? "#f97316" : "hsl(var(--primary))"
                }}>
                  <CardContent className="pt-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Icon className={`w-3 h-3 ${config.color}`} />
                            {config.label}
                          </Badge>
                          <Badge className={insight.timeline === "immediate" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"} >
                            {TIMELINE_LABELS[insight.timeline] || insight.timeline}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Priority: {priority}</span>
                        </div>
                      </div>
                      <div className="text-right min-w-[70px] space-y-1">
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <Progress value={insight.confidence * 100} className="h-1.5" />
                        <div className="text-xs font-medium">{Math.round(insight.confidence * 100)}%</div>
                      </div>
                    </div>

                    {/* What Happened */}
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What Happened</div>
                      <p className="text-sm">{insight.what_happened}</p>
                    </div>

                    {/* Why + Action + Impact â€” collapsible */}
                    <Collapsible open={isExpanded} onOpenChange={() => toggleCard(insight.id || String(i))}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs p-0 h-auto w-full justify-start">
                          <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {isExpanded ? "Collapse" : "Why â†’ Action â†’ Impact"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {/* Why */}
                        <div className="bg-muted/20 rounded-lg p-3 border-l-2 border-orange-400">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Why It Happened</div>
                          <p className="text-xs">{insight.why_it_happened}</p>
                        </div>
                        {/* Action */}
                        <div className="bg-primary/5 rounded-lg p-3 border-l-2 border-primary">
                          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> Recommended Action
                          </div>
                          <p className="text-xs font-medium">{insight.recommended_action}</p>
                        </div>
                        {/* Impact */}
                        <div className="bg-green-500/5 rounded-lg p-3 border-l-2 border-green-500">
                          <div className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Expected Impact</div>
                          <p className="text-xs">{insight.expected_impact}</p>
                        </div>

                        {/* Evidence */}
                        {insight.supporting_evidence?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {insight.supporting_evidence.map((e, j) => (
                              <span key={j} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{e}</span>
                            ))}
                          </div>
                        )}

                        {/* Affected Metrics */}
                        {insight.affected_metrics?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {insight.affected_metrics.map((m, j) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{m}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Learned from past */}
                        {insight.learned_from_past && (
                          <p className="text-[10px] text-muted-foreground italic">ðŸ§  {insight.learned_from_past}</p>
                        )}

                        {/* Feedback */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-muted-foreground">Was this helpful?</span>
                          <Button
                            variant={fb === "positive" ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleFeedback(insight.id || String(i), "positive")}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant={fb === "negative" ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleFeedback(insight.id || String(i), "negative")}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Radar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-1">Forge Autopilot is ready</p>
            <p className="text-xs text-muted-foreground">Click "Run Scan" or enable continuous mode to start monitoring your data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ForgeAutopilot;
