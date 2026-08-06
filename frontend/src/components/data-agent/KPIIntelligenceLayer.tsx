import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { computeDatasetProfile, profileToAIContext, type DatasetProfile, type KPI } from "@/lib/statisticsEngine";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

// â”€â”€ Local KPI Cards â”€â”€
const KPICard = ({ kpi }: { kpi: KPI }) => {
  const healthIcon = kpi.health === "healthy"
    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    : kpi.health === "warning"
    ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
    : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;

  return (
    <Card className={`border-border/50 ${kpi.health === "critical" ? "border-red-500/30" : kpi.health === "warning" ? "border-yellow-500/30" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{kpi.name}</p>
          {healthIcon}
        </div>
        <p className="text-lg font-bold">{kpi.formattedValue}</p>
        <div className="flex items-center gap-1 mt-1">
          {kpi.trend === "up" ? <TrendingUp className="w-3 h-3 text-green-500" /> : kpi.trend === "down" ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
          <span className={`text-xs ${kpi.trend === "up" ? "text-green-500" : kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
            {kpi.changePct >= 0 ? "+" : ""}{kpi.changePct}%
          </span>
          <Badge variant="outline" className="text-[8px] ml-auto">{kpi.category}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 truncate" title={kpi.formula}>
          Formula: {kpi.formula}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.insight}</p>
      </CardContent>
    </Card>
  );
};

// â”€â”€ AI-enhanced insights (optional layer) â”€â”€
interface AIEnhancement {
  summary: string;
  recommendations: string[];
  health_alerts: { kpi: string; alert: string; severity: "critical" | "warning" | "info" }[];
}

const KPIIntelligenceLayer = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const [aiEnhancement, setAiEnhancement] = useState<AIEnhancement | null>(null);
  const [loading, setLoading] = useState(false);

  // â”€â”€ Step 1: Always compute local stats first (no AI) â”€â”€
  const profile = useMemo(() => computeDatasetProfile(data, columns, columnTypes), [data, columns, columnTypes]);

  // â”€â”€ Step 2: Optional AI enhancement layer â”€â”€
  const enhanceWithAI = async () => {
    setLoading(true);
    try {
      const compactContext = profileToAIContext(profile);
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "kpi_intelligence",
          data: data.slice(0, 10),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          preComputedStats: compactContext,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      setAiEnhancement({
        summary: res?.summary || res?.result?.summary || "Analysis complete.",
        recommendations: res?.recommendations || res?.result?.recommendations || [],
        health_alerts: res?.health_alerts || res?.result?.health_alerts || [],
      });
      toast.success("AI intelligence layer applied");
    } catch (e: any) {
      toast.error(e.message || "AI enhancement failed â€” local KPIs still available");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                KPI Intelligence Layer
              </CardTitle>
              <CardDescription className="mt-1">
                {profile.kpis.length} KPIs detected from {profile.domainGuess} dataset â€¢ Quality: {profile.dataQualityScore}%
              </CardDescription>
            </div>
            <Button size="sm" onClick={enhanceWithAI} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              {aiEnhancement ? "Refresh AI" : "Enhance with AI"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI Summary */}
      {aiEnhancement && (
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <p className="text-sm text-foreground/90 leading-relaxed">{aiEnhancement.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards â€” always rendered from local stats */}
      {profile.kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profile.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
        </div>
      )}

      {/* Anomaly Summary */}
      {profile.anomalySummary.totalOutliers > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Anomaly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{profile.anomalySummary.totalOutliers} outliers detected ({profile.anomalySummary.outlierRate}% of data)</p>
              <p>Affected columns: {profile.anomalySummary.affectedColumns.join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Correlations */}
      {profile.correlations.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Correlations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {profile.correlations.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded border">
                    <span className="font-medium">{c.col1} â†” {c.col2}</span>
                    <Badge variant={c.strength === "strong" ? "default" : "outline"} className="text-[9px]">
                      r = {c.pearson}
                    </Badge>
                    <span className="text-muted-foreground">{c.strength} {c.direction}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* AI Health Alerts */}
      {aiEnhancement?.health_alerts?.length ? (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiEnhancement.health_alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded border">
                  <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "default" : "secondary"} className="text-[9px] shrink-0">{a.severity}</Badge>
                  <span className="font-medium shrink-0">{a.kpi}:</span>
                  <span className="text-muted-foreground">{a.alert}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* AI Recommendations */}
      {aiEnhancement?.recommendations?.length ? (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiEnhancement.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default KPIIntelligenceLayer;
