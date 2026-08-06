import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DataBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  showGrid?: boolean;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

const formatValue = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

const DataBarChart = ({ data, xKey, yKey, title, color, showGrid = true }: DataBarChartProps) => {
  const chartData = data.slice(0, 12).map((item, index) => ({
    name: String(item[xKey] || `Item ${index + 1}`).slice(0, 18),
    value: Number(item[yKey]) || 0,
  }));

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pct = ((payload[0].value / maxVal) * 100).toFixed(1);
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-primary">
              {formatValue(payload[0].value)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {pct}% of max
            </span>
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
          <span className="text-xs font-normal text-muted-foreground">
            {chartData.length} items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {CHART_COLORS.map((c, i) => (
                <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
            )}
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              dy={8}
              interval={0}
              angle={chartData.length > 8 ? -35 : 0}
              textAnchor={chartData.length > 8 ? "end" : "middle"}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={color || `url(#barGrad${index % CHART_COLORS.length})`}
                  className="transition-opacity duration-200 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: color || CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-[10px] text-muted-foreground">{item.name}</span>
            </div>
          ))}
          {chartData.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{chartData.length - 5} more</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataBarChart;
