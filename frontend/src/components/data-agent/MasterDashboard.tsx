import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, LineChart as LineChartIcon,
  PieChart as PieChartIcon, Maximize2, Minimize2, GripVertical, Pencil, Check, X,
  Download, ArrowUpRight, ArrowDownRight, Activity,
} from "lucide-react";
import DataBarChart from "./charts/DataBarChart";
import DataLineChart from "./charts/DataLineChart";
import DataPieChart from "./charts/DataPieChart";
import DataAreaChart from "./charts/DataAreaChart";
import DataScatterChart from "./charts/DataScatterChart";
import ShareDashboardButton from "@/components/sharing/ShareDashboardButton";

interface MasterDashboardProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  pipelineResults?: any;
}

interface DashboardTile {
  id: string;
  type: "kpi" | "bar" | "line" | "pie" | "area" | "scatter" | "anomaly" | "recommendation";
  title: string;
  size: "sm" | "md" | "lg";
  config: Record<string, any>;
}

const formatMetric = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const MasterDashboard = ({ data, columns, datasetName, pipelineResults }: MasterDashboardProps) => {
  const [fullscreenTile, setFullscreenTile] = useState<string | null>(null);
  const [editingTile, setEditingTile] = useState<string | null>(null);
  const [tileEdits, setTileEdits] = useState<Record<string, Partial<DashboardTile>>>({});

  // Auto-generate tiles from data + pipeline results
  const tiles = useMemo<DashboardTile[]>(() => {
    const numericCols = columns.filter(c => {
      const vals = data.slice(0, 20).map(r => Number(r[c]));
      return vals.filter(v => !isNaN(v)).length > 14;
    });
    const categoricalCols = columns.filter(c => !numericCols.includes(c));
    const generated: DashboardTile[] = [];

    // KPI tiles from numeric columns (top 4)
    numericCols.slice(0, 4).forEach((col, i) => {
      const vals = data.map(r => Number(r[col])).filter(v => !isNaN(v));
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const firstHalf = vals.slice(0, Math.floor(vals.length / 2));
      const secondHalf = vals.slice(Math.floor(vals.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
      const changePct = firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

      generated.push({
        id: `kpi-${i}`,
        type: "kpi",
        title: col,
        size: "sm",
        config: { value: avg, change: changePct, min: Math.min(...vals), max: Math.max(...vals) },
      });
    });

    // Bar chart — first categorical × numeric
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      generated.push({
        id: "bar-0",
        type: "bar",
        title: `${numericCols[0]} by ${categoricalCols[0]}`,
        size: "md",
        config: { xKey: categoricalCols[0], yKey: numericCols[0] },
      });
    }

    // Line chart — first numeric over index or date
    if (numericCols.length > 0) {
      const xKey = columns.find(c => /date|time|month|year|day|period/i.test(c)) || columns[0];
      generated.push({
        id: "line-0",
        type: "line",
        title: `${numericCols[0]} Trend`,
        size: "md",
        config: { xKey, yKeys: numericCols.slice(0, Math.min(3, numericCols.length)) },
      });
    }

    // Pie chart — first categorical
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      generated.push({
        id: "pie-0",
        type: "pie",
        title: `${categoricalCols[0]} Distribution`,
        size: "md",
        config: { nameKey: categoricalCols[0], valueKey: numericCols[0] },
      });
    }

    // Area chart
    if (numericCols.length > 1) {
      const xKey = columns.find(c => /date|time|month|year/i.test(c)) || columns[0];
      generated.push({
        id: "area-0",
        type: "area",
        title: `${numericCols[1]} Over Time`,
        size: "md",
        config: { xKey, yKeys: [numericCols[1]] },
      });
    }

    // Scatter chart
    if (numericCols.length >= 2) {
      generated.push({
        id: "scatter-0",
        type: "scatter",
        title: `${numericCols[0]} vs ${numericCols[1]}`,
        size: "md",
        config: { xKey: numericCols[0], yKey: numericCols[1] },
      });
    }

    // Anomaly tile from pipeline
    if (pipelineResults?.anomalyWatch) {
      generated.push({
        id: "anomaly-0",
        type: "anomaly",
        title: "Anomaly Alerts",
        size: "md",
        config: { anomalies: pipelineResults.anomalyWatch },
      });
    }

    // Recommendation tile from pipeline
    if (pipelineResults?.insights?.recommendations) {
      generated.push({
        id: "rec-0",
        type: "recommendation",
        title: "Top Recommendations",
        size: "md",
        config: { recommendations: pipelineResults.insights.recommendations },
      });
    }

    return generated;
  }, [data, columns, pipelineResults]);

  const getAppliedTile = useCallback((tile: DashboardTile) => ({
    ...tile,
    ...(tileEdits[tile.id] || {}),
  }), [tileEdits]);

  const handleEditSave = (id: string) => {
    setEditingTile(null);
  };

  const renderKPITile = (tile: DashboardTile) => {
    const { value, change, min, max } = tile.config;
    const isUp = change > 0;
    const TrendIcon = change > 1 ? TrendingUp : change < -1 ? TrendingDown : Minus;
    return (
      <Card className="linear-card h-full border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: isUp ? "hsl(var(--chart-3))" : change < -1 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate max-w-[70%]">{tile.title}</p>
            <TrendIcon className={`w-3.5 h-3.5 ${isUp ? "text-emerald-500" : change < -1 ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">{formatMetric(value)}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isUp ? "default" : "destructive"} className="text-[9px] px-1.5 py-0">
              {isUp ? "+" : ""}{change.toFixed(1)}%
            </Badge>
            <span className="text-[9px] text-muted-foreground">
              {formatMetric(min)} — {formatMetric(max)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAnomalyTile = (tile: DashboardTile) => {
    const anomalies = tile.config.anomalies;
    const items = Array.isArray(anomalies?.anomalies) ? anomalies.anomalies.slice(0, 4) : [];
    return (
      <Card className="linear-card h-full">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {tile.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">No anomalies detected</p>}
          {items.map((a: any, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
              <div className={`w-2 h-2 mt-1 rounded-full shrink-0 ${a.severity === "critical" ? "bg-red-500" : a.severity === "high" ? "bg-amber-500" : "bg-yellow-400"}`} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground leading-tight">{a.description?.slice(0, 80) || `Anomaly ${i + 1}`}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{a.severity} severity</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderRecommendationTile = (tile: DashboardTile) => {
    const recs = Array.isArray(tile.config.recommendations) ? tile.config.recommendations.slice(0, 4) : [];
    return (
      <Card className="linear-card h-full">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-primary" />
            {tile.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          {recs.map((r: string, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5">
              <Badge variant="outline" className="text-[8px] shrink-0 mt-0.5">{i + 1}</Badge>
              <p className="text-[11px] text-foreground leading-tight">{typeof r === "string" ? r : (r as any)?.action || JSON.stringify(r)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderChartTile = (tile: DashboardTile) => {
    const applied = getAppliedTile(tile);
    switch (applied.type) {
      case "bar":
        return <DataBarChart data={data} xKey={applied.config.xKey} yKey={applied.config.yKey} title={applied.title} />;
      case "line":
        return <DataLineChart data={data} xKey={applied.config.xKey} yKeys={applied.config.yKeys} title={applied.title} />;
      case "pie":
        return <DataPieChart data={data} nameKey={applied.config.nameKey} valueKey={applied.config.valueKey} title={applied.title} />;
      case "area":
        return <DataAreaChart data={data} xKey={applied.config.xKey} yKeys={applied.config.yKeys} title={applied.title} />;
      case "scatter":
        return <DataScatterChart data={data} xKey={applied.config.xKey} yKey={applied.config.yKey} title={applied.title} />;
      case "kpi":
        return renderKPITile(applied);
      case "anomaly":
        return renderAnomalyTile(applied);
      case "recommendation":
        return renderRecommendationTile(applied);
      default:
        return null;
    }
  };

  const kpiTiles = tiles.filter(t => t.type === "kpi");
  const chartTiles = tiles.filter(t => t.type !== "kpi");

  // Fullscreen overlay
  if (fullscreenTile) {
    const tile = tiles.find(t => t.id === fullscreenTile);
    if (tile) {
      return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{tile.title}</h2>
            <Button variant="ghost" size="sm" onClick={() => setFullscreenTile(null)}>
              <Minimize2 className="w-4 h-4 mr-1" /> Exit
            </Button>
          </div>
          <div className="flex-1">{renderChartTile(tile)}</div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Master Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{datasetName} · {data.length} rows · {columns.length} columns</p>
        </div>
        <ShareDashboardButton
          title={`${datasetName} — Master Dashboard`}
          datasetName={datasetName}
          snapshot={{
            data: data.slice(0, 500),
            columns,
            tiles: tiles.map(t => ({ id: t.id, type: t.type, title: t.title, config: t.config })),
            insights: pipelineResults?.insights?.recommendations || [],
            summary: pipelineResults?.summary,
          }}
        />
      </div>

      {/* KPI Row */}
      {kpiTiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiTiles.map(tile => (
            <div key={tile.id}>{renderChartTile(tile)}</div>
          ))}
        </div>
      )}

      {/* Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {chartTiles.map(tile => (
          <div key={tile.id} className="relative group">
            {/* Tile action bar */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingTile === tile.id ? (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditSave(tile.id)}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingTile(null); setTileEdits(e => { const n = { ...e }; delete n[tile.id]; return n; }); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTile(tile.id)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFullscreenTile(tile.id)}>
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>

            {/* Inline editor */}
            {editingTile === tile.id && (
              <Card className="mb-2 border-primary/30">
                <CardContent className="p-3 space-y-2">
                  <Input
                    value={tileEdits[tile.id]?.title ?? tile.title}
                    onChange={e => setTileEdits(prev => ({ ...prev, [tile.id]: { ...prev[tile.id], title: e.target.value } }))}
                    className="h-7 text-xs"
                    placeholder="Tile title"
                  />
                  <Select
                    value={tileEdits[tile.id]?.type ?? tile.type}
                    onValueChange={v => setTileEdits(prev => ({ ...prev, [tile.id]: { ...prev[tile.id], type: v as any } }))}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                      <SelectItem value="scatter">Scatter Plot</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {renderChartTile(getAppliedTile(tile))}
          </div>
        ))}
      </div>

      {tiles.length === 0 && (
        <Card className="linear-card">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Upload data to auto-generate your dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MasterDashboard;
