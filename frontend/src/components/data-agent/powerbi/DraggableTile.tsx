import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  Maximize2, 
  Minimize2,
  TrendingUp, 
  TrendingDown,
  Edit3,
  Trash2,
  Sparkles,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Legend,
  ComposedChart,
  ReferenceLine,
  ReferenceDot,
  Label as RechartsLabel,
} from "recharts";

export interface DashboardTile {
  id: string;
  type: "kpi" | "bar" | "line" | "pie" | "area" | "scatter" | "combo" | "table" | "radar" | "funnel" | "waterfall" | "heatmap" | "gauge" | "treemap" | "histogram" | "boxplot" | "conditional_bar" | "multi_line" | "annotated_area" | "stock_chart";
  title: string;
  size: "small" | "medium" | "large";
  column?: string;
  xAxis?: string;
  yAxis?: string;
  data?: any[];
  value?: number;
  change?: number;
  color?: string;
  secondaryData?: any[];
  width?: number;
  height?: number;
  aiInsight?: string;
  config?: Record<string, any>;
}

export const POWER_BI_COLORS = [
  "#01B8AA", "#374649", "#FD625E", "#F2C80F", "#5F6B6D",
  "#8AD4EB", "#FE9666", "#A66999", "#3599B8", "#DFBFBF"
];

interface DraggableTileProps {
  tile: DashboardTile;
  isSelected: boolean;
  onSelect: () => void;
  viewMode: "grid" | "list";
  onResize?: (id: string, size: "small" | "medium" | "large") => void;
  onEdit?: (tile: DashboardTile) => void;
  onDelete?: (id: string) => void;
  onAIExplain?: (tile: DashboardTile) => void;
  isDragging?: boolean;
  isExplaining?: boolean;
  editMode?: boolean;
}

