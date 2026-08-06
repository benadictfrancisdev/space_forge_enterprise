import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KPIFact } from "@/platform/track13/contracts";

export function InsightKPIGrid({ kpis }: { kpis: KPIFact[] }) {
  if (!kpis.length) {
    return (
      <p className="text-sm text-muted-foreground">No KPIs — run the platform pipeline first.</p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {kpis.map((k) => (
        <div
          key={k.name}
          className="rounded-lg border border-border/60 p-3 bg-muted/20"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.name}</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{k.value}</p>
          <Badge variant="secondary" className="mt-2 text-[10px]">{k.status}</Badge>
        </div>
      ))}
    </div>
  );
}

export function RecommendationsList({
  items,
}: {
  items: Array<{ title: string; body: string; priority?: number }>;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No recommendations yet.</p>;
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.title} className="text-sm border-l-2 border-primary/40 pl-3">
          <p className="font-medium">{r.title}</p>
          <p className="text-muted-foreground mt-0.5">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function GovernanceScoreCard({
  governance,
}: {
  governance?: Record<string, unknown> | null;
}) {
  if (!governance) return null;
  const compliance = governance.compliance_score as number | undefined;
  const security = governance.security_score as number | undefined;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Governance Posture</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-6 text-sm">
        <div>
          <p className="text-muted-foreground">Compliance</p>
          <p className="text-xl font-semibold">{compliance ?? "—"}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Security</p>
          <p className="text-xl font-semibold">{security ?? "—"}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Violations</p>
          <p className="text-xl font-semibold">{governance.policy_violations ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}
