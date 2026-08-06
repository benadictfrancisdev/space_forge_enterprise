import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, Play, Loader2, CheckCircle2, BarChart3, Sparkles,
  Lightbulb, TrendingUp, Brain, Cpu, Settings2, Layers,
  CheckCircle, XCircle, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { backend } from "@/platform";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter
} from "recharts";

interface PredictionPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface TrainingProgress {
  stage: string;
  progress: number;
  message: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

const PIPELINE_STAGES = [
  { key: "prep", label: "Data Prep", icon: Settings2 },
  { key: "engineer", label: "Feature Eng.", icon: Layers },
  { key: "train", label: "Training", icon: Brain },
  { key: "eval", label: "Evaluation", icon: Target },
  { key: "explain", label: "Interpretation", icon: Lightbulb },
];

const PredictionPanel = ({
  data, columns, numericColumns, categoricalColumns, columnTypes, datasetName, onModelTrained
}: PredictionPanelProps) => {
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [algorithm, setAlgorithm] = useState("auto");
  const [splitRatio, setSplitRatio] = useState("80/20");
  const [isTraining, setIsTraining] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [result, setResult] = useState<{
    type: "classification" | "regression";
    algorithmUsed: string;
    algorithmRationale: string;
    accuracy?: number;
    rSquared?: number;
    metrics: Record<string, number | null>;
    featureImportance: { feature: string; importance: number; direction?: string; explanation?: string }[];
    confusionMatrix?: { labels: string[]; matrix: number[][] };
    predictions?: { actual: unknown; predicted: unknown; correct?: boolean }[];
    interpretation: string;
    recommendations: string[];
    preprocessing: { missing_values_handled: number; features_encoded: string[]; features_scaled: string[]; transformations_applied: string[] };
    trainingSamples: number;
    testSamples: number;
  } | null>(null);

  const targetType = useMemo(() => {
    if (!targetColumn) return null;
    if (columnTypes[targetColumn] === "categorical") return "classification";
    const uniqueValues = new Set(data.map(row => row[targetColumn]));
    if (uniqueValues.size <= 10) return "classification";
    return "regression";
  }, [targetColumn, columnTypes, data]);

  // Auto-select features when target changes
  useMemo(() => {
    if (targetColumn) {
      setSelectedFeatures(new Set(columns.filter(c => c !== targetColumn)));
    }
  }, [targetColumn, columns]);

  const missingStats = useMemo(() => {
    if (!targetColumn) return { total: 0, byColumn: {} as Record<string, number> };
    let total = 0;
    const byColumn: Record<string, number> = {};
    columns.forEach(col => {
      const missing = data.filter(r => r[col] === null || r[col] === undefined || r[col] === "").length;
      byColumn[col] = missing;
      total += missing;
    });
    return { total, byColumn };
  }, [data, columns, targetColumn]);

  const toggleFeature = (col: string) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  };

