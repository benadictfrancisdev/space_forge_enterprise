import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatExecutiveBrief } from "./formatExecutiveBrief";
import { ReasoningChainView } from "./ReasoningChainView";
import type { DecisionAnalysisResult } from "@/platform/track13/contracts";

function riskVariant(level: string) {
  if (level === "critical" || level === "high") return "destructive";
  if (level === "medium") return "secondary";
  return "outline";
}

export function ExecutiveBriefCard({ brief }: { brief: unknown }) {
  const text = formatExecutiveBrief(brief);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Executive Narrative
          <Badge variant="outline" className="text-[10px]">Verified AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </CardContent>
    </Card>
  );
}

export function DecisionResultView({ result }: { result: DecisionAnalysisResult | Record<string, unknown> }) {
  const support = result.decision_support as DecisionAnalysisResult["decision_support"] | undefined;
  const chain = result.reasoning_chain as DecisionAnalysisResult["reasoning_chain"] | undefined;

  if (support && chain) {
    return (
      <div className="space-y-4">
        <ReasoningChainView stages={chain.stages} />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Confidence</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{support.confidence_score}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Level</CardTitle></CardHeader>
            <CardContent>
              <Badge variant={riskVariant(support.risk_assessment.level)} className="text-sm">
                {support.risk_assessment.level} ({support.risk_assessment.score})
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Expected ROI</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {String(support.expected_roi.estimate_pct ?? "—")}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Indicative estimate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Problem Summary</CardTitle></CardHeader>
          <CardContent className="text-sm">{support.problem_summary}</CardContent>
        </Card>

        {support.root_causes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Root Causes</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm list-disc pl-4">
                {support.root_causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Supporting Evidence</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {support.supporting_evidence.map((ev, i) => (
              <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                <Badge variant="outline" className="text-[10px] mb-1">{ev.type}</Badge>
                <p>{ev.summary}</p>
                <p className="text-xs text-muted-foreground">{ev.source}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recommended Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {support.recommended_actions.map((a) => (
              <div key={a.title} className="text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{a.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assumptions</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 list-disc pl-4 text-muted-foreground">
              {support.assumptions_used.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <ExecutiveBriefCard brief={support.executive_narrative} />
      </div>
    );
  }

  const insight = result.insight as Record<string, unknown> | undefined;
  const explanation = result.explanation as Record<string, unknown> | undefined;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Problem</CardTitle></CardHeader>
        <CardContent className="text-sm">{String(result.problem ?? "")}</CardContent>
      </Card>
      {insight?.kpis && Array.isArray(insight.kpis) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Verified KPIs</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            {(insight.kpis as Array<{ name: string; value: number; status: string }>).map((k) => (
              <div key={k.name}>{k.name}: {k.value} ({k.status})</div>
            ))}
          </CardContent>
        </Card>
      )}
      {explanation && <ExecutiveBriefCard brief={explanation} />}
    </div>
  );
}
