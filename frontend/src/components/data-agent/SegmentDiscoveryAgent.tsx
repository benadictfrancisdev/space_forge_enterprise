import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { PieChart, Loader2, RefreshCw, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface Segment {
  segment_name: string;
  dimension: string;
  dimension_value: string;
  metric: string;
  metric_value: number;
  overall_value: number;
  difference_pct: number;
  direction: "above" | "below";
  is_significant: boolean;
  p_value: number;
  contribution_pct: number;
  insight: string;
}

interface SegmentResult {
  summary: string;
  pareto_findings: string[];
  segments: Segment[];
  top_segments: { title: string; description: string; impact: "high" | "medium" | "low" }[];
  recommendations: string[];
}

const SegmentDiscoveryAgent = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "segment_discovery",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      if (res?.error) throw new Error(res.error);
      setResult(res);
      toast.success("Segment discovery complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to discover segments");
    } finally {
      setLoading(false);
    }
  };

  const impactColor = (impact: string) => {
    if (impact === "high") return "text-red-500";
    if (impact === "medium") return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Segment Discovery Agent
              </CardTitle>
              <CardDescription className="mt-1">
                Automatically slices every metric by every dimension â€” surfaces statistically significant segments only
              </CardDescription>
            </div>
            <Button size="sm" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              {result ? "Re-discover" : "Discover Segments"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-sm text-foreground/90 leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Pareto Findings */}
          {result.pareto_findings?.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pareto Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.pareto_findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">80/20</Badge>
                      <p className="text-xs text-foreground/80">{f}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Segments */}
          {result.top_segments?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Significant Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.top_segments.map((seg, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{seg.title}</span>
                        <Badge variant={seg.impact === "high" ? "destructive" : "secondary"} className="text-[9px]">{seg.impact}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{seg.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Segments Table */}
          {result.segments?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">All Significant Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {result.segments.filter(s => s.is_significant).map((seg, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{seg.dimension}={seg.dimension_value}</span>
                          <span className="text-muted-foreground"> â†’ {seg.metric}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {seg.direction === "above" ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                          <span className={seg.direction === "above" ? "text-green-500" : "text-red-500"}>
                            {seg.difference_pct > 0 ? "+" : ""}{seg.difference_pct?.toFixed(1)}%
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          p={seg.p_value?.toFixed(3)}
                        </Badge>
                        <div className="w-16 shrink-0">
                          <Progress value={Math.min(seg.contribution_pct || 0, 100)} className="h-1.5" />
                          <span className="text-[9px] text-muted-foreground">{seg.contribution_pct?.toFixed(0)}% share</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SegmentDiscoveryAgent;
