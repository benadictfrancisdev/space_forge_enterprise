import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Settings2, Play, Loader2, Trophy, TrendingUp, Zap, BarChart3,
  CheckCircle2, XCircle, Grid3X3, Sparkles, Download, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { mlAPI } from "@/services/api";
import { backend } from "@/platform";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";

interface HyperparameterTuningProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface ParamRange {
  name: string;
  type: "int" | "float" | "choice";
  values: string; // comma-separated or "min-max"
  enabled: boolean;
}

interface GridSearchResult {
  rank: number;
  params: Record<string, unknown>;
  metrics: Record<string, number>;
  training_time_ms: number;
}

interface TuningResult {
  algorithm: string;
  target_column: string;
  model_type: string;
  best_params: Record<string, unknown>;
  best_score: number;
  scoring_metric: string;
  grid_results: GridSearchResult[];
  total_combinations: number;
  improvement_over_default: number;
  convergence_analysis: string;
  recommendations: string[];
}

const ALGORITHM_PARAMS: Record<string, ParamRange[]> = {
  "Random Forest": [
    { name: "n_estimators", type: "choice", values: "50, 100, 200, 500", enabled: true },
    { name: "max_depth", type: "choice", values: "5, 10, 20, None", enabled: true },
    { name: "min_samples_split", type: "choice", values: "2, 5, 10", enabled: true },
    { name: "min_samples_leaf", type: "choice", values: "1, 2, 4", enabled: false },
    { name: "max_features", type: "choice", values: "sqrt, log2, 0.5", enabled: false },
  ],
  "Gradient Boosting": [
    { name: "n_estimators", type: "choice", values: "50, 100, 200", enabled: true },
    { name: "learning_rate", type: "choice", values: "0.01, 0.05, 0.1, 0.2", enabled: true },
    { name: "max_depth", type: "choice", values: "3, 5, 7, 10", enabled: true },
    { name: "subsample", type: "choice", values: "0.7, 0.8, 0.9, 1.0", enabled: false },
    { name: "min_samples_split", type: "choice", values: "2, 5, 10", enabled: false },
  ],
  "SVM": [
    { name: "C", type: "choice", values: "0.1, 1.0, 10.0, 100.0", enabled: true },
    { name: "kernel", type: "choice", values: "rbf, linear, poly", enabled: true },
    { name: "gamma", type: "choice", values: "scale, auto, 0.01, 0.1", enabled: true },
    { name: "degree", type: "choice", values: "2, 3, 4", enabled: false },
  ],
  "Logistic/Linear Regression": [
    { name: "C", type: "choice", values: "0.01, 0.1, 1.0, 10.0", enabled: true },
    { name: "penalty", type: "choice", values: "l1, l2, elasticnet", enabled: true },
    { name: "solver", type: "choice", values: "lbfgs, saga, liblinear", enabled: false },
    { name: "max_iter", type: "choice", values: "100, 500, 1000", enabled: false },
  ],
};

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const HyperparameterTuning = ({
  data, columns, numericColumns, categoricalColumns, columnTypes, datasetName
}: HyperparameterTuningProps) => {
  const [targetColumn, setTargetColumn] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState("Random Forest");
  const [paramRanges, setParamRanges] = useState<ParamRange[]>(ALGORITHM_PARAMS["Random Forest"]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<TuningResult | null>(null);

  const allColumns = useMemo(() => [...numericColumns, ...categoricalColumns], [numericColumns, categoricalColumns]);

  const handleAlgorithmChange = (algo: string) => {
    setAlgorithm(algo);
    setParamRanges(ALGORITHM_PARAMS[algo] || []);
  };

  const toggleParam = (index: number) => {
    setParamRanges(prev => prev.map((p, i) => i === index ? { ...p, enabled: !p.enabled } : p));
  };

  const updateParamValues = (index: number, values: string) => {
    setParamRanges(prev => prev.map((p, i) => i === index ? { ...p, values } : p));
  };

  const toggleFeature = (col: string) => {
    setSelectedFeatures(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const selectAllFeatures = () => {
    const available = allColumns.filter(c => c !== targetColumn);
    setSelectedFeatures(prev => prev.length === available.length ? [] : available);
  };

  const totalCombinations = useMemo(() => {
    const enabled = paramRanges.filter(p => p.enabled);
    if (enabled.length === 0) return 0;
    return enabled.reduce((acc, p) => acc * p.values.split(",").filter(v => v.trim()).length, 1);
  }, [paramRanges]);

  const handleRunSearch = async () => {
    if (!targetColumn) { toast.error("Select a target column"); return; }
    const features = selectedFeatures.length > 0 ? selectedFeatures : allColumns.filter(c => c !== targetColumn);
    const enabledParams = paramRanges.filter(p => p.enabled);
    if (enabledParams.length === 0) { toast.error("Enable at least one hyperparameter"); return; }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    const steps = ["Preparing data", "Building parameter grid", "Training models", "Cross-validating", "Ranking results"];
    for (let i = 0; i < steps.length; i++) {
      setProgressLabel(steps[i]);
      setProgress(((i + 1) / steps.length) * 90);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const paramGrid: Record<string, string[]> = {};
      enabledParams.forEach(p => {
        paramGrid[p.name] = p.values.split(",").map(v => v.trim());
      });

      const { data: response, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "hyperparameter_tuning",
          data: data.slice(0, 200),
          columns: features,
          targetColumn,
          featureColumns: features,
          algorithm,
          paramGrid,
          datasetName,
        },
      });

      if (error) throw error;
      if (response?.error) throw new Error(typeof response.error === "string" ? response.error : "AI service error");
      if (response?.error) throw new Error(response.error);

      setResult(response as TuningResult);
      setProgress(100);
      setProgressLabel("Complete!");
      toast.success("Grid search completed!");
    } catch (err) {
      console.error(err);
      toast.error("Grid search failed");
    } finally {
      setIsRunning(false);
    }
  };

  const exportResults = () => {
    if (!result) return;
    const csvRows = ["Rank,Score," + Object.keys(result.grid_results[0]?.params || {}).join(",")];
    result.grid_results.forEach(r => {
      csvRows.push(`${r.rank},${Object.values(r.metrics)[0]?.toFixed(4) || ""},${Object.values(r.params).join(",")}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hyperparameter_tuning_${datasetName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <Settings2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Hyperparameter Tuning
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                  <Grid3X3 className="h-3 w-3 mr-1" />Grid Search
                </Badge>
              </CardTitle>
              <CardDescription>Configure parameter ranges and find optimal model settings</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Target & Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
                <SelectContent>
                  {allColumns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Features ({selectedFeatures.length})</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllFeatures}>
                  {selectedFeatures.length === allColumns.filter(c => c !== targetColumn).length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <ScrollArea className="h-40 border rounded-md p-2">
                {allColumns.filter(c => c !== targetColumn).map(col => (
                  <div key={col} className="flex items-center gap-2 py-1">
                    <Checkbox checked={selectedFeatures.includes(col)} onCheckedChange={() => toggleFeature(col)} id={`feat-${col}`} />
                    <label htmlFor={`feat-${col}`} className="text-sm cursor-pointer flex-1">{col}</label>
                    <Badge variant="outline" className="text-[10px]">{columnTypes[col]}</Badge>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Middle: Algorithm */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Algorithm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={algorithm} onValueChange={handleAlgorithmChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ALGORITHM_PARAMS).map(algo => (
                  <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Separator />
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Parameter Ranges</Label>
              {paramRanges.map((param, idx) => (
                <div key={param.name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={param.enabled} onCheckedChange={() => toggleParam(idx)} id={`param-${idx}`} />
                    <label htmlFor={`param-${idx}`} className="text-sm font-medium cursor-pointer">{param.name}</label>
                  </div>
                  {param.enabled && (
                    <Input
                      value={param.values}
                      onChange={(e) => updateParamValues(idx, e.target.value)}
                      placeholder="Values (comma-separated)"
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Run */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Grid Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Combinations</span>
                <span className="font-bold text-lg">{totalCombinations}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Enabled Params</span>
                <span className="font-medium">{paramRanges.filter(p => p.enabled).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Algorithm</span>
                <span className="font-medium">{algorithm}</span>
              </div>
            </div>

            {isRunning && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progressLabel}</p>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={handleRunSearch}
              disabled={isRunning || !targetColumn || totalCombinations === 0}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Running..." : "Run Grid Search"}
            </Button>

            {result && (
              <Button variant="outline" className="w-full gap-2" onClick={exportResults}>
                <Download className="h-4 w-4" />Export Results
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Best Model Card */}
          <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Trophy className="h-8 w-8 text-amber-500" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold text-lg">Best Configuration Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.scoring_metric}: <span className="font-bold text-foreground">{(result.best_score * 100).toFixed(2)}%</span>
                    {result.improvement_over_default > 0 && (
                      <Badge className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
                        <TrendingUp className="h-3 w-3 mr-1" />+{result.improvement_over_default.toFixed(1)}% vs default
                      </Badge>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(result.best_params).map(([key, val]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: <span className="font-bold ml-1">{String(val)}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid Results Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance by Configuration (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={result.grid_results.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                    <YAxis type="category" dataKey="rank" width={40} tickFormatter={v => `#${v}`} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const d = payload[0].payload as GridSearchResult;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-semibold">Rank #{d.rank}</p>
                            <p className="text-muted-foreground">Score: {(Object.values(d.metrics)[0] * 100).toFixed(2)}%</p>
                            {Object.entries(d.params).map(([k, v]) => (
                              <p key={k} className="text-xs">{k}: {String(v)}</p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey={d => Object.values(d.metrics)[0] || 0} radius={[0, 4, 4, 0]}>
                      {result.grid_results.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "hsl(var(--primary))" : `hsl(var(--muted-foreground) / ${0.6 - i * 0.04})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">All Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1 font-medium">Rank</th>
                        <th className="text-left py-2 px-1 font-medium">Score</th>
                        <th className="text-left py-2 px-1 font-medium">Parameters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.grid_results.map((r) => (
                        <tr key={r.rank} className={`border-b ${r.rank === 1 ? "bg-amber-500/5" : ""}`}>
                          <td className="py-2 px-1">
                            {r.rank === 1 ? <Trophy className="h-4 w-4 text-amber-500 inline" /> : `#${r.rank}`}
                          </td>
                          <td className="py-2 px-1 font-mono">{(Object.values(r.metrics)[0] * 100).toFixed(2)}%</td>
                          <td className="py-2 px-1">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(r.params).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[10px] py-0">{k}={String(v)}</Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Convergence & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />Convergence Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.convergence_analysis}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default HyperparameterTuning;
