import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, ShieldAlert, X, Sparkles } from "lucide-react";
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

type Artifacts = Incident & {
  cause_md: string;
  predict_md: string;
  blast_radius: { nodes?: { id: string; type: string }[]; links?: { source: string; target: string }[] };
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
  const [seeding, setSeeding] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const env = await httpRequest<Incident[]>({ method: "GET", path: "/api/v1/incidents/", retries: 0 });
      setIncidents(env.data ?? []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setSeeding(true);
    try {
      await httpRequest({ method: "POST", path: "/api/v1/incidents/generate-demo/", body: {}, retries: 0 });
      await load();
    } catch {
      /* ignore */
    } finally {
      setSeeding(false);
    }
  };

  const openArtifacts = async (inc: Incident) => {
    try {
      const env = await httpRequest<Artifacts>({
        method: "GET",
        path: `/api/v1/incidents/${inc.id}/artifacts/`,
        retries: 0,
      });
      if (env.data) setArtifacts(env.data);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-8 max-w-5xl" data-testid="incidents-view">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active tenant incidents with correlated cause & blast-radius artifacts.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={seeding}
          data-testid="incidents-generate-button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate demo incidents
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="incidents-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
        </div>
      ) : incidents.length > 0 ? (
        <div className="rounded-md border border-border bg-card divide-y divide-border" data-testid="incidents-list">
          {incidents.map((inc) => (
            <button
              key={inc.id}
              onClick={() => openArtifacts(inc)}
              data-testid={`incident-row-${inc.id}`}
              className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-secondary/50 transition-colors"
            >
              <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{inc.title ?? inc.ticket_id ?? inc.id}</div>
                <div className="text-xs font-mono text-muted-foreground">{inc.ticket_id ?? inc.id}</div>
              </div>
              <span className={`px-2.5 py-1 text-[10px] font-mono border rounded-md ${SEVERITY[inc.severity ?? "low"] ?? SEVERITY.low}`}>
                {inc.severity ?? "low"}
              </span>
              <span className="text-xs text-muted-foreground w-24 text-right">{inc.status ?? "open"}</span>
            </button>
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
            Click <span className="text-foreground">Generate demo incidents</span> to populate correlated CAUSE &
            PREDICT artifacts for this workspace.
          </p>
        </div>
      )}

      {artifacts && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex justify-end"
          onClick={() => setArtifacts(null)}
          data-testid="incident-artifacts-drawer"
        >
          <div
            className="w-full max-w-xl h-full bg-card border-l border-border overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 border-b border-border flex items-center justify-between px-6 sticky top-0 bg-card">
              <div>
                <div className="text-sm font-semibold">{artifacts.title}</div>
                <div className="text-xs font-mono text-muted-foreground">{artifacts.ticket_id}</div>
              </div>
              <button onClick={() => setArtifacts(null)} className="p-1.5 rounded-md hover:bg-secondary" data-testid="artifacts-close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Cause</div>
                <pre className="bg-background border border-border rounded-md p-4 text-xs font-mono whitespace-pre-wrap">
                  {artifacts.cause_md}
                </pre>
              </section>
              <section>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Predict</div>
                <pre className="bg-background border border-border rounded-md p-4 text-xs font-mono whitespace-pre-wrap">
                  {artifacts.predict_md}
                </pre>
              </section>
              <section>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Blast Radius</div>
                <div className="flex flex-wrap items-center gap-2">
                  {(artifacts.blast_radius?.nodes ?? []).map((n) => (
                    <span key={n.id} className="px-2.5 py-1 text-xs font-mono border border-border rounded-md">
                      {n.id}<span className="opacity-50 ml-1">{n.type}</span>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
