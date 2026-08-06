import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Flame,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  ArrowUpRight,
} from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const BusinessHealthDashboard = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("founder_health", {
        data: data.slice(0, 200),
        columns,
        datasetName,
      });
      if (error) throw new Error(error);
      setMetrics(result);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!metrics) return;
    const sections: any[] = [];
    if (metrics.kpis) {
      sections.push({
        title: "Key Performance Indicators",
        content: "",
        type: "table",
        tableData: {
          headers: ["KPI", "Value", "Change", "Trend"],
          rows: metrics.kpis.map((k: any) => [k.name || "", k.value || "", k.change || "", k.trend || ""]),
        },
      });
    }
    if (metrics.health_score != null) {
      sections.push({
        title: "Overall Business Health",
        content: `Score: ${metrics.health_score}/100\n\n${metrics.summary || ""}`,
        type: "text",
      });
    }
    exportToPdf({
      title: "Business Health Statement",
      datasetName,
      sections,
      recommendations: metrics.recommendations || [],
    });
  };

  const kpiIcons: Record<string, any> = {
    cac: DollarSign,
    ltv: DollarSign,
    churn: Users,
    burn_rate: Flame,
    runway: Clock,
  };

  const healthTone = (score: number) =>
    score > 70
      ? { label: "Healthy", tone: "text-emerald-600 dark:text-emerald-400" }
      : score > 40
        ? { label: "Moderate", tone: "text-amber-600 dark:text-amber-400" }
        : { label: "At Risk", tone: "text-red-600 dark:text-red-400" };

  return (
    <div className="space-y-6">
      {/* Statement header — accounting/enterprise feel */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 px-6 py-5 border-b border-border">
          <div>
            <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-muted-foreground mb-2">
              SpaceForge · Founder Statement
            </p>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-[-0.01em]">
              Business Health Statement
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="truncate max-w-[42ch]">{datasetName || "Active dataset"}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{data.length.toLocaleString()} rows</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{columns.length} cols</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {metrics && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                Export statement
              </Button>
            )}
            <Button onClick={analyze} disabled={loading} size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {loading ? "Auditing…" : metrics ? "Re-run audit" : "Run health audit"}
            </Button>
          </div>
        </div>

        {/* Ledger-style metadata row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {[
            { label: "Period", value: "Latest snapshot" },
            { label: "Basis", value: "Uploaded ledger" },
            { label: "Prepared by", value: "SpaceForge AI" },
            { label: "Confidence", value: metrics ? "Model-verified" : "Pending audit" },
          ].map((m) => (
            <div key={m.label} className="px-6 py-3">
              <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{m.label}</p>
              <p className="text-sm text-foreground font-medium tabular-nums mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {!metrics && !loading && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm text-foreground font-medium">No statement generated yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Run the health audit to compute CAC, LTV, churn, burn rate and runway from your dataset, and
            receive an executive-grade business health score.
          </p>
        </div>
      )}

      {metrics && (
        <>
          {/* KPI ledger */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Key financial indicators</h3>
              <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                {metrics.kpis?.length || 0} metrics
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-0 border border-border rounded-xl overflow-hidden bg-card">
              {metrics.kpis?.map((kpi: any, i: number) => {
                const Icon = kpiIcons[kpi.key] || TrendingUp;
                const isUp = kpi.trend === "up";
                return (
                  <div
                    key={i}
                    className="px-5 py-4 border-b lg:border-b-0 border-r border-border last:border-r-0 group hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
                        {kpi.name}
                      </p>
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground/70 transition-colors" />
                    </div>
                    <p className="text-2xl font-semibold text-foreground tracking-[-0.02em] tabular-nums">
                      {kpi.value}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {isUp ? (
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className={`text-[11px] tabular-nums ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health score panel */}
          {metrics.health_score != null && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight">Overall business health</CardTitle>
                  <Badge variant="outline" className="text-[10px] tracking-[0.18em] uppercase">
                    Audit result
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
                  <div className="flex items-baseline gap-3">
                    <div className="text-6xl font-semibold text-foreground tracking-[-0.04em] tabular-nums">
                      {metrics.health_score}
                    </div>
                    <div className="text-lg text-muted-foreground tabular-nums">/100</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${healthTone(metrics.health_score).tone}`}>
                        {healthTone(metrics.health_score).label}
                      </span>
                      <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                        Composite index
                      </span>
                    </div>
                    <Progress value={metrics.health_score} className="h-2" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                      <span>0 · Critical</span>
                      <span>50 · Moderate</span>
                      <span>100 · Healthy</span>
                    </div>
                  </div>
                </div>
                {metrics.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-5 border-t border-border pt-4">
                    {metrics.summary}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations — auditor's notes */}
          {metrics.recommendations && metrics.recommendations.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight">Auditor's recommendations</CardTitle>
                  <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                    {metrics.recommendations.length} items
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border -my-2">
                  {metrics.recommendations.map((r: string, i: number) => (
                    <li key={i} className="py-3 flex items-start gap-3 group">
                      <span className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground tabular-nums mt-1 w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm text-foreground/90 leading-relaxed flex-1">{r}</p>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors mt-1" />
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

export default BusinessHealthDashboard;
