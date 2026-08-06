import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Copy, Wand2 } from "lucide-react";
import type { BuilderTile, ChartType } from "./types";
import type { CalculatedField } from "@/lib/formulaEngine";

interface Props {
  tile: BuilderTile;
  columns: string[];
  numericColumns: string[];
  calculatedFields: CalculatedField[];
  onChange: (patch: Partial<BuilderTile>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "kpi", label: "KPI" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "scatter", label: "Scatter" },
  { value: "heatmap", label: "Heatmap" },
  { value: "treemap", label: "Treemap" },
  { value: "funnel", label: "Funnel" },
  { value: "gauge", label: "Gauge" },
  { value: "combo", label: "Combo" },
  { value: "table", label: "Table" },
  { value: "slicer", label: "Slicer" },
  { value: "dateSlicer", label: "Date Slicer" },
];

const FormatPanel = ({ tile, columns, numericColumns, calculatedFields, onChange, onDelete, onDuplicate }: Props) => {
  const needsX = ["bar", "line", "area", "pie", "donut", "treemap", "heatmap", "funnel", "combo"].includes(tile.type);
  const needsY = ["bar", "line", "area", "scatter", "heatmap", "treemap", "funnel", "combo"].includes(tile.type);
  const isKpi = tile.type === "kpi" || tile.type === "gauge";
  const isSlicer = tile.type === "slicer" || tile.type === "dateSlicer";

  const fmt = tile.format || {};

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Selected tile</div>
          <div className="text-sm font-medium truncate">{tile.title || "Untitled"}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete} title="Delete" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="data" className="p-3">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
            <TabsTrigger value="format" className="text-xs">Format</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={tile.title} onChange={e => onChange({ title: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Chart type</Label>
              <Select value={tile.type} onValueChange={(v: ChartType) => onChange({ type: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isKpi && (
              <>
                <div>
                  <Label className="text-xs">Value field</Label>
                  <Select value={tile.valueField || ""} onValueChange={v => onChange({ valueField: v, calcFieldId: undefined })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick column" /></SelectTrigger>
                    <SelectContent>
                      {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {calculatedFields.length > 0 && (
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Wand2 className="h-3 w-3" /> Calculated field</Label>
                    <Select value={tile.calcFieldId || ""} onValueChange={v => onChange({ calcFieldId: v, valueField: undefined })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Use formula" /></SelectTrigger>
                      <SelectContent>
                        {calculatedFields.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Aggregation</Label>
                  <Select value={tile.agg || "sum"} onValueChange={v => onChange({ agg: v as BuilderTile["agg"] })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {needsX && (
              <div>
                <Label className="text-xs">X / Category</Label>
                <Select value={tile.xField || ""} onValueChange={v => onChange({ xField: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick column" /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsY && (
              <div>
                <Label className="text-xs">Y / Value</Label>
                <Select value={tile.yField || ""} onValueChange={v => onChange({ yField: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick numeric column" /></SelectTrigger>
                  <SelectContent>
                    {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tile.type === "combo" && (
              <div>
                <Label className="text-xs">Second Y (line)</Label>
                <Select value={tile.yField2 || ""} onValueChange={v => onChange({ yField2: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tile.type === "heatmap" && (
              <div>
                <Label className="text-xs">Y category (legend)</Label>
                <Select value={tile.legendField || ""} onValueChange={v => onChange({ legendField: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsY && (
              <div>
                <Label className="text-xs">Aggregation</Label>
                <Select value={tile.agg || "sum"} onValueChange={v => onChange({ agg: v as BuilderTile["agg"] })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="min">Min</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSlicer && (
              <div>
                <Label className="text-xs">Filter field</Label>
                <Select value={tile.slicerField || ""} onValueChange={v => onChange({ slicerField: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="format" className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show legend</Label>
              <Switch checked={fmt.showLegend !== false} onCheckedChange={v => onChange({ format: { ...fmt, showLegend: v } })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Data labels</Label>
              <Switch checked={!!fmt.showLabels} onCheckedChange={v => onChange({ format: { ...fmt, showLabels: v } })} />
            </div>
            <div>
              <Label className="text-xs">Legend position</Label>
              <Select value={fmt.legendPosition || "bottom"} onValueChange={v => onChange({ format: { ...fmt, legendPosition: v as "top" | "bottom" } })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Number format</Label>
              <Select value={fmt.numberFormat || "default"} onValueChange={v => onChange({ format: { ...fmt, numberFormat: v as "default" | "compact" | "currency" | "percent" } })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="compact">Compact (1.2k)</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">X-axis label</Label>
              <Input value={fmt.xAxisLabel || ""} onChange={e => onChange({ format: { ...fmt, xAxisLabel: e.target.value } })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Y-axis label</Label>
              <Input value={fmt.yAxisLabel || ""} onChange={e => onChange({ format: { ...fmt, yAxisLabel: e.target.value } })} className="h-8 text-sm" />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-3 mt-3">
            <div className="text-xs text-muted-foreground">
              Layout: <Badge variant="outline">{tile.layout.w}×{tile.layout.h}</Badge>
              <span className="ml-2">at ({tile.layout.x}, {tile.layout.y})</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Drag the corner of the tile on the canvas to resize. Drag the header to move.
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default FormatPanel;
