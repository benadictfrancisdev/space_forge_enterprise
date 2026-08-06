import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const InvestorReport = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const generate = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("founder_investor", {
        data: data.slice(0, 200), columns, datasetName,
      });
      if (error) throw new Error(error);
      setReport(result);
    } catch (e: any) {
      toast.error(e.message || "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!report) return;
    const sections: any[] = [
      { title: "Executive Summary", content: report.executive_summary || "", type: "text" },
    ];
    if (report.metrics_summary) {
      sections.push({
        title: "Key Metrics",
        content: "",
        type: "table",
        tableData: {
          headers: ["Metric", "Value", "Change"],
          rows: report.metrics_summary.map((m: any) => [m.name || "", m.value || "", m.change || ""]),
        },
      });
    }
    if (report.swot) {
      for (const key of ["strengths", "weaknesses", "opportunities", "threats"]) {
        if (report.swot[key]) {
          sections.push({ title: key.charAt(0).toUpperCase() + key.slice(1), content: report.swot[key], type: "list" });
        }
      }
    }
    if (report.growth_narrative) {
      sections.push({ title: "Growth Narrative", content: report.growth_narrative, type: "text" });
    }
    exportToPdf({ title: report.title || "Investor Report", subtitle: "Investor Report", datasetName, sections });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Investor Report</h2>
          <p className="text-sm text-muted-foreground">One-click investor deck with metrics, narrative, SWOT</p>
        </div>
        <div className="flex gap-2">
          {report && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </div>
      </div>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.executive_summary}</p>
            </CardContent>
          </Card>

          {report.metrics_summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {report.metrics_summary.map((m: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase">{m.name}</p>
                    <p className="text-xl font-bold text-foreground">{m.value}</p>
                    {m.change && <p className="text-xs text-primary">{m.change}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {report.swot && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["strengths", "weaknesses", "opportunities", "threats"].map((key) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize">{key}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {report.swot[key]?.map((item: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {report.growth_narrative && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Growth Narrative</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{report.growth_narrative}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default InvestorReport;
