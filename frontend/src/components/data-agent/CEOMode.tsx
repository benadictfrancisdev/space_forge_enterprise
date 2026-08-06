import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Crown, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Users, Target, Zap, CheckCircle2, ArrowRight,
  BarChart3, ShieldAlert, Lightbulb, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDataMemory } from "@/hooks/useDataMemory";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface CEOInsight {
  id: string;
  category: "revenue_risk" | "churn_alert" | "growth_opportunity" | "cost_optimization" | "market_signal" | "operational_risk";
  severity: "critical" | "warning" | "info" | "positive";
  headline: string;
  what_happened: string;
  why_it_happened: string;
  recommended_action: string;
  expected_impact: string;
  impact_value: string;
  confidence: number;
  urgency: number;
  time_sensitivity: string;
  kpi_affected: string[];
  evidence: string[];
}

interface CEOBriefing {
  executive_summary: string;
  overall_health_score: number;
  revenue_status: { trend: string; signal: string; value: string };
  customer_status: { trend: string; signal: string; value: string };
  growth_status: { trend: string; signal: string; value: string };
  cost_status: { trend: string; signal: string; value: string };
  insights: CEOInsight[];
  top_priority: string;
  ceo_one_liner: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  revenue_risk: <DollarSign className="w-4 h-4" />,
  churn_alert: <Users className="w-4 h-4" />,
  growth_opportunity: <TrendingUp className="w-4 h-4" />,
  cost_optimization: <BarChart3 className="w-4 h-4" />,
  market_signal: <Target className="w-4 h-4" />,
  operational_risk: <ShieldAlert className="w-4 h-4" />,
};

const severityStyles: Record<string, string> = {
  critical: "border-destructive/50 bg-destructive/5",
  warning: "border-yellow-500/50 bg-yellow-500/5",
  info: "border-primary/50 bg-primary/5",
  positive: "border-green-500/50 bg-green-500/5",
};

const severityBadge: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-yellow-500 text-white",
  info: "bg-primary text-primary-foreground",
  positive: "bg-green-600 text-white",
};

const trendIcon = (trend: string) =>
  trend === "up" || trend === "growing" ? <TrendingUp className="w-4 h-4 text-green-500" /> :
  trend === "down" || trend === "declining" ? <TrendingDown className="w-4 h-4 text-destructive" /> :
  <BarChart3 className="w-4 h-4 text-muted-foreground" />;

