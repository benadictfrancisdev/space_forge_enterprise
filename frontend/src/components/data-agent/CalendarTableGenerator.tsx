import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, Copy, Download } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import FeatureGate from "./FeatureGate";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

const CalendarTableGenerator = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [selectedDateCol, setSelectedDateCol] = useState("");
  const [sqlOutput, setSqlOutput] = useState("");
  const [relationships, setRelationships] = useState<string[]>([]);

  const dateColumns = useMemo(() => {
    return columns.filter(col => {
      const samples = data.slice(0, 20).map(r => r[col]);
      return samples.some(v => {
        if (!v || typeof v !== "string") return false;
        const d = new Date(v as string);
        return !isNaN(d.getTime()) && v.toString().length > 6;
      });
    });
  }, [data, columns]);

  const generate = async () => {
    if (!selectedDateCol) {
      toast.error("Select a date column");
      return;
    }
    setLoading(true);
    try {
      const sampleDates = data.slice(0, 50).map(r => r[selectedDateCol]);
      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "calendar_table",
          data: sampleDates.map(d => ({ [selectedDateCol]: d })),
          columns: [selectedDateCol],
          datasetName,
          targetColumn: selectedDateCol,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      const parsed = typeof result?.result === "string" ? JSON.parse(result.result) : result?.result;
      if (parsed?.sql) {
        setSqlOutput(parsed.sql);
        setRelationships(parsed.relationships || []);
        toast.success("Calendar table DDL generated");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate calendar table");
    } finally {
      setLoading(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(sqlOutput);
    toast.success("SQL copied to clipboard");
  };

  return (
    <FeatureGate feature="Calendar Table Generator" creditCost={1} requiredPlan="standard">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Calendar Table Auto-Generator
              <Badge variant="outline" className="ml-auto text-[10px]">STANDARD+</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Auto-build calendar/date-dimension table with Year, Quarter, Month, Week, Day fields. 
              Enables time-shifted comparisons.
            </p>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Column</label>
              <Select value={selectedDateCol} onValueChange={setSelectedDateCol}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select date column" /></SelectTrigger>
                <SelectContent>
                  {dateColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  {dateColumns.length === 0 && <SelectItem value="_none" disabled>No date columns detected</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={generate} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Generating...</> : "Generate Calendar Table"}
            </Button>
          </CardContent>
        </Card>

        {sqlOutput && (
          <Card className="linear-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Generated DDL</CardTitle>
              <Button size="sm" variant="ghost" onClick={copySQL} className="h-7 text-xs">
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-[10px] font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-64 whitespace-pre-wrap">
                {sqlOutput}
              </pre>
              {relationships.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold">Relationships</p>
                  {relationships.map((r, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">â€¢ {r}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
};

export default CalendarTableGenerator;
