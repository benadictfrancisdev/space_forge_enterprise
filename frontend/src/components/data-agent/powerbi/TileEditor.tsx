import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Target,
  Activity,
  Layers,
  GitBranch,
  BarChart,
  BoxSelect,
  Save,
} from "lucide-react";
import type { DashboardTile } from "./DraggableTile";

interface TileEditorProps {
  tile: DashboardTile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: DashboardTile) => void;
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  data: Record<string, unknown>[];
}

const CHART_TYPES = [
  { value: "kpi", label: "KPI Card", icon: Target },
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "area", label: "Area Chart", icon: AreaChart },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChart },
  { value: "combo", label: "Combo Chart", icon: Activity },
  { value: "histogram", label: "Histogram", icon: BarChart },
  { value: "gauge", label: "Gauge", icon: Target },
  { value: "funnel", label: "Funnel", icon: GitBranch },
  { value: "treemap", label: "Treemap", icon: Layers },
  { value: "boxplot", label: "Box Plot", icon: BoxSelect },
] as const;

const POWER_BI_COLORS = [
  "#01B8AA", "#374649", "#FD625E", "#F2C80F", "#5F6B6D",
  "#8AD4EB", "#FE9666", "#A66999", "#3599B8", "#DFBFBF"
];

const TileEditor = ({ tile, open, onOpenChange, onSave, columns, columnTypes, data }: TileEditorProps) => {
  const [editedTile, setEditedTile] = useState<DashboardTile>({ ...tile });

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  const regenerateData = (newType: DashboardTile["type"], xAxis?: string, yAxis?: string) => {
    const xCol = xAxis || editedTile.xAxis || categoricalColumns[0] || columns[0];
    const yCol = yAxis || editedTile.yAxis || editedTile.column || numericColumns[0] || columns[1];

    switch (newType) {
      case "kpi": {
        const values = data.map(row => Number(row[yCol])).filter(v => !isNaN(v));
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const prevAvg = values.length > 1 ? values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1) : avg;
        const change = prevAvg !== 0 ? ((avg - prevAvg) / prevAvg) * 100 : 0;
        return { value: avg, change, data: undefined, column: yCol };
      }
      case "bar": {
        const grouped: Record<string, number[]> = {};
        data.forEach(row => {
          const key = String(row[xCol]);
          if (!grouped[key]) grouped[key] = [];
          const val = Number(row[yCol]);
          if (!isNaN(val)) grouped[key].push(val);
        });
        const chartData = Object.entries(grouped).slice(0, 10).map(([name, values]) => ({
          name,
          value: values.reduce((a, b) => a + b, 0) / values.length
        }));
        return { data: chartData, xAxis: xCol, yAxis: yCol };
      }
      case "line":
      case "area": {
        const chartData = data.slice(0, 50).map((row, i) => ({
          index: i + 1,
          value: Number(row[yCol]) || 0
        }));
        return { data: chartData, column: yCol };
      }
      case "pie": {
        const counts: Record<string, number> = {};
        data.forEach(row => {
          const key = String(row[xCol]);
          counts[key] = (counts[key] || 0) + 1;
        });
        const chartData = Object.entries(counts).slice(0, 8).map(([name, value]) => ({ name, value }));
        return { data: chartData, column: xCol };
      }
      case "scatter": {
        const xNumCol = numericColumns[0] || columns[0];
        const yNumCol = numericColumns[1] || columns[1];
        const chartData = data.slice(0, 100).map(row => ({
          x: Number(row[xNumCol]) || 0,
          y: Number(row[yNumCol]) || 0,
          name: `(${Number(row[xNumCol])?.toFixed(1)}, ${Number(row[yNumCol])?.toFixed(1)})`
        }));
        return { data: chartData, xAxis: xNumCol, yAxis: yNumCol };
      }
      case "histogram": {
        const values = data.map(row => Number(row[yCol])).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 10;
        const binSize = (max - min) / binCount || 1;
        const bins: Record<string, number> = {};
        for (let i = 0; i < binCount; i++) {
          const s = min + i * binSize;
          bins[`${s.toFixed(1)}-${(s + binSize).toFixed(1)}`] = 0;
        }
        values.forEach(val => {
          const idx = Math.min(Math.floor((val - min) / binSize), binCount - 1);
          const s = min + idx * binSize;
          const label = `${s.toFixed(1)}-${(s + binSize).toFixed(1)}`;
          bins[label] = (bins[label] || 0) + 1;
        });
        return { data: Object.entries(bins).map(([name, value]) => ({ name, value })), column: yCol };
      }
      case "gauge": {
        const values = data.map(row => Number(row[yCol])).filter(v => !isNaN(v));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        return { value: (avg / max) * 100, data: [{ value: avg, max }], column: yCol };
      }
      case "funnel": {
        const grouped: Record<string, number> = {};
        data.forEach(row => {
          const key = String(row[xCol]);
          const val = Number(row[yCol]);
          if (!isNaN(val)) grouped[key] = (grouped[key] || 0) + val;
        });
        const chartData = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
        return { data: chartData };
      }
      default:
        return {};
    }
  };

  const handleTypeChange = (newType: string) => {
    const type = newType as DashboardTile["type"];
    const newData = regenerateData(type);
    setEditedTile(prev => ({
      ...prev,
      type,
      ...newData,
      color: prev.color || POWER_BI_COLORS[0],
    }));
  };

  const handleColumnChange = (axis: "x" | "y", col: string) => {
    const xAxis = axis === "x" ? col : editedTile.xAxis;
    const yAxis = axis === "y" ? col : (editedTile.yAxis || editedTile.column);
    const newData = regenerateData(editedTile.type, xAxis || undefined, yAxis || undefined);
    setEditedTile(prev => ({
      ...prev,
      ...(axis === "x" ? { xAxis: col } : { yAxis: col, column: col }),
      ...newData,
    }));
  };

  const handleSave = () => {
    onSave(editedTile);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Tile</DialogTitle>
          <DialogDescription className="text-xs">Change chart type, data columns, and appearance</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={editedTile.title}
              onChange={(e) => setEditedTile(prev => ({ ...prev, title: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          {/* Chart Type Grid */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Chart Type</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {CHART_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleTypeChange(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                    editedTile.type === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Column Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">X-Axis / Category</Label>
              <Select
                value={editedTile.xAxis || editedTile.column || ""}
                onValueChange={(val) => handleColumnChange("x", val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.filter(c => c?.trim()).map(col => (
                    <SelectItem key={col} value={col}>
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {columnTypes[col]?.charAt(0).toUpperCase() || "C"}
                        </Badge>
                        {col}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Y-Axis / Value</Label>
              <Select
                value={editedTile.yAxis || editedTile.column || ""}
                onValueChange={(val) => handleColumnChange("y", val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.filter(c => c?.trim()).map(col => (
                    <SelectItem key={col} value={col}>
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {columnTypes[col]?.charAt(0).toUpperCase() || "C"}
                        </Badge>
                        {col}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Size</Label>
            <div className="flex gap-2">
              {(["small", "medium", "large"] as const).map(size => (
                <Button
                  key={size}
                  variant={editedTile.size === size ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs h-7"
                  onClick={() => setEditedTile(prev => ({ ...prev, size }))}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="flex gap-1.5 flex-wrap">
              {POWER_BI_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditedTile(prev => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    editedTile.color === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Save */}
          <Button onClick={handleSave} className="w-full gap-2" size="sm">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TileEditor;
