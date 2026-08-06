import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { GitBranch, Loader2, RefreshCw, ArrowRight, Clock, AlertCircle } from "lucide-react";

interface CausalDiscoveryAgentProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  columnTypes?: Record<string, string>;
}

interface CausalEdge {
  cause: string;
  effect: string;
  strength: number;
  confidence: number;
  mechanism: string;
  lag?: string;
  type: "direct" | "indirect" | "confounded";
}

interface LeadLag {
  variable: string;
  role: "leading" | "lagging" | "coincident";
  leads_by?: string;
  explanation: string;
}

interface CausalResult {
  summary: string;
  causal_edges: CausalEdge[];
  lead_lag_indicators: LeadLag[];
  confounders: { variable: string; affects: string[]; explanation: string }[];
  interventions: { action: string; expected_impact: string; confidence: number }[];
  plain_language_findings: string[];
}

const CausalDiscoveryAgent = ({ data, columns, datasetName, columnTypes }: CausalDiscoveryAgentProps) => {
  const { user } = useAuth();
  const [result, setResult] = useState<CausalResult | null>(null);
  const [loading, setLoading] = useState(false);

  const discover = async () => {
    setLoading(true);
    try {
      const summary = summarizeDataset(data, columns);
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "causal_discovery",
          data: data.slice(0, 50),
          columns,
          datasetName,
          userId: user?.id,
          dataSummary: JSON.stringify(summary),
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);
      setResult(res.result);
      toast.success("Causal graph discovered");
    } catch (e: any) {
      toast.error(e.message || "Failed to discover causal structure");
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = (s: number) => s > 0.7 ? "text-green-600" : s > 0.4 ? "text-yellow-600" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Causal Discovery Agent
            </CardTitle>
            <Button size="sm" onClick={discover} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              {result ? "Re-discover" : "Discover Causes"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Goes beyond correlation. Builds causal graph, identifies leading/lagging indicators with plain-language explanations.
          </p>
        </CardHeader>
      </Card>

      {result && (
        <>
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Plain Language Findings */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key Causal Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.plain_language_findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
                    <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                    <p className="text-xs text-foreground/90">{f}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Causal Graph (text representation) */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Causal Edges</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-2">
                  {result.causal_edges.map((e, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-semibold">{e.cause}</Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                        <Badge variant="outline" className="text-[10px] font-semibold">{e.effect}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${e.type === "direct" ? "bg-green-500/10 text-green-600 border-green-500/20" : e.type === "confounded" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" : "bg-muted"}`}>
                          {e.type}
                        </Badge>
                        {e.lag && (
                          <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Clock className="w-2.5 h-2.5 mr-0.5" />{e.lag} lag
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span className={strengthColor(e.strength)}>Strength: {(e.strength * 100).toFixed(0)}%</span>
                        <span>Confidence: {(e.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{e.mechanism}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Leading / Lagging */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Leading vs Lagging Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.lead_lag_indicators.map((ll, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <Badge variant="outline" className={`text-[9px] ${ll.role === "leading" ? "bg-green-500/10 text-green-600 border-green-500/20" : ll.role === "lagging" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" : "bg-muted"}`}>
                      {ll.role}
                    </Badge>
                    <span className="text-xs font-medium">{ll.variable}</span>
                    {ll.leads_by && <span className="text-[10px] text-muted-foreground">({ll.leads_by})</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{ll.explanation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confounders */}
          {result.confounders.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Confounders Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.confounders.map((c, i) => (
                    <div key={i} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs">
                      <span className="font-medium">{c.variable}</span> affects {c.affects.join(", ")}
                      <p className="text-muted-foreground mt-0.5">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interventions */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Suggested Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.interventions.map((iv, i) => (
                  <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{iv.action}</span>
                      <span className="text-muted-foreground">{(iv.confidence * 100).toFixed(0)}% confidence</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{iv.expected_impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CausalDiscoveryAgent;
