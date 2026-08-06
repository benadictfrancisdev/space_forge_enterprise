import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataAreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys?: string[];
  yKey?: string;
  title: string;
  showGrid?: boolean;
  stacked?: boolean;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

const DataAreaChart = ({ data, xKey, yKeys, yKey, title, showGrid = true, stacked = false }: DataAreaChartProps) => {
  const keys = yKeys || (yKey ? [yKey] : []);

  const chartData = data.slice(0, 30).map((item, index) => ({
    name: String(item[xKey] || `Point ${index + 1}`).slice(0, 12),
    ...keys.reduce((acc, key) => ({ ...acc, [key]: Number(item[key]) || 0 }), {}),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs font-semibold text-foreground mb-2 pb-2 border-b border-border">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 py-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-foreground">{formatValue(entry.value)}</span>
            </div>
          ))}
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
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {CHART_COLORS.map((color, index) => (
                <linearGradient key={index} id={`areaFill${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            )}
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            {keys.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 16 }}
                iconType="square"
                iconSize={8}
                formatter={(value) => <span className="text-muted-foreground text-[10px]">{value}</span>}
              />
            )}
            {keys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                fill={`url(#areaFill${index % CHART_COLORS.length})`}
                stackId={stacked ? "1" : undefined}
                animationDuration={800}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataAreaChart;
