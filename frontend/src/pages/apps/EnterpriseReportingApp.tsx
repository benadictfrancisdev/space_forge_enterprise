import { useEffect, useState } from "react";
import { Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlatformDatasets } from "@/hooks/usePlatformDatasets";
import { useDatasetFromQuery } from "@/hooks/useDatasetFromQuery";
import { platformClient } from "@/platform/track13/platformClient";
import type { ReportTypeOption } from "@/platform/track13/contracts";
import { PlatformDatasetPicker } from "@/components/enterprise/PlatformDatasetPicker";
import { ExecutiveBriefCard } from "@/components/enterprise/DecisionResultView";
import { toast } from "sonner";

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EnterpriseReportingApp() {
  const { datasets } = usePlatformDatasets();
  const { datasetId, setDatasetId } = useDatasetFromQuery();
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [reportType, setReportType] = useState("executive");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    platformClient.listReportTypes().then(setReportTypes).catch(() => setReportTypes([]));
  }, []);

  const generate = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      setReport(await platformClient.generateReport(datasetId, reportType));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const schedule = async () => {
    if (!datasetId) return;
    setBusy(true);
    try {
      const { job } = await platformClient.scheduleReport(datasetId, reportType, "daily");
      await platformClient.pollJob(job.id);
      toast.success("Report scheduled and generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadMd = () => {
    if (!report?.markdown) return;
    downloadBlob(String(report.markdown), `${reportType}-report-${datasetId}.md`, "text/markdown");
  };

  const downloadHtml = () => {
    if (!report?.html) return;
    downloadBlob(String(report.html), `${reportType}-report-${datasetId}.html`, "text/html");
  };

  const downloadSlides = () => {
    if (!report?.slides) return;
    downloadBlob(JSON.stringify(report.slides, null, 2), `${reportType}-deck-${datasetId}.json`, "application/json");
  };

  const printPdf = () => {
    if (!report?.html) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(String(report.html));
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enterprise Reporting</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Board, executive, operational, department, and compliance reports with scheduling.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <PlatformDatasetPicker datasets={datasets} value={datasetId} onChange={setDatasetId} />
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Report type" /></SelectTrigger>
          <SelectContent>
            {reportTypes.map((t) => (
              <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={!datasetId || busy}>Generate</Button>
        <Button variant="secondary" onClick={schedule} disabled={!datasetId || busy}>
          <Mail className="h-4 w-4 mr-2" />
          Schedule Daily
        </Button>
        <Button variant="outline" onClick={downloadMd} disabled={!report?.markdown}>
          <Download className="h-4 w-4 mr-2" />
          Markdown
        </Button>
        <Button variant="outline" onClick={downloadHtml} disabled={!report?.html}>HTML</Button>
        <Button variant="outline" onClick={printPdf} disabled={!report?.html}>Print / PDF</Button>
        <Button variant="outline" onClick={downloadSlides} disabled={!report?.slides}>Deck JSON</Button>
      </div>

      {report && (
        <div className="space-y-4">
          <ExecutiveBriefCard brief={(report.content as Record<string, unknown>)?.executive_brief} />
          <Card>
            <CardContent className="pt-6">
              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {String(report.markdown ?? "")}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
