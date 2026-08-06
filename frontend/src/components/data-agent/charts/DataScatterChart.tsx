import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine } from "recharts";
import { useMemo } from "react";

interface DataScatterChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  showGrid?: boolean;
}

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number(v.toFixed(2)).toLocaleString();
};

const DataScatterChart = ({ data, xKey, yKey, title, showGrid = true }: DataScatterChartProps) => {
  const chartData = data.slice(0, 80).map((item) => ({
    x: Number(item[xKey]) || 0,
    y: Number(item[yKey]) || 0,
    z: 100,
  }));

  const stats = useMemo(() => {
    const xs = chartData.map(d => d.x);
    const ys = chartData.map(d => d.y);
    return {
      avgX: xs.reduce((a, b) => a + b, 0) / xs.length,
      avgY: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{xKey}</span>
            <span className="text-xs font-bold text-foreground">{formatValue(payload[0].payload.x)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{yKey}</span>
            <span className="text-xs font-bold text-foreground">{formatValue(payload[0].payload.y)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="linear-card h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          {title}
          <span className="text-xs font-normal text-muted-foreground">{chartData.length} points</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            )}
            <XAxis
              type="number"
              dataKey="x"
              name={xKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              dy={8}
              tickFormatter={formatValue}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
              tickFormatter={formatValue}
            />
            <ZAxis type="number" dataKey="z" range={[30, 100]} />
            {/* Mean reference lines */}
            <ReferenceLine
              x={stats.avgX}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <ReferenceLine
              y={stats.avgY}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }} />
            <Scatter
              data={chartData}
              fill="hsl(var(--chart-1))"
              fillOpacity={0.65}
              animationDuration={800}
            />
          </ScatterChart>
        </ResponsiveContainer>

        <div className="flex justify-between mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
          <span>X: {xKey} (avg: {formatValue(stats.avgX)})</span>
          <span>Y: {yKey} (avg: {formatValue(stats.avgY)})</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataScatterChart;
