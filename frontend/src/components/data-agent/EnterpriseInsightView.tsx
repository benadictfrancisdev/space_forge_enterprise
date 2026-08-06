import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, Target,
  CheckCircle2, ArrowRight, ChevronDown, BarChart3, DollarSign,
  Clock, User, Zap, Brain, Shield, HelpCircle,
} from "lucide-react";
import { useState } from "react";
import type { UniversalEnvelope } from "@/lib/outputEnvelope";
import { InsightCardExport } from "@/components/sharing/InsightCardExport";

interface Props {
  envelope: UniversalEnvelope;
  /** Optional title override (e.g., "Stakeholder Briefing") */
  title?: string;
  /** Hide the headline strip when the parent already shows one */
  compact?: boolean;
  /** Module identifier — used for analytics drill events */
  module?: string;
}

const priorityStyles: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
  medium: "bg-primary/15 text-primary border-primary/40",
  low: "bg-muted text-muted-foreground border-border",
};

const effortStyles: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  high: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function DirectionIcon({ direction }: { direction?: string }) {
  if (direction === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (direction === "down") return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

const EnterpriseInsightView = ({ envelope, title, compact, module }: Props) => {
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  const visibleInsights = showAllInsights ? envelope.insights : envelope.insights.slice(0, 3);
  const visibleRecs = showAllRecs ? envelope.recommendations : envelope.recommendations.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Headline strip */}
      {!compact && envelope.headline && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">{title || "Executive Headline"}</CardTitle>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="outline" className="text-[10px]">
                  Confidence {envelope.confidence}%
                </Badge>
                {envelope.evidence?.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {envelope.evidence.length} evidence points
                  </Badge>
                )}
                <InsightCardExport
                  compact
                  title={title || "Executive Headline"}
                  insight={envelope.headline}
                />
              </div>
            </div>
            <CardDescription className="text-foreground text-sm font-medium leading-relaxed pt-1">
              {envelope.headline}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Evidence chips */}
      {envelope.evidence && envelope.evidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {envelope.evidence.slice(0, 8).map((e, i) => (
                <div
                  key={i}
                  className="text-[11px] bg-muted/50 border border-border/60 rounded-md px-2 py-1 flex items-center gap-1.5"
                >
                  <span className="font-medium text-foreground">{e.metric}:</span>
                  <span className="text-primary font-semibold">{String(e.value)}</span>
                  {e.source_column && (
                    <span className="text-muted-foreground">· {e.source_column}</span>
                  )}
                  {e.sample_size != null && (
                    <span className="text-muted-foreground">· n={e.sample_size}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {envelope.insights && envelope.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Brain className="w-3 h-3" /> Key Insights ({envelope.insights.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {visibleInsights.map((ins, i) => (
              <div key={i} className="border-l-2 border-primary/40 pl-3 py-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground leading-snug flex-1">
                    {ins.finding}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <DirectionIcon direction={ins.direction} />
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      {ins.confidence}%
                    </Badge>
                    <InsightCardExport
                      compact
                      title="Key Insight"
                      insight={ins.finding}
                      metricLabel={ins.why_it_matters}
                    />
                  </div>
                </div>
                {ins.why_it_matters && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1">
                    <span className="font-medium text-foreground/70">Why it matters: </span>
                    {ins.why_it_matters}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ins.magnitude && (
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                      Δ {ins.magnitude}
                    </Badge>
                  )}
                  {ins.business_impact_$ && (
                    <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">
                      <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                      {ins.business_impact_$}
                    </Badge>
                  )}
                  {ins.statistical_basis && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      {ins.statistical_basis}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {envelope.insights.length > 3 && (
              <button
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowAllInsights((s) => !s)}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllInsights ? "rotate-180" : ""}`} />
                {showAllInsights ? "Show less" : `Show ${envelope.insights.length - 3} more insights`}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {envelope.recommendations && envelope.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" /> Recommended Actions ({envelope.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2.5">
            {visibleRecs.map((rec, i) => (
              <div key={i} className="bg-muted/30 border border-border/60 rounded-md p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {rec.action}
                    </p>
                    {rec.expected_outcome && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                        {rec.expected_outcome}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                    <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${priorityStyles[rec.priority] || ""}`}>
                      {rec.priority}
                    </Badge>
                    {rec.success_probability != null && (
                      <span className="text-[9px] text-muted-foreground">
                        {rec.success_probability}% success
                      </span>
                    )}
                    <InsightCardExport
                      compact
                      title="Recommended Action"
                      insight={rec.action}
                      metricLabel={rec.expected_outcome}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${effortStyles[rec.effort] || ""}`}>
                    <Zap className="w-2.5 h-2.5 mr-0.5" /> {rec.effort} effort
                  </Badge>
                  {rec.roi_estimate && (
                    <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">
                      <DollarSign className="w-2.5 h-2.5 mr-0.5" /> ROI {rec.roi_estimate}
                    </Badge>
                  )}
                  {rec.payback_period && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      <Clock className="w-2.5 h-2.5 mr-0.5" /> Payback {rec.payback_period}
                    </Badge>
                  )}
                  {rec.deadline_window && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      Due {rec.deadline_window}
                    </Badge>
                  )}
                  {rec.owner_role && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      <User className="w-2.5 h-2.5 mr-0.5" /> {rec.owner_role}
                    </Badge>
                  )}
                  {rec.kpi_to_track && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      Track: {rec.kpi_to_track}
                    </Badge>
                  )}
                </div>
                {(rec.counter_factual || (rec.dependency_chain && rec.dependency_chain.length > 0)) && (
                  <Collapsible className="mt-2">
                    <CollapsibleTrigger className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" /> Decision context
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1.5 space-y-1">
                      {rec.counter_factual && (
                        <p className="text-[10px] text-muted-foreground italic">
                          <AlertTriangle className="w-2.5 h-2.5 inline mr-1 text-orange-500" />
                          If no action: {rec.counter_factual}
                        </p>
                      )}
                      {rec.dependency_chain && rec.dependency_chain.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-medium">Depends on: </span>
                          {rec.dependency_chain.join(" → ")}
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
            {envelope.recommendations.length > 3 && (
              <button
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowAllRecs((s) => !s)}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllRecs ? "rotate-180" : ""}`} />
                {showAllRecs ? "Show less" : `Show ${envelope.recommendations.length - 3} more actions`}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risks & Next Questions side by side */}
      {((envelope.risks_and_caveats && envelope.risks_and_caveats.length > 0) ||
        (envelope.next_questions && envelope.next_questions.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {envelope.risks_and_caveats && envelope.risks_and_caveats.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Risks & Caveats
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {envelope.risks_and_caveats.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                    <span>{r}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
          {envelope.next_questions && envelope.next_questions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Next Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {envelope.next_questions.map((q, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                    <span>{q}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Drill-down paths */}
      {envelope.drill_down_paths && envelope.drill_down_paths.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Drill-down →
              </span>
              {envelope.drill_down_paths.map((d, i) => (
                <Badge key={i} variant="outline" className="text-[10px] cursor-default">
                  {d.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnterpriseInsightView;
