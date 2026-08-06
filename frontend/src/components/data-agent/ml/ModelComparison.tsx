import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3, Target, GitBranch, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Trophy, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import type { MLModel } from "./MLWorkbench";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend
} from "recharts";

interface ModelComparisonProps {
  models: MLModel[];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const ModelComparison = ({ models }: ModelComparisonProps) => {
  const getTypeIcon = (type: MLModel["type"]) => {
    switch (type) {
      case "classification": return <Target className="h-4 w-4" />;
      case "regression": return <TrendingUp className="h-4 w-4" />;
      case "clustering": return <GitBranch className="h-4 w-4" />;
      case "anomaly": return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: MLModel["type"]) => {
    switch (type) {
      case "classification": return "bg-blue-500/10 text-blue-500";
      case "regression": return "bg-green-500/10 text-green-500";
      case "clustering": return "bg-purple-500/10 text-purple-500";
      case "anomaly": return "bg-orange-500/10 text-orange-500";
    }
  };

  const getScore = (model: MLModel) => {
    if (model.accuracy) return model.accuracy * 100;
    if (model.rSquared) return model.rSquared * 100;
    return null;
  };

  const bestModel = useMemo(() => {
    const scored = models.filter(m => getScore(m) !== null);
    if (scored.length === 0) return null;
    return scored.reduce((best, m) => (getScore(m)! > getScore(best)! ? m : best));
  }, [models]);

  const scoreData = models
    .filter(m => getScore(m) !== null)
    .map(m => ({
      name: m.name.length > 20 ? m.name.substring(0, 20) + "..." : m.name,
      score: getScore(m) || 0,
      type: m.type,
      id: m.id
    }));

  // Radar with real metrics only (no random values)
  const radarData = useMemo(() => {
    const predictiveModels = models.filter(m => m.type === "classification" || m.type === "regression").slice(0, 5);
    if (predictiveModels.length < 2) return [];

    const metrics = [
      { metric: "Score", getter: (m: MLModel) => (m.accuracy || m.rSquared || 0) * 100 },
      { metric: "Features", getter: (m: MLModel) => Math.min((m.featureImportance?.length || 0) * 10, 100) },
      { metric: "Top Feature Impact", getter: (m: MLModel) => (m.featureImportance?.[0]?.importance || 0) * 100 },
      { metric: "Feature Coverage", getter: (m: MLModel) => Math.min((m.featureImportance?.filter(f => f.importance > 0.05).length || 0) * 15, 100) },
    ];

    return metrics.map(({ metric, getter }) => ({
      metric,
      ...Object.fromEntries(predictiveModels.map((m, i) => [`model${i}`, getter(m)]))
    }));
  }, [models]);

  const predictiveModelsForRadar = models.filter(m => m.type === "classification" || m.type === "regression").slice(0, 5);

  if (models.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-full bg-muted inline-block"><BarChart3 className="h-10 w-10 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold">No Models to Compare</h3>
            <p className="text-muted-foreground">Train models in the Prediction, Clustering, or Anomaly tabs first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Model Banner */}
      {bestModel && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-500/20"><Trophy className="h-6 w-6 text-yellow-500" /></div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Best Model: {bestModel.name}
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Sparkles className="h-3 w-3 mr-1" />Top Performer</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Score: {getScore(bestModel)!.toFixed(1)}% • {bestModel.type} • {bestModel.featureImportance?.length || 0} features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground"><BarChart3 className="h-4 w-4" /><span className="text-sm">Total Models</span></div>
            <p className="text-2xl font-bold mt-1">{models.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Target className="h-4 w-4" /><span className="text-sm">Prediction</span></div>
            <p className="text-2xl font-bold mt-1">{models.filter(m => m.type === "classification" || m.type === "regression").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground"><GitBranch className="h-4 w-4" /><span className="text-sm">Clustering</span></div>
            <p className="text-2xl font-bold mt-1">{models.filter(m => m.type === "clustering").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground"><AlertTriangle className="h-4 w-4" /><span className="text-sm">Anomaly</span></div>
            <p className="text-2xl font-bold mt-1">{models.filter(m => m.type === "anomaly").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Chart */}
      {scoreData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Comparison</CardTitle>
            <CardDescription>Accuracy / R² scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {scoreData.map((entry, i) => (
                      <Cell key={i} fill={entry.id === bestModel?.id ? "#eab308" : COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar (only real metrics) */}
      {radarData.length > 0 && predictiveModelsForRadar.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Multi-dimensional Comparison</CardTitle>
            <CardDescription>Real metrics across predictive models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {predictiveModelsForRadar.map((model, i) => (
                    <Radar key={model.id} name={model.name} dataKey={`model${i}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.2} />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Trained Models</CardTitle>
          <CardDescription>Detailed view with interpretations</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Interpretation</TableHead>
                  <TableHead>Trained</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(model => (
                  <TableRow key={model.id}>
                    <TableCell>{model.id === bestModel?.id ? <Trophy className="h-4 w-4 text-yellow-500" /> : null}</TableCell>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(model.type)}>{getTypeIcon(model.type)}<span className="ml-1 capitalize">{model.type}</span></Badge>
                    </TableCell>
                    <TableCell>
                      {model.accuracy ? <span className="font-mono">{(model.accuracy * 100).toFixed(1)}% acc</span>
                        : model.rSquared ? <span className="font-mono">R² {model.rSquared.toFixed(3)}</span>
                        : model.clusters ? <span>{model.clusters} clusters</span>
                        : model.anomalyCount !== undefined ? <span>{model.anomalyCount} found</span>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{model.explanation || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(model.trainedAt, "HH:mm:ss")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={model.status === "ready" ? "default" : "secondary"} className="gap-1">
                        {model.status === "ready" ? <CheckCircle2 className="h-3 w-3" /> : null}{model.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelComparison;
