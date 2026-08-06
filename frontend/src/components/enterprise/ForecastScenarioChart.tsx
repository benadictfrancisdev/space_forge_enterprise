import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ForecastPoint = { period: number; value: number };

type ScenarioBundle = {
  expected?: { forecast?: ForecastPoint[]; target_column?: string };
  best_case?: { forecast?: ForecastPoint[] };
  worst_case?: { forecast?: ForecastPoint[] };
};

export function ForecastScenarioChart({ scenarios }: { scenarios: ScenarioBundle }) {
  const expected = scenarios.expected?.forecast ?? [];
  if (!expected.length) {
    return <p className="text-sm text-muted-foreground">No forecast data — run scenarios first.</p>;
  }

  const data = expected.map((pt, i) => ({
    period: pt.period,
    expected: pt.value,
    best: scenarios.best_case?.forecast?.[i]?.value,
    worst: scenarios.worst_case?.forecast?.[i]?.value,
  }));

  const target = scenarios.expected?.target_column ?? "value";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Target: {target}</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="expected" name="Expected" stroke="hsl(var(--primary))" dot={false} />
          <Line type="monotone" dataKey="best" name="Best case" stroke="hsl(142 76% 36%)" dot={false} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="worst" name="Worst case" stroke="hsl(var(--destructive))" dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
