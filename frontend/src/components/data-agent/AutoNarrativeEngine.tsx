import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import { BookOpen, Loader2, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, Download, RefreshCw, Minus } from "lucide-react";

interface AutoNarrativeEngineProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  columnTypes?: Record<string, string>;
}

interface NarrativeResult {
  executive_briefing: string;
  technical_deep_dive?: string;
  what_happened: string;
  why_it_happened: string;
  where_it_happened: string;
  when_it_changed: string;
  what_is_at_risk: string;
  anomaly_chain: { anomaly: string; root_cause: string; segment: string; recommendation: string }[];
  key_metrics: { name: string; value: string; change: string; direction: "up" | "down" | "stable" }[];
  story_sections: { heading: string; content: string; priority: "high" | "medium" | "low" }[];
}

type AudienceRole = "executive" | "technical" | "stakeholder";

const AutoNarrativeEngine = ({ data, columns, datasetName, columnTypes }: AutoNarrativeEngineProps) => {
  const { user } = useAuth();
  const [result, setResult] = useState<NarrativeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AudienceRole>("executive");

  const generate = async () => {
    setLoading(true);
    try {
      const summary = summarizeDataset(data, columns);
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "auto_narrative",
          data: data.slice(0, 100),
          columns,
          datasetName,
          userId: user?.id,
          dataSummary: JSON.stringify(summary),
          audienceRole: role,
        },
      });
      if (error) throw error;
      if (res?.error && !res?.executive_briefing && !res?.data) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      const payload: any = (res?.data && typeof res.data === "object" && (res.data.executive_briefing || res.data.what_happened)) ? res.data : res;

      const toText = (v: unknown): string => {
        if (v == null) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (Array.isArray(v)) return v.map(toText).filter(Boolean).join("\nâ€¢ ");
        if (typeof v === "object") {
          const o = v as Record<string, unknown>;
          const main = o.action ?? o.text ?? o.content ?? o.description ?? o.summary ?? o.title ?? o.finding;
          const meta: string[] = [];
          if (o.expected_outcome) meta.push(`Outcome: ${toText(o.expected_outcome)}`);
          if (o.kpi_to_track) meta.push(`KPI: ${toText(o.kpi_to_track)}`);
          if (o.effort) meta.push(`Effort: ${toText(o.effort)}`);
          if (o.priority) meta.push(`Priority: ${toText(o.priority)}`);
          if (main != null) return meta.length ? `${toText(main)} (${meta.join(" â€¢ ")})` : toText(main);
          return Object.entries(o).map(([k, val]) => `${k}: ${toText(val)}`).join(" â€¢ ");
        }
        return String(v);
      };
      const isMissing = (v: unknown) => {
        const s = toText(v).trim();
        return !s || s === "â€”";
      };

      // Build a minimal data-driven fallback from summary so users never see only labels
      const numericCols = Object.entries(columnTypes || {}).filter(([, t]) => t === "numeric").map(([c]) => c);
      const rowCount = data.length;
      const colCount = columns.length;
      const fallbackWhat = `The dataset "${datasetName}" contains ${rowCount.toLocaleString()} records across ${colCount} columns (${numericCols.slice(0, 4).join(", ")}${numericCols.length > 4 ? ", â€¦" : ""}). Initial profiling shows the data is structured and ready for analysis. Please regenerate to get a full AI narrative.`;
      const fallbackBriefing = `Executive view of "${datasetName}": ${rowCount.toLocaleString()} rows and ${colCount} columns were analyzed. Key numeric drivers detected: ${numericCols.slice(0, 5).join(", ") || "none"}. To get the full structured story (What â†’ Why â†’ Where â†’ When â†’ Risk), click Regenerate â€” the AI will write a multi-paragraph briefing tailored to a ${role} audience.`;

      const safe: NarrativeResult = {
        executive_briefing: !isMissing(payload?.executive_briefing) ? toText(payload.executive_briefing) : (toText(payload?.summary) || fallbackBriefing),
        technical_deep_dive: payload?.technical_deep_dive ? toText(payload.technical_deep_dive) : undefined,
        what_happened: !isMissing(payload?.what_happened) ? toText(payload.what_happened) : fallbackWhat,
        why_it_happened: !isMissing(payload?.why_it_happened) ? toText(payload.why_it_happened) : "Root-cause analysis pending â€” the AI did not return a 'why' paragraph. Click Regenerate to retry; if the issue persists, try a smaller dataset or a different audience role.",
        where_it_happened: !isMissing(payload?.where_it_happened) ? toText(payload.where_it_happened) : "Segment-level breakdown not available in this response. Regenerate to get region/category-level detail.",
        when_it_changed: !isMissing(payload?.when_it_changed) ? toText(payload.when_it_changed) : "Temporal inflection points were not identified in this run. Ensure your dataset has a date column for richer 'when' analysis.",
        what_is_at_risk: !isMissing(payload?.what_is_at_risk) ? toText(payload.what_is_at_risk) : "Forward-looking risk assessment not generated. Regenerate to see projected impact if current trends continue.",
        anomaly_chain: Array.isArray(payload?.anomaly_chain)
          ? payload.anomaly_chain.map((a: any) => ({
              anomaly: toText(a?.anomaly ?? a),
              root_cause: toText(a?.root_cause),
              segment: toText(a?.segment),
              recommendation: toText(a?.recommendation ?? a?.action),
            }))
          : [],
        key_metrics: Array.isArray(payload?.key_metrics)
          ? payload.key_metrics.map((m: any) => ({
              name: toText(m?.name),
              value: toText(m?.value),
              change: toText(m?.change),
              direction: (m?.direction === "up" || m?.direction === "down" || m?.direction === "stable") ? m.direction : "stable",
            }))
          : [],
        story_sections: Array.isArray(payload?.story_sections)
          ? payload.story_sections.map((s: any) => ({
              heading: toText(s?.heading ?? s?.title ?? "Section"),
              content: toText(s?.content ?? s?.body ?? s),
              priority: (s?.priority === "high" || s?.priority === "medium" || s?.priority === "low") ? s.priority : "medium",
            }))
          : [],
      };
      setResult(safe);
      toast.success("Executive briefing generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate narrative");
    } finally {
      setLoading(false);
    }
  };

  const downloadText = () => {
    if (!result) return;
    const sections = [
      `EXECUTIVE BRIEFING: ${datasetName}`,
      "=".repeat(50),
      result.executive_briefing,
      "",
      "STRUCTURED STORY",
      "-".repeat(30),
      `WHAT HAPPENED:\n${result.what_happened}`,
      `\nWHY IT HAPPENED:\n${result.why_it_happened}`,
      `\nWHERE IT HAPPENED:\n${result.where_it_happened}`,
      `\nWHEN IT CHANGED:\n${result.when_it_changed}`,
      `\nWHAT IS AT RISK:\n${result.what_is_at_risk}`,
      "",
      "KEY METRICS",
      "-".repeat(30),
      ...result.key_metrics.map(m => `${m.name}: ${m.value} (${m.change})`),
      "",
      "ANOMALY CHAIN ANALYSIS",
      "-".repeat(30),
      ...result.anomaly_chain.map((a, i) => `${i + 1}. Anomaly: ${a.anomaly}\n   Root Cause: ${a.root_cause}\n   Segment: ${a.segment}\n   Action: ${a.recommendation}`),
    ].join("\n");
    const blob = new Blob([sections], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${datasetName}-executive-briefing.txt`;
    a.click();
  };

  const dirIcon = (d: string) => {
    if (d === "up") return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (d === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                AutoNarrative Engine
              </CardTitle>
              <CardDescription className="mt-1">
                Structured story: What â†’ Why â†’ Where â†’ When â†’ Risk â€” adjusted for audience
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as AudienceRole)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="stakeholder">Stakeholder</SelectItem>
                </SelectContent>
              </Select>
              {result && (
                <Button size="sm" variant="outline" onClick={downloadText}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Export
                </Button>
              )}
              <Button size="sm" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {result ? "Regenerate" : "Generate Briefing"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          {/* Executive Briefing */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Executive Briefing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{result.executive_briefing}</p>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {result.key_metrics?.map((m, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.name}</p>
                  <p className="text-lg font-bold mt-1">{m.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {dirIcon(m.direction)}
                    <span className={`text-xs ${m.direction === "up" ? "text-green-500" : m.direction === "down" ? "text-red-500" : "text-muted-foreground"}`}>{m.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Structured Story: What â†’ Why â†’ Where â†’ When â†’ Risk */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Structured Data Story</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4">
                  {[
                    { label: "What Happened", content: result.what_happened, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                    { label: "Why It Happened", content: result.why_it_happened, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
                    { label: "Where It Happened", content: result.where_it_happened, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                    { label: "When It Changed", content: result.when_it_changed, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
                    { label: "What Is At Risk", content: result.what_is_at_risk, color: "bg-red-500/10 text-red-600 border-red-500/20" },
                  ].filter(s => s.content).map((section, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] ${section.color}`}>{section.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-border">{section.content}</p>
                      {i < 4 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Additional Story Sections */}
          {result.story_sections?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deep Dive Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {result.story_sections.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{s.heading}</h4>
                          <Badge variant="outline" className="text-[9px]">{s.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.content}</p>
                        {i < result.story_sections.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Anomaly Chain */}
          {result.anomaly_chain?.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Anomaly â†’ Root Cause â†’ Action Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.anomaly_chain.map((a, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20 shrink-0">Anomaly</Badge>
                        <p className="text-xs">{a.anomaly}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">Root Cause</Badge>
                        <p className="text-xs text-muted-foreground">{a.root_cause}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0">Segment</Badge>
                        <p className="text-xs text-muted-foreground">{a.segment}</p>
                      </div>
                      <div className="flex items-start gap-2 pl-4">
                        <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20 shrink-0">Action</Badge>
                        <p className="text-xs text-muted-foreground">{a.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Deep Dive (only for technical role) */}
          {result.technical_deep_dive && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Technical Deep Dive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-mono">{result.technical_deep_dive}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AutoNarrativeEngine;
