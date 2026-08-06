import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { backend } from "@/platform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, ShieldCheck, AlertCircle, BarChart3, Clock, ArrowRight, Eye } from "lucide-react";
import Logo from "@/components/Logo";
import DataBarChart from "@/components/data-agent/charts/DataBarChart";
import DataLineChart from "@/components/data-agent/charts/DataLineChart";
import DataPieChart from "@/components/data-agent/charts/DataPieChart";
import DataAreaChart from "@/components/data-agent/charts/DataAreaChart";
import DataScatterChart from "@/components/data-agent/charts/DataScatterChart";
import { ViralShareActions, ViralConversionCTA } from "@/components/sharing/ViralShareActions";

interface SharedSnapshot {
  data?: Record<string, unknown>[];
  columns?: string[];
  tiles?: Array<{
    id: string;
    type: string;
    title: string;
    config?: Record<string, any>;
    value?: number;
    change?: number;
    insight?: string;
  }>;
  insights?: string[];
  summary?: string;
  source?: string;
}

interface ShareMeta {
  id: string;
  title: string;
  description?: string | null;
  dataset_name?: string | null;
  snapshot?: SharedSnapshot;
  is_password_protected?: boolean;
  expires_at?: string | null;
  created_at?: string;
  view_count?: number;
}

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <a href="/" className="flex items-center gap-2"><Logo /></a>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">Shared dashboard</Badge>
          <Button asChild size="sm" className="h-8">
            <Link to="/data-agent">
              Try free <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
    <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">{children}</main>
    <footer className="border-t border-border mt-12 py-6">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Powered by <a href="/" className="text-primary hover:underline">SpaceForge</a> â€” AI Business Reporting Assistant</span>
        <Link to="/data-agent" className="hover:text-primary transition-colors">
          Make your own free dashboard â†’
        </Link>
      </div>
    </footer>
  </div>
);

const formatNum = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const renderTile = (tile: NonNullable<SharedSnapshot["tiles"]>[number], data: Record<string, unknown>[]) => {
  const cfg = tile.config || {};
  switch (tile.type) {
    case "kpi": {
      const v = Number(tile.value ?? cfg.value ?? 0);
      const change = Number(tile.change ?? cfg.change ?? 0);
      return (
        <Card className="linear-card h-full">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{tile.title}</p>
            <p className="text-2xl font-bold mt-1">{formatNum(v)}</p>
            {change !== 0 && (
              <Badge variant={change > 0 ? "default" : "destructive"} className="mt-2 text-[10px]">
                {change > 0 ? "+" : ""}{change.toFixed(1)}%
              </Badge>
            )}
            {tile.insight && <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{tile.insight}</p>}
          </CardContent>
        </Card>
      );
    }
    case "bar":
      return <DataBarChart data={data} xKey={cfg.xKey} yKey={cfg.yKey} title={tile.title} />;
    case "line":
      return <DataLineChart data={data} xKey={cfg.xKey} yKeys={cfg.yKeys || [cfg.yKey]} title={tile.title} />;
    case "pie":
      return <DataPieChart data={data} nameKey={cfg.nameKey} valueKey={cfg.valueKey} title={tile.title} />;
    case "area":
      return <DataAreaChart data={data} xKey={cfg.xKey} yKeys={cfg.yKeys || [cfg.yKey]} title={tile.title} />;
    case "scatter":
      return <DataScatterChart data={data} xKey={cfg.xKey} yKey={cfg.yKey} title={tile.title} />;
    default:
      return (
        <Card className="linear-card h-full">
          <CardHeader className="pb-2"><CardTitle className="text-sm">{tile.title}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">{tile.insight || "â€”"}</CardContent>
        </Card>
      );
  }
};

