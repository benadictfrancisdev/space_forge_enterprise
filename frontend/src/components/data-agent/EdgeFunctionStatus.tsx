import { useCallback, useEffect, useState } from "react";
import { backend } from "@/platform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Server, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvocationLog {
  ts: number;
  action: string;
  status: "ok" | "error" | "fallback";
  code?: string;
  step?: string;
  http_status: number;
  duration_ms: number;
  user_mode: "authenticated" | "anonymous" | "admin";
  model?: string;
}

interface HealthPayload {
  ok: boolean;
  service: string;
  version: string;
  uptime_seconds: number;
  timestamp: string;
  environment: {
    ai_api_key: boolean;
    api_url: boolean;
    service_credentials: boolean;
  };
  stats: {
    total_invocations: number;
    errors: number;
    fallbacks: number;
    success_rate: number;
    avg_latency_ms: number;
  };
  recent: InvocationLog[];
}

interface PingResult {
  ok: boolean;
  roundtrip_ms?: number;
  version?: string;
  error?: string;
}

const EdgeFunctionStatus = () => {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [ping, setPing] = useState<PingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await backend.functions.invoke("data-agent", {
        body: { action: "health" },
      });
      if (error) throw error;
      setHealth((data as HealthPayload) ?? null);
    } catch (e) {
      console.error("[Health] fetch failed:", e);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const runPing = useCallback(async () => {
    setPinging(true);
    const t0 = performance.now();
    try {
      const { data, error } = await backend.functions.invoke("data-agent", {
        body: { action: "__ping", echo: { from: "diagnostics-panel", at: Date.now() } },
      });
      const roundtrip = Math.round(performance.now() - t0);
      if (error) throw error;
      setPing({ ok: !!data?.ok, roundtrip_ms: roundtrip, version: data?.version });
    } catch (e) {
      setPing({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setPinging(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    runPing();
  }, [fetchHealth, runPing]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchHealth, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchHealth]);

  const statusColor = (s: InvocationLog["status"]) =>
    s === "ok" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : s === "fallback" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-rose-500/15 text-rose-400 border-rose-500/30";

  const overallOk = health?.ok && (ping?.ok ?? false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            overallOk ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
          )}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Edge Function Health</h3>
            <p className="text-xs text-muted-foreground">
              Live diagnostics for <code className="font-mono">data-agent</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(v => !v)}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Auto-refresh: {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={runPing} disabled={pinging}>
            {pinging ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            Run Ping
          </Button>
        </div>
      </div>

      {/* Top metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              {overallOk
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span className="text-sm font-semibold">
                {overallOk ? "Operational" : "Degraded"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">Success rate</p>
            <p className="text-xl font-bold">{health?.stats.success_rate ?? "â€”"}%</p>
            <p className="text-xs text-muted-foreground">{health?.stats.total_invocations ?? 0} calls</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">Avg latency</p>
            <p className="text-xl font-bold">{health?.stats.avg_latency_ms ?? "â€”"}<span className="text-xs font-normal text-muted-foreground"> ms</span></p>
            <p className="text-xs text-muted-foreground">last {health?.recent?.length ?? 0} calls</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground mb-1">Ping roundtrip</p>
            <p className="text-xl font-bold">{ping?.roundtrip_ms ?? "â€”"}<span className="text-xs font-normal text-muted-foreground"> ms</span></p>
            <p className="text-xs text-muted-foreground truncate">{ping?.version ?? (ping?.error ? "Failed" : "")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Environment readiness */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Environment Readiness</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            {[
              { label: "AI API key", ok: health?.environment.ai_api_key },
              { label: "API URL", ok: health?.environment.api_url },
              { label: "Service credentials", ok: health?.environment.service_credentials },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                {item.ok
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                <span>{item.label}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {item.ok ? "ready" : "missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent invocations */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recent invocations</span>
            <Badge variant="outline" className="text-xs">
              {health?.stats.errors ?? 0} errors Â· {health?.stats.fallbacks ?? 0} fallbacks
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!health?.recent?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No invocations recorded yet. Trigger an action or run a ping.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {health.recent.map((log, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-muted/20 text-xs">
                  <Badge className={cn("text-[10px] uppercase shrink-0", statusColor(log.status))}>
                    {log.status}
                  </Badge>
                  <code className="font-mono shrink-0 text-foreground/80">{log.action}</code>
                  <span className="text-muted-foreground truncate flex-1">
                    {log.code ? `${log.code} Â· ${log.step ?? ""}` : log.model ?? ""}
                  </span>
                  <span className="text-muted-foreground shrink-0">{log.duration_ms}ms</span>
                  <span className="text-muted-foreground shrink-0 hidden sm:inline">{log.user_mode}</span>
                  <span className="text-muted-foreground shrink-0 hidden md:inline">
                    {new Date(log.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {health?.version && (
        <p className="text-[11px] text-muted-foreground text-center">
          v{health.version} Â· uptime {Math.round((health.uptime_seconds ?? 0) / 60)}m Â· last refreshed {new Date(health.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};

export default EdgeFunctionStatus;
