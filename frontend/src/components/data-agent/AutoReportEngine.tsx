import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, Download, Loader2, ChevronDown, BarChart3, AlertTriangle,
  TrendingUp, Target, Sparkles, Building2, CheckCircle,
} from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AutoReportEngineProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  pipelineResults?: any;
}

interface ReportSection {
  id: string;
  title: string;
  icon: any;
  content: string;
  data?: any;
}

const AutoReportEngine = ({ data, columns, datasetName, pipelineResults }: AutoReportEngineProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [exportFormat, setExportFormat] = useState<"pdf" | "html">("pdf");
  const [orgName, setOrgName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const generateReport = useCallback(async () => {
    if (!data.length) return;
    setLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "auto_report_narrative",
          data: data.slice(0, 50),
          columns,
          datasetName,
          userId: user?.id,
          pipelineResults: pipelineResults ? {
            insights: pipelineResults.insights,
            anomalyWatch: pipelineResults.anomalyWatch,
            forecast: pipelineResults.forecast,
            rootCause: pipelineResults.rootCause,
            recommendations: pipelineResults.recommendations || pipelineResults.insights?.recommendations,
          } : undefined,
        },
      });

      if (error) throw error;
      if (result?.success === false) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      const reportData = result?.module === "auto_report_narrative" && result?.data ? result.data : (result || {});
      const generated: ReportSection[] = [
        {
          id: "exec_summary",
          title: "Executive Summary",
          icon: Sparkles,
          content: reportData.executive_summary || "This report provides a comprehensive analysis of the dataset with actionable insights and strategic recommendations.",
        },
        {
          id: "kpi_dashboard",
          title: "KPI Dashboard",
          icon: BarChart3,
          content: reportData.kpi_dashboard || "Key performance indicators computed from the dataset.",
          data: reportData.kpis,
        },
        {
          id: "anomalies",
          title: "Anomaly Report",
          icon: AlertTriangle,
          content: reportData.anomaly_report || "Analysis of detected anomalies and outliers in the data.",
          data: reportData.anomalies,
        },
        {
          id: "root_cause",
          title: "Root Cause Analysis",
          icon: Target,
          content: reportData.root_cause_analysis || "Waterfall contribution analysis identifying primary drivers of KPI changes.",
          data: reportData.root_causes,
        },
        {
          id: "forecast",
          title: "Forecast & Projections",
          icon: TrendingUp,
          content: reportData.forecast_section || "Trend projections with confidence bands for key metrics.",
          data: reportData.forecasts,
        },
        {
          id: "recommendations",
          title: "Strategic Recommendations",
          icon: CheckCircle,
          content: reportData.recommendations_section || "Prioritized action items ranked by expected ROI.",
          data: reportData.action_items,
        },
      ];

      setSections(generated);
      setExpandedSections(new Set(generated.map(s => s.id)));
      toast.success("Report generated successfully");
    } catch (err: any) {
      console.error("Report generation failed:", err);
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [data, columns, datasetName, user, pipelineResults]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover page
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 297, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text(orgName || "Data Analysis Report", pageWidth / 2, 100, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184);
    doc.text(datasetName, pageWidth / 2, 120, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 135, { align: "center" });
    doc.text(`${data.length} rows Â· ${columns.length} columns`, pageWidth / 2, 145, { align: "center" });

    // Content pages
    sections.forEach((section, idx) => {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 297, "F");

      // Section header
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(18);
      doc.text(`${idx + 1}. ${section.title}`, 20, 25);
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(1);
      doc.line(20, 30, pageWidth - 20, 30);

      // Section content
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(section.content, pageWidth - 40);
      doc.text(lines, 20, 40);

      // Data table if available
      if (section.data && Array.isArray(section.data) && section.data.length > 0) {
        const startY = 40 + lines.length * 5 + 10;
        const tableData = section.data.slice(0, 10);
        if (typeof tableData[0] === "object") {
          const keys = Object.keys(tableData[0]).slice(0, 5);
          autoTable(doc, {
            startY,
            head: [keys],
            body: tableData.map(row => keys.map(k => String((row as any)[k] ?? "").slice(0, 30))),
            theme: "grid",
            headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 20, right: 20 },
          });
        }
      }
    });

    doc.save(`${datasetName.replace(/\s+/g, "_")}_Auto_Report.pdf`);
    toast.success("PDF exported");
  }, [sections, datasetName, data.length, columns.length, orgName]);

  const exportHTML = useCallback(() => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${orgName || "Data Analysis Report"} - ${datasetName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#334155;line-height:1.6}
    .cover{background:#0f172a;color:white;padding:80px 40px;text-align:center}
    .cover h1{font-size:2.5rem;margin-bottom:0.5rem}
    .cover p{color:#94a3b8;font-size:0.9rem}
    .container{max-width:900px;margin:0 auto;padding:40px 20px}
    .section{background:white;border-radius:12px;padding:32px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    .section h2{font-size:1.25rem;color:#0f172a;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #0d9488}
    .section p{color:#475569;font-size:0.875rem}
    .badge{display:inline-block;background:#0d948820;color:#0d9488;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600}
    .footer{text-align:center;padding:20px;color:#94a3b8;font-size:0.75rem}
  </style>
</head>
<body>
  <div class="cover">
    <h1>${orgName || "Data Analysis Report"}</h1>
    <p>${datasetName} Â· ${data.length} rows Â· ${columns.length} columns</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="container">
    ${sections.map((s, i) => `
    <div class="section">
      <h2><span class="badge">${i + 1}</span> ${s.title}</h2>
      <p>${s.content}</p>
    </div>`).join("")}
  </div>
  <div class="footer">Auto-generated report Â· ${orgName || "SpaceForge"}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${datasetName.replace(/\s+/g, "_")}_Report.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML report downloaded");
  }, [sections, datasetName, data.length, columns.length, orgName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Auto Report Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">One-click structured report from all analyses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Organization name (optional)"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="h-8 text-xs w-48"
          />
          <Button onClick={generateReport} disabled={loading || !data.length} size="sm">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report sections */}
      {sections.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportHTML}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export HTML
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              const isOpen = expandedSections.has(section.id);
              return (
                <Collapsible
                  key={section.id}
                  open={isOpen}
                  onOpenChange={open => {
                    setExpandedSections(prev => {
                      const next = new Set(prev);
                      open ? next.add(section.id) : next.delete(section.id);
                      return next;
                    });
                  }}
                >
                  <Card className="linear-card">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] px-1.5">{idx + 1}</Badge>
                            <Icon className="w-4 h-4 text-primary" />
                            {section.title}
                          </div>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                          {section.content}
                        </p>
                        {section.data && Array.isArray(section.data) && section.data.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {section.data.slice(0, 5).map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-[11px]">
                                <Badge variant="outline" className="text-[8px] shrink-0 mt-0.5">{i + 1}</Badge>
                                <span className="text-foreground">{typeof item === "string" ? item : item.description || item.finding || item.name || JSON.stringify(item)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {sections.length === 0 && !loading && (
        <Card className="linear-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No report generated yet</p>
            <p className="text-xs text-muted-foreground mb-4">Click "Generate Report" to create a structured analysis report from your data</p>
            <div className="flex flex-wrap gap-2 justify-center text-[10px] text-muted-foreground">
              {["Executive Summary", "KPI Dashboard", "Anomalies", "Root Cause", "Forecast", "Recommendations"].map(s => (
                <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoReportEngine;
