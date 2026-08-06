import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Play, Loader2, CheckCircle2, XCircle,
  Lightbulb, Eye, Target, Zap, Cpu, Sparkles, Download,
  Brain, TrendingUp, Shield
} from "lucide-react";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import { backend } from "@/platform";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

interface AnomalyPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface DetectedAnomaly {
  index: number;
  row: Record<string, unknown>;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  affectedColumns: Array<{ column: string; value: number; z_score: number; expected_range?: string }>;
  explanation: string;
  suggestedAction: string;
}

interface RootCauseGroup {
  group_name: string;
  pattern: string;
  count: number;
  affected_columns: string[];
  business_impact: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

const BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];

const AnomalyPanel = ({ data, columns, numericColumns, columnTypes, datasetName, onModelTrained }: AnomalyPanelProps) => {
  const [method, setMethod] = useState("Isolation Forest");
  const [contamination, setContamination] = useState(0.1);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set(numericColumns));
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<DetectedAnomaly | null>(null);
  const [result, setResult] = useState<{
    anomalies: DetectedAnomaly[];
    severitySummary: Record<string, number>;
    totalRecords: number;
    anomalyRate: number;
    methodUsed: string;
    methodRationale: string;
    rootCauseGroups: RootCauseGroup[];
    scoreDistribution: Array<{ bin: string; count: number }>;
    summary: string;
    recommendations: string[];
  } | null>(null);

  const toggleFeature = (col: string) => {
    setSelectedFeatures(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; });
  };

  const exportAnomalies = () => {
    if (!result) return;
    const headers = ["Row", "Severity", "Score", "Explanation", "Affected Columns"];
    const rows = result.anomalies.map(a => [
      a.index + 1, a.severity, a.score.toFixed(3), `"${a.explanation}"`,
      a.affectedColumns.map(c => `${c.column}(${c.z_score.toFixed(1)}Ïƒ)`).join("; ")
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `anomalies_${datasetName}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Anomalies exported to CSV");
  };

  const detectAnomalies = useCallback(async () => {
    const features = Array.from(selectedFeatures);
    if (features.length === 0) { toast.error("Select at least one feature"); return; }

    setIsDetecting(true);
    setProgress({ stage: "Uploading", progress: 15, message: "Sending data for analysis..." });

    try {
      setProgress({ stage: "Detecting", progress: 40, message: `Running ${method}...` });

      const { data: responseData, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'anomaly',
          data: data.slice(0, 1000),
          columns: features,
          featureColumns: features,
          method,
          datasetName
        }
      });
      if (error || !responseData?.success) throw new Error(error?.message || responseData?.error || "Detection failed");

      const r = responseData;
      setProgress({ stage: "Analyzing", progress: 75, message: "Analyzing root causes..." });

      const anomalies: DetectedAnomaly[] = (r.anomalies || []).map((a: any) => ({
        index: a.index, row: a.row_data || {},
        score: a.anomaly_score || 0, severity: a.severity || "medium",
        affectedColumns: a.affected_columns || [],
        explanation: a.description || `Row ${a.index + 1} shows unusual values`,
        suggestedAction: a.recommendation || "Review this data point"
      }));

      let summary = r.summary || "";
      // Get additional AI explanation if summary is short
      if (summary.length < 50) {
        try {
          setProgress({ stage: "AI Analysis", progress: 90, message: "AI generating root cause analysis..." });
          const { data: explainData } = await backend.functions.invoke('data-agent', {
            body: {
              action: 'explain',
              analysisType: 'anomaly_detection',
              analysisResults: { anomaly_count: r.anomaly_count, anomaly_rate: r.anomaly_rate, severity_summary: r.severity_summary, root_cause_groups: r.root_cause_groups, sample_anomalies: anomalies.slice(0, 5) },
              dataContext: `Dataset: ${datasetName}, ${data.length} rows, Method: ${method}`
            }
          });
          if (explainData?.success && explainData.explanation) summary = explainData.explanation;
        } catch { /* use existing summary */ }
      }

      setProgress({ stage: "Complete", progress: 100, message: "Detection complete!" });

      setResult({
        anomalies, totalRecords: r.total_records || data.length,
        anomalyRate: r.anomaly_rate || 0,
        severitySummary: r.severity_summary || {},
        methodUsed: r.method_used || method,
        methodRationale: r.method_rationale || "",
        rootCauseGroups: r.root_cause_groups || [],
        scoreDistribution: r.score_distribution || [],
        summary, recommendations: r.recommendations || []
      });

      const model: MLModel = {
        id: `anomaly-${Date.now()}`, name: `${r.method_used || method} Detector`,
        type: "anomaly", anomalyCount: anomalies.length,
        trainedAt: new Date(), status: "ready",
        explanation: `${anomalies.length} anomalies (${(r.anomaly_rate || 0).toFixed(1)}%)`
      };
      onModelTrained(model);
      toast.success(`Found ${anomalies.length} anomalies!`);
    } catch (error) {
      console.error("Detection error:", error);
      toast.error(error instanceof Error ? error.message : "Detection failed");
    } finally { setIsDetecting(false); }
  }, [data, selectedFeatures, contamination, method, datasetName, onModelTrained]);

  const getSeverityIcon = (s: string) => {
    switch (s) { case "critical": return <XCircle className="h-4 w-4" />; case "high": return <AlertTriangle className="h-4 w-4" />; case "medium": return <Target className="h-4 w-4" />; default: return <Eye className="h-4 w-4" />; }
  };

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Anomaly Detection Pipeline
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary"><Cpu className="h-3 w-3 mr-1" />AI-Powered</Badge>
          </CardTitle>
          <CardDescription>Detect unusual patterns and outliers with ML methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Detection Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Isolation Forest">Isolation Forest</SelectItem>
                  <SelectItem value="Z-Score">Z-Score</SelectItem>
                  <SelectItem value="IQR">IQR (Interquartile Range)</SelectItem>
                  <SelectItem value="LOF">Local Outlier Factor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label>Sensitivity ({(contamination * 100).toFixed(0)}%)</Label></div>
              <Slider value={[contamination * 100]} onValueChange={v => setContamination(v[0] / 100)} min={1} max={30} step={1} />
              <p className="text-xs text-muted-foreground">Higher = more anomalies detected</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Features ({selectedFeatures.size})</Label>
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

          <Button onClick={detectAnomalies} disabled={isDetecting || selectedFeatures.size === 0} className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent">
            {isDetecting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Detecting...</> : <><Zap className="h-4 w-4 mr-2" />Detect Anomalies</>}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isDetecting && (
        <Card className="border-primary/30">
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="font-medium">{progress.stage}</span><span className="text-muted-foreground">{progress.progress}%</span></div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isDetecting && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Total</span></div>
                <p className="text-2xl font-bold mt-1">{result.anomalies.length}</p>
                <p className="text-xs text-muted-foreground">{result.anomalyRate.toFixed(1)}% of data</p>
              </CardContent>
            </Card>
            {["critical", "high", "medium", "low"].map(sev => (
              <Card key={sev} className={`${SEVERITY_COLORS[sev]} border`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">{getSeverityIcon(sev)}<span className="text-sm font-medium capitalize">{sev}</span></div>
                  <p className="text-2xl font-bold mt-1">{result.severitySummary[sev] || 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Method info */}
          {result.methodRationale && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 text-primary" /><span className="font-medium">{result.methodUsed}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{result.methodRationale}</p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="anomalies" className="w-full">
            <TabsList className="w-full justify-start bg-card/80 p-1 h-auto flex-wrap">
              <TabsTrigger value="anomalies" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Anomalies</TabsTrigger>
              {result.rootCauseGroups.length > 0 && <TabsTrigger value="rootcause" className="gap-1.5"><Brain className="h-3.5 w-3.5" />Root Causes</TabsTrigger>}
              {result.scoreDistribution.length > 0 && <TabsTrigger value="distribution" className="gap-1.5"><Target className="h-3.5 w-3.5" />Distribution</TabsTrigger>}
              <TabsTrigger value="insights" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="anomalies" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Detected Anomalies</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportAnomalies} className="gap-1.5"><Download className="h-3.5 w-3.5" />Export CSV</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead className="w-24">Severity</TableHead>
                          <TableHead>Affected Columns</TableHead>
                          <TableHead>Explanation</TableHead>
                          <TableHead className="w-24">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.anomalies.map((anomaly, i) => (
                          <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAnomaly(anomaly)}>
                            <TableCell className="font-mono">{anomaly.index + 1}</TableCell>
                            <TableCell>
                              <Badge className={SEVERITY_COLORS[anomaly.severity]}>
                                {getSeverityIcon(anomaly.severity)}
                                <span className="ml-1 capitalize">{anomaly.severity}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {anomaly.affectedColumns.slice(0, 3).map(col => (
                                  <Badge key={col.column} variant="outline" className="text-xs">{col.column} ({col.z_score.toFixed(1)}Ïƒ)</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{anomaly.explanation}</TableCell>
                            <TableCell><Progress value={Math.abs(anomaly.score) * 100} className="h-2 w-16" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {result.rootCauseGroups.length > 0 && (
              <TabsContent value="rootcause" className="mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.rootCauseGroups.map((group, i) => (
                    <Card key={i} className="border-l-4" style={{ borderLeftColor: BAR_COLORS[i % BAR_COLORS.length] }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{group.group_name}</CardTitle>
                        <CardDescription>{group.count} anomalies</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground"><span className="font-medium">Pattern:</span> {group.pattern}</p>
                        <p className="text-muted-foreground"><span className="font-medium">Impact:</span> {group.business_impact}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.affected_columns.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}

            {result.scoreDistribution.length > 0 && (
              <TabsContent value="distribution" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Anomaly Score Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.scoreDistribution}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {result.scoreDistribution.map((_, i) => <Cell key={i} fill={BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="insights" className="mt-4 space-y-4">
              {result.summary && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" />AI Root Cause Analysis<Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500"><Sparkles className="h-3 w-3 mr-1" />AI</Badge></CardTitle></CardHeader>
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

          {/* Detail panel */}
          {selectedAnomaly && (
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Row {selectedAnomaly.index + 1} Details</CardTitle>
                  <Badge className={SEVERITY_COLORS[selectedAnomaly.severity]}>{getSeverityIcon(selectedAnomaly.severity)}<span className="ml-1 capitalize">{selectedAnomaly.severity}</span></Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Deviations</h4>
                    <div className="space-y-2">
                      {selectedAnomaly.affectedColumns.map(col => (
                        <div key={col.column} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                          <span>{col.column}</span>
                          <div className="flex gap-2"><Badge variant="outline">{col.z_score.toFixed(1)}Ïƒ</Badge><span className="font-mono">{col.value}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Analysis</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnomaly.explanation}</p>
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start gap-2"><Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" /><p className="text-xs text-muted-foreground">{selectedAnomaly.suggestedAction}</p></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AnomalyPanel;
