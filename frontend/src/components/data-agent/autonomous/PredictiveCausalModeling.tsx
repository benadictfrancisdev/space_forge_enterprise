import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  GitBranch,
  TrendingUp,
  Loader2,
  ArrowRight,
  Beaker,
  BarChart3,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ReferenceLine,
} from "recharts";

interface CausalResult {
  causal_graph: Array<{ cause: string; effect: string; strength: number; confidence: number; mechanism: string }>;
  interventions: Array<{ variable: string; change: string; expected_impact: Array<{ target: string; change_pct: number; direction: string }> }>;
  what_if_results?: Array<{ scenario: string; outcome: string; probability: number }>;
  counterfactuals?: Array<{ question: string; answer: string; confidence: number }>;
  summary: string;
}

interface PredictiveCausalModelingProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

const PredictiveCausalModeling = ({ data, columns, columnTypes, datasetName }: PredictiveCausalModelingProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CausalResult | null>(null);
  const [targetVariable, setTargetVariable] = useState("");
  const [whatIfVariable, setWhatIfVariable] = useState("");
  const [whatIfChange, setWhatIfChange] = useState([20]);
  const [whatIfResults, setWhatIfResults] = useState<any[]>([]);
  const [isWhatIf, setIsWhatIf] = useState(false);

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");

  const runCausalAnalysis = async () => {
    if (!targetVariable) { toast.error("Select a target variable"); return; }
    setIsAnalyzing(true);
    try {
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "causal_analysis",
          data: data.slice(0, 200),
          columns,
          datasetName,
          targetVariable,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      setResult(res as CausalResult);
      toast.success("Causal analysis complete");
    } catch (err) {
      console.error(err);
      toast.error("Causal analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runWhatIf = async () => {
    if (!whatIfVariable || !result) return;
    setIsWhatIf(true);
    try {
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "what_if_analysis",
          data: data.slice(0, 200),
          columns,
          datasetName,
          targetVariable,
          whatIfVariable,
          changePercent: whatIfChange[0],
          causalGraph: result.causal_graph,
        },
      });
      if (error) throw error;
      setWhatIfResults(res?.scenarios || []);
    } catch { toast.error("What-if analysis failed"); }
    finally { setIsWhatIf(false); }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Predictive + Causal Modeling</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="causal">
          <TabsList className="mb-4">
            <TabsTrigger value="causal">Causal Analysis</TabsTrigger>
            <TabsTrigger value="whatif">What-If Scenarios</TabsTrigger>
            <TabsTrigger value="counterfactual">Counterfactuals</TabsTrigger>
          </TabsList>

          <TabsContent value="causal" className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Target Variable (Effect)</Label>
                <Select value={targetVariable} onValueChange={setTargetVariable}>
                  <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                  <SelectContent>
                    {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runCausalAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Beaker className="w-4 h-4 mr-1" />}
                Analyze Causality
              </Button>
            </div>

            {result && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Causal Graph</h4>
                  <div className="space-y-2">
                    {result.causal_graph.map((edge, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/50">
                        <Badge variant="outline">{edge.cause}</Badge>
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <Badge variant="outline">{edge.effect}</Badge>
                        <Badge className="ml-auto text-[10px]" variant={edge.strength > 0.7 ? "default" : "secondary"}>
                          {(edge.strength * 100).toFixed(0)}% strength
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {(edge.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {result.causal_graph.length > 0 && (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.causal_graph.map(e => ({ name: `${e.cause}â†’${e.effect}`, strength: e.strength * 100, confidence: e.confidence * 100 }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis className="fill-muted-foreground" />
                        <Tooltip />
                        <Bar dataKey="strength" fill="hsl(var(--primary))" name="Strength %" />
                        <Bar dataKey="confidence" fill="hsl(var(--muted-foreground))" name="Confidence %" opacity={0.5} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="whatif" className="space-y-4">
            {!result ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run causal analysis first to unlock What-If scenarios</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <Label>Change Variable</Label>
                    <Select value={whatIfVariable} onValueChange={setWhatIfVariable}>
                      <SelectTrigger><SelectValue placeholder="Select variable to change" /></SelectTrigger>
                      <SelectContent>
                        {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Change by: {whatIfChange[0]}%</Label>
                    <Slider value={whatIfChange} onValueChange={setWhatIfChange} min={-100} max={100} step={5} className="mt-2" />
                  </div>
                  <Button onClick={runWhatIf} disabled={isWhatIf || !whatIfVariable}>
                    {isWhatIf ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
                    Run What-If
                  </Button>
                </div>
                {whatIfResults.length > 0 && (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {whatIfResults.map((s: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg border border-border">
                          <p className="text-sm font-medium">{s.scenario}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.outcome}</p>
                          <Badge className="mt-2 text-[10px]">{(s.probability * 100).toFixed(0)}% likely</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="counterfactual" className="space-y-4">
            {result?.counterfactuals ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {result.counterfactuals.map((cf, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-primary" />
                        {cf.question}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{cf.answer}</p>
                      <Badge variant="outline" className="mt-2 text-[10px]">{(cf.confidence * 100).toFixed(0)}% confidence</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run causal analysis to generate counterfactual scenarios</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PredictiveCausalModeling;
