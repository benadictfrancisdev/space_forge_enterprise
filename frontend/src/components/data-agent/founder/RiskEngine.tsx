import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Shield, ShieldAlert, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  low: "bg-green-500/10 text-green-600 border-green-500/30",
};

const RiskEngine = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const analyze = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("founder_risk", {
        data: data.slice(0, 200), columns, datasetName,
      });
      if (error) throw new Error(error);
      setRisks(result);
    } catch (e: any) {
      toast.error(e.message || "Risk analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!risks) return;
    const sections: any[] = [];
    if (risks.threat_level) {
      sections.push({ title: "Threat Assessment", content: `Threat Level: ${risks.threat_level.toUpperCase()}\n\n${risks.threat_summary || ""}`, type: "text" });
    }
    if (risks.risks) {
      sections.push({
        title: "Identified Risks",
        content: "",
        type: "table",
        tableData: {
          headers: ["Severity", "Risk", "Description", "Mitigation"],
          rows: risks.risks.map((r: any) => [r.severity || "", r.title || "", r.description || "", r.mitigation || ""]),
        },
      });
    }
    exportToPdf({ title: "Risk Analysis Report", datasetName, sections });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Risk Engine</h2>
          <p className="text-sm text-muted-foreground">Identify churn segments, revenue concentration, declining retention</p>
        </div>
        <div className="flex gap-2">
          {risks && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
            {loading ? "Scanning..." : "Scan Risks"}
          </Button>
        </div>
      </div>

      {risks && (
        <>
          {risks.threat_level && (
            <Card className={severityColors[risks.threat_level] || ""}>
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Threat Level: {risks.threat_level.toUpperCase()}</p>
                  <p className="text-sm opacity-80">{risks.threat_summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {risks.risks?.map((risk: any, i: number) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={severityColors[risk.severity] || ""}>
                          {risk.severity}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{risk.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                      {risk.mitigation && (
                        <p className="text-xs text-primary mt-2">
                          <Shield className="w-3 h-3 inline mr-1" />
                          {risk.mitigation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RiskEngine;
