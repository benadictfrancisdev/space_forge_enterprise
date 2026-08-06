import { useMemo } from "react";
import type { BuilderTile, ChartType } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Plus } from "lucide-react";

interface Props {
  rows: Record<string, unknown>[];
  columns: string[];
  onAdd: (tile: BuilderTile) => void;
}

function classify(rows: Record<string, unknown>[], col: string) {
  const sample = rows.slice(0, 100).map(r => r[col]).filter(v => v != null);
  if (!sample.length) return "empty";
  const numericCount = sample.filter(v => !Number.isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.8) return "numeric";
  const dateCount = sample.filter(v => !Number.isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";
  const unique = new Set(sample.map(String)).size;
  if (unique <= 30) return "categorical";
  return "text";
}

const id = () => Math.random().toString(36).slice(2, 9);

const SmartSuggestPanel = ({ rows, columns, onAdd }: Props) => {
  const suggestions = useMemo(() => {
    if (!rows.length) return [];
    const types: Record<string, string> = {};
    columns.forEach(c => { types[c] = classify(rows, c); });
    const numerics = columns.filter(c => types[c] === "numeric");
    const cats = columns.filter(c => types[c] === "categorical");
    const dates = columns.filter(c => types[c] === "date");

    const out: { label: string; tile: BuilderTile }[] = [];
    if (numerics[0]) out.push({
      label: `KPI · Sum of ${numerics[0]}`,
      tile: { id: id(), type: "kpi", title: `Total ${numerics[0]}`, valueField: numerics[0], agg: "sum", layout: { x: 0, y: 0, w: 3, h: 2 } },
    });
    if (dates[0] && numerics[0]) out.push({
      label: `Line · ${numerics[0]} over ${dates[0]}`,
      tile: { id: id(), type: "line", title: `${numerics[0]} trend`, xField: dates[0], yField: numerics[0], agg: "sum", layout: { x: 0, y: 0, w: 6, h: 4 } },
    });
    if (cats[0] && numerics[0]) out.push({
      label: `Bar · ${numerics[0]} by ${cats[0]}`,
      tile: { id: id(), type: "bar", title: `${numerics[0]} by ${cats[0]}`, xField: cats[0], yField: numerics[0], agg: "sum", layout: { x: 0, y: 0, w: 6, h: 4 } },
    });
    if (cats[0] && numerics[0]) out.push({
      label: `Pie · ${numerics[0]} by ${cats[0]}`,
      tile: { id: id(), type: "pie", title: `${cats[0]} share`, xField: cats[0], yField: numerics[0], agg: "sum", layout: { x: 0, y: 0, w: 4, h: 4 } },
    });
    if (numerics[0] && numerics[1]) out.push({
      label: `Scatter · ${numerics[0]} vs ${numerics[1]}`,
      tile: { id: id(), type: "scatter", title: `${numerics[0]} vs ${numerics[1]}`, xField: numerics[0], yField: numerics[1], layout: { x: 0, y: 0, w: 5, h: 4 } },
    });
    return out.slice(0, 6);
  }, [rows, columns]);

  if (!suggestions.length) {
    return <div className="text-xs text-muted-foreground p-2">Load data to see AI suggestions.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs flex items-center gap-1 text-muted-foreground"><Sparkles className="h-3 w-3 text-primary" /> Smart suggestions</div>
      {suggestions.map((s, i) => (
        <Card key={i} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/40 cursor-pointer" onClick={() => onAdd(s.tile)}>
          <div className="text-xs truncate">{s.label}</div>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0"><Plus className="h-3 w-3" /></Button>
        </Card>
      ))}
    </div>
  );
};

export default SmartSuggestPanel;
