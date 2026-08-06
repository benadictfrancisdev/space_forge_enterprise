import { useEffect, useState } from "react";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileBarChart, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, ArrowRight, Minus, Download } from "lucide-react";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import EnterpriseInsightView from "./EnterpriseInsightView";
import { isUniversalEnvelope, type UniversalEnvelope } from "@/lib/outputEnvelope";
import { recordFinding } from "@/lib/insightMemory";

interface StakeholderReportProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

interface ReportData {
  reportTitle: string;
  executiveSummary: {
    headline: string;
    summary: string;
    bullets?: string[];
    keyMetric: { name: string; value: string; change: string; context: string };
  };
  keyFindings: Array<{
    finding: string;
    impact: string;
    confidence: string;
    icon: string;
  }>;
  performanceSnapshot: {
    metrics: Array<{
      name: string;
      current: string;
      previous: string;
      change: string;
      status: string;
      explanation: string;
    }>;
    overallHealth: string;
    healthExplanation: string;
  };
  trendAnalysis: {
    summary: string;
    trends: Array<{
      name: string;
      direction: string;
      magnitude: string;
      implication: string;
    }>;
  };
  riskAndOpportunities: {
    risks: Array<{ risk: string; severity: string; mitigation: string }>;
    opportunities: Array<{ opportunity: string; potentialValue: string; effort: string }>;
  };
  actionItems: Array<{
    priority: number;
    action: string;
    owner: string;
    timeline: string;
    expectedOutcome: string;
  }>;
  confidenceScore: number;
  dataQualityNote: string;
}

const iconMap: Record<string, React.ReactNode> = {
  "trending-up": <TrendingUp className="w-4 h-4 text-green-400" />,
  "trending-down": <TrendingDown className="w-4 h-4 text-red-400" />,
  "alert": <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  "check": <CheckCircle className="w-4 h-4 text-green-400" />,
  "info": <Info className="w-4 h-4 text-blue-400" />,
};

