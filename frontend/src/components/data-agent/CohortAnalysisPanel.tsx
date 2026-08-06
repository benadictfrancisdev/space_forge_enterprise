import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface CohortRow {
  cohort: string;
  periods: { period: number; count: number; retention: number }[];
  totalUsers: number;
}

interface CohortKPI {
  cohort: string;
  kpiName: string;
  value: number;
  comparedToAvg: number;
  trend: "up" | "down" | "flat";
}

interface CohortResult {
  retentionTable: CohortRow[];
  kpiComparisons: CohortKPI[];
  insights: string[];
  bestCohort: string;
  worstCohort: string;
}

const CohortAnalysisPanel = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [dateColumn, setDateColumn] = useState("");
  const [userColumn, setUserColumn] = useState("");
  const [metricColumn, setMetricColumn] = useState("");
  const [granularity, setGranularity] = useState("month");
  const [results, setResults] = useState<CohortResult | null>(null);

  const dateColumns = useMemo(() => columns.filter(c => {
    const samples = data.slice(0, 20).map(r => String(r[c] ?? ""));
    return samples.some(s => !isNaN(Date.parse(s)) && s.length > 6);
  }), [columns, data]);

  const categoricalColumns = useMemo(() => columns.filter(c => columnTypes[c] === "categorical"), [columns, columnTypes]);
  const numericColumns = useMemo(() => columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);

  const runCohortAnalysis = async () => {
    if (!dateColumn || !userColumn) { toast.error("Select date and user columns"); return; }
    setLoading(true);

    try {
      // Build cohort assignments
      const getGranularKey = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        if (granularity === "week") {
          const start = new Date(d); start.setDate(d.getDate() - d.getDay());
          return `W${start.toISOString().slice(0, 10)}`;
        }
        if (granularity === "quarter") return `Q${Math.ceil((d.getMonth() + 1) / 3)}-${d.getFullYear()}`;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };

      // Assign each user to their first-seen cohort
      const userFirstSeen: Record<string, { cohort: string; date: Date }> = {};
      const sortedData = [...data].sort((a, b) => new Date(String(a[dateColumn])).getTime() - new Date(String(b[dateColumn])).getTime());

      for (const row of sortedData) {
        const userId = String(row[userColumn] ?? "");
        const dateStr = String(row[dateColumn] ?? "");
        if (!userId || !dateStr) continue;
        const cohortKey = getGranularKey(dateStr);
        if (!cohortKey) continue;
        if (!userFirstSeen[userId]) {
          userFirstSeen[userId] = { cohort: cohortKey, date: new Date(dateStr) };
        }
      }

      // Build retention table
      const cohortUsers: Record<string, Set<string>> = {};
      const cohortActivity: Record<string, Record<number, Set<string>>> = {};

      for (const [userId, info] of Object.entries(userFirstSeen)) {
        if (!cohortUsers[info.cohort]) cohortUsers[info.cohort] = new Set();
        cohortUsers[info.cohort].add(userId);
      }

      for (const row of sortedData) {
        const userId = String(row[userColumn] ?? "");
        const dateStr = String(row[dateColumn] ?? "");
        if (!userId || !dateStr || !userFirstSeen[userId]) continue;
        const firstDate = userFirstSeen[userId].date;
        const currentDate = new Date(dateStr);
        const diffMs = currentDate.getTime() - firstDate.getTime();
        let period = 0;
        if (granularity === "week") period = Math.floor(diffMs / (7 * 86400000));
        else if (granularity === "quarter") period = Math.floor(diffMs / (91 * 86400000));
        else period = Math.floor(diffMs / (30 * 86400000));

        const cohort = userFirstSeen[userId].cohort;
        if (!cohortActivity[cohort]) cohortActivity[cohort] = {};
        if (!cohortActivity[cohort][period]) cohortActivity[cohort][period] = new Set();
        cohortActivity[cohort][period].add(userId);
      }

      const sortedCohorts = Object.keys(cohortUsers).sort();
      const maxPeriods = Math.min(12, Math.max(...Object.values(cohortActivity).flatMap(ca => Object.keys(ca).map(Number)), 0) + 1);

      const retentionTable: CohortRow[] = sortedCohorts.slice(-8).map(cohort => {
        const total = cohortUsers[cohort].size;
        const periods = Array.from({ length: maxPeriods }, (_, i) => ({
          period: i,
          count: cohortActivity[cohort]?.[i]?.size || 0,
          retention: total > 0 ? ((cohortActivity[cohort]?.[i]?.size || 0) / total) * 100 : 0,
        }));
        return { cohort, periods, totalUsers: total };
      });

      // KPI Comparisons
      const kpiComparisons: CohortKPI[] = [];
      if (metricColumn) {
        for (const cohort of sortedCohorts.slice(-8)) {
          const cohortUserIds = cohortUsers[cohort];
          const cohortRows = data.filter(r => cohortUserIds.has(String(r[userColumn] ?? "")));
          const values = cohortRows.map(r => Number(r[metricColumn])).filter(n => !isNaN(n));
          if (values.length === 0) continue;
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const globalValues = data.map(r => Number(r[metricColumn])).filter(n => !isNaN(n));
          const globalAvg = globalValues.reduce((a, b) => a + b, 0) / globalValues.length;
          const diff = globalAvg !== 0 ? ((avg - globalAvg) / Math.abs(globalAvg)) * 100 : 0;
          kpiComparisons.push({
            cohort,
            kpiName: metricColumn,
            value: avg,
            comparedToAvg: diff,
            trend: Math.abs(diff) < 2 ? "flat" : diff > 0 ? "up" : "down",
          });
        }
      }

      // AI insights
      let insights: string[] = [];
      try {
        const retentionSummary = retentionTable.map(r => ({
          cohort: r.cohort,
          n: r.totalUsers,
          period1Retention: r.periods[1]?.retention?.toFixed(1) || "N/A",
          period3Retention: r.periods[3]?.retention?.toFixed(1) || "N/A",
        }));
        const { data: aiData } = await backend.functions.invoke("data-agent", {
          body: {
            action: "explain",
            analysisType: "cohort_insights",
            datasetName,
            analysisResults: retentionSummary,
            dataContext: `Analyze this cohort retention data and provide 4 bullet-point insights:\n${JSON.stringify(retentionSummary)}${kpiComparisons.length ? `\nKPI by cohort: ${JSON.stringify(kpiComparisons.slice(0, 5))}` : ""}`,
          }
        });
        const rawInsights = aiData?.explanation;
        if (typeof rawInsights === "string") {
          insights = rawInsights.split("\n").filter(Boolean);
        } else if (Array.isArray(rawInsights)) {
          insights = rawInsights as string[];
        }
      } catch { insights = ["Cohort analysis complete. Review retention trends above."]; }

      const bestCohort = retentionTable.reduce((best, r) => (r.periods[1]?.retention || 0) > (best.periods[1]?.retention || 0) ? r : best, retentionTable[0])?.cohort || "";
      const worstCohort = retentionTable.reduce((worst, r) => (r.periods[1]?.retention || 0) < (worst.periods[1]?.retention || 0) ? r : worst, retentionTable[0])?.cohort || "";

      setResults({ retentionTable, kpiComparisons, insights, bestCohort, worstCohort });
      toast.success("Cohort analysis complete");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getRetentionColor = (retention: number) => {
    if (retention >= 70) return "bg-green-500/80 text-white";
    if (retention >= 40) return "bg-green-500/40 text-foreground";
    if (retention >= 20) return "bg-yellow-500/30 text-foreground";
    if (retention >= 5) return "bg-red-500/20 text-foreground";
    return "bg-muted/30 text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Cohort Analysis & KPI Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Date Column</Label>
              <Select value={dateColumn} onValueChange={setDateColumn}>
                <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>{dateColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">User/Entity Column</Label>
              <Select value={userColumn} onValueChange={setUserColumn}>
                <SelectTrigger><SelectValue placeholder="User ID" /></SelectTrigger>
                <SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">KPI Column (optional)</Label>
              <Select value={metricColumn} onValueChange={setMetricColumn}>
                <SelectTrigger><SelectValue placeholder="Metric" /></SelectTrigger>
                <SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Granularity</Label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={runCohortAnalysis} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing Cohorts...</> : "Run Cohort Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Retention Heatmap */}
      {results && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Retention Heatmap</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px]">Best: {results.bestCohort}</Badge>
                  <Badge variant="destructive" className="text-[10px]">Worst: {results.worstCohort}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-24">Cohort</TableHead>
                      <TableHead className="text-xs w-16">Users</TableHead>
                      {Array.from({ length: Math.min(8, results.retentionTable[0]?.periods.length || 0) }, (_, i) => (
                        <TableHead key={i} className="text-xs text-center w-16">P{i}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.retentionTable.map(row => (
                      <TableRow key={row.cohort}>
                        <TableCell className="text-xs font-medium">{row.cohort}</TableCell>
                        <TableCell className="text-xs">{row.totalUsers}</TableCell>
                        {row.periods.slice(0, 8).map((p, i) => (
                          <TableCell key={i} className={`text-xs text-center ${getRetentionColor(p.retention)}`}>
                            {p.retention.toFixed(0)}%
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* KPI Comparison */}
          {results.kpiComparisons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Cohort KPI Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {results.kpiComparisons.map((kpi, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-[10px] text-muted-foreground">{kpi.cohort}</p>
                      <p className="text-lg font-bold">{kpi.value.toFixed(2)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {kpi.trend === "up" ? <TrendingUp className="w-3 h-3 text-green-500" /> :
                         kpi.trend === "down" ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
                        <span className={`text-[10px] ${kpi.comparedToAvg > 0 ? "text-green-500" : kpi.comparedToAvg < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {kpi.comparedToAvg > 0 ? "+" : ""}{kpi.comparedToAvg.toFixed(1)}% vs avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {results.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.insights.map((insight, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary">â€¢</span> {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CohortAnalysisPanel;
