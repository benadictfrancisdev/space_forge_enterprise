import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { Beaker, Loader2, RefreshCw, BarChart3, ArrowRight } from "lucide-react";

interface AutoExperimentEngineProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  columnTypes?: Record<string, string>;
}

interface TestResult {
  column_pair: string;
  test_name: string;
  test_statistic: number;
  p_value: number;
  significance: "significant" | "not significant";
  effect_size: number;
  effect_label: "small" | "medium" | "large";
  plain_explanation: string;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  target: string;
  explanation: string;
}

interface ExperimentResult {
  summary: string;
  tests: TestResult[];
  feature_importance: FeatureImportance[];
  kpi_drivers: string[];
  recommendations: string[];
}

const AutoExperimentEngine = ({ data, columns, datasetName, columnTypes }: AutoExperimentEngineProps) => {
  const { user } = useAuth();
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const summary = summarizeDataset(data, columns);
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "auto_experiment",
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
      toast.success("AutoExperiment complete");
    } catch (e: any) {
      toast.error(e.message || "Failed to run experiments");
    } finally {
      setLoading(false);
    }
  };

  const sigColor = (sig: string) => sig === "significant" ? "text-green-600 bg-green-500/10 border-green-500/20" : "text-muted-foreground bg-muted border-border";

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              AutoExperiment Engine
            </CardTitle>
            <Button size="sm" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              {result ? "Re-run" : "Run Auto-Tests"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically selects and runs the right statistical tests. No configuration needed.
          </p>
        </CardHeader>
      </Card>

      {result && (
        <>
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <p className="text-sm text-foreground/90 leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Statistical Tests */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Statistical Tests Auto-Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {result.tests.map((t, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{t.column_pair}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="outline" className="text-[9px]">{t.test_name}</Badge>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${sigColor(t.significance)}`}>
                          {t.significance} (p={t.p_value.toFixed(4)})
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span>Statistic: {t.test_statistic.toFixed(3)}</span>
                        <span>Effect: {t.effect_size.toFixed(3)} ({t.effect_label})</span>
                      </div>
                      <p className="text-xs text-foreground/80">{t.plain_explanation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Feature Importance */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                What Drives Your KPIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.feature_importance.map((f, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{f.feature}</span>
                      <span className="text-muted-foreground">{(f.importance * 100).toFixed(1)}% of variance in {f.target}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${f.importance * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{f.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">â€¢</span>
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AutoExperimentEngine;
