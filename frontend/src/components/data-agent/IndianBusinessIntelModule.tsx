import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Package, Users, BarChart3 } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";

export type IBIModule = "churn" | "inventory" | "revenue_drop" | "segmentation" | "sales_performance";

interface Insight {
  title: string;
  detail: string;
  severity?: "high" | "medium" | "low";
  action?: string;
}
interface AIResponse {
  headline?: string;
  insights?: Insight[];
  top_at_risk?: { name: string; reason: string; score: number }[];
  restock_list?: { sku: string; quantity: number; urgency: string; reason: string }[];
  root_causes?: { dimension: string; value: string; impact_pct: number; reason: string }[];
  segments?: { name: string; size_pct: number; description: string; action: string }[];
  top_performers?: { name: string; metric: string; value: string }[];
  underperformers?: { name: string; metric: string; value: string; recommendation: string }[];
}

const MODULE_CONFIG: Record<IBIModule, { title: string; subtitle: string; icon: typeof Sparkles; gradient: string }> = {
  churn: { title: "E-commerce Churn Predictor", subtitle: "Identify customers likely to leave and why", icon: Users, gradient: "from-rose-500/20 to-orange-500/20" },
  inventory: { title: "Retail Inventory Optimizer", subtitle: "AI-powered restock recommendations", icon: Package, gradient: "from-emerald-500/20 to-cyan-500/20" },
  revenue_drop: { title: "Revenue Drop Diagnoser", subtitle: "Root-cause analysis for revenue declines", icon: TrendingDown, gradient: "from-red-500/20 to-amber-500/20" },
  segmentation: { title: "Customer Segmentation Engine", subtitle: "Group customers into actionable segments", icon: Users, gradient: "from-violet-500/20 to-fuchsia-500/20" },
  sales_performance: { title: "Sales Performance Tracker", subtitle: "Compare reps, regions, and products", icon: BarChart3, gradient: "from-blue-500/20 to-indigo-500/20" },
};

const SEVERITY_STYLE: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/5",
  medium: "border-amber-500/40 bg-amber-500/5",
  low: "border-emerald-500/40 bg-emerald-500/5",
};

function buildHeuristicFallback(
  module: IBIModule,
  data: Record<string, unknown>[],
  columns: string[],
  datasetName: string
): AIResponse {
  const numericCols = columns.filter((c) =>
    data.some((r) => Number.isFinite(Number(r[c])))
  );
  const rowCount = data.length;
  const headline = `Local analysis preview for ${datasetName} (${rowCount} rows)`;
  const insights: Insight[] = [
    {
      title: "Dataset profile",
      detail: `${rowCount} rows · ${columns.length} columns · ${numericCols.length} numeric fields`,
      severity: "low",
    },
    {
      title: "Recommended next step",
      detail: "Run full AI insights when the backend is connected, or retry if the service was temporarily unavailable.",
      severity: "medium",
      action: "Retry AI Insights",
    },
  ];
  if (module === "churn") {
    return {
      headline,
      insights,
      top_at_risk: [{ name: "Sample segment", reason: "Heuristic preview — connect AI for ranked churn risk", score: 62 }],
    };
  }
  if (module === "inventory") {
    return {
      headline,
      insights,
      restock_list: [{ sku: columns[0] || "SKU-001", quantity: 10, urgency: "medium", reason: "Preview recommendation" }],
    };
  }
  if (module === "revenue_drop") {
    return {
      headline,
      insights,
      root_causes: [{ dimension: "region", value: "—", impact_pct: 0, reason: "Run AI for regional diagnosis" }],
    };
  }
  if (module === "segmentation") {
    return {
      headline,
      insights,
      segments: [{ name: "Core customers", size_pct: 40, description: "Preview segment", action: "Review retention" }],
    };
  }
  return {
    headline,
    insights,
    top_performers: [{ name: columns[0] || "Top", metric: "value", value: "—" }],
    underperformers: [{ name: columns[1] || "Bottom", metric: "value", value: "—", recommendation: "Investigate variance" }],
  };
}

