import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Target, TrendingUp, AlertTriangle, ArrowRight, Zap, Download, ChevronDown, DollarSign, Brain } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDataMemory } from "@/hooks/useDataMemory";
import { usePdfExport } from "@/hooks/usePdfExport";
import EnterpriseInsightView from "./EnterpriseInsightView";
import { isUniversalEnvelope } from "@/lib/outputEnvelope";
import { recordFinding, getCrossModuleContext } from "@/lib/insightMemory";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
  autoRun?: boolean;
}

interface Decision {
  recommendation: string;
  reasoning: string;
  reasoning_chain?: string[];
  estimated_impact: string;
  roi_estimate?: string;
  impact_score: number;
  confidence_level?: number;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  action_template: string;
  evidence: string[];
  timeline: string;
}

interface DecisionResult {
  decisions: Decision[];
  summary: string;
  data_quality_note: string;
  enterprise?: unknown;
}

const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  medium: "bg-primary/20 text-primary",
  low: "bg-muted text-muted-foreground",
};

const DecisionIntelligence = ({ data, columns, columnTypes, datasetName, autoRun }: Props) => {
  const { user } = useAuth();
  const { saveMemory, getContextForPrompt } = useDataMemory(datasetName);
  const { exportToPdf } = usePdfExport();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [expandedChains, setExpandedChains] = useState<Set<number>>(new Set());

  const toggleChain = (i: number) => {
    setExpandedChains(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const memoryContext = getContextForPrompt() + getCrossModuleContext(datasetName, "decision_intelligence");
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "decision_intelligence",
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

      // Normalize: AI may wrap in { data: {...} } envelope or omit fields
      const payload = (res?.data && typeof res.data === "object" && Array.isArray((res.data as any).decisions))
        ? res.data
        : res;
      const safe: DecisionResult = {
        decisions: Array.isArray(payload?.decisions) ? payload.decisions : [],
        summary: payload?.summary || "No summary available.",
        data_quality_note: payload?.data_quality_note || "",
        enterprise: payload?.enterprise,
      };
      if (safe.decisions.length === 0) {
        toast.error("AI returned no decisions. Please try again.");
        return;
      }
      setResult(safe);
      if (safe.enterprise && isUniversalEnvelope(safe.enterprise)) {
        recordFinding(datasetName, "decision_intelligence", safe.enterprise);
      }
      if (safe.decisions.length > 0) {
        await saveMemory({
          contextType: "decision_intelligence",
          title: `Decision analysis for ${datasetName}`,
          content: { decisionsCount: safe.decisions.length, topDecision: safe.decisions[0]?.recommendation },
          tags: ["decisions", "actions"],
          importance: "high",
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Decision analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run when navigated from autonomous pipeline
  useEffect(() => {
    if (autoRun && !result && !loading) {
      analyze();
    }
  }, [autoRun]);

  const handleExport = () => {
    if (!result) return;
    exportToPdf({
      title: "Decision Intelligence Report",
      datasetName,
      sections: [
        { title: "Summary", content: result.summary, type: "text" },
        {
          title: "Ranked Decisions",
          content: "",
          type: "table",
          tableData: {
            headers: ["Priority", "Recommendation", "ROI", "Impact", "Timeline"],
            rows: result.decisions.map((d) => [d.priority.toUpperCase(), d.recommendation, d.roi_estimate || d.estimated_impact, `${d.impact_score}%`, d.timeline]),
          },
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Decision Intelligence
              </CardTitle>
              <CardDescription>AI recommends ROI-ranked actions with transparent reasoning</CardDescription>
            </div>
            <div className="flex gap-2">
              {result && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
              )}
              <Button onClick={analyze} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
                {loading ? "Analyzing..." : "Generate Decisions"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {result.enterprise && isUniversalEnvelope(result.enterprise) && (
            <EnterpriseInsightView
              envelope={result.enterprise as any}
              title="Decision Briefing"
              module="decision_intelligence"
            />
          )}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              {result.data_quality_note && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {result.data_quality_note}
                </p>
              )}
            </CardContent>
          </Card>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {result.decisions.map((d, i) => (
                <Card key={i} className="border-l-4" style={{ borderLeftColor: d.priority === "critical" ? "hsl(var(--destructive))" : d.priority === "high" ? "#f97316" : "hsl(var(--primary))" }}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={priorityColors[d.priority]}>{d.priority}</Badge>
                          <Badge variant="outline">{d.category}</Badge>
                          {d.roi_estimate && (
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-[10px]">
                              <DollarSign className="w-3 h-3 mr-0.5" />{d.roi_estimate}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{d.timeline}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{d.recommendation}</h4>
                      </div>
                      <div className="text-right min-w-[80px] space-y-1">
                        <div className="text-xs text-muted-foreground">Impact</div>
                        <Progress value={d.impact_score} className="h-2" />
                        <div className="text-xs font-medium">{d.impact_score}%</div>
                        {d.confidence_level != null && (
                          <>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                            <Progress value={d.confidence_level} className="h-2" />
                            <div className="text-xs font-medium">{d.confidence_level}%</div>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{d.reasoning}</p>

                    {/* Reasoning chain â€” expandable */}
                    {d.reasoning_chain && d.reasoning_chain.length > 0 && (
                      <Collapsible open={expandedChains.has(i)} onOpenChange={() => toggleChain(i)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto">
                            <Brain className="w-3 h-3 mr-1 text-primary" />
                            <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${expandedChains.has(i) ? "rotate-180" : ""}`} />
                            Reasoning Chain ({d.reasoning_chain.length} steps)
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-1 pl-3 border-l-2 border-primary/30">
                            {d.reasoning_chain.map((step, j) => (
                              <p key={j} className="text-[11px] text-muted-foreground">{step}</p>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs font-medium mb-1 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> Action Template
                      </div>
                      <p className="text-xs text-muted-foreground">{d.action_template}</p>
                    </div>

                    {Array.isArray(d.evidence) && d.evidence.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {d.evidence.map((e, j) => (
                          <span key={j} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{e}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <TrendingUp className="w-3 h-3" /> {d.estimated_impact}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};

export default DecisionIntelligence;
