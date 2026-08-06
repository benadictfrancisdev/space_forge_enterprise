import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface AnnotatedStockChartProps {
  data: Record<string, unknown>[];
  dateKey: string;
  priceKey: string;
  volumeKey?: string;
  title: string;
  showMA50?: boolean;
  showMA200?: boolean;
  annotations?: Array<{ date: string; label: string; value: number }>;
}

/**
 * Stock-style price chart with optional moving averages, volume bars, and annotations.
 * Reference: META stock chart with 50/200-day MA lines and labeled milestones.
 */
const AnnotatedStockChart = ({
  data, dateKey, priceKey, volumeKey, title,
  showMA50 = true, showMA200 = true, annotations = [],
}: AnnotatedStockChartProps) => {
  const { chartData, priceMin, priceMax, volMax, autoAnnotations } = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const da = new Date(String(a[dateKey])).getTime();
      const db = new Date(String(b[dateKey])).getTime();
      return da - db;
    });

    let min = Infinity, max = -Infinity, vMax = 0;

    const prices = sorted.map((row) => Number(row[priceKey]) || 0);
    const allTimeHigh = Math.max(...prices);
    const allTimeLow = Math.min(...prices.filter((p) => p > 0));

    const processed = sorted.map((row, i) => {
      const price = Number(row[priceKey]) || 0;
      const vol = volumeKey ? (Number(row[volumeKey]) || 0) : 0;
      if (price < min) min = price;
      if (price > max) max = price;
      if (vol > vMax) vMax = vol;

      // Moving averages
      const ma50 = i >= 49
        ? prices.slice(i - 49, i + 1).reduce((s, v) => s + v, 0) / 50
        : undefined;
      const ma200 = i >= 199
        ? prices.slice(i - 199, i + 1).reduce((s, v) => s + v, 0) / 200
        : undefined;

      return {
        date: String(row[dateKey] ?? "").slice(0, 10),
        price,
        volume: vol,
        ma50,
        ma200,
      };
    });

    // Auto-detect ATH and ATL as annotations
    const auto: Array<{ date: string; label: string; value: number }> = [];
    const athIdx = prices.indexOf(allTimeHigh);
    const atlIdx = prices.indexOf(allTimeLow);
    if (athIdx >= 0 && processed[athIdx]) {
      auto.push({ date: processed[athIdx].date, label: `ATH $${allTimeHigh.toLocaleString()}`, value: allTimeHigh });
    }
    if (atlIdx >= 0 && processed[atlIdx] && atlIdx !== athIdx) {
      auto.push({ date: processed[atlIdx].date, label: `Low $${allTimeLow.toLocaleString()}`, value: allTimeLow });
    }

    return { chartData: processed, priceMin: min, priceMax: max, volMax: vMax, autoAnnotations: auto };
  }, [data, dateKey, priceKey, volumeKey]);

  const allAnnotations = [...annotations, ...autoAnnotations];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="linear-card h-full">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {title}
          <Badge variant="outline" className="text-[10px] ml-auto">{chartData.length} points</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {/* Price Chart */}
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[priceMin * 0.95, priceMax * 1.05]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              width={55}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              fill="url(#priceGrad)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              name="Price"
              dot={false}
            />
            {showMA50 && (
              <Line type="monotone" dataKey="ma50" stroke="hsl(var(--chart-2))" strokeWidth={1} dot={false} name="50-Day MA" strokeDasharray="2 2" />
            )}
            {showMA200 && (
              <Line type="monotone" dataKey="ma200" stroke="hsl(var(--destructive))" strokeWidth={1} dot={false} name="200-Day MA" strokeDasharray="4 2" />
            )}
            {/* Annotations */}
            {allAnnotations.map((ann, i) => (
              <ReferenceDot
                key={i}
                x={ann.date}
                y={ann.value}
                r={4}
                fill="hsl(var(--foreground))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                label={{
                  value: ann.label,
                  position: ann.value > (priceMax + priceMin) / 2 ? "top" : "bottom",
                  fill: "hsl(var(--foreground))",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconSize={8}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Volume chart (if volume data exists) */}
        {volumeKey && volMax > 0 && (
          <>
            <p className="text-[10px] text-muted-foreground font-medium text-center">Trading Volume</p>
            <ResponsiveContainer width="100%" height={80}>
              <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={[0, volMax * 1.1]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  width={55}
                  tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}
                />
                <Bar dataKey="volume" fill="hsl(var(--muted-foreground))" opacity={0.3} name="Volume" />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnotatedStockChart;
