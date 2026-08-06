import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileSpreadsheet, ShieldCheck, Sparkles, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { analyzeBySlug, analyzeTemplates } from "@/data/analyzeTemplates";

const SITE_ORIGIN = "https://www.spaceforge.in";

export default function AnalyzeUseCase() {
  const { slug = "" } = useParams();
  const tpl = analyzeBySlug(slug);

  if (!tpl) return <Navigate to="/" replace />;

  // JSON-LD for richer search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SpaceForge",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: tpl.description,
    url: `${SITE_ORIGIN}/analyze/${tpl.slug}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "142" },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={tpl.title} description={tpl.description} canonicalPath={`/analyze/${tpl.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />

      <main className="relative z-10">
        {/* Hero */}
        <section className="container mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-medium tracking-[0.24em] uppercase text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              For {tpl.audience}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-foreground mb-6 leading-[1.02] tracking-[-0.035em]">
              {tpl.h1}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-light">{tpl.intent}</p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <Link to="/data-agent" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-full px-7 py-3.5 min-h-[48px] gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-glow-strong)]">
                  <Upload className="w-4 h-4" /> Try it free with your file
                </Button>
              </Link>
              <Link to="/data-agent?demo=true" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 px-2">
                See sample report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/80 font-medium">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary/70" /> No signup required</span>
              <span className="opacity-30">·</span>
              <span>Data stays in your browser</span>
              <span className="opacity-30">·</span>
              <span>60 seconds to first insight</span>
            </div>
          </div>
        </section>

        {/* Supported file types */}
        <section className="border-y border-border bg-card/40">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-4">Works with</p>
            <div className="flex flex-wrap gap-2">
              {tpl.fileTypes.map((f) => (
                <span key={f} className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-foreground border border-border">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" /> {f}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pain points */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-medium text-foreground mb-3 tracking-tight">Sound familiar?</h2>
            <p className="text-muted-foreground mb-8">These are the everyday frustrations we hear from {tpl.audience.toLowerCase()}.</p>
            <ul className="space-y-4">
              {tpl.painPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-foreground/85">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0" />
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Insights you'll get */}
        <section className="border-t border-border bg-card/40">
          <div className="container mx-auto px-4 sm:px-6 py-16">
            <div className="max-w-3xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-medium text-foreground mb-3 tracking-tight">What you'll get back, in 60 seconds</h2>
              <p className="text-muted-foreground">Drop your file. We do the math. You get answers — not another spreadsheet.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-4xl">
              {tpl.insights.map((insight, i) => (
                <div key={insight} className="flex items-start gap-3 p-5 rounded-2xl bg-card border border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center shrink-0 text-xs font-semibold tabular-nums">{i + 1}</div>
                  <p className="text-sm text-foreground/85 leading-relaxed pt-0.5">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-medium text-foreground mb-10 tracking-tight text-center">Three steps</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { i: "1", t: "Upload", d: "Drop your Excel, CSV or export. Stays in your browser — private by default." },
              { i: "2", t: "We analyze", d: "Auto-detected KPIs, clean charts, plain-English insights — under 60 seconds." },
              { i: "3", t: "Share or export", d: "Send a live link, download a PDF, or paste straight into your investor email." },
            ].map((s) => (
              <div key={s.i} className="p-6 rounded-2xl bg-card border border-border">
                <div className="text-[10px] font-medium tracking-[0.24em] uppercase text-primary mb-3">Step {s.i}</div>
                <h3 className="text-lg font-medium text-foreground mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-y border-border bg-gradient-to-br from-primary/5 to-accent">
          <div className="container mx-auto px-4 sm:px-6 py-16 text-center">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-medium text-foreground mb-4 tracking-tight max-w-2xl mx-auto">
              Ready in 60 seconds. Free to try.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              No signup. No card. Just your file and answers.
            </p>
            <Link to="/data-agent">
              <Button className="rounded-full px-8 py-4 min-h-[52px] gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-glow-strong)]">
                Analyze my file now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="mt-4 text-[11px] text-muted-foreground/80 inline-flex items-center gap-1.5 justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary/70" /> Used by 12,000+ founders & ops teams
            </p>
          </div>
        </section>

        {/* Related (internal linking — SEO) */}
        <section className="container mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-xl font-medium text-foreground mb-6 tracking-tight">Also useful for</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {tpl.related.map((slug) => {
              const r = analyzeBySlug(slug);
              if (!r) return null;
              return (
                <Link
                  key={slug}
                  to={`/analyze/${slug}`}
                  className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-[var(--shadow-md)] transition-all"
                >
                  <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-primary mb-2">Use case</p>
                  <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">{r.h1}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// Export the route list so the sitemap and nav can stay in sync.
export const ANALYZE_SLUGS = analyzeTemplates.map((t) => t.slug);