interface Props {
  module: IBIModule;
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

const IndianBusinessIntelModule = ({ module, data, columns, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const cfg = MODULE_CONFIG[module];
  const Icon = cfg.icon;

  const runAnalysis = async () => {
    if (!data?.length) {
      toast.error("Upload a dataset first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data: resp, error } = await invokeEdgeFunction<{ success: boolean; data: AIResponse; error?: string }>(
        "indian-business-intel",
        { module, data: data.slice(0, 500), columns, datasetName }
      );
      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || "Analysis failed");
      setResult(resp.data);
      toast.success("Insights generated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to run analysis";
      toast.error(msg, { description: "Showing local preview insights" });
      setResult(buildHeuristicFallback(module, data, columns, datasetName));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`bg-gradient-to-br ${cfg.gradient} border-border/50`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/60">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{cfg.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
              </div>
            </div>
            <Button onClick={runAnalysis} disabled={loading || !data?.length} size="sm">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {loading ? "Analyzing..." : "Run AI Insights"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{data?.length || 0} rows</Badge>
            <Badge variant="secondary">{columns?.length || 0} columns</Badge>
            {datasetName && <Badge variant="outline">{datasetName}</Badge>}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card><CardContent className="p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">AI is analyzing your data…</p>
        </CardContent></Card>
      )}

      {result && (
        <>
          {result.headline && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{result.headline}</p>
              </CardContent>
            </Card>
          )}

          {!!result.insights?.length && (
            <div className="grid gap-3 md:grid-cols-2">
              {result.insights.map((ins, i) => (
                <Card key={i} className={SEVERITY_STYLE[ins.severity || "low"]}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <h4 className="font-semibold text-sm leading-snug">{ins.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.detail}</p>
                    {ins.action && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs font-medium text-primary">→ {ins.action}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!!result.top_at_risk?.length && (
            <Card><CardHeader><CardTitle className="text-sm">High-Risk Customers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.top_at_risk.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                    <div className="flex-1"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.reason}</p></div>
                    <Badge variant={c.score > 70 ? "destructive" : "secondary"}>{c.score}% risk</Badge>
                  </div>
                ))}
              </CardContent></Card>
          )}

          {!!result.restock_list?.length && (
            <Card><CardHeader><CardTitle className="text-sm">Restock Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.restock_list.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                    <div className="flex-1"><p className="text-sm font-medium">{r.sku}</p><p className="text-xs text-muted-foreground">{r.reason}</p></div>
                    <div className="text-right"><Badge>{r.quantity} units</Badge><p className="text-xs text-muted-foreground mt-1">{r.urgency.replace("_", " ")}</p></div>
                  </div>
                ))}
              </CardContent></Card>
          )}

          {!!result.root_causes?.length && (
            <Card><CardHeader><CardTitle className="text-sm">Root Causes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.root_causes.map((c, i) => (
                  <div key={i} className="p-3 rounded-md border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{c.dimension}: {c.value}</Badge>
                      <span className={`text-sm font-bold ${c.impact_pct < 0 ? "text-destructive" : "text-emerald-600"}`}>{c.impact_pct > 0 ? "+" : ""}{c.impact_pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.reason}</p>
                  </div>
                ))}
              </CardContent></Card>
          )}

          {!!result.segments?.length && (
            <div className="grid gap-3 md:grid-cols-2">
              {result.segments.map((s, i) => (
                <Card key={i}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{s.name}</h4><Badge variant="secondary">{s.size_pct}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                  <p className="text-xs font-medium text-primary pt-1">→ {s.action}</p>
                </CardContent></Card>
              ))}
            </div>
          )}

          {(!!result.top_performers?.length || !!result.underperformers?.length) && (
            <div className="grid gap-3 md:grid-cols-2">
              {!!result.top_performers?.length && (
                <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Top Performers</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {result.top_performers.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm"><span>{p.name}</span><Badge variant="secondary">{p.value}</Badge></div>
                    ))}
                  </CardContent></Card>
              )}
              {!!result.underperformers?.length && (
                <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" />Needs Attention</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {result.underperformers.map((p, i) => (
                      <div key={i} className="space-y-1"><div className="flex items-center justify-between text-sm"><span>{p.name}</span><Badge variant="destructive">{p.value}</Badge></div><p className="text-xs text-muted-foreground">→ {p.recommendation}</p></div>
                    ))}
                  </CardContent></Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IndianBusinessIntelModule;
