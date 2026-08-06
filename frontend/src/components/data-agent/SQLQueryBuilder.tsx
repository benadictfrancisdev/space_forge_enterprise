import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Terminal,
  Copy,
  Check,
  Loader2,
  Clock,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Lightbulb,
} from "lucide-react";

interface SQLQueryBuilderProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface QueryResult {
  id: string;
  question: string;
  sql: string;
  explanation: string;
  queryType: string;
  optimisationNotes: string[];
  simulatedResults: Record<string, unknown>[];
  timestamp: Date;
}

const EXAMPLE_PROMPTS = [
  "Top 10 rows by the highest numeric column",
  "Total and average of each numeric column",
  "Count of unique values in each text column",
  "Find rows where any numeric value is above average",
  "Group by the first text column and sum all numbers",
];

function simulateQuery(
  data: Record<string, unknown>[],
  question: string,
  columns: string[],
  columnTypes: Record<string, string>
): Record<string, unknown>[] {
  const q = question.toLowerCase();
  const numericCols = columns.filter((c) => columnTypes[c] === "numeric");
  const categoricalCols = columns.filter((c) => columnTypes[c] !== "numeric");

  // "top N" pattern
  const topMatch = q.match(/top\s+(\d+)/);
  if (topMatch && numericCols.length > 0) {
    const n = parseInt(topMatch[1], 10);
    const sortCol = numericCols[0];
    return [...data]
      .sort((a, b) => Number(b[sortCol] || 0) - Number(a[sortCol] || 0))
      .slice(0, n);
  }

  // "average" or "total" â†’ aggregate
  if (q.includes("average") || q.includes("total") || q.includes("sum") || q.includes("mean")) {
    const agg: Record<string, unknown> = {};
    for (const col of numericCols) {
      const vals = data.map((r) => Number(r[col] || 0));
      agg[`sum_${col}`] = vals.reduce((a, b) => a + b, 0);
      agg[`avg_${col}`] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
    }
    return [agg];
  }

  // "count" or "unique"
  if (q.includes("count") || q.includes("unique")) {
    return categoricalCols.map((col) => ({
      column: col,
      unique_values: new Set(data.map((r) => r[col])).size,
      total_rows: data.length,
    }));
  }

  // "group by"
  if (q.includes("group") && categoricalCols.length > 0) {
    const groupCol = categoricalCols[0];
    const groups: Record<string, Record<string, number>> = {};
    for (const row of data) {
      const key = String(row[groupCol] || "Unknown");
      if (!groups[key]) groups[key] = {};
      for (const nc of numericCols) {
        groups[key][nc] = (groups[key][nc] || 0) + Number(row[nc] || 0);
      }
    }
    return Object.entries(groups).map(([k, v]) => ({ [groupCol]: k, ...v }));
  }

  // fallback: first 10 rows
  return data.slice(0, 10);
}

const SQLQueryBuilder = ({ data, columns, columnTypes, datasetName }: SQLQueryBuilderProps) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [activeResult, setActiveResult] = useState<QueryResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const runQuery = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);

      try {
        const sampleData = data.slice(0, 5);
        const { data: res, error } = await backend.functions.invoke("data-agent", {
          body: {
            action: "nl_to_sql",
            data: sampleData,
            columns,
            columnTypes,
            datasetName,
            query: q.trim(),
            userId: user?.id,
          },
        });

        if (error) throw error;
        if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");

        const simulated = simulateQuery(data, q, columns, columnTypes);

        const result: QueryResult = {
          id: crypto.randomUUID(),
          question: q.trim(),
          sql: res?.sql || "-- No SQL generated",
          explanation: res?.explanation || "No explanation available.",
          queryType: res?.query_type || "SELECT",
          optimisationNotes: res?.optimisation_notes || [],
          simulatedResults: simulated.slice(0, 20),
          timestamp: new Date(),
        };

        setActiveResult(result);
        setHistory((prev) => [result, ...prev].slice(0, 20));
        toast.success("SQL generated successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to generate SQL");
      } finally {
        setLoading(false);
      }
    },
    [data, columns, columnTypes, datasetName, user?.id]
  );

  const handleCopy = () => {
    if (!activeResult) return;
    navigator.clipboard.writeText(activeResult.sql);
    setCopied(true);
    toast.success("SQL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeResult) return;
    const report = `-- Question: ${activeResult.question}\n-- Type: ${activeResult.queryType}\n-- Generated: ${activeResult.timestamp.toISOString()}\n\n${activeResult.sql}\n\n-- Explanation:\n-- ${activeResult.explanation.replace(/\n/g, "\n-- ")}\n${
      activeResult.optimisationNotes.length
        ? "\n-- Optimisation Notes:\n" + activeResult.optimisationNotes.map((n) => `-- â€¢ ${n}`).join("\n")
        : ""
    }`;
    const blob = new Blob([report], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SQL file downloaded");
  };

  const resultCols = activeResult?.simulatedResults?.[0]
    ? Object.keys(activeResult.simulatedResults[0])
    : [];

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            Natural Language â†’ SQL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Describe what you want in plain Englishâ€¦ e.g. 'Top 10 products by revenue excluding returns'"
            className="min-h-[80px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runQuery(question);
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setQuestion(p);
                  runQuery(p);
                }}
                className="px-2.5 py-1 rounded-full text-[11px] bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => runQuery(question)} disabled={loading || !question.trim()}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Generate SQL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {activeResult && (
        <div className="space-y-4">
          {/* SQL Output */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">Generated SQL</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {activeResult.queryType}
                </Badge>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground">
                {activeResult.sql}
              </pre>
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{activeResult.explanation}</p>
              {activeResult.optimisationNotes.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/30 space-y-1">
                  <p className="text-[11px] font-semibold text-foreground">Optimisation Notes</p>
                  {activeResult.optimisationNotes.map((note, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">â€¢ {note}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simulated Results */}
          {resultCols.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Result Preview ({activeResult.simulatedResults.length} rows)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {resultCols.map((col) => (
                          <TableHead key={col} className="text-[11px] font-semibold whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeResult.simulatedResults.map((row, i) => (
                        <TableRow key={i}>
                          {resultCols.map((col) => (
                            <TableCell key={col} className="text-[11px] whitespace-nowrap">
                              {String(row[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Query History ({history.length})
              </CardTitle>
              {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </CardHeader>
          {historyOpen && (
            <CardContent className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs font-medium text-foreground truncate">{item.question}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()} Â· {item.queryType}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setActiveResult(item);
                      setQuestion(item.question);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default SQLQueryBuilder;
