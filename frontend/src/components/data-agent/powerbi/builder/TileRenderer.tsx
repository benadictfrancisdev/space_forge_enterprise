import { useMemo } from "react";
import {
  Bar, BarChart, Line, LineChart, Area, AreaChart, Pie, PieChart, Cell,
  Scatter, ScatterChart, Treemap, Funnel, FunnelChart, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBar, RadialBarChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import type { BuilderTile, DashboardTheme } from "./types";
import { evaluateFormula } from "@/lib/formulaEngine";
import type { CalculatedField } from "@/lib/formulaEngine";

interface Props {
  tile: BuilderTile;
  rows: Record<string, unknown>[];
  theme: DashboardTheme;
  calculatedFields: CalculatedField[];
  onSlicerChange?: (tileId: string, value: unknown) => void;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function aggregateBy(rows: Record<string, unknown>[], xField: string, yField: string, agg: string) {
  const groups: Record<string, number[]> = {};
  for (const r of rows) {
    const key = String(r[xField] ?? "—");
    if (!groups[key]) groups[key] = [];
    groups[key].push(num(r[yField]));
  }
  return Object.entries(groups).map(([k, vals]) => {
    let v = 0;
    if (agg === "sum") v = vals.reduce((a, b) => a + b, 0);
    else if (agg === "avg") v = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    else if (agg === "min") v = Math.min(...vals);
    else if (agg === "max") v = Math.max(...vals);
    else v = vals.length;
    return { name: k, value: v, [yField]: v };
  });
}

function formatNumber(v: number, fmt?: string) {
  if (!Number.isFinite(v)) return "—";
  if (fmt === "compact") return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  if (fmt === "currency") return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  if (fmt === "percent") return `${v.toFixed(1)}%`;
  return new Intl.NumberFormat("en").format(Math.round(v * 100) / 100);
}

const TileRenderer = ({ tile, rows, theme, calculatedFields, onSlicerChange }: Props) => {
  const palette = theme.palette;
  const fmt = tile.format || {};

  const data = useMemo(() => {
    if (!tile.xField || !tile.yField) return [];
    return aggregateBy(rows, tile.xField, tile.yField, tile.agg || "sum").slice(0, 50);
  }, [rows, tile.xField, tile.yField, tile.agg]);

  // KPI / gauge value (calculated field aware)
  const kpiValue = useMemo(() => {
    if (tile.calcFieldId) {
      const cf = calculatedFields.find(c => c.id === tile.calcFieldId);
      if (cf) {
        try { return Number(evaluateFormula(cf.formula, rows)); } catch { return 0; }
      }
    }
    if (!tile.valueField) return 0;
    const vals = rows.map(r => num(r[tile.valueField!]));
    if (tile.agg === "avg") return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    if (tile.agg === "min") return Math.min(...vals);
    if (tile.agg === "max") return Math.max(...vals);
    if (tile.agg === "count") return vals.length;
    return vals.reduce((a, b) => a + b, 0);
  }, [rows, tile, calculatedFields]);

  const showLegend = fmt.showLegend !== false;
  const legendPos = fmt.legendPosition || "bottom";

  const renderEmpty = (msg: string) => (
    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
      {msg}
    </div>
  );

  switch (tile.type) {
    case "kpi":
      return (
        <div className="h-full w-full flex flex-col justify-center px-4">
          <div className="text-xs text-muted-foreground">{tile.title}</div>
          <div className="text-3xl font-bold tracking-tight mt-1">
            {formatNumber(kpiValue, fmt.numberFormat)}
          </div>
          {tile.valueField && (
            <div className="text-[10px] text-muted-foreground mt-1">
              {tile.agg || "sum"} of {tile.valueField}
            </div>
          )}
        </div>
      );

    case "bar":
      if (!data.length) return renderEmpty("Pick X & Y fields");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            {showLegend && <Legend verticalAlign={legendPos === "top" ? "top" : "bottom"} wrapperStyle={{ fontSize: 11 }} />}
            <Bar dataKey="value" fill={palette[0]} radius={[4, 4, 0, 0]}>
              {fmt.showLabels && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      if (!data.length) return renderEmpty("Pick X & Y fields");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      if (!data.length) return renderEmpty("Pick X & Y fields");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={palette[0]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={palette[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke={palette[0]} fill={`url(#grad-${tile.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "donut":
      if (!data.length) return renderEmpty("Pick category & value");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%"
              innerRadius={tile.type === "donut" ? "55%" : 0}
              outerRadius="80%"
              label={fmt.showLabels ? ({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%` : false}
            >
              {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter":
      if (!tile.xField || !tile.yField) return renderEmpty("Pick X & Y");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" dataKey={tile.xField} name={tile.xField} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey={tile.yField} name={tile.yField} tick={{ fontSize: 10 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Scatter data={rows.slice(0, 500)} fill={palette[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "treemap":
      if (!data.length) return renderEmpty("Pick fields");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={data} dataKey="value" nameKey="name" stroke="hsl(var(--background))" fill={palette[0]} />
        </ResponsiveContainer>
      );

    case "heatmap": {
      // Simple matrix: x = xField, y = legendField, value aggregated
      if (!tile.xField || !tile.legendField || !tile.yField) return renderEmpty("Pick X, Legend, Value");
      const xVals = Array.from(new Set(rows.map(r => String(r[tile.xField!])))).slice(0, 12);
      const yVals = Array.from(new Set(rows.map(r => String(r[tile.legendField!])))).slice(0, 12);
      const matrix: number[][] = yVals.map(y => xVals.map(x => {
        const subset = rows.filter(r => String(r[tile.xField!]) === x && String(r[tile.legendField!]) === y);
        const sum = subset.reduce((a, r) => a + num(r[tile.yField!]), 0);
        return sum;
      }));
      const max = Math.max(1, ...matrix.flat());
      return (
        <div className="h-full w-full p-2 overflow-auto">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${xVals.length}, minmax(28px, 1fr))` }}>
            <div />
            {xVals.map(x => <div key={x} className="text-[9px] text-muted-foreground text-center truncate">{x}</div>)}
            {yVals.map((y, i) => (
              <>
                <div key={`y-${y}`} className="text-[9px] text-muted-foreground truncate pr-1">{y}</div>
                {matrix[i].map((v, j) => (
                  <div key={`${i}-${j}`}
                    className="aspect-square rounded-sm flex items-center justify-center text-[8px] text-foreground/80"
                    style={{ background: `hsl(var(--primary) / ${0.1 + (v / max) * 0.8})` }}
                    title={`${y} × ${xVals[j]}: ${formatNumber(v, fmt.numberFormat)}`}
                  >{v > 0 ? formatNumber(v, "compact") : ""}</div>
                ))}
              </>
            ))}
          </div>
        </div>
      );
    }

    case "funnel":
      if (!data.length) return renderEmpty("Pick fields");
      return (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={data} isAnimationActive>
              {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" style={{ fontSize: 10 }} />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );

    case "gauge": {
      const v = kpiValue;
      const max = 100;
      const pct = Math.min(100, Math.max(0, (v / max) * 100));
      const gaugeData = [{ name: "v", value: pct, fill: palette[0] }];
      return (
        <div className="h-full w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="65%" outerRadius="90%" data={gaugeData} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" background cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-end justify-center pb-4 text-xl font-bold">
            {formatNumber(v, fmt.numberFormat)}
          </div>
        </div>
      );
    }

    case "combo": {
      if (!tile.xField || !tile.yField) return renderEmpty("Pick X & Y");
      const d = aggregateBy(rows, tile.xField, tile.yField, tile.agg || "sum").slice(0, 30);
      const d2 = tile.yField2 ? aggregateBy(rows, tile.xField, tile.yField2, tile.agg || "sum") : [];
      const merged = d.map((row, i) => ({ ...row, value2: d2[i]?.value || 0 }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <Bar dataKey="value" fill={palette[0]} name={tile.yField} />
            <Line type="monotone" dataKey="value2" stroke={palette[1]} strokeWidth={2} name={tile.yField2 || ""} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "table": {
      const cols = Object.keys(rows[0] || {}).slice(0, 6);
      const display = rows.slice(0, 50);
      return (
        <div className="h-full w-full overflow-auto text-xs">
          <table className="w-full">
            <thead className="sticky top-0 bg-background">
              <tr>
                {cols.map(c => <th key={c} className="text-left px-2 py-1 font-medium border-b">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {display.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {cols.map(c => <td key={c} className="px-2 py-1 border-b border-border/40 truncate max-w-[160px]">{String(r[c] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "slicer": {
      if (!tile.slicerField) return renderEmpty("Pick a field");
      const opts = Array.from(new Set(rows.map(r => String(r[tile.slicerField!])))).slice(0, 20);
      return (
        <div className="h-full w-full p-2 overflow-auto">
          <div className="text-[10px] text-muted-foreground mb-1">{tile.slicerField}</div>
          <Input placeholder="Search…" className="h-7 text-xs mb-2" onChange={e => onSlicerChange?.(tile.id, { search: e.target.value })} />
          <div className="space-y-1">
            {opts.map(o => (
              <label key={o} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 px-1 py-0.5 rounded">
                <Checkbox onCheckedChange={(checked) => onSlicerChange?.(tile.id, { value: o, checked })} />
                <span className="truncate">{o}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    case "dateSlicer": {
      return (
        <div className="h-full w-full p-3 flex flex-col gap-2 justify-center">
          <div className="text-[10px] text-muted-foreground">{tile.slicerField || "Date range"}</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="justify-start gap-2">
                <CalendarIcon className="h-3 w-3" /> Pick range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" className="p-3 pointer-events-auto" onSelect={(r) => onSlicerChange?.(tile.id, r)} />
            </PopoverContent>
          </Popover>
        </div>
      );
    }
  }
};

export default TileRenderer;
