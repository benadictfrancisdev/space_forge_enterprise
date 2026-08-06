import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Loader2,
  Download,
  Copy,
  Briefcase,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";

interface NarrativeSection {
  heading: string;
  content: string;
  priority: "high" | "medium" | "low";
}

interface Narrative {
  title: string;
  executive_summary: string;
  sections: NarrativeSection[];
  key_takeaways: string[];
  action_items: string[];
  generated_at: string;
  audience: string;
}

interface ExecutiveNarrativeGeneratorProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

const ExecutiveNarrativeGenerator = ({ data, columns, datasetName }: ExecutiveNarrativeGeneratorProps) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [audience, setAudience] = useState("executive");
  const [additionalContext, setAdditionalContext] = useState("");
  const { exportToPdf } = usePdfExport();

  const generate = async () => {
    setIsGenerating(true);
    try {
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "executive_narrative",
          data: data.slice(0, 200),
          columns,
          datasetName,
          audience,
          additionalContext,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      const toText = (v: unknown): string => {
        if (v == null) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(" â€” ");
        if (typeof v === "object") {
          const o = v as Record<string, unknown>;
          // Prefer common content keys
          const main = o.action ?? o.text ?? o.title ?? o.description ?? o.takeaway ?? o.summary;
          const meta: string[] = [];
          if (o.expected_outcome) meta.push(`Outcome: ${toText(o.expected_outcome)}`);
          if (o.kpi_to_track) meta.push(`KPI: ${toText(o.kpi_to_track)}`);
          if (o.effort) meta.push(`Effort: ${toText(o.effort)}`);
          if (o.priority) meta.push(`Priority: ${toText(o.priority)}`);
          if (main) return meta.length ? `${toText(main)} (${meta.join(" â€¢ ")})` : toText(main);
          return Object.entries(o).map(([k, val]) => `${k}: ${toText(val)}`).join(" â€¢ ");
        }
        return String(v);
      };
      const normalizeSection = (s: unknown): NarrativeSection => {
        if (s && typeof s === "object") {
          const o = s as Record<string, unknown>;
          const priority = (o.priority === "high" || o.priority === "medium" || o.priority === "low")
            ? o.priority : "medium";
          return {
            heading: toText(o.heading ?? o.title ?? "Section"),
            content: toText(o.content ?? o.body ?? o.text ?? o),
            priority: priority as "high" | "medium" | "low",
          };
        }
        return { heading: "Section", content: toText(s), priority: "medium" };
      };

      const n: Narrative = {
        title: toText(result?.title) || `${datasetName} - Executive Brief`,
        executive_summary: toText(result?.executive_summary),
        sections: Array.isArray(result?.sections) ? result.sections.map(normalizeSection) : [],
        key_takeaways: Array.isArray(result?.key_takeaways) ? result.key_takeaways.map(toText).filter(Boolean) : [],
        action_items: Array.isArray(result?.action_items) ? result.action_items.map(toText).filter(Boolean) : [],
        generated_at: new Date().toISOString(),
        audience,
      };
      setNarrative(n);

      // Save to memory
      if (user) {
        try {
          await backend.from("business_context_memory").insert({
            user_id: user.id,
            context_type: "narrative",
            dataset_name: datasetName,
            title: n.title,
            content: { executive_summary: n.executive_summary, key_takeaways: n.key_takeaways, audience },
            importance: "high",
            tags: ["narrative", audience, datasetName],
          });
        } catch { /* non-critical */ }
      }

      toast.success("Executive narrative generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate narrative");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!narrative) return;
    const text = [
      narrative.title,
      "",
      "EXECUTIVE SUMMARY",
      narrative.executive_summary,
      "",
      ...narrative.sections.flatMap(s => [s.heading.toUpperCase(), s.content, ""]),
      "KEY TAKEAWAYS",
      ...narrative.key_takeaways.map((t, i) => `${i + 1}. ${t}`),
      "",
      "ACTION ITEMS",
      ...narrative.action_items.map((a, i) => `${i + 1}. ${a}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const exportPdf = () => {
    if (!narrative) return;
    exportToPdf({
      title: narrative.title,
      subtitle: `Generated for ${audience} audience`,
      datasetName,
      statistics: {},
      insights: narrative.key_takeaways.map(t => ({ title: t, description: "", importance: "high" as const })),
      sections: [
        { title: "Executive Summary", content: narrative.executive_summary, type: "text" },
        ...narrative.sections.map(s => ({ title: s.heading, content: s.content, type: "text" as const })),
        { title: "Action Items", type: "list", content: narrative.action_items },
      ],
      recommendations: narrative.action_items,
    });
  };

  const getAudienceIcon = (a: string) => {
    switch (a) {
      case "executive": return <Briefcase className="w-4 h-4" />;
      case "manager": return <Users className="w-4 h-4" />;
      case "board": return <Building2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Executive Narrative Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Target Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">C-Suite Executive</SelectItem>
                <SelectItem value="manager">Department Manager</SelectItem>
                <SelectItem value="board">Board of Directors</SelectItem>
                <SelectItem value="technical">Technical Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Additional Context</Label>
            <Textarea
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="E.g., 'Focus on Q4 performance', 'Highlight customer churn'"
              className="h-[38px] min-h-[38px]"
            />
          </div>
        </div>

        <Button onClick={generate} disabled={isGenerating} className="w-full">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate Narrative
        </Button>

        {narrative && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getAudienceIcon(narrative.audience)}
                <h3 className="text-sm font-semibold">{narrative.title}</h3>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="w-3.5 h-3.5 mr-1" />Copy
                </Button>
                <Button size="sm" variant="outline" onClick={exportPdf}>
                  <Download className="w-3.5 h-3.5 mr-1" />PDF
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="text-sm font-semibold text-primary mb-2">Executive Summary</h4>
                  <p className="text-sm text-foreground leading-relaxed">{narrative.executive_summary}</p>
                </div>

                {narrative.sections.map((section, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium">{section.heading}</h4>
                      <Badge variant={section.priority === "high" ? "default" : "secondary"} className="text-[10px]">
                        {section.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                ))}

                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-semibold mb-2">Key Takeaways</h4>
                  <ul className="space-y-1">
                    {narrative.key_takeaways.map((t, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">â€¢</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-semibold mb-2">Action Items</h4>
                  <ul className="space-y-1">
                    {narrative.action_items.map((a, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutiveNarrativeGenerator;
