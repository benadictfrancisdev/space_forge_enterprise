import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch, Play, Loader2, CheckCircle2, Sparkles, Users,
  Lightbulb, Target, Brain, Cpu, TrendingUp, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { backend } from "@/platform";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

interface ClusteringPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

const CLUSTER_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

const ClusteringPanel = ({ data, columns, numericColumns, columnTypes, datasetName, onModelTrained }: ClusteringPanelProps) => {
  const [algorithm, setAlgorithm] = useState<string>("kmeans");
  const [autoDetectK, setAutoDetectK] = useState(true);
  const [numClusters, setNumClusters] = useState(3);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set(numericColumns));
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [result, setResult] = useState<{
    clusters: Array<{ id: number; label: string; count: number; percentage: number; description: string; profile: Record<string, number>; recommendation?: string }>;
    scatterData: { x: number; y: number; cluster: number }[];
    xAxis: string;
    yAxis: string;
    silhouetteScore: number;
    calinskiScore: number;
    daviesBouldinScore?: number;
    elbowData?: Array<{ k: number; inertia: number; silhouette: number }>;
    optimalKReasoning: string;
    summary: string;
    algorithmUsed: string;
    recommendations: string[];
  } | null>(null);

  // Sync selected features with numeric columns
  useMemo(() => { setSelectedFeatures(new Set(numericColumns)); }, [numericColumns]);

  const toggleFeature = (col: string) => {
    setSelectedFeatures(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; });
  };

  const runClustering = useCallback(async () => {
    const features = Array.from(selectedFeatures);
    if (features.length < 2) { toast.error("Select at least 2 features"); return; }

    setIsTraining(true);
    setProgress({ stage: "Uploading", progress: 15, message: "Sending data for clustering..." });

    try {
      setProgress({ stage: "Clustering", progress: 40, message: `Running ${algorithm} clustering...` });

      const { data: responseData, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'clustering',
          data: data.slice(0, 1000),
          columns: features,
          featureColumns: features,
          query: `Find optimal clusters using ${algorithm}`,
          algorithm,
          datasetName,
          ...(autoDetectK ? {} : { numClusters })
        }
      });
      if (error || !responseData?.success) throw new Error(error?.message || responseData?.error || "Clustering failed");

      const r = responseData;
      setProgress({ stage: "Analyzing", progress: 80, message: "Analyzing cluster profiles..." });

      let summary = r.summary || "";
      // Get additional AI explanation if summary is short
      if (summary.length < 50) {
        try {
          setProgress({ stage: "AI Analysis", progress: 90, message: "AI interpreting segments..." });
          const { data: explainData } = await backend.functions.invoke('data-agent', {
            body: {
              action: 'explain',
              analysisType: 'clustering',
              analysisResults: { n_clusters: r.n_clusters, metrics: r.metrics, cluster_stats: r.cluster_stats },
              dataContext: `Dataset: ${datasetName}, ${data.length} rows`
            }
          });
          if (explainData?.success && explainData.explanation) summary = explainData.explanation;
        } catch { /* use existing summary */ }
      }

      setProgress({ stage: "Complete", progress: 100, message: "Clustering complete!" });

      setResult({
        clusters: (r.cluster_stats || []).map((s: any) => ({
          id: s.cluster_id, label: s.label || s.description || `Cluster ${s.cluster_id + 1}`,
          count: s.size, percentage: s.percentage, description: s.description || "",
          profile: s.profile || s.key_features || {}, recommendation: ""
        })),
        scatterData: r.scatter_data || [],
        xAxis: r.x_axis || features[0],
        yAxis: r.y_axis || features[1],
        silhouetteScore: r.metrics?.silhouette_score || 0,
        calinskiScore: r.metrics?.calinski_harabasz_score || 0,
        daviesBouldinScore: r.metrics?.davies_bouldin_score,
        elbowData: r.elbow_data,
        optimalKReasoning: r.optimal_k_reasoning || "",
        summary: summary || r.summary || "",
        algorithmUsed: r.algorithm_used || algorithm,
        recommendations: r.recommendations || []
      });

      const model: MLModel = {
        id: `cluster-${Date.now()}`,
        name: `${r.algorithm_used || algorithm} (${r.n_clusters} clusters)`,
        type: "clustering",
        clusters: r.n_clusters,
        trainedAt: new Date(),
        status: "ready",
        explanation: `${r.n_clusters} segments, silhouette=${(r.metrics?.silhouette_score || 0).toFixed(2)}`
      };
      onModelTrained(model);
      toast.success(`Found ${r.n_clusters} clusters!`);
    } catch (error) {
      console.error("Clustering error:", error);
      toast.error(error instanceof Error ? error.message : "Clustering failed");
    } finally { setIsTraining(false); }
  }, [data, selectedFeatures, numClusters, autoDetectK, algorithm, datasetName, onModelTrained]);

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Clustering Pipeline
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary"><Cpu className="h-3 w-3 mr-1" />AI-Powered</Badge>
          </CardTitle>
          <CardDescription>Discover natural segments in your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kmeans">K-Means</SelectItem>
                  <SelectItem value="dbscan">DBSCAN (Density)</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-detect optimal K</Label>
                <Switch checked={autoDetectK} onCheckedChange={setAutoDetectK} />
              </div>
              {!autoDetectK && (
                <Select value={String(numClusters)} onValueChange={v => setNumClusters(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2,3,4,5,6,7,8].map(k => <SelectItem key={k} value={String(k)}>{k} clusters</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Feature Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Features ({selectedFeatures.size} selected)</Label>
            <ScrollArea className="h-28 border rounded-lg p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {numericColumns.map(col => (
                  <label key={col} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                    <Checkbox checked={selectedFeatures.has(col)} onCheckedChange={() => toggleFeature(col)} />
                    <span className="truncate">{col}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button onClick={runClustering} disabled={isTraining || selectedFeatures.size < 2} className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent">
            {isTraining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clustering...</> : <><Play className="h-4 w-4 mr-2" />Run Clustering</>}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isTraining && (
        <Card className="border-primary/30">
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="font-medium">{progress.stage}</span><span className="text-muted-foreground">{progress.progress}%</span></div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isTraining && (
        <div className="space-y-6">
          {/* Score */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/20"><CheckCircle2 className="h-8 w-8 text-blue-500" /></div>
                  <div>
                    <h3 className="font-semibold text-lg">{result.algorithmUsed} â€” {result.clusters.length} Segments</h3>
                    {result.optimalKReasoning && <p className="text-xs text-muted-foreground max-w-md mt-1">{result.optimalKReasoning}</p>}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right"><p className="text-2xl font-bold text-blue-500">{result.silhouetteScore.toFixed(2)}</p><p className="text-xs text-muted-foreground">Silhouette</p></div>
                  <div className="text-right"><p className="text-2xl font-bold text-purple-500">{result.calinskiScore.toFixed(0)}</p><p className="text-xs text-muted-foreground">Calinski-H</p></div>
                  {result.daviesBouldinScore !== undefined && (
                    <div className="text-right"><p className="text-2xl font-bold text-cyan-500">{result.daviesBouldinScore.toFixed(2)}</p><p className="text-xs text-muted-foreground">Davies-B</p></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="scatter" className="w-full">
            <TabsList className="w-full justify-start bg-card/80 p-1 h-auto flex-wrap">
              <TabsTrigger value="scatter" className="gap-1.5"><Target className="h-3.5 w-3.5" />Scatter</TabsTrigger>
              {result.elbowData && <TabsTrigger value="elbow" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Elbow Curve</TabsTrigger>}
              <TabsTrigger value="profiles" className="gap-1.5"><Users className="h-3.5 w-3.5" />Profiles</TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="scatter" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Cluster Visualization</CardTitle><CardDescription>{result.xAxis} vs {result.yAxis}</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" dataKey="x" name={result.xAxis} tick={{ fontSize: 12 }} />
                        <YAxis type="number" dataKey="y" name={result.yAxis} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Legend />
                        {result.clusters.map((c, i) => (
                          <Scatter key={c.id} name={c.label} data={result.scatterData.filter(d => d.cluster === c.id).slice(0, 200)} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {result.elbowData && (
              <TabsContent value="elbow" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Elbow Curve & Silhouette Analysis</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.elbowData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="k" label={{ value: "Number of Clusters (K)", position: "insideBottom", offset: -5 }} />
                          <YAxis yAxisId="left" label={{ value: "Inertia", angle: -90, position: "insideLeft" }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: "Silhouette", angle: 90, position: "insideRight" }} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="inertia" stroke="#8b5cf6" strokeWidth={2} name="Inertia" />
                          <Line yAxisId="right" type="monotone" dataKey="silhouette" stroke="#10b981" strokeWidth={2} name="Silhouette Score" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="profiles" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.clusters.map((cluster, i) => (
                  <Card key={cluster.id} className="border-l-4" style={{ borderLeftColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" style={{ color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                          {cluster.label}
                        </CardTitle>
                        <Badge variant="secondary">{cluster.count}</Badge>
                      </div>
                      <CardDescription>{cluster.percentage.toFixed(1)}% of data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">{cluster.description}</p>
                      {Object.keys(cluster.profile).length > 0 && (
                        <div className="text-xs space-y-1">
                          {Object.entries(cluster.profile).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{typeof v === 'number' ? v.toFixed(2) : v}</span></div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-4 space-y-4">
              {result.summary && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" />AI Segment Analysis<Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500"><Sparkles className="h-3 w-3 mr-1" />AI</Badge></CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p></CardContent>
                </Card>
              )}
              {result.recommendations.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">{result.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span className="text-muted-foreground">{r}</span></li>
                    ))}</ul>
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

export default ClusteringPanel;