export const DraggableTile = ({ 
  tile, 
  isSelected, 
  onSelect, 
  viewMode,
  onResize,
  onEdit,
  onDelete,
  onAIExplain,
  isDragging,
  isExplaining,
  editMode,
}: DraggableTileProps) => {
  const [showInsight, setShowInsight] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sizeClasses = {
    small: "col-span-1",
    medium: viewMode === "grid" ? "col-span-1 md:col-span-2" : "col-span-1",
    large: viewMode === "grid" ? "col-span-1 md:col-span-2 lg:col-span-3" : "col-span-1"
  };

  const cycleSize = () => {
    const sizes: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
    const currentIndex = sizes.indexOf(tile.size);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    onResize?.(tile.id, nextSize);
  };

  const showControls = editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div ref={setNodeRef} style={style} className={sizeClasses[tile.size]}>
      <Card 
        className={`group relative cursor-pointer transition-all duration-200 hover:shadow-lg border-border/60 ${
          isSelected ? "ring-2 ring-primary shadow-lg" : ""
        } ${isDragging ? "opacity-50 scale-105 shadow-2xl z-50" : ""} ${
          editMode ? "ring-1 ring-primary/30" : ""
        }`}
        onClick={onSelect}
      >
        {/* Power BI-style top color accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg"
          style={{ backgroundColor: tile.color || POWER_BI_COLORS[0] }}
        />

        <CardHeader className="pb-1 pt-3 px-3">
          <div className="flex items-center justify-between gap-1">
            <div 
              {...attributes} 
              {...listeners}
              className={`cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted ${showControls} transition-opacity`}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <CardTitle className="text-xs font-semibold truncate flex-1 text-foreground/90">{tile.title}</CardTitle>
            
            {/* Action buttons - visible on hover */}
            <div className={`flex gap-0.5 ${showControls} transition-opacity`}>
              {onAIExplain && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tile.aiInsight) {
                      setShowInsight(!showInsight);
                    } else {
                      onAIExplain(tile);
                    }
                  }}
                >
                  {isExplaining ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-primary" />
                  )}
                </Button>
              )}
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(tile);
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSize();
                }}
              >
                {tile.size === "large" ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-destructive/10 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(tile.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          {editMode && (
            <div className="flex gap-1 mt-1">
              {(["small", "medium", "large"] as const).map(s => (
                <Button
                  key={s}
                  variant={tile.size === s ? "default" : "outline"}
                  size="sm"
                  className="h-5 text-[9px] px-2"
                  onClick={(e) => { e.stopPropagation(); onResize?.(tile.id, s); }}
                >
                  {s[0].toUpperCase()}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {/* AI Insight Badge */}
          {tile.aiInsight && showInsight && (
            <div className="mb-2 p-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground/80 relative">
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <p className="leading-relaxed pr-4">{tile.aiInsight}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 absolute top-1 right-1"
                onClick={(e) => { e.stopPropagation(); setShowInsight(false); }}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          )}
          {tile.aiInsight && !showInsight && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowInsight(true); }}
              className="mb-1.5 flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              <Sparkles className="h-2.5 w-2.5" />
              AI insight available
            </button>
          )}

          {/* Chart Rendering */}
          {tile.type === "kpi" && (
            <div className="space-y-1 py-2">
              <div className="text-2xl font-bold tracking-tight" style={{ color: tile.color }}>
                {tile.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {tile.change != null && (
                <div className={`flex items-center text-xs font-medium ${
                  tile.change >= 0 ? "text-emerald-600" : "text-red-500"
                }`}>
                  {tile.change >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                  {tile.change >= 0 ? "+" : ""}{tile.change.toFixed(2)}%
                </div>
              )}
            </div>
          )}

          {tile.type === "bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "line" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Line type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[2]} strokeWidth={2} dot={false} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "pie" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={tile.data} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value" label={({ name }) => name} labelLine={false}>
                    {tile.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={POWER_BI_COLORS[index % POWER_BI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "area" && tile.data && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`gradient-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[4]} fill={`url(#gradient-${tile.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "scatter" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.xAxis} />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.yAxis} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={tile.data} fill={tile.color || POWER_BI_COLORS[5]} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "combo" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={Object.keys(tile.data[0] || {})[1] || "value"} fill={POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey={Object.keys(tile.data[0] || {})[2] || "value2"} stroke={POWER_BI_COLORS[2]} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "gauge" && tile.data && (
            <div className="h-32 flex items-center justify-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
                <div 
                  className="absolute inset-0 rounded-t-full border-8 origin-bottom transition-transform duration-1000"
                  style={{ borderColor: tile.color || POWER_BI_COLORS[7], clipPath: `polygon(0 0, ${tile.value || 50}% 0, ${tile.value || 50}% 100%, 0 100%)` }}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                  <span className="text-xl font-bold">{tile.value?.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {tile.type === "histogram" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "treemap" && tile.data && (
            <div className="h-48 grid grid-cols-4 gap-1 p-2">
              {tile.data.slice(0, 12).map((item, idx) => {
                const maxValue = Math.max(...tile.data!.map(d => d.value || 0));
                const ratio = (item.value || 0) / maxValue;
                return (
                  <div key={idx} className="rounded flex items-center justify-center text-white text-xs font-medium p-1 truncate"
                    style={{ backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length], opacity: 0.5 + ratio * 0.5, gridColumn: ratio > 0.5 ? 'span 2' : 'span 1', gridRow: ratio > 0.7 ? 'span 2' : 'span 1' }}
                    title={`${item.name}: ${item.value?.toFixed(2)}`}
                  >
                    {item.name?.split('/')[1] || item.name}
                  </div>
                );
              })}
            </div>
          )}

          {tile.type === "funnel" && tile.data && (
            <div className="h-48 flex flex-col justify-center space-y-1 px-4">
              {tile.data.map((item, idx) => {
                const maxValue = tile.data![0]?.value || 1;
                const width = ((item.value || 0) / maxValue) * 100;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="h-6 rounded-r-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                      style={{ width: `${width}%`, backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length], minWidth: '40px' }}
                    >
                      {item.value?.toFixed(0)}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tile.type === "waterfall" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" fill={tile.color || POWER_BI_COLORS[9]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Conditional Bar (positive=green, negative=red) */}
          {tile.type === "conditional_bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}>
                    {tile.data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value >= 0 
                          ? (tile.config?.positiveColor || "#22c55e") 
                          : (tile.config?.negativeColor || "#ef4444")} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Multi-Line Chart (overlaid series like price + moving averages) */}
          {tile.type === "multi_line" && tile.data && tile.config?.series && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {(tile.config.series as any[]).map((s: any, idx: number) => (
                    <Line 
                      key={s.key} 
                      type="monotone" 
                      dataKey={s.key} 
                      name={s.name} 
                      stroke={s.color || POWER_BI_COLORS[idx]} 
                      strokeWidth={s.strokeWidth || 2} 
                      strokeDasharray={s.strokeDasharray || undefined}
                      dot={false} 
                    />
                  ))}
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {/* Annotated Area Chart */}
          {tile.type === "annotated_area" && tile.data && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`ann-grad-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.config?.fillColor || "#3b82f6"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.config?.fillColor || "#3b82f6"} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke={tile.config?.fillColor || "#3b82f6"} fill={`url(#ann-grad-${tile.id})`} strokeWidth={2} dot={false} />
                  {tile.config?.annotations?.map((ann: any, idx: number) => (
                    <ReferenceDot key={idx} x={ann.x} y={ann.y} r={4} fill="#f97316" stroke="#fff" strokeWidth={2}>
                      <RechartsLabel value={ann.label} position="top" fill="hsl(var(--foreground))" fontSize={9} />
                    </ReferenceDot>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Heatmap */}
          {tile.type === "heatmap" && tile.data && tile.config && (
            <div className="overflow-x-auto">
              <div className="min-w-[300px]">
                {/* X-axis labels */}
                <div className="flex">
                  <div className="w-12 shrink-0" />
                  {(tile.config.xLabels || []).map((xl: string, i: number) => (
                    <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground font-medium truncate px-0.5">
                      {xl}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {(tile.config.yLabels || []).map((yl: string, yi: number) => (
                  <div key={yi} className="flex items-center">
                    <div className="w-12 shrink-0 text-[9px] text-muted-foreground font-medium text-right pr-1 truncate">
                      {yl}
                    </div>
                    {(tile.config.xLabels || []).map((xl: string, xi: number) => {
                      const cell = tile.data!.find((d: any) => d.x === xl && d.y === yl);
                      const val = cell?.value ?? 0;
                      // Color interpolation between min (red) through mid (yellow) to max (green)
                      const allVals = tile.data!.map((d: any) => d.value || 0);
                      const minVal = Math.min(...allVals);
                      const maxVal = Math.max(...allVals);
                      const range = maxVal - minVal || 1;
                      const ratio = (val - minVal) / range;
                      const bg = ratio > 0.5
                        ? `color-mix(in srgb, ${tile.config.maxColor || "#22c55e"} ${((ratio - 0.5) * 2 * 100).toFixed(0)}%, ${tile.config.midColor || "#fef08a"})`
                        : `color-mix(in srgb, ${tile.config.midColor || "#fef08a"} ${(ratio * 2 * 100).toFixed(0)}%, ${tile.config.minColor || "#dc2626"})`;
                      return (
                        <div 
                          key={`${yi}-${xi}`} 
                          className="flex-1 flex items-center justify-center text-[9px] font-medium border border-background/50 py-1.5 rounded-sm"
                          style={{ backgroundColor: bg, color: ratio < 0.3 || ratio > 0.7 ? '#fff' : '#1a1a1a' }}
                          title={`${yl} / ${xl}: ${val}`}
                        >
                          {typeof val === 'number' ? val.toFixed(1) : val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tile.type === "boxplot" && tile.data && (
            <div className="h-48 flex items-end justify-around px-4 pb-6">
              {tile.data.map((item, idx) => {
                const maxVal = Math.max(...tile.data!.map(d => d.max || 0));
                const scale = (val: number) => (val / maxVal) * 140;
                return (
                  <div key={idx} className="flex flex-col items-center relative" style={{ height: '100%' }}>
                    <div className="absolute w-px bg-muted-foreground" style={{ bottom: `${scale(item.min || 0)}px`, height: `${scale((item.max || 0) - (item.min || 0))}px` }} />
                    <div className="absolute w-8 rounded" style={{ bottom: `${scale(item.q1 || 0)}px`, height: `${scale((item.q3 || 0) - (item.q1 || 0))}px`, backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length] }} />
                    <div className="absolute w-8 h-0.5 bg-white" style={{ bottom: `${scale(item.median || 0)}px` }} />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground truncate max-w-12">{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stock Chart: main line + moving averages + volume sub-chart */}
          {tile.type === "stock_chart" && tile.data && (
            <div className="space-y-1">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={tile.data}>
                    <defs>
                      <linearGradient id={`stock-g-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={tile.color || POWER_BI_COLORS[8]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={tile.color || POWER_BI_COLORS[8]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Area type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[8]} fill={`url(#stock-g-${tile.id})`} strokeWidth={2} name="Value" dot={false} />
                    {tile.data[0]?.ma50 !== undefined && (
                      <Line type="monotone" dataKey="ma50" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" dot={false} name="MA50" />
                    )}
                    {tile.data[0]?.ma200 !== undefined && (
                      <Line type="monotone" dataKey="ma200" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} name="MA200" />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {tile.data[0]?.volume !== undefined && (
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tile.data}>
                      <XAxis dataKey="name" tick={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }} />
                      <Bar dataKey="volume" fill={POWER_BI_COLORS[5]} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggableTile;
