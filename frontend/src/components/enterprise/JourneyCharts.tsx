import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Stage = { stage: string; count: number; conversion_pct?: number };

export function FunnelBarChart({ stages }: { stages: Stage[] }) {
  if (!stages.length) return null;
  const data = stages.map((s) => ({
    name: s.stage,
    count: s.count,
    conversion: s.conversion_pct ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 16 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "count" ? [value, "Count"] : [`${value}%`, "Conversion"]
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`hsl(var(--primary) / ${0.35 + i * 0.12})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type Cohort = { cohort: string; count: number };

export function CohortBarChart({ cohorts }: { cohorts: Cohort[] }) {
  if (!cohorts.length) return <p className="text-sm text-muted-foreground">No cohort data.</p>;
  const data = cohorts.map((c) => ({ name: c.cohort, count: c.count }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type Link = { source: string; target: string; value: number };

export function SankeyFlowChart({ links }: { links: Link[] }) {
  if (!links.length) return <p className="text-sm text-muted-foreground">No flow data.</p>;
  const max = Math.max(...links.map((l) => l.value), 1);
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div key={`${link.source}-${link.target}`} className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{link.source} → {link.target}</span>
            <span>{link.value}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.max(8, (link.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type DropOff = {
  from_stage: string;
  to_stage: string;
  drop_off_count: number;
  drop_off_pct: number;
};

export function DropOffTable({ drops }: { drops: DropOff[] }) {
  if (!drops.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-2 pr-4">From</th>
            <th className="py-2 pr-4">To</th>
            <th className="py-2 pr-4">Drop-off</th>
            <th className="py-2">Rate</th>
          </tr>
        </thead>
        <tbody>
          {drops.map((d) => (
            <tr key={`${d.from_stage}-${d.to_stage}`} className="border-b border-border/40">
              <td className="py-2 pr-4">{d.from_stage}</td>
              <td className="py-2 pr-4">{d.to_stage}</td>
              <td className="py-2 pr-4 tabular-nums">{d.drop_off_count}</td>
              <td className="py-2 tabular-nums">{d.drop_off_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
