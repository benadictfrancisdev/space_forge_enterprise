import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FlaskConical, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface ABResult {
  testName: string;
  controlGroup: { name: string; n: number; mean: number; stdDev: number };
  treatmentGroup: { name: string; n: number; mean: number; stdDev: number };
  metric: string;
  lift: number;
  liftDirection: "up" | "down" | "flat";
  pValue: number;
  significant: boolean;
  confidenceLevel: number;
  confidenceInterval: [number, number];
  powerAnalysis: { achievedPower: number; recommendedN: number };
  interpretation: string;
  recommendation: string;
}

const ABTestingPanel = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [splitColumn, setSplitColumn] = useState("");
  const [metricColumn, setMetricColumn] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState([95]);
  const [results, setResults] = useState<ABResult | null>(null);

  const categoricalColumns = useMemo(() =>
    columns.filter(c => columnTypes[c] === "categorical"), [columns, columnTypes]);
  const numericColumns = useMemo(() =>
    columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);

  const uniqueGroups = useMemo(() => {
    if (!splitColumn) return [];
    const vals = [...new Set(data.map(r => String(r[splitColumn] ?? "")))].filter(Boolean);
    return vals.slice(0, 10);
  }, [splitColumn, data]);

  const [controlValue, setControlValue] = useState("");
  const [treatmentValue, setTreatmentValue] = useState("");

  const runABTest = async () => {
    if (!splitColumn || !metricColumn || !controlValue || !treatmentValue) {
      toast.error("Please select all fields"); return;
    }
    setLoading(true);
    try {
      const controlData = data.filter(r => String(r[splitColumn]) === controlValue).map(r => Number(r[metricColumn])).filter(n => !isNaN(n));
      const treatmentData = data.filter(r => String(r[splitColumn]) === treatmentValue).map(r => Number(r[metricColumn])).filter(n => !isNaN(n));

      if (controlData.length < 5 || treatmentData.length < 5) {
        toast.error("Need at least 5 samples per group"); setLoading(false); return;
      }

      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const std = (arr: number[]) => { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)); };

      const cMean = mean(controlData), tMean = mean(treatmentData);
      const cStd = std(controlData), tStd = std(treatmentData);
      const cN = controlData.length, tN = treatmentData.length;

      // Welch's t-test
      const se = Math.sqrt((cStd ** 2 / cN) + (tStd ** 2 / tN));
      const tStat = (tMean - cMean) / (se || 0.0001);
      const df = Math.round(((cStd ** 2 / cN + tStd ** 2 / tN) ** 2) /
        ((cStd ** 2 / cN) ** 2 / (cN - 1) + (tStd ** 2 / tN) ** 2 / (tN - 1)));

      // Approximate p-value using normal distribution for large df
      const absT = Math.abs(tStat);
      const pValue = Math.max(0.0001, 2 * (1 - normalCDF(absT)));

      const lift = cMean !== 0 ? ((tMean - cMean) / Math.abs(cMean)) * 100 : 0;
      const significant = pValue < (1 - confidenceLevel[0] / 100);
      const zAlpha = normalInv(1 - (1 - confidenceLevel[0] / 100) / 2);
      const ci: [number, number] = [
        (tMean - cMean) - zAlpha * se,
        (tMean - cMean) + zAlpha * se
      ];

      // Power analysis (approximate)
      const effectSize = Math.abs(tMean - cMean) / Math.sqrt((cStd ** 2 + tStd ** 2) / 2);
      const achievedPower = 1 - normalCDF(zAlpha - effectSize * Math.sqrt(Math.min(cN, tN) / 2));
      const recommendedN = effectSize > 0 ? Math.ceil((2 * (zAlpha + normalInv(0.8)) ** 2) / (effectSize ** 2)) : 1000;

      // AI interpretation
      const { data: aiData } = await backend.functions.invoke("data-agent", {
        body: {
          action: "explain",
          analysisType: "ab_test_interpretation",
          datasetName,
          analysisResults: { controlMean: cMean, treatmentMean: tMean, lift, pValue, significant },
          dataContext: `Interpret this A/B test: Control (${controlValue}): mean=${cMean.toFixed(2)}, n=${cN}. Treatment (${treatmentValue}): mean=${tMean.toFixed(2)}, n=${tN}. Metric: ${metricColumn}. Lift: ${lift.toFixed(2)}%. p-value: ${pValue.toFixed(4)}. Significant: ${significant}. Power: ${(achievedPower * 100).toFixed(0)}%. Give a 2-sentence interpretation and 1-sentence recommendation.`,
        }
      });

      const explanation = aiData?.explanation || "";
      const interpretation = explanation || (significant
        ? `The treatment group (${treatmentValue}) shows a statistically significant ${lift > 0 ? "increase" : "decrease"} of ${Math.abs(lift).toFixed(1)}% in ${metricColumn} compared to control.`
        : `No statistically significant difference found between groups at ${confidenceLevel[0]}% confidence.`);
      const recommendation = (significant
        ? lift > 0 ? "Consider rolling out the treatment to all users." : "Revert to the control variant."
        : "Increase sample size or test duration for conclusive results.");

      setResults({
        testName: `${controlValue} vs ${treatmentValue}`,
        controlGroup: { name: controlValue, n: cN, mean: cMean, stdDev: cStd },
        treatmentGroup: { name: treatmentValue, n: tN, mean: tMean, stdDev: tStd },
        metric: metricColumn,
        lift,
        liftDirection: Math.abs(lift) < 1 ? "flat" : lift > 0 ? "up" : "down",
        pValue,
        significant,
        confidenceLevel: confidenceLevel[0],
        confidenceInterval: ci,
        powerAnalysis: { achievedPower, recommendedN },
        interpretation,
        recommendation,
      });
      toast.success("A/B test complete");
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Setup Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            A/B Test Designer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Split Column (Group Variable)</Label>
              <Select value={splitColumn} onValueChange={(v) => { setSplitColumn(v); setControlValue(""); setTreatmentValue(""); }}>
                <SelectTrigger><SelectValue placeholder="Select group column" /></SelectTrigger>
                <SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Metric Column (What to measure)</Label>
              <Select value={metricColumn} onValueChange={setMetricColumn}>
                <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                <SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {uniqueGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Control Group</Label>
                <Select value={controlValue} onValueChange={setControlValue}>
                  <SelectTrigger><SelectValue placeholder="Control" /></SelectTrigger>
                  <SelectContent>{uniqueGroups.filter(g => g !== treatmentValue).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Treatment Group</Label>
                <Select value={treatmentValue} onValueChange={setTreatmentValue}>
                  <SelectTrigger><SelectValue placeholder="Treatment" /></SelectTrigger>
                  <SelectContent>{uniqueGroups.filter(g => g !== controlValue).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Confidence Level: {confidenceLevel[0]}%</Label>
            <Slider value={confidenceLevel} onValueChange={setConfidenceLevel} min={80} max={99} step={1} />
          </div>

          <Button onClick={runABTest} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Running Test...</> : "Run A/B Test"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {results.significant ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                Test Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={results.significant ? "default" : "secondary"}>
                  {results.significant ? "Significant" : "Not Significant"}
                </Badge>
                <span className="text-xs text-muted-foreground">p = {results.pValue.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2">
                {results.liftDirection === "up" ? <TrendingUp className="w-5 h-5 text-green-500" /> :
                 results.liftDirection === "down" ? <TrendingDown className="w-5 h-5 text-red-500" /> :
                 <Minus className="w-5 h-5 text-muted-foreground" />}
                <span className="text-2xl font-bold">{results.lift > 0 ? "+" : ""}{results.lift.toFixed(2)}%</span>
                <span className="text-xs text-muted-foreground">lift</span>
              </div>
              <p className="text-sm text-muted-foreground">{results.interpretation}</p>
              <div className="p-2 rounded-md bg-primary/5 border border-primary/10">
                <p className="text-xs font-medium text-primary">{results.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Group Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Group Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[results.controlGroup, results.treatmentGroup].map((g, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div>
                    <p className="text-xs font-medium">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground">n = {g.n}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{g.mean.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Ïƒ = {g.stdDev.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>CI ({results.confidenceLevel}%): [{results.confidenceInterval[0].toFixed(2)}, {results.confidenceInterval[1].toFixed(2)}]</p>
                <p>Power: {(results.powerAnalysis.achievedPower * 100).toFixed(0)}% | Recommended N: {results.powerAnalysis.recommendedN}/group</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Utility functions
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

export default ABTestingPanel;
