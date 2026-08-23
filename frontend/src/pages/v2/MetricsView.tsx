import { useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { httpRequest } from "@/platform/httpClient";
import { isApiConfigured } from "@/platform";

type Stats = {
  p50_ms?: number;
  p90_ms?: number;
  p99_ms?: number;
  events_per_second?: number;
  error_rate?: number;
  total_events?: number;
};

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-6" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold font-mono">
        {value}
        {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export default function MetricsView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const env = await httpRequest<Stats>({ method: "GET", path: "/api/v1/events/stats/", retries: 0 });
        if (!cancelled) setStats(env.data ?? null);
      } catch {
        // Event Engine stats arrive in Phase 2 — show zeroed baseline, not a crash.
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const v = (n?: number) => (n == null ? "—" : String(n));

  return (
    <div className="p-8 max-w-5xl" data-testid="metrics-view">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time latency percentiles, throughput and error rates across telemetry streams.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="metrics-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading telemetry…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="metrics-grid">
            <Metric label="P50 Latency" value={v(stats?.p50_ms)} suffix="ms" />
            <Metric label="P90 Latency" value={v(stats?.p90_ms)} suffix="ms" />
            <Metric label="P99 Latency" value={v(stats?.p99_ms)} suffix="ms" />
            <Metric label="Events / sec" value={v(stats?.events_per_second)} />
            <Metric label="Error Rate" value={v(stats?.error_rate)} suffix="%" />
            <Metric label="Total Events" value={v(stats?.total_events)} />
          </div>
          {!stats && (
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground" data-testid="metrics-empty">
              <Activity className="h-4 w-4" />
              No telemetry ingested yet. Event Engine stats endpoint activates in Phase 2.
            </div>
          )}
        </>
      )}
    </div>
  );
}