const SharedDashboard = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ShareMeta | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error } = await backend.functions.invoke("share-dashboard", {
        body: { action: "get", token },
      });
      setLoading(false);

      if (error) { setError(error.message); return; }
      if (!data?.success) { setError(data?.error || "Share not found"); return; }

      const meta = data.data as ShareMeta;
      setMeta(meta);
      if (meta.is_password_protected && !meta.snapshot) setNeedsPassword(true);

      // Per-page SEO + social meta so re-shared links preview cleanly
      try {
        const desc = meta.description || `AI-generated business dashboard${meta.dataset_name ? ` for ${meta.dataset_name}` : ""} â€” powered by SpaceForge.`;
        document.title = `${meta.title} Â· SpaceForge`;
        const set = (sel: string, attr: string, key: string, val: string) => {
          let el = document.head.querySelector<HTMLMetaElement>(sel);
          if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
          el.setAttribute("content", val);
        };
        set('meta[name="description"]', "name", "description", desc);
        set('meta[property="og:title"]', "property", "og:title", meta.title);
        set('meta[property="og:description"]', "property", "og:description", desc);
        set('meta[property="og:type"]', "property", "og:type", "article");
        set('meta[property="og:url"]', "property", "og:url", window.location.href);
        set('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
        set('meta[name="twitter:title"]', "name", "twitter:title", meta.title);
        set('meta[name="twitter:description"]', "name", "twitter:description", desc);
      } catch { /* head mutation best-effort */ }
    })();
  }, [token]);

  const handleVerify = async () => {
    if (!token || !password) return;
    setVerifying(true);
    setVerifyError(null);
    const { data, error } = await backend.functions.invoke("share-dashboard", {
      body: { action: "verify_password", token, password },
    });
    setVerifying(false);
    if (error || !data?.success) {
      setVerifyError(data?.error || error?.message || "Incorrect password");
      return;
    }
    setMeta((prev) => ({ ...(prev || ({} as ShareMeta)), ...data.data }));
    setNeedsPassword(false);
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading shared dashboardâ€¦
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Card className="linear-card max-w-md mx-auto mt-12">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold">Share unavailable</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button asChild variant="outline" className="mt-4"><a href="/">Go home</a></Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (needsPassword) {
    return (
      <PageShell>
        <Card className="linear-card max-w-md mx-auto mt-12">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Protected dashboard</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the password shared by {meta?.title ? `â€œ${meta.title}â€` : "the owner"} to view.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                autoFocus
              />
              {verifyError && <p className="text-[11px] text-destructive">{verifyError}</p>}
            </div>
            <Button onClick={handleVerify} disabled={verifying || !password} className="w-full">
              {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifyingâ€¦</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Unlock</>}
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const snap = meta?.snapshot || {};
  const data = Array.isArray(snap.data) ? snap.data : [];
  const tiles = Array.isArray(snap.tiles) ? snap.tiles : [];
  const insights = Array.isArray(snap.insights) ? snap.insights : [];

  const headline = insights[0] && typeof insights[0] === "string" ? insights[0] : undefined;

  return (
    <PageShell>
      <ViralConversionCTA variant="top" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{meta?.title}</h1>
        {meta?.description && <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
          {meta?.dataset_name && <span>Dataset: <strong>{meta.dataset_name}</strong></span>}
          {data.length > 0 && <span>Â· {data.length.toLocaleString()} rows</span>}
          {typeof meta?.view_count === "number" && meta.view_count > 0 && (
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {meta.view_count.toLocaleString()} views</span>
          )}
          {meta?.expires_at && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(meta.expires_at).toLocaleDateString()}</span>
          )}
      </div>

      {snap.summary && (
        <Card className="linear-card">
          <CardContent className="p-4">
            <p className="text-sm text-foreground leading-relaxed">{snap.summary}</p>
          </CardContent>
        </Card>
      )}
      </div>

      {insights.length > 0 && (
        <Card className="linear-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Key insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.slice(0, 6).map((ins, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-primary/5">
                <Badge variant="outline" className="text-[9px] mt-0.5">{i + 1}</Badge>
                <p className="text-xs text-foreground leading-relaxed">{typeof ins === "string" ? ins : JSON.stringify(ins)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tiles.map((t) => <div key={t.id}>{renderTile(t, data)}</div>)}
        </div>
      ) : (
        <Card className="linear-card">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No visualizations were included in this share.</p>
          </CardContent>
        </Card>
      )}

      <ViralShareActions title={meta?.title || "Dashboard"} headline={headline} viewCount={meta?.view_count} />
      <ViralConversionCTA variant="bottom" />
    </PageShell>
  );
};

export default SharedDashboard;