const CEOMode = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const { saveMemory, getContextForPrompt } = useDataMemory(datasetName);
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<CEOBriefing | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const runCEOBriefing = useCallback(async () => {
    setLoading(true);
    setBriefing(null);
    try {
      const memoryContext = getContextForPrompt();
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "ceo_mode",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          businessContext: memoryContext,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      setBriefing(res as CEOBriefing);

      await saveMemory({
        contextType: "ceo_briefing",
        title: `CEO Briefing: ${datasetName}`,
        content: { summary: res?.executive_summary, insights_count: res?.insights?.length },
        tags: ["ceo_mode", "executive"],
        importance: "high",
      });

      toast.success("CEO Briefing generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  }, [data, columns, columnTypes, datasetName, user, getContextForPrompt, saveMemory]);

  const healthColor = (score: number) =>
    score >= 75 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-primary" />
                CEO Mode â€” AI COO
              </CardTitle>
              <CardDescription className="mt-1">
                Full-stack executive intelligence. Revenue risks, churn signals, growth opportunities, and action plans â€” automatically.
              </CardDescription>
            </div>
            <Button onClick={runCEOBriefing} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Analyzing..." : "Generate CEO Briefing"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <div>
              <p className="text-sm font-medium">Running full business intelligence pipeline...</p>
              <p className="text-xs text-muted-foreground mt-1">Analyzing revenue, churn, growth, costs, and generating action plans</p>
            </div>
            <Progress value={45} className="max-w-xs mx-auto" />
          </CardContent>
        </Card>
      )}

      {briefing && (
        <>
          {/* CEO One-Liner */}
          <Card className="border-primary/20">
            <CardContent className="py-4">
              <p className="text-base font-semibold text-foreground italic">"{briefing.ceo_one_liner}"</p>
              <p className="text-xs text-muted-foreground mt-1">Top Priority: {briefing.top_priority}</p>
            </CardContent>
          </Card>

          {/* Health Score + KPI Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Health Score */}
            <Card className="md:col-span-1">
              <CardContent className="py-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Health Score</p>
                <p className={`text-4xl font-bold mt-1 ${healthColor(briefing.overall_health_score)}`}>
                  {briefing.overall_health_score}
                </p>
                <p className="text-[10px] text-muted-foreground">/100</p>
              </CardContent>
            </Card>

            {/* KPI Status Cards */}
            {[
              { label: "Revenue", status: briefing.revenue_status, icon: DollarSign },
              { label: "Customers", status: briefing.customer_status, icon: Users },
              { label: "Growth", status: briefing.growth_status, icon: TrendingUp },
              { label: "Costs", status: briefing.cost_status, icon: BarChart3 },
            ].map(({ label, status, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    {trendIcon(status?.trend || "stable")}
                  </div>
                  <p className="text-sm font-semibold mt-1">{status?.value || "â€”"}</p>
                  <p className="text-[10px] text-muted-foreground">{status?.signal || ""}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Executive Summary */}
          <Card>
            <CardContent className="py-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                Executive Summary
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{briefing.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Insight Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Insights & Actions ({briefing.insights?.length || 0})</CardTitle>
              <CardDescription className="text-xs">Prioritized by urgency Ã— business impact Ã— confidence</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {(briefing.insights || []).map((insight, idx) => {
                    const expanded = expandedInsight === insight.id;
                    return (
                      <div
                        key={insight.id || idx}
                        className={`rounded-lg border-2 p-4 transition-all ${severityStyles[insight.severity] || severityStyles.info}`}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="mt-0.5">{categoryIcons[insight.category] || <Target className="w-4 h-4" />}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{insight.headline}</span>
                                <Badge className={`text-[9px] px-1.5 py-0 ${severityBadge[insight.severity] || ""}`}>
                                  {insight.severity}
                                </Badge>
                                {insight.urgency >= 8 && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-destructive text-destructive">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" /> URGENT
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{insight.what_happened}</p>
                            </div>
                          </div>

                          {/* Impact badge */}
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-primary">{insight.impact_value}</p>
                            <p className="text-[10px] text-muted-foreground">est. impact</p>
                          </div>
                        </div>

                        {/* Recommended Action - always visible */}
                        <div className="mt-3 p-2.5 rounded-md bg-primary/10 border border-primary/20">
                          <div className="flex items-start gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-primary">Suggested Fix</p>
                              <p className="text-xs text-foreground mt-0.5">{insight.recommended_action}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <p className="text-[11px] text-green-600 font-medium">{insight.expected_impact}</p>
                          </div>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedInsight(expanded ? null : insight.id)}
                          className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expanded ? "Less detail" : "Why this happened + evidence"}
                        </button>

                        {expanded && (
                          <div className="mt-2 space-y-2 pl-6 border-l-2 border-muted">
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Root Cause</p>
                              <p className="text-xs text-foreground">{insight.why_it_happened}</p>
                            </div>
                            {insight.evidence?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Evidence</p>
                                <ul className="text-xs text-muted-foreground space-y-0.5">
                                  {insight.evidence.map((e, i) => <li key={i}>â€¢ {e}</li>)}
                                </ul>
                              </div>
                            )}
                            <div className="flex gap-4 text-[10px] text-muted-foreground">
                              <span>Confidence: <strong>{Math.round((insight.confidence || 0) * 100)}%</strong></span>
                              <span>Urgency: <strong>{insight.urgency}/10</strong></span>
                              <span>Window: <strong>{insight.time_sensitivity}</strong></span>
                            </div>
                            {insight.kpi_affected?.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {insight.kpi_affected.map((kpi) => (
                                  <Badge key={kpi} variant="outline" className="text-[9px]">{kpi}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CEOMode;
