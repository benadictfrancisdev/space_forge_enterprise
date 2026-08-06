import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, TrendingUp, TrendingDown, Minus, Download, MessageSquare, SlidersHorizontal } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const exampleScenarios = [
  "What if we increase marketing budget by 20%?",
  "What if we reduce prices by 10%?",
  "What if we expand to 2 new regions?",
  "What if customer churn doubles?",
];

const ScenarioSimulation = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"nl" | "slider">("nl");
  // NL mode
  const [scenarioQuestion, setScenarioQuestion] = useState("");
  const [nlResult, setNlResult] = useState<any>(null);
  // Slider mode
  const [variable, setVariable] = useState("");
  const [changePct, setChangePct] = useState([10]);
  const [sliderResults, setSliderResults] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const simulateNL = async () => {
    if (!scenarioQuestion.trim()) { toast.error("Enter a scenario question"); return; }
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "what_if_simulation",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          scenarioQuestion: scenarioQuestion.trim(),
          causalContext: {},
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setNlResult(result);
    } catch (e: any) {
      toast.error(e.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const simulateSlider = async () => {
    if (!variable) { toast.error("Select a variable"); return; }
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "founder_simulate",
          data: data.slice(0, 200),
          columns,
          datasetName,
          variable,
          changePercent: changePct[0],
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      setSliderResults(result);
    } catch (e: any) {
      toast.error(e.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (mode === "nl" && nlResult) {
      exportToPdf({
        title: "What-If Simulation Results",
        subtitle: nlResult.scenario || scenarioQuestion,
        datasetName,
        sections: [
          { title: "Summary", content: nlResult.reasoning || "", type: "text" },
          ...(nlResult.affected_kpis ? [{
            title: "Affected KPIs",
            content: "",
            type: "table" as const,
            tableData: {
              headers: ["KPI", "Current", "Projected", "Change"],
              rows: nlResult.affected_kpis.map((k: any) => [k.name, String(k.current), String(k.projected), `${k.change_pct > 0 ? "+" : ""}${k.change_pct}%`]),
            },
          }] : []),
        ],
      });
    } else if (sliderResults?.scenarios) {
      exportToPdf({
        title: "Scenario Simulation Results",
        subtitle: `Variable: ${variable} | Change: ${changePct[0] > 0 ? "+" : ""}${changePct[0]}%`,
        datasetName,
        sections: [{
          title: "Scenarios",
          content: "",
          type: "table",
          tableData: {
            headers: ["Scenario", "Outcome", "Probability"],
            rows: sliderResults.scenarios.map((s: any) => [s.scenario || "", s.outcome || "", `${Math.round((s.probability ?? 0) * 100)}%`]),
          },
        }],
      });
    }
  };

  const hasResults = mode === "nl" ? !!nlResult : !!sliderResults?.scenarios;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">What-If Simulation</h2>
          <p className="text-sm text-muted-foreground">Ask a scenario question or adjust variables to simulate outcomes</p>
        </div>
        <div className="flex gap-2">
          {hasResults && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button variant={mode === "nl" ? "default" : "outline"} size="sm" onClick={() => setMode("nl")}>
          <MessageSquare className="w-4 h-4 mr-1" /> Natural Language
        </Button>
        <Button variant={mode === "slider" ? "default" : "outline"} size="sm" onClick={() => setMode("slider")}>
          <SlidersHorizontal className="w-4 h-4 mr-1" /> Variable Slider
        </Button>
      </div>

      {mode === "nl" ? (
        <>
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label>Scenario Question</Label>
                <Textarea
                  placeholder='e.g. "What if we increase marketing budget by 20%?"'
                  value={scenarioQuestion}
                  onChange={(e) => setScenarioQuestion(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {exampleScenarios.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-xs" onClick={() => setScenarioQuestion(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <Button onClick={simulateNL} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {loading ? "Simulating..." : "Run What-If Simulation"}
              </Button>
            </CardContent>
          </Card>

          {/* NL Results */}
          {nlResult && (
            <div className="space-y-3">
              <Card className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{nlResult.scenario || scenarioQuestion}</p>
                    <p className="text-lg font-bold text-primary mt-1">{nlResult.estimated_impact}</p>
                    {nlResult.confidence_interval && (
                      <p className="text-xs text-muted-foreground">
                        Range: {nlResult.confidence_interval.lower} â€“ {nlResult.confidence_interval.upper} {nlResult.confidence_interval.unit || ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {nlResult.payback_period && (
                      <Badge variant="outline" className="text-xs">Payback: {nlResult.payback_period}</Badge>
                    )}
                    {nlResult.cac_impact && (
                      <Badge variant="outline" className="text-xs">CAC: {nlResult.cac_impact}</Badge>
                    )}
                    {nlResult.confidence_score != null && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <Progress value={nlResult.confidence_score} className="h-2 w-16" />
                        <span className="text-xs font-medium">{nlResult.confidence_score}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Affected KPIs */}
              {nlResult.affected_kpis?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nlResult.affected_kpis.map((kpi: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">{kpi.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium">{kpi.current}</span>
                          <span className="text-xs text-muted-foreground">â†’</span>
                          <span className="text-sm font-bold">{kpi.projected}</span>
                          <Badge className={`text-[10px] ${kpi.change_pct > 0 ? "bg-green-500/20 text-green-700 dark:text-green-300" : kpi.change_pct < 0 ? "bg-red-500/20 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
                            {kpi.change_pct > 0 ? "+" : ""}{kpi.change_pct}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Reasoning + Risks + Recommendation */}
              {nlResult.reasoning && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs font-medium text-foreground">Reasoning</p>
                    <p className="text-xs text-muted-foreground">{nlResult.reasoning}</p>
                    {nlResult.second_order_effects?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground">Second-order Effects</p>
                        <ul className="text-xs text-muted-foreground list-disc ml-4 mt-1">
                          {nlResult.second_order_effects.map((e: string, i: number) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    )}
                    {nlResult.risks?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground">Risks</p>
                        <ul className="text-xs text-muted-foreground list-disc ml-4 mt-1">
                          {nlResult.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {nlResult.recommendation && (
                      <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/20">
                        <p className="text-xs font-medium text-primary">Verdict: {nlResult.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Slider mode â€” existing */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Variable to Change</Label>
                  <select
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={variable}
                    onChange={(e) => setVariable(e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Change: {changePct[0] > 0 ? "+" : ""}{changePct[0]}%</Label>
                  <Slider
                    value={changePct}
                    onValueChange={setChangePct}
                    min={-50}
                    max={50}
                    step={5}
                    className="mt-3"
                  />
                </div>
              </div>
              <Button onClick={simulateSlider} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {loading ? "Simulating..." : "Run Simulation"}
              </Button>
            </CardContent>
          </Card>

          {sliderResults?.scenarios?.map((s: any, i: number) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {(s.probability ?? 0) > 0.6 ? (
                    <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (s.probability ?? 0) < 0.3 ? (
                    <TrendingDown className="w-5 h-5 text-red-500 mt-0.5" />
                  ) : (
                    <Minus className="w-5 h-5 text-yellow-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.scenario}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.outcome}</p>
                    <p className="text-xs text-muted-foreground mt-1">Probability: {Math.round((s.probability ?? 0) * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default ScenarioSimulation;
