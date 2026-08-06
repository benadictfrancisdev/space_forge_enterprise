import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, FileSpreadsheet, Sparkles, ShieldCheck, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import DemoModal from "./DemoModal";

const insights = [
  { label: "Revenue", value: "₹ 12.4L", delta: "+18.2%", positive: true,  hint: "Weekend repeat purchases up" },
  { label: "Gross Margin", value: "42.6%", delta: "+1.8 pts", positive: true,  hint: "Logistics cost stabilised" },
  { label: "Top Channel", value: "Direct", delta: "54% of sales", positive: true,  hint: "WhatsApp orders growing" },
  { label: "Watchlist", value: "3 SKUs", delta: "stockout in 9 days", positive: false, hint: "Reorder before next weekend" },
];

const bars = [42, 58, 51, 67, 73, 64, 81, 76, 88, 94];

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [step, setStep]         = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center pt-28 sm:pt-24 pb-16 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-20 items-center max-w-6xl mx-auto">

          <div className="text-left">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-medium tracking-[0.24em] uppercase text-primary mb-7 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              New · Auto-Analyze for spreadsheets
            </div>

            <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[5.25rem] font-medium text-foreground mb-6 animate-slide-up leading-[0.98] tracking-[-0.045em]">
              Your spreadsheet,<br />
              <span className="bg-gradient-to-r from-primary to-[hsl(258_90%_66%)] bg-clip-text text-transparent">answered in 60 seconds.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-9 animate-slide-up leading-[1.55] max-w-xl font-light" style={{ animationDelay: "0.1s" }}>
              Upload Excel or CSV — get an executive dashboard, the 5 insights that matter, and a shareable report. No analyst, no setup, no SQL.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/data-agent" className="w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto rounded-full px-7 py-3.5 min-h-[48px] gap-2 text-sm font-medium tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-0 shadow-[var(--shadow-glow-strong)]"
                >
                  Try with your spreadsheet — free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/apps/executive" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-full px-7 py-3.5 min-h-[48px] gap-2 text-sm font-medium"
                >
                  Open Enterprise Suite <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 px-2"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="w-3.5 h-3.5" /> See sample report
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/80 font-medium tracking-wide animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary/70" /> No signup to try</span>
              <span className="opacity-30">·</span>
              <span>Data stays in your browser</span>
              <span className="opacity-30">·</span>
              <span>Excel · CSV · PDF</span>
              <span className="opacity-30">·</span>
              <a
                href="https://startupranked.com/startup/space-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-primary/70" /> #1 of all time on StartupRanked
              </a>
            </div>
          </div>


          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
              {/* Top bar — file → dashboard */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-medium text-foreground truncate">sales_q3.xlsx</span>
                  <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">· 4,218 rows</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary">
                  <Sparkles className="w-3 h-3" />
                  {step === 0 && "Reading data…"}
                  {step === 1 && "Generating dashboard…"}
                  {step === 2 && "Ready"}
                </div>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-px bg-border/60">
                {insights.map((k, i) => (
                  <div key={k.label} className="bg-card px-5 py-4">
                    <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted-foreground mb-1.5">{k.label}</p>
                    <p className="text-xl font-semibold text-foreground tracking-tight tabular-nums">{k.value}</p>
                    <p className={`text-[11px] mt-1 ${k.positive ? "text-foreground/70" : "text-destructive/90"}`}>
                      {k.delta}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-snug">{k.hint}</p>
                  </div>
                ))}
              </div>

              {/* Mini chart */}
              <div className="px-5 py-4 border-t border-border/70">
                <div className="flex items-end justify-between gap-1.5 h-16">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/15 transition-all duration-700"
                      style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                    >
                      <div
                        className="w-full rounded-sm bg-primary"
                        style={{ height: `${Math.max(20, h - 25)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground/70">
                  <span>Last 10 weeks</span>
                  <span className="text-foreground/80 font-medium">Revenue trend ↑</span>
                </div>
              </div>

              {/* Footer insight */}
              <div className="flex items-start gap-2 px-5 py-3.5 border-t border-border/70 bg-muted/30">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[12px] leading-relaxed text-foreground/85">
                  Revenue grew <span className="font-medium">18%</span> month-over-month, driven by
                  <span className="font-medium"> weekend repeat buyers</span>. Reorder 3 SKUs before the next weekend to avoid stockouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}
