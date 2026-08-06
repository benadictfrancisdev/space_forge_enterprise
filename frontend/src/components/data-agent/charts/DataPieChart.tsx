import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPieChartProps {
  data: Record<string, unknown>[];
  valueKey: string;
  nameKey: string;
  title: string;
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

const DataPieChart = ({ data, valueKey, nameKey, title }: DataPieChartProps) => {
  const aggregated = data.reduce<Record<string, number>>((acc, item) => {
    const key = String(item[nameKey] || "Other");
    acc[key] = (acc[key] || 0) + (Number(item[valueKey]) || 1);
    return acc;
  }, {});

  const chartData = Object.entries(aggregated)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      name: name.slice(0, 18),
      value,
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pct = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
          <p className="text-xs font-semibold text-foreground mb-1">{payload[0].name}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">
              {payload[0].value.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-primary">
              {pct}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="linear-card h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            {chartData.length} categories
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderLabel}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  className="transition-opacity duration-200 hover:opacity-80"
                />
              ))}
            </Pie>
            {/* Center label */}
            <text x="50%" y="43%" textAnchor="middle" dominantBaseline="central" className="fill-foreground" style={{ fontSize: 18, fontWeight: 700 }}>
              {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString()}
            </text>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              TOTAL
            </text>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
              formatter={(value) => <span className="text-muted-foreground text-[10px]">{value}</span>}
              iconType="circle"
              iconSize={7}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataPieChart;