const statusColor: Record<string, string> = {
  good: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const StakeholderReport = ({ data, columns, datasetName }: StakeholderReportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [enterprise, setEnterprise] = useState<UniversalEnvelope | null>(null);
  const [audience, setAudience] = useState("executive");
  const [focusArea, setFocusArea] = useState("");
  const { user } = useAuth();
  const { exportToPdf } = usePdfExport();
  const history = useFeatureHistory("stakeholder_report", datasetName);

  // Restore last report on mount
  useEffect(() => {
    if (!report && history.latest?.output) {
      const saved = history.latest.output as { report?: ReportData; enterprise?: UniversalEnvelope | null };
      if (saved.report?.reportTitle) setReport(saved.report);
      if (saved.enterprise) setEnterprise(saved.enterprise);
      const summary = history.latest.input_summary as Record<string, string> | undefined;
      if (summary?.audience) setAudience(summary.audience);
      if (summary?.focusArea) setFocusArea(summary.focusArea);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.latest?.id]);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please sign in to generate a stakeholder report.");
      return;
    }
    setIsGenerating(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "stakeholder_report",
          data: data.slice(0, 500),
          columns,
          datasetName,
          audience,
          focusArea: focusArea || undefined,
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) throw error;
      if (result?.success === false) {
        throw new Error(typeof result.error === "string" ? result.error : "Stakeholder report generation failed");
      }

      const reportPayload = result?.module === "stakeholder_report" && result?.data ? result.data : result;
      if (!reportPayload?.reportTitle || !reportPayload?.executiveSummary) {
        throw new Error("Stakeholder report response was incomplete");
      }

      setReport(reportPayload);
      history.save({ report: reportPayload, enterprise: null }, { audience, focusArea }).catch(() => {});
      toast.success(result?.fallback ? "Report generated in fallback mode (AI returned partial data)" : "Stakeholder report generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    exportToPdf({
      title: report.reportTitle,
      subtitle: `Stakeholder Report â€” ${audience}`,
      datasetName,
      sections: [
        { title: "Executive Summary", content: `${report.executiveSummary.headline}\n\n${report.executiveSummary.summary}\n\nKey Metric: ${report.executiveSummary.keyMetric.name} = ${report.executiveSummary.keyMetric.value} (${report.executiveSummary.keyMetric.change})`, type: "text" },
        { title: "Key Findings", content: report.keyFindings.map(f => `${f.finding} â€” Impact: ${f.impact} (Confidence: ${f.confidence})`), type: "list" },
        {
          title: "Performance Snapshot",
          content: `Overall Health: ${report.performanceSnapshot.overallHealth}`,
          type: "table",
          tableData: {
            headers: ["Metric", "Current", "Previous", "Change", "Status"],
            rows: report.performanceSnapshot.metrics.map(m => [m.name, m.current, m.previous, m.change, m.status]),
          },
        },
        ...(report.trendAnalysis ? [{
          title: "Trend Analysis",
          content: [report.trendAnalysis.summary, ...report.trendAnalysis.trends.map(t => `${t.name}: ${t.direction} (${t.magnitude}) â€” ${t.implication}`)],
          type: "list" as const,
        }] : []),
        { title: "Risks", content: report.riskAndOpportunities.risks.map(r => `[${r.severity}] ${r.risk} â€” Mitigation: ${r.mitigation}`), type: "list" },
        { title: "Opportunities", content: report.riskAndOpportunities.opportunities.map(o => `${o.opportunity} â€” Value: ${o.potentialValue}, Effort: ${o.effort}`), type: "list" },
        {
          title: "Action Items",
          content: "",
          type: "table",
          tableData: {
            headers: ["#", "Action", "Owner", "Timeline", "Expected Outcome"],
            rows: report.actionItems.map(a => [String(a.priority), a.action, a.owner, a.timeline, a.expectedOutcome]),
          },
        },
      ],
      footer: report.dataQualityNote,
    });
  };

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <FileBarChart className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-1">Stakeholder Report</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Auto-generate executive summaries with plain-language insights, performance snapshots, and prioritized action items.
            </p>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Report Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">C-Suite / Executive</SelectItem>
                    <SelectItem value="manager">Department Manager</SelectItem>
                    <SelectItem value="analyst">Data Analyst / Technical</SelectItem>
                    <SelectItem value="board">Board of Directors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Focus Area (optional)</Label>
                <Input
                  placeholder="e.g., Revenue growth, Customer retention"
                  value={focusArea}
                  onChange={e => setFocusArea(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Report...</>
              ) : (
                <><FileBarChart className="w-4 h-4 mr-2" />Generate Stakeholder Report</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title & Confidence */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{report.reportTitle}</h2>
        <Badge variant="outline" className="text-xs">
          Confidence: {((report.confidenceScore ?? 0) * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* Enterprise envelope (Databricks-grade briefing) */}
      {enterprise && (
        <EnterpriseInsightView envelope={enterprise} title="Board Briefing" module="stakeholder_report" />
      )}

      {/* Executive Summary */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="py-5">
          <p className="text-lg font-semibold mb-2">{report.executiveSummary.headline}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{report.executiveSummary.summary}</p>

          {/* Executive Bullets (5-7 high-impact bullets) */}
          {Array.isArray(report.executiveSummary.bullets) && report.executiveSummary.bullets.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {report.executiveSummary.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-1">â€¢</span>
                  <span className="text-foreground/90 leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="inline-flex items-center gap-3 p-3 bg-background/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">{report.executiveSummary.keyMetric.name}</p>
              <p className="text-2xl font-bold">{report.executiveSummary.keyMetric.value}</p>
            </div>
            <Badge className={report.executiveSummary.keyMetric.change?.startsWith("+") ? statusColor.good : statusColor.critical}>
              {report.executiveSummary.keyMetric.change}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{report.executiveSummary.keyMetric.context}</p>
        </CardContent>
      </Card>

      {/* Key Findings */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Key Findings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {report.keyFindings.map((f, i) => (
            <div key={i} className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-start gap-2">
                {iconMap[f.icon] || <Info className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.finding}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.impact}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{f.confidence}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Snapshot */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Performance Snapshot</CardTitle>
            <Badge className={statusColor[report.performanceSnapshot.overallHealth === "strong" ? "good" : report.performanceSnapshot.overallHealth === "moderate" ? "warning" : "critical"]}>
              {report.performanceSnapshot.overallHealth}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.performanceSnapshot.metrics.map((m, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg">
                <p className="text-xs text-muted-foreground">{m.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-semibold">{m.current}</span>
                  <Badge className={`text-xs ${statusColor[m.status] || statusColor.good}`}>{m.change}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.explanation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trends */}
      {report.trendAnalysis && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Trend Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{report.trendAnalysis.summary}</p>
            {report.trendAnalysis.trends.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {t.direction === "improving" ? <TrendingUp className="w-4 h-4 text-green-400" /> : t.direction === "declining" ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-muted-foreground"> â€” {t.magnitude}. {t.implication}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risks & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" />Risks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.riskAndOpportunities.risks.map((r, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{r.risk}</span>
                  <Badge className={statusColor[r.severity === "high" ? "critical" : r.severity === "medium" ? "warning" : "good"]} >{r.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.mitigation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.riskAndOpportunities.opportunities.map((o, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg">
                <p className="text-sm font-medium">{o.opportunity}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">Value: {o.potentialValue}</Badge>
                  <Badge variant="outline" className="text-xs">Effort: {o.effort}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Prioritized Action Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {report.actionItems.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {a.priority}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{a.action}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{a.owner}</Badge>
                  <Badge variant="outline" className="text-xs">{a.timeline}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />{a.expectedOutcome}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Quality Note */}
      <p className="text-xs text-muted-foreground text-center">{report.dataQualityNote}</p>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => setReport(null)}>
          <FileBarChart className="w-4 h-4 mr-2" />Generate New Report
        </Button>
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-2" />Download PDF
        </Button>
      </div>
    </div>
  );
};

export default StakeholderReport;
