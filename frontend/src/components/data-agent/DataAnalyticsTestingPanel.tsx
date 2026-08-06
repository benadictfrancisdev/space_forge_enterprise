import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TestTubes, CheckCircle2, XCircle, BarChart3, TrendingUp } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface TestResult {
  testName: string;
  category: string;
  column: string;
  statistic: number;
  pValue: number;
  passed: boolean;
  interpretation: string;
  details: Record<string, unknown>;
}

const DataAnalyticsTestingPanel = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [mode, setMode] = useState<"single" | "all">("all");

  const numericColumns = useMemo(() => columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[]) => { const m = mean(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)); };

  const normalCDF = (x: number) => {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911; const sign = x < 0 ? -1 : 1; x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  };

  const runTests = async (col: string): Promise<TestResult[]> => {
    const values = data.map(r => Number(r[col])).filter(n => !isNaN(n));
    if (values.length < 10) return [];
    const n = values.length;
    const m = mean(values), s = std(values);
    const results: TestResult[] = [];

    // 1. Normality Test (Jarque-Bera)
    const skewness = values.reduce((a, v) => a + ((v - m) / s) ** 3, 0) / n;
    const kurtosis = values.reduce((a, v) => a + ((v - m) / s) ** 4, 0) / n - 3;
    const jb = (n / 6) * (skewness ** 2 + (kurtosis ** 2) / 4);
    const jbPValue = Math.max(0.0001, 1 - normalCDF(Math.sqrt(jb)));
    results.push({
      testName: "Jarque-Bera Normality",
      category: "Distribution",
      column: col,
      statistic: jb,
      pValue: jbPValue,
      passed: jbPValue > 0.05,
      interpretation: jbPValue > 0.05 ? "Data appears normally distributed" : "Data is NOT normally distributed",
      details: { skewness: +skewness.toFixed(4), kurtosis: +kurtosis.toFixed(4), n }
    });

    // 2. Stationarity Test (simplified ADF-like check via autocorrelation)
    const lag1Corr = (() => {
      const v1 = values.slice(0, -1), v2 = values.slice(1);
      const m1 = mean(v1), m2 = mean(v2);
      const num = v1.reduce((a, v, i) => a + (v - m1) * (v2[i] - m2), 0);
      const d1 = Math.sqrt(v1.reduce((a, v) => a + (v - m1) ** 2, 0));
      const d2 = Math.sqrt(v2.reduce((a, v) => a + (v - m2) ** 2, 0));
      return d1 * d2 > 0 ? num / (d1 * d2) : 0;
    })();
    const adfStat = Math.sqrt(n) * (1 - lag1Corr);
    const stationaryPValue = lag1Corr > 0.9 ? 0.01 : lag1Corr > 0.7 ? 0.1 : 0.5;
    results.push({
      testName: "Stationarity Check",
      category: "Time Series",
      column: col,
      statistic: lag1Corr,
      pValue: stationaryPValue,
      passed: lag1Corr < 0.85,
      interpretation: lag1Corr < 0.85 ? "Data appears stationary" : "Data shows non-stationary trend (lag-1 autocorrelation is high)",
      details: { lag1Autocorrelation: +lag1Corr.toFixed(4) }
    });

    // 3. Outlier Test (IQR method)
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)], q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const outlierCount = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
    const outlierPct = (outlierCount / n) * 100;
    results.push({
      testName: "IQR Outlier Detection",
      category: "Quality",
      column: col,
      statistic: outlierCount,
      pValue: outlierPct / 100,
      passed: outlierPct < 5,
      interpretation: outlierPct < 5 ? `${outlierCount} outliers (${outlierPct.toFixed(1)}%) â€” within normal range` : `${outlierCount} outliers (${outlierPct.toFixed(1)}%) â€” HIGH outlier rate`,
      details: { q1, q3, iqr: +iqr.toFixed(2), outlierCount, outlierPct: +outlierPct.toFixed(1) }
    });

    // 4. Completeness Test
    const nullCount = data.filter(r => r[col] === null || r[col] === undefined || r[col] === "").length;
    const completeness = ((n) / data.length) * 100;
    results.push({
      testName: "Data Completeness",
      category: "Quality",
      column: col,
      statistic: completeness,
      pValue: nullCount / data.length,
      passed: completeness >= 95,
      interpretation: completeness >= 95 ? `${completeness.toFixed(1)}% complete â€” excellent` : `${completeness.toFixed(1)}% complete â€” ${nullCount} missing values`,
      details: { totalRows: data.length, validValues: n, nullCount, completeness: +completeness.toFixed(1) }
    });

    // 5. Variance Stability (coefficient of variation)
    const cv = s / Math.abs(m || 0.0001) * 100;
    results.push({
      testName: "Variance Stability (CV)",
      category: "Distribution",
      column: col,
      statistic: cv,
      pValue: cv > 100 ? 0.01 : cv > 50 ? 0.05 : 0.5,
      passed: cv < 100,
      interpretation: cv < 30 ? "Low variance â€” stable metric" : cv < 100 ? "Moderate variance" : "High variance â€” metric is unstable",
      details: { mean: +m.toFixed(2), stdDev: +s.toFixed(2), cv: +cv.toFixed(1) }
    });

    return results;
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const cols = mode === "single" ? [selectedColumn] : numericColumns.slice(0, 10);
      if (cols.length === 0 || (mode === "single" && !selectedColumn)) {
        toast.error("Select a column"); setLoading(false); return;
      }

      const allResults: TestResult[] = [];
      for (const col of cols) {
        allResults.push(...await runTests(col));
      }

      // Get AI summary
      try {
        const summary = allResults.slice(0, 15).map(r => `${r.column}/${r.testName}: ${r.passed ? "PASS" : "FAIL"} (p=${r.pValue.toFixed(3)})`);
        const { data: aiData } = await backend.functions.invoke("data-agent", {
          body: {
            action: "explain",
            analysisType: "data_quality_summary",
            datasetName,
            analysisResults: summary,
            dataContext: `Summarize these data quality test results in 2 sentences:\n${summary.join("\n")}`,
          }
        });
        const aiSummary = aiData?.explanation || aiData?.raw_response || null;
        if (aiSummary) {
          allResults.unshift({
            testName: "AI Summary",
            category: "Summary",
            column: "All",
            statistic: 0,
            pValue: 0,
            passed: true,
            interpretation: typeof aiSummary === 'string' ? aiSummary : JSON.stringify(aiSummary),
            details: {}
          });
        }
      } catch {}

      setResults(allResults);
      toast.success(`Ran ${allResults.length} tests`);
    } catch (e: any) {
      toast.error(e.message || "Tests failed");
    } finally {
      setLoading(false);
    }
  };

  const passCount = results.filter(r => r.passed && r.category !== "Summary").length;
  const failCount = results.filter(r => !r.passed && r.category !== "Summary").length;
  const categories = [...new Set(results.map(r => r.category))];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TestTubes className="w-4 h-4 text-primary" />
            Data Analytics Testing Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Mode</Label>
              <Select value={mode} onValueChange={(v: "single" | "all") => setMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Test All Numeric</SelectItem>
                  <SelectItem value="single">Single Column</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "single" && (
              <div className="space-y-2">
                <Label className="text-xs">Column</Label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={handleRun} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Running Tests...</> : `Run ${mode === "all" ? "All" : "Column"} Tests`}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          {/* Score Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{passCount}</p>
              <p className="text-[10px] text-muted-foreground">Passed</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{failCount}</p>
              <p className="text-[10px] text-muted-foreground">Failed</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{passCount + failCount > 0 ? ((passCount / (passCount + failCount)) * 100).toFixed(0) : 0}%</p>
              <p className="text-[10px] text-muted-foreground">Health Score</p>
            </Card>
          </div>

          {/* Results by Category */}
          {categories.map(cat => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{cat}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.filter(r => r.category === cat).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                    {r.category === "Summary" ? (
                      <BarChart3 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    ) : r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{r.testName}</span>
                        {r.column !== "All" && <Badge variant="outline" className="text-[10px]">{r.column}</Badge>}
                        {r.pValue > 0 && r.category !== "Summary" && (
                          <span className="text-[10px] text-muted-foreground">p={r.pValue.toFixed(3)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.interpretation}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default DataAnalyticsTestingPanel;
