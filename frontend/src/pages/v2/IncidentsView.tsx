import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { httpRequest } from "@/platform/httpClient";
import { isApiConfigured } from "@/platform";

type Incident = {
  id: string;
  ticket_id?: string;
  title?: string;
  status?: string;
  severity?: string;
  created_at?: string;
};

const SEVERITY: Record<string, string> = {
  critical: "text-destructive border-destructive/40",
  high: "text-orange-400 border-orange-400/40",
  medium: "text-primary border-primary/40",
  low: "text-muted-foreground border-border",
};

export default function IncidentsView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const env = await httpRequest<Incident[]>({ method: "GET", path: "/api/v1/incidents/", retries: 0 });
        if (!cancelled) setIncidents(env.data ?? []);
      } catch (e) {
        // Endpoint arrives in Phase 3 — degrade to empty state, not a crash.
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load incidents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-8 max-w-5xl" data-testid="incidents-view">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active tenant incidents with correlated cause & blast-radius artifacts.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="incidents-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
        </div>
      ) : incidents.length > 0 ? (
        <div className="rounded-md border border-border bg-card divide-y divide-border" data-testid="incidents-list">
          {incidents.map((inc) => (
            <div key={inc.id} className="flex items-center gap-4 px-6 py-4" data-testid={`incident-row-${inc.id}`}>
              <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{inc.title ?? inc.ticket_id ?? inc.id}</div>
                <div className="text-xs font-mono text-muted-foreground">{inc.ticket_id ?? inc.id}</div>
              </div>
              <span
                className={`px-2.5 py-1 text-[10px] font-mono border rounded-md ${
                  SEVERITY[inc.severity ?? "low"] ?? SEVERITY.low
                }`}
              >
                {inc.severity ?? "low"}
              </span>
              <span className="text-xs text-muted-foreground">{inc.status ?? "open"}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-md border border-dashed border-border bg-card/50 p-12 grid place-items-center text-center"
          data-testid="incidents-empty"
        >
          <ShieldAlert className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No active incidents</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {error
              ? "Incident intelligence service is not available yet (Phase 3)."
              : "When a telemetry rule breaches, correlated CAUSE & PREDICT artifacts will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
