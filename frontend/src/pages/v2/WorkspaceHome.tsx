import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Code2,
  Boxes,
  Database,
  ArrowUpRight,
  FileCode2,
  ArrowRight,
} from "lucide-react";
import { workspacePath } from "@/config/workspaceNav";
import { httpRequest } from "@/platform/httpClient";
import { isApiConfigured } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";

type Incident = {
  id: string;
  ticket_id?: string;
  title?: string;
  status?: string;
  severity?: string;
};

type EventStats = {
  p50_ms?: number;
  p90_ms?: number;
  p99_ms?: number;
  events_per_second?: number;
  error_rate?: number;
  total_events?: number;
};

const MODULES = [
  { to: workspacePath("/rules"), title: "Rules", desc: "Markdown-as-Logic IDE", icon: FileCode2, tag: "rules" },
  { to: workspacePath("/incidents"), title: "Incidents", desc: "CAUSE, PREDICT, blast radius", icon: AlertTriangle, tag: "incidents" },
  { to: workspacePath("/metrics"), title: "Live Metrics", desc: "P50 / P90 / P99 and throughput", icon: Activity, tag: "telemetry" },
  { to: workspacePath("/apps/executive"), title: "Intelligence", desc: "Executive, journey, decision, forecast", icon: Boxes, tag: "apps" },
  { to: workspacePath("/data-agent"), title: "Data Agent", desc: "Datasets, connectors, analysis", icon: Database, tag: "data" },
  { to: workspacePath("/events"), title: "Events", desc: "Ingest and query telemetry", icon: Code2, tag: "events" },
];

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function WorkspaceHome() {
  const { user } = useAuth();
  const tenant = useTenantContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiConfigured() || !user) {
        setLoading(false);
        return;
      }
      try {
        const [incEnv, statsEnv] = await Promise.all([
          httpRequest<Incident[]>({ method: "GET", path: "/api/v1/incidents/", retries: 0 }),
          httpRequest<EventStats>({ method: "GET", path: "/api/v1/events/stats/", retries: 0 }),
        ]);
        if (cancelled) return;
        setIncidents(incEnv.data ?? []);
        setStats(statsEnv.data ?? null);
      } catch {
        if (!cancelled) {
          setIncidents([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const name = user?.email?.split("@")[0] ?? "there";
  const attention = incidents.filter((i) => {
    const s = (i.severity ?? "").toLowerCase();
    const st = (i.status ?? "open").toLowerCase();
    return st !== "resolved" && st !== "closed" && (s === "critical" || s === "high" || st === "open");
  });

  return (
    <div className="overflow-y-auto p-4 md:p-6 max-w-6xl" data-testid="workspace-home">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting(new Date().getHours())}, {name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tenant.organization?.name ?? "Organization"} / {tenant.workspace?.name ?? "Workspace"}
          {!tenant.apiConfigured && " · Platform API not configured"}
          {tenant.apiConfigured && !user && " · Sign in to load live status"}
        </p>
      </header>

      <section className="mb-8" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Attention required
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workspace status…</p>
        ) : attention.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md px-4 py-6">
            No open critical incidents in this workspace.
          </p>
        ) : (
          <ul className="border border-border rounded-md divide-y divide-border bg-card">
            {attention.slice(0, 5).map((inc) => (
              <li key={inc.id}>
                <Link
                  to={workspacePath("/incidents")}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm truncate flex-1">{inc.title ?? inc.ticket_id ?? inc.id}</span>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{inc.severity ?? "open"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8" aria-labelledby="ops-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="ops-heading" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Operations
          </h2>
          <Link to={workspacePath("/metrics")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Live Metrics <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Pulse label="Events" value={stats?.total_events ?? "—"} />
          <Pulse label="P99 ms" value={stats?.p99_ms ?? "—"} />
          <Pulse label="Error rate" value={stats?.error_rate != null ? `${stats.error_rate}%` : "—"} />
          <Pulse label="Open incidents" value={attention.length} />
        </div>
      </section>

      <section className="mb-8" aria-labelledby="intel-heading">
        <h2 id="intel-heading" className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Investigate
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link className="text-sm border border-border rounded-md px-3 py-2 hover:bg-secondary" to={workspacePath("/apps/decisions")}>
            Decision Intelligence
          </Link>
          <Link className="text-sm border border-border rounded-md px-3 py-2 hover:bg-secondary" to={workspacePath("/apps/executive")}>
            Executive Insights
          </Link>
          <Link className="text-sm border border-border rounded-md px-3 py-2 hover:bg-secondary" to={workspacePath("/data-agent")}>
            Data Agent
          </Link>
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Workspace modules
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((c) => (
            <Link
              key={c.tag}
              to={c.to}
              data-testid={`workspace-card-${c.tag}`}
              className="group rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <c.icon className="h-4 w-4 text-primary" />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Pulse({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold font-mono tabular-nums">{value}</div>
    </div>
  );
}
