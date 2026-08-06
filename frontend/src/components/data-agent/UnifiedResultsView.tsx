import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, TrendingUp, Target, BookOpen, Eye, BarChart3, ArrowRight, Sparkles, CheckCircle2, ChevronDown, Zap } from "lucide-react";
import type { PipelineResults } from "./AutonomousPipeline";

interface Props {
  results: PipelineResults;
  onNavigate: (tab: string) => void;
}

const UnifiedResultsView = ({ results, onNavigate }: Props) => {
  const topInsights = (results.prioritised as any)?.top_insights || [];
  const anomalies = (results.anomalyWatch as any)?.anomalies || [];
  const anomalyCount = anomalies.length;
  const criticalCount = anomalies.filter((a: any) => a.severity === "critical" || a.severity === "high").length;
  const narrative = (results.autoNarrative as any)?.narrative || (results.autoNarrative as any)?.executive_summary || "";
  const decisions = (results.decisionIntel as any)?.decisions || (results.decisionIntel as any)?.recommendations || [];
  const trendDir = (results.trendIntel as any)?.trends?.[0]?.direction || null;
  const healthScore = (results.schemaIntel as any)?.healthScore || 0;

  const [showAllInsights, setShowAllInsights] = useState(false);

  const top3 = topInsights.slice(0, 3);
  const remaining = topInsights.slice(3);

  const severityColor = (s: string) => {
    if (s === "critical") return "text-red-500";
    if (s === "high") return "text-orange-500";
    if (s === "medium") return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Hero summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<Sparkles className="w-4 h-4" />} label="Priority Insights" value={String(topInsights.length)} accent />
        <SummaryCard icon={<AlertTriangle className="w-4 h-4" />} label="Anomalies" value={`${anomalyCount} (${criticalCount} critical)`} />
        <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Trend" value={trendDir || "N/A"} />
        <SummaryCard icon={<CheckCircle2 className="w-4 h-4" />} label="Data Health" value={`${healthScore}%`} />
      </div>

      {/* Top 3 "Act Now" Insights with paired recommendations */}
      {top3.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Act Now — Top {top3.length} Priority Insights
            </CardTitle>
            <CardDescription>Ranked by Impact × Confidence × Urgency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {top3.map((insight: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-primary/20 bg-card">
                  <div className="flex items-start gap-2">
                    <Badge className="shrink-0 text-[10px] mt-0.5 bg-primary text-primary-foreground">#{i + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {/* Paired recommendation */}
                      {insight.recommended_action && (
                        <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20">
                          <div className="flex items-center gap-1 text-xs font-medium text-primary mb-1">
                            <Target className="w-3 h-3" /> Recommended Action
                          </div>
                          <p className="text-xs text-foreground">{insight.recommended_action}</p>
                          {insight.estimated_roi && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{insight.estimated_roi}</p>
                          )}
                          {insight.reasoning && (
                            <p className="text-[11px] text-muted-foreground mt-1 italic">{insight.reasoning}</p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {insight.source_agent && (
                          <Badge variant="secondary" className="text-[10px]">{insight.source_agent}</Badge>
                        )}
                        {insight.score != null && (
                          <Badge variant="outline" className="text-[10px]">Score: {Math.round(insight.score)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining insights — collapsible */}
            {remaining.length > 0 && (
              <Collapsible open={showAllInsights} onOpenChange={setShowAllInsights}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                    <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${showAllInsights ? "rotate-180" : ""}`} />
                    {showAllInsights ? "Hide" : `Show ${remaining.length} more insights`}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 mt-3">
                    {remaining.map((insight: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border bg-card/50">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 text-[10px] mt-0.5">#{i + 4}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{insight.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                            {insight.recommended_action && (
                              <p className="text-xs text-primary mt-1">→ {insight.recommended_action}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Narrative summary */}
      {narrative && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Executive Briefing
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("narrative_full")}>
                Full Report <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
              {typeof narrative === "string" ? narrative : JSON.stringify(narrative).slice(0, 500)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Anomaly + Decisions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {anomalyCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Anomalies ({anomalyCount})
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("anomaly_watch")}>
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {anomalies.slice(0, 5).map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border text-xs">
                      <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${severityColor(a.severity)}`} />
                      <span className="text-muted-foreground">{a.description || `Anomaly in ${a.affected_columns?.[0]?.column || "data"}`}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {decisions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Recommendations ({decisions.length})
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("decision_intel")}>
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {decisions.slice(0, 5).map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border text-xs">
                      <Badge variant="outline" className="shrink-0 text-[10px]">#{i + 1}</Badge>
                      <span className="text-muted-foreground">{typeof d === "string" ? d : d.action || d.recommendation || d.title || JSON.stringify(d).slice(0, 120)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drill-down buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { tab: "narrative_full", label: "Full Narrative", icon: BookOpen },
          { tab: "anomaly_watch", label: "Anomaly Watch", icon: Eye },
          { tab: "decision_intel", label: "Decisions", icon: Target },
          { tab: "forecast_chat", label: "Forecast", icon: TrendingUp },
          { tab: "analyze", label: "Statistics", icon: BarChart3 },
        ].map(({ tab, label, icon: Icon }) => (
          <Button key={`${tab}-${label}`} variant="outline" size="sm" className="text-xs" onClick={() => onNavigate(tab)}>
            <Icon className="w-3 h-3 mr-1" /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <Card className={accent ? "border-primary/50 bg-primary/5" : ""}>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
      <p className="text-sm font-semibold truncate">{value}</p>
    </CardContent>
  </Card>
);

export default UnifiedResultsView;
