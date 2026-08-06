import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, BookOpen, Download } from "lucide-react";
import { safeInvoke } from "@/services/api";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const ResearchPaperGenerator = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState<any>(null);
  const { exportToPdf } = usePdfExport();

  const generate = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await safeInvoke("scientist_paper", {
        data: data.slice(0, 200), columns, datasetName,
      });
      if (error) throw new Error(error);
      setPaper(result);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!paper) return;
    const sectionKeys = [
      { key: "abstract", title: "Abstract" },
      { key: "introduction", title: "1. Introduction" },
      { key: "methodology", title: "2. Methodology" },
      { key: "results", title: "3. Results" },
      { key: "discussion", title: "4. Discussion" },
      { key: "conclusion", title: "5. Conclusion" },
    ];
    const sections = sectionKeys
      .filter(({ key }) => paper[key])
      .map(({ key, title }) => ({ title, content: paper[key], type: "text" as const }));
    if (paper.references) {
      sections.push({ title: "References", content: paper.references.map((r: string, i: number) => `[${i + 1}] ${r}`), type: "list" as any });
    }
    exportToPdf({
      title: paper.title || "Research Paper",
      subtitle: paper.authors || "",
      datasetName,
      sections,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Research Paper Generator</h2>
          <p className="text-sm text-muted-foreground">Generate Abstract, Methodology, Results, Conclusion</p>
        </div>
        <div className="flex gap-2">
          {paper && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          )}
          <Button onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
            {loading ? "Writing..." : "Generate Paper"}
          </Button>
        </div>
      </div>

      {paper && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{paper.title}</CardTitle></CardHeader>
            <CardContent>
              {paper.authors && <p className="text-xs text-muted-foreground mb-2">{paper.authors}</p>}
            </CardContent>
          </Card>

          {[
            { key: "abstract", title: "Abstract" },
            { key: "introduction", title: "1. Introduction" },
            { key: "methodology", title: "2. Methodology" },
            { key: "results", title: "3. Results" },
            { key: "discussion", title: "4. Discussion" },
            { key: "conclusion", title: "5. Conclusion" },
          ].map(({ key, title }) => (
            paper[key] && (
              <Card key={key}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{paper[key]}</p>
                </CardContent>
              </Card>
            )
          ))}

          {paper.references && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">References</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {paper.references.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">[{i + 1}] {r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchPaperGenerator;
