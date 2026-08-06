import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, TrendingDown, Users, AlertTriangle, Activity, ArrowRight,
  Bell, ChevronDown, ChevronUp, Sparkles, MessageSquare, Mail,
  BarChart3, Target, Layers, ShieldCheck, GitBranch, LineChart,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  generateDecisions,
  type DecisionFeedResult,
  type GeneratedDecision,
  type DecisionSeverity,
  type DecisionCategory,
} from "@/lib/decisionGenerator";
import { ShareLinkButton } from "@/components/sharing/ShareLinkButton";
import ShareDashboardButton from "@/components/sharing/ShareDashboardButton";
import { buildDecisionFeedSnapshot } from "@/lib/buildShareSnapshot";

const Footer = lazy(() => import("@/components/Footer"));

const severityConfig: Record<DecisionSeverity, { label: string; chip: string; ring: string }> = {
  critical: { label: "Critical", chip: "bg-destructive/15 text-destructive border-destructive/30", ring: "ring-destructive/40" },
  high:     { label: "High",     chip: "bg-amber-500/15 text-amber-500 border-amber-500/30",        ring: "ring-amber-500/40" },
  medium:   { label: "Medium",   chip: "bg-primary/15 text-primary border-primary/30",              ring: "ring-primary/30" },
  low:      { label: "Low",      chip: "bg-muted text-muted-foreground border-border",              ring: "ring-border" },
};

const categoryIcons: Record<DecisionCategory, typeof Wallet> = {
  cashflow: Wallet,
  revenue: TrendingDown,
  churn: Users,
  expense: AlertTriangle,
  score: Activity,
  performance: Target,
  trend: LineChart,
  anomaly: AlertTriangle,
  concentration: Layers,
  quality: ShieldCheck,
  correlation: GitBranch,
};

interface StoredDataset {
  datasetName: string;
  columns: string[];
  rowCount: number;
  sampledRowCount: number;
  rows: Record<string, unknown>[];
}

// ─── Sample fallback decisions (only when no data is connected) ─────
const sampleResult: DecisionFeedResult = {
  domain: "general",
  forgeScore: 71,
  scoreLabel: "Watch",
  scoreSummary: "These are example decisions — connect your data to see your own.",
  decisions: [
    {
      id: "demo-1", category: "cashflow", severity: "critical",
      problem: "Cash will run out in 47 days at current burn rate",
      impact: "Payroll for next month at risk",
      impactValue: "47d",
      action: "Collect overdue receivables — 8 invoices > 30 days late",
      actionLabel: "See Live Decisions",
      source: "Example data",
      evidence: ["Sample insight only", "Connect Tally / Zoho / CSV", "Real numbers will appear here"],
    },
    {
      id: "demo-2", category: "revenue", severity: "high",
      problem: "Revenue projected to drop 12% next month",
      impact: "South region driving the dip",
      impactValue: "−12%",
      action: "Re-engage top 5 accounts that reduced order frequency",
      actionLabel: "See Live Decisions",
      source: "Example data",
      evidence: ["Demo only", "Upload data to personalise"],
    },
  ],
};

