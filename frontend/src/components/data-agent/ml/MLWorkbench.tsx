import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Brain,
  Target,
  GitBranch,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
  TrendingUp,
  Sparkles,
  Download,
  RefreshCw,
  Info,
  Layers,
  Gauge,
  Puzzle,
  Lightbulb
} from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import PredictionPanel from "./PredictionPanel";
import ClusteringPanel from "./ClusteringPanel";
import AnomalyPanel from "./AnomalyPanel";
import ModelComparison from "./ModelComparison";
import HyperparameterTuning from "./HyperparameterTuning";

interface MLWorkbenchProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

export interface MLModel {
  id: string;
  name: string;
  type: "classification" | "regression" | "clustering" | "anomaly";
  accuracy?: number;
  rSquared?: number;
  featureImportance?: { feature: string; importance: number }[];
  clusters?: number;
  anomalyCount?: number;
  trainedAt: Date;
  status: "training" | "ready" | "failed";
  explanation?: string;
}

const MLWorkbench = ({ data, columns, columnTypes, datasetName }: MLWorkbenchProps) => {
  const [activeTab, setActiveTab] = useState("prediction");
  const [trainedModels, setTrainedModels] = useState<MLModel[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { exportToPdf } = usePdfExport();

  const numericColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "numeric"), 
    [columns, columnTypes]
  );

  const categoricalColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "categorical"), 
    [columns, columnTypes]
  );

  const handleModelTrained = useCallback((model: MLModel) => {
    setTrainedModels(prev => [...prev.filter(m => m.id !== model.id), model]);
    toast.success(`${model.name} trained successfully!`);
  }, []);

  const handleExportModels = async () => {
    if (trainedModels.length === 0) {
      toast.error("No models to export");
      return;
    }

    setIsExporting(true);
    try {
      exportToPdf({
        title: "ML Workbench Report",
        subtitle: `Machine Learning Models for ${datasetName}`,
        datasetName,
        statistics: {
          "Total Models": trainedModels.length,
          "Prediction Models": trainedModels.filter(m => m.type === "classification" || m.type === "regression").length,
          "Clustering Models": trainedModels.filter(m => m.type === "clustering").length,
          "Anomaly Models": trainedModels.filter(m => m.type === "anomaly").length,
          "Dataset Rows": data.length,
        },
        insights: trainedModels.map(m => ({
          title: m.name,
          description: m.explanation || `${m.type} model with ${m.accuracy ? `${(m.accuracy * 100).toFixed(1)}% accuracy` : m.rSquared ? `RÂ² = ${m.rSquared.toFixed(3)}` : 'trained'}`,
          importance: m.accuracy && m.accuracy > 0.8 ? "high" : "medium" as const
        })),
        sections: trainedModels.filter(m => m.featureImportance).map(m => ({
          title: `Feature Importance - ${m.name}`,
          type: "table" as const,
          content: "",
          tableData: {
            headers: ["Feature", "Importance"],
            rows: (m.featureImportance || []).slice(0, 10).map(f => [
              f.feature,
              `${(f.importance * 100).toFixed(1)}%`
            ])
          }
        })),
        recommendations: [
          "Use feature importance to focus on key variables",
          "Monitor model performance over time",
          "Consider ensemble methods for better accuracy"
        ]
      });
      toast.success("ML report exported!");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Validation for minimum data requirements
  const dataValidation = useMemo(() => {
    const minRows = 10;
    const hasEnoughRows = data.length >= minRows;
    const hasNumericColumns = numericColumns.length >= 1;
    const hasCategoricalColumns = categoricalColumns.length >= 1;
    
    return {
      isValid: hasEnoughRows && hasNumericColumns,
      hasEnoughRows,
      hasNumericColumns,
      hasCategoricalColumns,
      rowCount: data.length,
      numericCount: numericColumns.length,
      categoricalCount: categoricalColumns.length,
      minRows
    };
  }, [data.length, numericColumns.length, categoricalColumns.length]);

  if (!dataValidation.isValid) {
    return (
      <Card className="border-dashed border-2 border-destructive/30">
        <CardContent className="py-16 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-full bg-destructive/10 inline-block">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Insufficient Data for ML</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              {!dataValidation.hasEnoughRows && (
                <p className="flex items-center gap-2 justify-center">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Need at least {dataValidation.minRows} rows (have {dataValidation.rowCount})
                </p>
              )}
              {!dataValidation.hasNumericColumns && (
                <p className="flex items-center gap-2 justify-center">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Need at least 1 numeric column (have {dataValidation.numericCount})
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  ML Workbench
                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Train prediction, clustering, and anomaly detection models
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {trainedModels.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExportModels}
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export Report
                </Button>
              )}
              <Badge variant="outline" className="text-sm py-2 px-3">
                <Layers className="h-4 w-4 mr-2" />
                {trainedModels.length} Models
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Rows</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Numeric</span>
            </div>
            <p className="text-2xl font-bold mt-1">{numericColumns.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Puzzle className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Categorical</span>
            </div>
            <p className="text-2xl font-bold mt-1">{categoricalColumns.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Models</span>
            </div>
            <p className="text-2xl font-bold mt-1">{trainedModels.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ML Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-card/80 p-1 h-auto flex-wrap">
          <TabsTrigger value="prediction" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Prediction</span>
          </TabsTrigger>
          <TabsTrigger value="clustering" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Clustering</span>
          </TabsTrigger>
          <TabsTrigger value="anomaly" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Anomaly</span>
          </TabsTrigger>
          <TabsTrigger value="tuning" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Tuning</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={trainedModels.length === 0}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prediction" className="mt-6">
          <PredictionPanel
            data={data}
            columns={columns}
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            columnTypes={columnTypes}
            datasetName={datasetName}
            onModelTrained={handleModelTrained}
          />
        </TabsContent>

        <TabsContent value="clustering" className="mt-6">
          <ClusteringPanel
            data={data}
            columns={columns}
            numericColumns={numericColumns}
            columnTypes={columnTypes}
            datasetName={datasetName}
            onModelTrained={handleModelTrained}
          />
        </TabsContent>

        <TabsContent value="anomaly" className="mt-6">
          <AnomalyPanel
            data={data}
            columns={columns}
            numericColumns={numericColumns}
            columnTypes={columnTypes}
            datasetName={datasetName}
            onModelTrained={handleModelTrained}
          />
        </TabsContent>

        <TabsContent value="tuning" className="mt-6">
          <HyperparameterTuning
            data={data}
            columns={columns}
            numericColumns={numericColumns}
            categoricalColumns={categoricalColumns}
            columnTypes={columnTypes}
            datasetName={datasetName}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <ModelComparison models={trainedModels} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLWorkbench;
