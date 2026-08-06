import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { PlatformEmptyState } from "@/components/platform/PlatformStates";
import FeatureGate from "./FeatureGate";
import { computeDatasetProfile } from "@/lib/statisticsEngine";
import { flagOutliers } from "@/lib/advancedStats";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

/** Lightweight inline SVG sparkline — no chart library overhead. */
function Sparkline({
  values,
  trend,
}: {
  values: number[];
  trend: "up" | "down" | "stable";
}) {
  if (!values || values.length < 2) return null;
  const w = 80;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  const stroke =
    trend === "up"
      ? "hsl(var(--primary))"
      : trend === "down"
      ? "hsl(0 84% 60%)"
      : "hsl(var(--muted-foreground))";
  return (
    <svg
      width={w}
      height={h}
      className="overflow-visible"
      role="img"
      aria-label="trend sparkline"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      <circle
        cx={(values.length - 1) * step}
        cy={h - ((values[values.length - 1] - min) / range) * h}
        r={2}
        fill={stroke}
      />
    </svg>
  );
}

/** Health → color mapping using semantic tokens only. */
function healthBadge(health: "healthy" | "warning" | "critical") {
  if (health === "critical")
    return "bg-destructive/15 text-destructive border-destructive/40";
  if (health === "warning")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
}

const KPIComparisonCards = ({ data, columns, columnTypes, datasetName }: Props) => {
  const profile = useMemo(
    () => computeDatasetProfile(data, columns, columnTypes),
    [data, columns, columnTypes],
  );

  // Build enriched cards: pull recent-window samples for sparkline, flag anomalies, suggest drill paths.
  const cards = useMemo(() => {
    return profile.kpis.map((kpi) => {
      // Sample up to 20 most-recent values for sparkline
      const all = data
        .map((r) => Number(r[kpi.column]))
        .filter((v) => Number.isFinite(v));
      const sample = all.length > 20 ? all.slice(-20) : all;

      // Outlier detection — flag if recent window contains ≥1 extreme
      const flags = flagOutliers(sample);
      const recentExtreme = flags.some((f) => f.severity === "extreme");

      // Heuristic target: previous value × (1 + small growth assumption)
      const target = kpi.value * (kpi.trend === "up" ? 1.0 : 1.05);
      const vsTargetPct =
        target !== 0 ? ((kpi.value - target) / Math.abs(target)) * 100 : 0;

      return {
        metric: kpi.name,
        column: kpi.column,
        category: kpi.category,
        formula: kpi.formula,
        current_val: kpi.value,
        formatted: kpi.formattedValue,
        delta_pct: kpi.changePct,
        direction: kpi.trend,
        health: kpi.health,
        business_context: kpi.insight,
        sparkline: sample,
        anomaly: recentExtreme,
        anomalyCount: flags.length,
        vsTargetPct,
        drillTo: `Drill: ${kpi.column} → Time Intelligence`,
      };
    });
  }, [profile.kpis, data]);

  return (
    <FeatureGate feature="KPI Comparison Cards" creditCost={0} requiredPlan="free">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              KPI Comparison Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Auto-detected {cards.length} KPIs with sparklines, anomaly badges and drill paths
              — computed locally, no AI credits used.
            </p>
          </CardContent>
        </Card>

        {cards.length === 0 ? (
          <Card className="linear-card border-dashed">
            <CardContent>
              <PlatformEmptyState
                title="No KPIs detected"
                description="Upload a dataset with numeric columns (revenue, units, counts) to auto-generate KPI comparison cards."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((card, i) => (
              <Card key={i} className="linear-card overflow-hidden relative">
                {card.anomaly && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge
                      variant="outline"
                      className="bg-destructive/15 text-destructive border-destructive/40 text-[9px] py-0 px-1.5 gap-1"
                    >
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Anomaly
                    </Badge>
                  </div>
                )}
                <CardContent className="p-4">
                  {/* Header: metric name + category */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {card.metric}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0 px-1.5 ${healthBadge(card.health)}`}
                    >
                      {card.health}
                    </Badge>
                  </div>

                  {/* Value + sparkline row */}
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <p className="text-2xl font-bold text-foreground leading-none">
                      {card.formatted}
                    </p>
                    <Sparkline values={card.sparkline} trend={card.direction} />
                  </div>

                  {/* vs prior + vs target */}
                  <div className="flex items-center gap-3 text-xs font-medium mb-1.5">
                    <span
                      className={`flex items-center gap-0.5 ${
                        card.direction === "up"
                          ? "text-emerald-500"
                          : card.direction === "down"
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {card.direction === "up" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : card.direction === "down" ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {card.delta_pct > 0 ? "+" : ""}
                      {card.delta_pct?.toFixed(1)}%
                      <span className="text-muted-foreground ml-0.5 font-normal">
                        vs prev
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      vs target:{" "}
                      <span
                        className={
                          card.vsTargetPct >= 0 ? "text-emerald-500" : "text-rose-500"
                        }
                      >
                        {card.vsTargetPct > 0 ? "+" : ""}
                        {card.vsTargetPct.toFixed(1)}%
                      </span>
                    </span>
                  </div>

                  {/* Business context */}
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                    {card.business_context}
                  </p>

                  {/* Drill path */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {card.formula}
                    </span>
                    <span className="text-[9px] text-primary flex items-center gap-0.5">
                      {card.drillTo}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
};

export default KPIComparisonCards;
