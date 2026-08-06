import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: { value: number; suffix?: string } | null;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function MetricCard({ label, value, hint, delta, icon, loading, className }: MetricCardProps) {
  const Trend = delta && delta.value > 0 ? TrendingUp : delta && delta.value < 0 ? TrendingDown : Minus;
  const trendColor =
    delta && delta.value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta && delta.value < 0
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/70 bg-card p-4 hover:border-border transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
        ) : (
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        )}
        {delta && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", trendColor)}>
            <Trend className="h-3 w-3" />
            {Math.abs(delta.value)}
            {delta.suffix ?? "%"}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