  const trainModel = useCallback(async () => {
    if (!targetColumn || !targetType) { toast.error("Select a target column"); return; }
    if (selectedFeatures.size === 0) { toast.error("Select at least one feature"); return; }

    setIsTraining(true);
    const features = Array.from(selectedFeatures);

    try {
      // Stage 0: Data Prep
      setCurrentStage(0);
      setProgress({ stage: "Data Preparation", progress: 10, message: "Analyzing data quality, handling missing values..." });
      await new Promise(r => setTimeout(r, 400));

      // Stage 1: Feature Engineering
      setCurrentStage(1);
      setProgress({ stage: "Feature Engineering", progress: 25, message: "Encoding categoricals, scaling numerics..." });
      await new Promise(r => setTimeout(r, 400));

      // Stage 2: Training
      setCurrentStage(2);
      setProgress({ stage: "Model Training", progress: 45, message: `Training ${algorithm === "auto" ? "best algorithm" : algorithm} with ${splitRatio} split...` });

      const { data: responseData, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'prediction',
          data: data.slice(0, 1000),
          columns,
          targetColumn,
          featureColumns: features,
          algorithm,
          datasetName
        }
      });

      if (error || !responseData?.success) throw new Error(error?.message || responseData?.error || "Training failed");
      const mlResult = responseData;

      // Stage 3: Evaluation
      setCurrentStage(3);
      setProgress({ stage: "Evaluation", progress: 75, message: "Computing metrics, cross-validation..." });
      await new Promise(r => setTimeout(r, 300));

      // Stage 4: Interpretation
      setCurrentStage(4);
      setProgress({ stage: "Model Interpretation", progress: 90, message: "Generating AI explanation..." });

      let interpretation = mlResult.model_interpretation || "";
      if (!interpretation) {
        try {
          const { data: explainData } = await backend.functions.invoke('data-agent', {
            body: {
              action: 'explain',
              analysisType: 'prediction_model',
              analysisResults: { model_type: mlResult.model_type, target: targetColumn, metrics: mlResult.metrics, top_features: (mlResult.feature_importance || []).slice(0, 3) },
              dataContext: `Dataset: ${datasetName}, ${data.length} rows`
            }
          });
          if (explainData?.success && explainData.explanation) interpretation = explainData.explanation;
        } catch { /* fallback below */ }
      }

      setProgress({ stage: "Complete", progress: 100, message: "Model trained!" });

      const modelResult = {
        type: mlResult.model_type as "classification" | "regression",
        algorithmUsed: mlResult.algorithm_used || "Random Forest",
        algorithmRationale: mlResult.algorithm_rationale || "",
        accuracy: mlResult.model_type === "classification" ? mlResult.metrics?.accuracy : undefined,
        rSquared: mlResult.model_type === "regression" ? mlResult.metrics?.r2_score : undefined,
        metrics: mlResult.metrics || {},
        featureImportance: mlResult.feature_importance || [],
        confusionMatrix: mlResult.confusion_matrix,
        predictions: mlResult.sample_predictions || [],
        interpretation: interpretation || "Model trained successfully.",
        recommendations: mlResult.recommendations || [],
        preprocessing: mlResult.preprocessing || { missing_values_handled: 0, features_encoded: [], features_scaled: [], transformations_applied: [] },
        trainingSamples: mlResult.training_samples || Math.floor(data.length * 0.8),
        testSamples: mlResult.test_samples || Math.floor(data.length * 0.2),
      };

      setResult(modelResult);

      const model: MLModel = {
        id: `pred-${Date.now()}`,
        name: `${modelResult.algorithmUsed} ${modelResult.type === "classification" ? "Classifier" : "Regressor"}`,
        type: modelResult.type,
        accuracy: modelResult.accuracy,
        rSquared: modelResult.rSquared,
        featureImportance: modelResult.featureImportance,
        trainedAt: new Date(),
        status: "ready",
        explanation: interpretation
      };
      onModelTrained(model);
      toast.success(`${modelResult.algorithmUsed} trained successfully!`);
    } catch (error) {
      console.error("Training error:", error);
      toast.error(error instanceof Error ? error.message : "Training failed");
      setProgress(null);
    } finally {
      setIsTraining(false);
      setCurrentStage(-1);
    }
  }, [targetColumn, targetType, selectedFeatures, algorithm, splitRatio, data, datasetName, onModelTrained]);

  const displayMetrics = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.metrics)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([key, value]) => ({ key, value: value as number }));
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            ML Prediction Pipeline
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/30">
              <Cpu className="h-3 w-3 mr-1" />
              AI-Powered ML
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure features, algorithm, and train a predictive model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target & Algorithm */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger><SelectValue placeholder="What to predict" /></SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>
                      <span className="flex items-center gap-2">{col} <Badge variant="outline" className="text-xs">{columnTypes[col]}</Badge></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Best Fit)</SelectItem>
                  <SelectItem value="Random Forest">Random Forest</SelectItem>
                  <SelectItem value="Gradient Boosting">Gradient Boosting</SelectItem>
                  <SelectItem value="Logistic Regression">Logistic / Linear Regression</SelectItem>
                  <SelectItem value="SVM">Support Vector Machine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Train/Test Split</Label>
              <Select value={splitRatio} onValueChange={setSplitRatio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="70/30">70 / 30</SelectItem>
                  <SelectItem value="80/20">80 / 20</SelectItem>
                  <SelectItem value="90/10">90 / 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detected type */}
          {targetColumn && targetType && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Badge className={targetType === "classification" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}>
                {targetType === "classification" ? "Classification" : "Regression"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {targetType === "classification" ? "Predicts categories" : "Predicts continuous values"} â€¢ {data.length} samples â€¢ {missingStats.total} missing values
              </span>
            </div>
          )}

          {/* Feature Selection */}
          {targetColumn && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Feature Selection ({selectedFeatures.size} selected)</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeatures(new Set(columns.filter(c => c !== targetColumn)))}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeatures(new Set(numericColumns.filter(c => c !== targetColumn)))}>Numeric Only</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeatures(new Set())}>None</Button>
                </div>
              </div>
              <ScrollArea className="h-32 border rounded-lg p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {columns.filter(c => c !== targetColumn).map(col => (
                    <label key={col} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                      <Checkbox
                        checked={selectedFeatures.has(col)}
                        onCheckedChange={() => toggleFeature(col)}
                      />
                      <span className="truncate">{col}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{columnTypes[col]}</Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Button onClick={trainModel} disabled={!targetColumn || isTraining || selectedFeatures.size === 0} className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent">
            {isTraining ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Training Pipeline Running...</>) : (<><Play className="h-4 w-4 mr-2" />Train Prediction Model</>)}
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline Progress */}
      {isTraining && progress && (
        <Card className="border-primary/30">
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center gap-2 justify-between">
              {PIPELINE_STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = i === currentStage;
                const isDone = i < currentStage;
                return (
                  <div key={stage.key} className="flex items-center gap-1">
                    <div className={`p-1.5 rounded-full ${isDone ? "bg-green-500/20 text-green-500" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"}`}>
                      {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs hidden sm:inline ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>{stage.label}</span>
                    {i < PIPELINE_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
                  </div>
                );
              })}
            </div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isTraining && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{result.algorithmUsed} â€” {result.type === "classification" ? "Classifier" : "Regressor"}</h3>
                    <p className="text-sm text-muted-foreground">{result.trainingSamples} train / {result.testSamples} test samples</p>
                    {result.algorithmRationale && <p className="text-xs text-muted-foreground mt-1 max-w-md">{result.algorithmRationale}</p>}
                  </div>
                </div>
                <div className="text-right">
                  {result.type === "classification" ? (
                    <>
                      <p className="text-3xl font-bold text-green-500">{((result.accuracy || 0) * 100).toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-green-500">{(result.rSquared || 0).toFixed(3)}</p>
                      <p className="text-sm text-muted-foreground">RÂ² Score</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Results */}
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="w-full justify-start bg-card/80 p-1 h-auto flex-wrap">
              <TabsTrigger value="metrics" className="gap-1.5"><Target className="h-3.5 w-3.5" />Metrics</TabsTrigger>
              <TabsTrigger value="features" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Features</TabsTrigger>
              {result.confusionMatrix && <TabsTrigger value="confusion" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Confusion Matrix</TabsTrigger>}
              <TabsTrigger value="predictions" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Predictions</TabsTrigger>
              <TabsTrigger value="interpretation" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Interpretation</TabsTrigger>
            </TabsList>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-4">
              <div className="space-y-4">
                {/* Preprocessing summary */}
                {result.preprocessing && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" />Preprocessing Applied</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Missing handled:</span> <span className="font-medium">{result.preprocessing.missing_values_handled}</span></div>
                        <div><span className="text-muted-foreground">Encoded:</span> <span className="font-medium">{result.preprocessing.features_encoded?.length || 0} cols</span></div>
                        <div><span className="text-muted-foreground">Scaled:</span> <span className="font-medium">{result.preprocessing.features_scaled?.length || 0} cols</span></div>
                        <div><span className="text-muted-foreground">Transforms:</span> <span className="font-medium">{result.preprocessing.transformations_applied?.length || 0}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {displayMetrics.map(({ key, value }) => (
                    <Card key={key} className="bg-card/50">
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xl font-bold mt-1">
                          {key.includes('accuracy') || key.includes('precision') || key.includes('recall') || key.includes('f1') || key.includes('r2')
                            ? `${(value * 100).toFixed(1)}%` : value.toFixed(4)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Feature Importance Tab */}
            <TabsContent value="features" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Feature Importance (SHAP-style)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.featureImportance.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <YAxis type="category" dataKey="feature" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Importance"]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                          {result.featureImportance.slice(0, 10).map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Feature explanations */}
                  <div className="mt-4 space-y-2">
                    {result.featureImportance.slice(0, 5).filter(f => f.explanation).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                        <Badge variant="outline" className="shrink-0 mt-0.5">{f.feature}</Badge>
                        <span className="text-muted-foreground">{f.explanation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Confusion Matrix Tab */}
            {result.confusionMatrix && (
              <TabsContent value="confusion" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Confusion Matrix</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-auto mx-auto border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 text-xs text-muted-foreground"></th>
                            {result.confusionMatrix.labels.map(l => (
                              <th key={l} className="p-2 text-xs font-medium text-center min-w-[60px]">Pred: {l}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.confusionMatrix.matrix.map((row, i) => (
                            <tr key={i}>
                              <td className="p-2 text-xs font-medium">Actual: {result.confusionMatrix!.labels[i]}</td>
                              {row.map((val, j) => {
                                const isDiagonal = i === j;
                                return (
                                  <td key={j} className={`p-3 text-center font-bold rounded ${isDiagonal ? "bg-green-500/20 text-green-600" : val > 0 ? "bg-red-500/10 text-red-500" : "bg-muted/30 text-muted-foreground"}`}>
                                    {val}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample Predictions</CardTitle>
                  <CardDescription>Actual vs Predicted values from test set</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(result.predictions || []).slice(0, 20).map((p, i) => {
                        const isCorrect = p.correct !== undefined ? p.correct : String(p.actual) === String(p.predicted);
                        return (
                          <div key={i} className={`flex items-center justify-between p-2 rounded border text-sm ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                            <span className="text-muted-foreground">Actual: <span className="font-medium text-foreground">{String(p.actual)}</span></span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Pred: <span className="font-medium text-foreground">{String(p.predicted)}</span></span>
                            {isCorrect ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interpretation Tab */}
            <TabsContent value="interpretation" className="mt-4 space-y-4">
              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    AI Model Interpretation
                    <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{result.interpretation}</p>
                </CardContent>
              </Card>
              {result.recommendations.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Actionable Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span className="text-muted-foreground">{rec}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;
