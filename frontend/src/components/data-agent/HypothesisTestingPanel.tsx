import { useEffect, useState } from "react";
import { backend } from "@/platform";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FlaskConical, Loader2, CheckCircle, XCircle, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface HypothesisTestingPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface TestResults {
  testSelected: string;
  testSelectionReason: string;
  hypothesis: { null: string; alternative: string; significance_level: number };
  assumptions: {
    checked: string[];
    normality: { assessment: string; method: string; details: string };
    equal_variance: { assessment: string; method: string; details: string };
    sample_size_adequate: boolean;
  };
  results: {
    test_statistic: number;
    test_statistic_name: string;
    degrees_of_freedom: number;
    p_value: number;
    confidence_interval: { lower: number; upper: number; level: number };
    effect_size: { value: number; name: string; interpretation: string };
    power: number;
  };
  groups: Array<{ name: string; n: number; mean: number; std: number; median: number }>;
  decision: string;
  interpretation: string;
  caveats: string[];
  recommendations: string[];
  followUpTests: string[];
}

const HypothesisTestingPanel = ({ data, columns, columnTypes, datasetName }: HypothesisTestingPanelProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [testType, setTestType] = useState<string>("");
  const [groupColumn, setGroupColumn] = useState<string>("");
  const [valueColumn, setValueColumn] = useState<string>("");
  const [hypothesis, setHypothesis] = useState("");
  const history = useFeatureHistory("hypothesis", datasetName);

  // Restore last result on mount / dataset change
  useEffect(() => {
    if (!results && history.latest?.output) {
      const saved = history.latest.output as TestResults;
      if (saved?.results?.p_value !== undefined) setResults(saved);
      const summary = history.latest.input_summary as Record<string, string> | undefined;
      if (summary) {
        if (summary.testType) setTestType(summary.testType);
        if (summary.groupColumn) setGroupColumn(summary.groupColumn);
        if (summary.valueColumn) setValueColumn(summary.valueColumn);
        if (summary.hypothesis) setHypothesis(summary.hypothesis);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.latest?.id]);

  const numericCols = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");

  const handleRunTest = async () => {
    if (!valueColumn) {
      toast.error("Please select a value column to test");
      return;
    }
    setIsRunning(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "hypothesis_testing",
          data: data.slice(0, 500),
          columns,
          datasetName,
          testType: testType && testType !== "__auto__" ? testType : undefined,
          groupColumn: groupColumn && groupColumn !== "__none__" ? groupColumn : undefined,
          valueColumn,
          hypothesisDescription: hypothesis || undefined,
        },
      });
      if (error) throw error;
      // The edge function may return either:
      //   { ...TestResults }           â€” old shape
      //   { ok:true, data: {...} }     â€” new envelope
      //   { ok:false, error: "..." }   â€” handled error (HTTP 200)
      if (result?.ok === false) {
        throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      }
      if (result?.error && !result?.results) {
        throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      }
      const payload = (result?.data && typeof result.data === "object" && (result.data as any).results)
        ? (result.data as TestResults)
        : (result as TestResults);

      const num = (v: unknown, d = 0): number => {
        if (typeof v === "number" && !isNaN(v)) return v;
        if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n)) return n; }
        return d;
      };

      // Coerce p_value
      if (payload?.results) {
        (payload.results as any).p_value = num((payload.results as any).p_value, NaN);
      }
      if (!payload || !payload.results || typeof payload.results.p_value !== "number" || isNaN(payload.results.p_value)) {
        throw new Error("AI returned an incomplete result. Please try again or pick a different test.");
      }
      // Fill safe defaults & coerce every numeric field used in toFixed()
      payload.hypothesis = payload.hypothesis ?? { null: "â€”", alternative: "â€”", significance_level: 0.05 };
      payload.assumptions = payload.assumptions ?? { checked: [], normality: { assessment: "â€”", method: "â€”", details: "â€”" }, equal_variance: { assessment: "â€”", method: "â€”", details: "â€”" }, sample_size_adequate: true };

      const r: any = payload.results;
      r.test_statistic = num(r.test_statistic);
      r.test_statistic_name = r.test_statistic_name || "test";
      r.degrees_of_freedom = num(r.degrees_of_freedom);
      r.power = num(r.power);
      const es = r.effect_size ?? {};
      r.effect_size = { value: num(es.value), name: es.name || "â€”", interpretation: es.interpretation || "â€”" };
      const ci = r.confidence_interval ?? {};
      r.confidence_interval = { lower: num(ci.lower), upper: num(ci.upper), level: num(ci.level, 0.95) };

      payload.groups = (Array.isArray(payload.groups) ? payload.groups : []).map((g: any) => ({
        name: g?.name ?? "Group",
        n: num(g?.n),
        mean: num(g?.mean),
        std: num(g?.std),
        median: num(g?.median),
      }));
      payload.recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : [];
      payload.followUpTests = Array.isArray(payload.followUpTests) ? payload.followUpTests : [];
      payload.caveats = Array.isArray(payload.caveats) ? payload.caveats : [];
      payload.testSelected = payload.testSelected || (testType && testType !== "__auto__" ? testType : "auto");
      payload.decision = payload.decision || (payload.results.p_value < 0.05 ? "reject" : "fail to reject");
      payload.interpretation = payload.interpretation || "Result computed. Review the statistics above for the full picture.";

      setResults(payload);
      history.save(payload, { testType, groupColumn, valueColumn, hypothesis }).catch(() => {});
      toast.success("Hypothesis test complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!results) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-1">Hypothesis Testing</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Validate business assumptions with automated statistical tests. The AI selects the right test, checks assumptions, and explains results in plain English.
            </p>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Configure Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value Column *</Label>
                <Select value={valueColumn} onValueChange={setValueColumn}>
                  <SelectTrigger><SelectValue placeholder="Select column to test" /></SelectTrigger>
                  <SelectContent>
                    {numericCols.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group Column (optional)</Label>
                <Select value={groupColumn} onValueChange={setGroupColumn}>
                  <SelectTrigger><SelectValue placeholder="Compare groups by..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (single-sample test)</SelectItem>
                    {categoricalCols.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Test Type (optional â€” AI auto-selects if empty)</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger><SelectValue placeholder="Auto-select best test" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-select</SelectItem>
                  <SelectItem value="t-test">Independent t-test</SelectItem>
                  <SelectItem value="paired-t-test">Paired t-test</SelectItem>
                  <SelectItem value="welch-t-test">Welch's t-test</SelectItem>
                  <SelectItem value="chi-square">Chi-square test</SelectItem>
                  <SelectItem value="mann-whitney-u">Mann-Whitney U</SelectItem>
                  <SelectItem value="anova">ANOVA</SelectItem>
                  <SelectItem value="kruskal-wallis">Kruskal-Wallis</SelectItem>
                  <SelectItem value="z-test">Z-test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Describe your hypothesis (optional)</Label>
              <Textarea
                placeholder="e.g., 'Revenue is significantly higher in Q4 than Q1' or 'There is no difference in churn rate between regions'"
                value={hypothesis}
                onChange={e => setHypothesis(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleRunTest}
              disabled={isRunning || !valueColumn}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Test...</>
              ) : (
                <><FlaskConical className="w-4 h-4 mr-2" />Run Hypothesis Test</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fx = (v: unknown, d = 2): string => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n.toFixed(d) : "â€”";
  };
  const pValNum = Number(results.results?.p_value);
  const pValueColor = Number.isFinite(pValNum) && pValNum < 0.05 ? "text-green-400" : "text-yellow-400";
  const decisionIcon = results.decision === "reject" ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-yellow-400" />;

  return (
    <div className="space-y-4">
      {/* Decision Banner */}
      <Card className={`border-2 ${results.decision === "reject" ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {decisionIcon}
            <div>
              <p className="font-semibold text-lg">
                {results.decision === "reject" ? "Statistically Significant Result" : "No Significant Difference Found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {results.testSelected} | p-value: <span className={pValueColor}>{fx(results.results?.p_value, 4)}</span> | 
                Effect size: {results.results?.effect_size?.interpretation ?? "â€”"} ({results.results?.effect_size?.name ?? "â€”"} = {fx(results.results?.effect_size?.value, 3)})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypotheses */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4 text-violet-400" />Hypotheses</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Null Hypothesis (Hâ‚€)</p>
            <p className="text-sm">{results.hypothesis.null}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Alternative Hypothesis (Hâ‚)</p>
            <p className="text-sm">{results.hypothesis.alternative}</p>
          </div>
          <p className="text-xs text-muted-foreground">Significance level: Î± = {results.hypothesis.significance_level}</p>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Results</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: (results.results?.test_statistic_name ?? "test") + "-statistic", value: fx(results.results?.test_statistic, 3) },
              { label: "p-value", value: fx(results.results?.p_value, 4) },
              { label: "Degrees of Freedom", value: fx(results.results?.degrees_of_freedom, 0) },
              { label: "Statistical Power", value: Number.isFinite(Number(results.results?.power)) ? (Number(results.results?.power) * 100).toFixed(1) + "%" : "â€”" },
            ].map((s, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          {results.results?.confidence_interval && (
            <p className="text-sm text-muted-foreground mt-3">
              {Number.isFinite(Number(results.results.confidence_interval.level)) ? (Number(results.results.confidence_interval.level) * 100) : 95}% CI: [{fx(results.results.confidence_interval.lower, 3)}, {fx(results.results.confidence_interval.upper, 3)}]
            </p>
          )}
        </CardContent>
      </Card>

      {/* Groups */}
      {results.groups && results.groups.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Group Statistics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.groups.map((g, i) => (
                <div key={i} className="p-3 bg-muted/20 rounded-lg">
                  <p className="font-medium mb-2">{g.name} <span className="text-xs text-muted-foreground">(n={g.n})</span></p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Mean:</span> {fx(g.mean, 2)}</div>
                    <div><span className="text-muted-foreground">Median:</span> {fx(g.median, 2)}</div>
                    <div><span className="text-muted-foreground">Std:</span> {fx(g.std, 2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interpretation */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Plain-English Interpretation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{results.interpretation}</p>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Assumption Checks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(results.assumptions?.checked ?? []).map((a, i) => {
            const text = typeof a === "string" ? a : (a as any)?.text || (a as any)?.description || JSON.stringify(a);
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {text.toLowerCase().includes("met") ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                <span>{text}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommendations & Follow-ups */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.recommendations.map((r, i) => {
              const text = typeof r === "string" ? r : (r as any)?.action || (r as any)?.text || (r as any)?.recommendation || JSON.stringify(r);
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                  <span>{text}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {results.followUpTests && results.followUpTests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Suggested follow-up tests:</span>
          {results.followUpTests.map((t, i) => {
            const text = typeof t === "string" ? t : (t as any)?.name || (t as any)?.test || JSON.stringify(t);
            return (
              <Badge key={i} variant="outline" className="text-xs">{text}</Badge>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setResults(null)}>
          <FlaskConical className="w-4 h-4 mr-2" />Run Another Test
        </Button>
      </div>
    </div>
  );
};

export default HypothesisTestingPanel;