const DecisionFeed = () => {
  const [active, setActive] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stored, setStored] = useState<StoredDataset | null>(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("spaceforge-decision-dataset") ||
        sessionStorage.getItem("spaceforge-decision-dataset");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDataset;
        if (parsed?.rows?.length) setStored(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const isConnected = !!stored;

  const result: DecisionFeedResult = useMemo(() => {
    if (!stored) return sampleResult;
    try {
      return generateDecisions(stored.rows, stored.columns);
    } catch (err) {
      console.error("Decision generation failed", err);
      toast.error("Could not analyse this dataset", { description: "Falling back to example feed." });
      return sampleResult;
    }
  }, [stored]);

  // Build dynamic categories from generated decisions
  const categories = useMemo(() => {
    const set = new Set<string>();
    result.decisions.forEach(d => set.add(d.category));
    const list = [{ id: "all", label: "All Decisions" }, ...Array.from(set).map(id => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
    }))];
    return list;
  }, [result]);

  const filtered = active === "all" ? result.decisions : result.decisions.filter(d => d.category === active);

  const handleAct = (d: GeneratedDecision) => {
    if (!isConnected) {
      toast.info("Connect your data to enable real actions", {
        description: "These are example decisions. Upload a CSV or connect Tally/Zoho to see your own.",
      });
      return;
    }
    toast.success(`Action queued: ${d.actionLabel}`, {
      description: "We'll trigger this against your live data.",
    });
  };

  const scoreColor =
    result.forgeScore >= 85 ? "text-emerald-500" :
    result.forgeScore >= 70 ? "text-primary" :
    result.forgeScore >= 50 ? "text-amber-500" : "text-destructive";

  return (
    <div className="min-h-screen bg-background relative">
      <SEO
        title="Decision Feed — AI Analyst Copilot in Action | SpaceForge"
        description="Live Problem → Impact → Action feed for your business. Cash flow, revenue, anomalies, and recommended actions — generated from your own data."
      />
      <SpaceBackground />
      <Navbar />

      <main className="relative z-10 pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Decision Feed · {isConnected ? `${result.domain} mode` : "Demo"}
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[5.25rem] font-medium text-foreground tracking-[-0.05em] leading-[0.98] mb-6">
              Today's decisions,
              <br />
              <span className="italic font-light text-foreground/55">ranked by impact.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-[1.6] font-light">
              Every card: <span className="text-foreground">Problem → Impact → Action</span>. Generated from your data, refreshed continuously.
            </p>
          </div>

          {/* Forge Score banner */}
          <div className="mb-8 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center">
                <span className={`text-2xl font-black ${scoreColor}`}>{result.forgeScore}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Forge Score</span>
                  <Badge variant="secondary" className="text-[10px]">{result.scoreLabel}</Badge>
                </div>
                <p className="text-sm text-foreground font-semibold mt-1">{result.scoreSummary}</p>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? `Computed from ${stored.sampledRowCount.toLocaleString()} rows of ${stored.datasetName}` : "Demo score — connect data for your real number"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <ShareDashboardButton
                title={`SpaceForge Decision Feed — Forge Score ${result.forgeScore}`}
                datasetName={isConnected ? stored.datasetName : undefined}
                snapshot={buildDecisionFeedSnapshot(result)}
              />
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => toast.info("WhatsApp alerts coming soon")}>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => toast.info("Email digest coming soon")}>
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full" onClick={() => toast.info("Push alerts enabled")}>
                <Bell className="w-3.5 h-3.5" /> Alerts
              </Button>
            </div>
          </div>

          {/* Connection state banner */}
          {!isConnected ? (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">You're viewing example decisions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your data (Tally, Zoho, Vyapar, Razorpay or CSV). Decisions adapt to financial, sales, sports, or any dataset you upload.
                  </p>
                </div>
              </div>
              <Link to="/data-agent">
                <Button size="sm" className="rounded-full gap-1.5 font-bold">
                  Connect Data <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-sm text-foreground">
                <span className="font-bold">Live</span> · Connected to{" "}
                <span className="text-primary font-semibold">{stored.datasetName}</span>
                <span className="text-muted-foreground"> · {stored.rowCount.toLocaleString()} rows · {stored.columns.length} columns · domain detected: <span className="text-foreground font-semibold capitalize">{result.domain}</span></span>
              </p>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all border ${
                  active === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Decision cards */}
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-border bg-card/80 p-10 text-center">
                <p className="text-sm text-muted-foreground">No decisions in this category. Try "All Decisions".</p>
              </div>
            )}
            {filtered.map((d) => {
              const cfg = severityConfig[d.severity];
              const Icon = categoryIcons[d.category] || Activity;
              const isOpen = expanded[d.id];
              return (
                <article
                  key={d.id}
                  className={`rounded-2xl border bg-card/90 backdrop-blur-sm overflow-hidden transition-all hover:ring-1 ${cfg.ring}`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.chip}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.source}</span>
                        </div>

                        <h2 className="text-lg font-bold text-foreground leading-snug">{d.problem}</h2>

                        <div className="mt-3 flex items-start gap-3">
                          <div className="text-2xl font-black text-primary leading-none mt-0.5 break-all">{d.impactValue}</div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Business Impact</p>
                            <p className="text-sm text-foreground/90">{d.impact}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Recommended Action</p>
                          <p className="text-sm text-foreground font-medium mb-3">{d.action}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="rounded-full gap-1.5" onClick={() => handleAct(d)}>
                              {d.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full gap-1.5 text-xs"
                              onClick={() => setExpanded(p => ({ ...p, [d.id]: !p[d.id] }))}
                            >
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isOpen ? "Hide evidence" : "Show evidence"}
                            </Button>
                            <ShareLinkButton
                              title={`${cfg.label}: ${d.problem}`}
                              text={`${d.problem} — ${d.impact} (${d.impactValue}). Action: ${d.action}`}
                              variant="ghost"
                              label="Share"
                            />
                          </div>
                        </div>

                        {isOpen && (
                          <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 animate-fade-in">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Evidence</p>
                            <ul className="space-y-1.5">
                              {d.evidence.map((e, i) => (
                                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>{e}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Footer CTA */}
          {!isConnected && (
            <div className="mt-12 rounded-2xl border border-primary/20 bg-card/80 p-8 text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">Want this on your real data?</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
                Upload any CSV — financial, sales, sports, marketing — the AI CFO adapts and generates decisions in under 60 seconds.
              </p>
              <Link to="/data-agent">
                <Button size="lg" className="rounded-full gap-2 font-bold">
                  Connect Your Data <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default DecisionFeed;
