import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  GitCompare, Upload, Loader2, CheckCircle2, ArrowRight, TrendingUp, TrendingDown, Minus,
  Sparkles, BarChart3, Search, Brain, AlertCircle, Link2, Play, Table, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { detectJoinColumns, executeJoin, compareDatasets, type JoinSuggestion, type JoinResult, type ComparisonKPI } from "@/lib/joinEngine";
import { backend } from "@/platform";
import type { DatasetState } from "@/pages/DataAgent";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  primaryDataset: DatasetState;
  onJoinComplete: (joinedData: Record<string, unknown>[], columns: string[]) => void;
}

const JOIN_TYPES = [
  { value: "inner", label: "Inner Join", icon: "âˆ©" },
  { value: "left", label: "Left Join", icon: "âŠƒ" },
  { value: "right", label: "Right Join", icon: "âŠ‚" },
  { value: "full", label: "Full Outer", icon: "âˆª" },
] as const;

const MultiDatasetComparison = ({ primaryDataset, onJoinComplete }: Props) => {
  const [secondaryDataset, setSecondaryDataset] = useState<DatasetState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<JoinSuggestion[]>([]);
  const [selectedJoin, setSelectedJoin] = useState<{ leftCol: string; rightCol: string; type: "inner" | "left" | "right" | "full" }>({ leftCol: "", rightCol: "", type: "inner" });
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [comparisonKPIs, setComparisonKPIs] = useState<ComparisonKPI[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [smartQuery, setSmartQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState("setup");

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
      const data = parsed.data as Record<string, unknown>[];
      const columns = parsed.meta.fields || [];

      if (data.length === 0 || columns.length === 0) {
        toast.error("No data found in file");
        return;
      }

      const ds: DatasetState = {
        name: file.name.replace(/\.[^.]+$/, ""),
        rawData: data,
        columns,
        status: "uploaded",
      };
      setSecondaryDataset(ds);

      // Auto-detect join columns
      const detected = detectJoinColumns(primaryDataset.columns, columns, primaryDataset.rawData, data);
      setSuggestions(detected);

      if (detected.length > 0) {
        setSelectedJoin({ leftCol: detected[0].leftColumn, rightCol: detected[0].rightColumn, type: "inner" });
      }

      // Auto-compute comparison KPIs
      const kpis = compareDatasets(primaryDataset.rawData, data, primaryDataset.columns, columns);
      setComparisonKPIs(kpis);

      toast.success(`Loaded ${data.length.toLocaleString()} rows from ${file.name}`);
      if (detected.length > 0) {
        toast.info(`Found ${detected.length} potential join column${detected.length > 1 ? "s" : ""}`);
      }
    } catch {
      toast.error("Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  }, [primaryDataset]);

  const handleJoin = useCallback(async () => {
    if (!secondaryDataset || !selectedJoin.leftCol || !selectedJoin.rightCol) {
      toast.error("Select join columns first");
      return;
    }
    setIsJoining(true);
    try {
      const result = executeJoin(
        primaryDataset.rawData,
        secondaryDataset.rawData,
        { leftColumn: selectedJoin.leftCol, rightColumn: selectedJoin.rightCol, joinType: selectedJoin.type },
        primaryDataset.name,
        secondaryDataset.name
      );
      setJoinResult(result);
      setActiveView("results");
      toast.success(`Join complete: ${result.data.length.toLocaleString()} rows`);
    } catch {
      toast.error("Join failed");
    } finally {
      setIsJoining(false);
    }
  }, [primaryDataset, secondaryDataset, selectedJoin]);

  const handleSmartQuery = useCallback(async () => {
    if (!smartQuery.trim() || !secondaryDataset) return;
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const context = {
        datasetA: { name: primaryDataset.name, columns: primaryDataset.columns, rowCount: primaryDataset.rawData.length, sample: primaryDataset.rawData.slice(0, 5) },
        datasetB: { name: secondaryDataset.name, columns: secondaryDataset.columns, rowCount: secondaryDataset.rawData.length, sample: secondaryDataset.rawData.slice(0, 5) },
        comparisonKPIs: comparisonKPIs.slice(0, 10),
        joinResult: joinResult ? { rowCount: joinResult.data.length, matchedCount: joinResult.matchedCount } : null,
      };
      const { data, error } = await backend.functions.invoke("data-agent", {
        body: { action: "multi_dataset_query", query: smartQuery, context, datasetName: `${primaryDataset.name} + ${secondaryDataset.name}` },
      });
      if (error) throw error;
      setQueryResult(data?.explanation || data?.raw_response || "No result");
    } catch {
      setQueryResult("Failed to process query. Please try again.");
    } finally {
      setIsQuerying(false);
    }
  }, [smartQuery, primaryDataset, secondaryDataset, comparisonKPIs, joinResult]);

  const handleAIInsights = useCallback(async () => {
    if (!secondaryDataset) return;
    setIsAnalyzing(true);
    try {
      const context = {
        datasetA: { name: primaryDataset.name, columns: primaryDataset.columns, rowCount: primaryDataset.rawData.length },
        datasetB: { name: secondaryDataset.name, columns: secondaryDataset.columns, rowCount: secondaryDataset.rawData.length },
        comparisonKPIs,
        joinResult: joinResult ? { rowCount: joinResult.data.length, matchedCount: joinResult.matchedCount, unmatchedLeft: joinResult.unmatchedLeft, unmatchedRight: joinResult.unmatchedRight } : null,
      };
      const { data, error } = await backend.functions.invoke("data-agent", {
        body: { action: "multi_dataset_insights", context, datasetName: `${primaryDataset.name} + ${secondaryDataset.name}` },
      });
      if (error) throw error;
      setAiInsights(data?.explanation || data?.raw_response || "No insights generated");
    } catch {
      setAiInsights("Failed to generate insights.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [primaryDataset, secondaryDataset, comparisonKPIs, joinResult]);

  const comparisonChartData = useMemo(() => {
    return comparisonKPIs.slice(0, 6).map(kpi => ({
      column: kpi.column.length > 15 ? kpi.column.slice(0, 12) + "â€¦" : kpi.column,
      [primaryDataset.name]: Math.round(kpi.datasetA.mean * 100) / 100,
      [secondaryDataset?.name || "Dataset B"]: Math.round(kpi.datasetB.mean * 100) / 100,
    }));
  }, [comparisonKPIs, primaryDataset.name, secondaryDataset?.name]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <GitCompare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Multi-Dataset Intelligence</CardTitle>
              <CardDescription>Upload, join, compare, and query across multiple datasets</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="setup">Setup & Join</TabsTrigger>
          <TabsTrigger value="compare" disabled={!secondaryDataset}>Compare</TabsTrigger>
          <TabsTrigger value="results" disabled={!joinResult}>Results</TabsTrigger>
          <TabsTrigger value="insights" disabled={!secondaryDataset}>AI Insights</TabsTrigger>
        </TabsList>

        {/* â”€â”€ SETUP TAB â”€â”€ */}
        <TabsContent value="setup" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Dataset A */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">A</Badge>
                  {primaryDataset.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{primaryDataset.rawData.length.toLocaleString()} rows</span>
                  <span>{primaryDataset.columns.length} columns</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {primaryDataset.columns.slice(0, 8).map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                  {primaryDataset.columns.length > 8 && <Badge variant="outline" className="text-[10px]">+{primaryDataset.columns.length - 8}</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Dataset B */}
            <Card className={cn("border-dashed", secondaryDataset ? "border-accent/50" : "border-border")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline">B</Badge>
                  {secondaryDataset?.name || "Upload Dataset B"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {secondaryDataset ? (
                  <>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{secondaryDataset.rawData.length.toLocaleString()} rows</span>
                      <span>{secondaryDataset.columns.length} columns</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {secondaryDataset.columns.slice(0, 8).map(c => (
                        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSecondaryDataset(null); setSuggestions([]); setJoinResult(null); setComparisonKPIs([]); }}>
                      Replace Dataset
                    </Button>
                  </>
                ) : (
                  <label className="flex flex-col items-center gap-2 py-6 cursor-pointer text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg hover:border-primary/50">
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                    <span className="text-sm">{isUploading ? "Parsing..." : "Click to upload CSV"}</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Auto-detected join suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Auto-Detected Join Columns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors text-sm",
                      selectedJoin.leftCol === s.leftColumn && selectedJoin.rightCol === s.rightColumn
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    )}
                    onClick={() => setSelectedJoin(prev => ({ ...prev, leftCol: s.leftColumn, rightCol: s.rightColumn }))}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={s.matchType === "exact" ? "default" : "secondary"} className="text-[10px]">
                        {s.matchType === "exact" ? "Exact" : s.matchType === "fuzzy" ? "Fuzzy" : "Overlap"}
                      </Badge>
                      <span className="font-medium">{s.leftColumn}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{s.rightColumn}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.reason}</span>
                      <Badge variant="outline" className="text-[10px]">{s.confidence}%</Badge>
                    </div>
                  </button>
                ))}

                {/* Manual override */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Select value={selectedJoin.leftCol} onValueChange={v => setSelectedJoin(p => ({ ...p, leftCol: v }))}>
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Left column" /></SelectTrigger>
                    <SelectContent>{primaryDataset.columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedJoin.type} onValueChange={v => setSelectedJoin(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{JOIN_TYPES.map(jt => <SelectItem key={jt.value} value={jt.value}>{jt.icon} {jt.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedJoin.rightCol} onValueChange={v => setSelectedJoin(p => ({ ...p, rightCol: v }))}>
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Right column" /></SelectTrigger>
                    <SelectContent>{secondaryDataset?.columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <Button className="w-full gap-2" onClick={handleJoin} disabled={isJoining || !selectedJoin.leftCol || !selectedJoin.rightCol}>
                  {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Execute {selectedJoin.type.charAt(0).toUpperCase() + selectedJoin.type.slice(1)} Join
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* â”€â”€ COMPARE TAB â”€â”€ */}
        <TabsContent value="compare" className="space-y-4">
          {comparisonKPIs.length > 0 ? (
            <>
              {/* KPI Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {comparisonKPIs.slice(0, 6).map(kpi => {
                  const pctChange = kpi.diff.meanPctChange;
                  const isUp = pctChange > 0;
                  const isFlat = Math.abs(pctChange) < 1;
                  return (
                    <Card key={kpi.column} className="bg-card/60">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground font-medium mb-2 truncate">{kpi.column}</p>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Dataset A</p>
                            <p className="text-lg font-bold">{kpi.datasetA.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                          </div>
                          <div className={cn("flex items-center gap-1 text-sm font-semibold", isFlat ? "text-muted-foreground" : isUp ? "text-green-500" : "text-red-500")}>
                            {isFlat ? <Minus className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(pctChange).toFixed(1)}%
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Dataset B</p>
                            <p className="text-lg font-bold">{kpi.datasetB.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Comparison Chart */}
              {comparisonChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Mean Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={comparisonChartData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="column" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={primaryDataset.name} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={secondaryDataset?.name || "Dataset B"} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No common numeric columns found for comparison</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* â”€â”€ RESULTS TAB â”€â”€ */}
        <TabsContent value="results" className="space-y-4">
          {joinResult && (
            <>
              {/* Join Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows", value: joinResult.data.length },
                  { label: "Matched", value: joinResult.matchedCount },
                  { label: "Unmatched Left", value: joinResult.unmatchedLeft },
                  { label: "Unmatched Right", value: joinResult.unmatchedRight },
                ].map(s => (
                  <Card key={s.label} className="bg-card/60">
                    <CardContent className="pt-3 pb-2 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Preview Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Table className="w-4 h-4" /> Joined Data Preview</CardTitle>
                    <Button size="sm" onClick={() => onJoinComplete(joinResult.data, joinResult.columns)}>
                      <Zap className="w-3 h-3 mr-1" /> Apply as Dataset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="border-b bg-muted/30 sticky top-0">
                          <tr>
                            {joinResult.columns.slice(0, 12).map(c => (
                              <th key={c} className="text-left px-2 py-1.5 font-medium whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {joinResult.data.slice(0, 30).map((row, i) => (
                            <tr key={i} className="border-b border-border/20 hover:bg-muted/10">
                              {joinResult.columns.slice(0, 12).map(c => (
                                <td key={c} className="px-2 py-1 whitespace-nowrap">{String(row[c] ?? "â€”")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* â”€â”€ AI INSIGHTS TAB â”€â”€ */}
        <TabsContent value="insights" className="space-y-4">
          {/* Smart Search */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4" /> Cross-Dataset Query</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder='e.g. "Compare revenue between both datasets" or "Which region performs best?"'
                  value={smartQuery}
                  onChange={e => setSmartQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSmartQuery()}
                  className="text-sm"
                />
                <Button onClick={handleSmartQuery} disabled={isQuerying || !smartQuery.trim()} size="sm">
                  {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {queryResult && (
                <div className="p-3 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap">{queryResult}</div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> AI Comparison Insights</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAIInsights} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Generate Insights
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="p-3 rounded-lg bg-muted/30 text-sm whitespace-pre-wrap">{aiInsights}</div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Click "Generate Insights" to get AI-powered cross-dataset analysis</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiDatasetComparison;
