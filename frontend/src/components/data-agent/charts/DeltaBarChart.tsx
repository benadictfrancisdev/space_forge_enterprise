import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DeltaBarChartProps {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  title: string;
  unit?: string;
  showLabels?: boolean;
}

/**
 * Positive/negative diverging bar chart with conditional red/green coloring.
 * Reference: Meta Annual Returns by Year chart.
 */
const DeltaBarChart = ({ data, labelKey, valueKey, title, unit = "%", showLabels = true }: DeltaBarChartProps) => {
  const chartData = useMemo(() => {
    return data.slice(0, 30).map((row, i) => ({
      label: String(row[labelKey] ?? `Item ${i + 1}`),
      value: Number(row[valueKey]) || 0,
    }));
  }, [data, labelKey, valueKey]);

  const { positiveCount, negativeCount, maxAbs } = useMemo(() => {
    let pos = 0, neg = 0, mAbs = 0;
    chartData.forEach(({ value }) => {
      if (value >= 0) pos++;
      else neg++;
      if (Math.abs(value) > mAbs) mAbs = Math.abs(value);
    });
    return { positiveCount: pos, negativeCount: neg, maxAbs: mAbs };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <p className={val >= 0 ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"}>
          {val >= 0 ? "+" : ""}{val.toFixed(1)}{unit}
        </p>
      </div>
    );
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!showLabels) return null;
    const isPositive = value >= 0;
    return (
      <text
        x={x + width / 2}
        y={isPositive ? y - 6 : y + 16}
        fill={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 50%)"}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
      >
        {value >= 0 ? "+" : ""}{value.toFixed(1)}{unit}
      </text>
    );
  };

  return (
    <Card className="linear-card h-full">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          {positiveCount >= negativeCount
            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
            : <TrendingDown className="w-4 h-4 text-destructive" />
          }
          {title}
          <div className="ml-auto flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">
              +{positiveCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/20">
              −{negativeCount}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              domain={[-(maxAbs * 1.2), maxAbs * 1.2]}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.5} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.value >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 50%)"}
                  opacity={0.85}
                />
              ))}
              <LabelList content={renderCustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DeltaBarChart;
