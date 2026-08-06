import { memo } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X, Minus } from "lucide-react";

const Footer = lazy(() => import("@/components/Footer"));

type Status = "yes" | "no" | "partial";

const features: { name: string; spaceforge: Status; tableau: Status; powerbi: Status; akkio: Status }[] = [
  { name: "No-Code AI Analysis",       spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "yes" },
  { name: "Upload CSV → Instant Insights", spaceforge: "yes", tableau: "no",      powerbi: "no",      akkio: "yes" },
  { name: "Predictive Forecasting",    spaceforge: "yes",     tableau: "partial",  powerbi: "partial",  akkio: "yes" },
  { name: "Anomaly Detection",         spaceforge: "yes",     tableau: "no",      powerbi: "partial",  akkio: "partial" },
  { name: "Natural Language Queries",  spaceforge: "yes",     tableau: "partial",  powerbi: "yes",     akkio: "no" },
  { name: "Executive Report Generator",spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "no" },
  { name: "Indian SMB Integrations",   spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "no" },
  { name: "Client-Side Privacy",       spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "no" },
  { name: "Free Tier Available",       spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "yes" },
  { name: "Starts at ₹999/mo",        spaceforge: "yes",     tableau: "no",      powerbi: "partial",  akkio: "no" },
  { name: "Causal Discovery AI",      spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "no" },
  { name: "CEO Mode Briefing",        spaceforge: "yes",     tableau: "no",      powerbi: "no",      akkio: "no" },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "yes") return <Check className="w-4 h-4 text-emerald-400" />;
  if (status === "no") return <X className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-amber-400" />;
};

const Compare = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SpaceForge AI vs Tableau, Power BI & Akkio — Feature Comparison"
        description="Side-by-side comparison: SpaceForge AI vs Tableau, Power BI and Akkio. See why teams choose AI-powered decisions over traditional BI dashboards. Free tier, no-code, instant insights."
      />
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-6 text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            SpaceForge vs <span className="text-primary">The Rest</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            See why 2,400+ users chose SpaceForge over traditional BI tools. We deliver AI-powered decisions, not just dashboards.
          </p>
        </section>

        {/* Comparison table */}
        <section className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-4 px-3 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-4 px-3 font-bold text-primary">SpaceForge</th>
                  <th className="text-center py-4 px-3 text-muted-foreground font-medium">Tableau</th>
                  <th className="text-center py-4 px-3 text-muted-foreground font-medium">Power BI</th>
                  <th className="text-center py-4 px-3 text-muted-foreground font-medium">Akkio</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.name} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 text-foreground">{f.name}</td>
                    <td className="py-3 px-3 text-center"><div className="flex justify-center"><StatusIcon status={f.spaceforge} /></div></td>
                    <td className="py-3 px-3 text-center"><div className="flex justify-center"><StatusIcon status={f.tableau} /></div></td>
                    <td className="py-3 px-3 text-center"><div className="flex justify-center"><StatusIcon status={f.powerbi} /></div></td>
                    <td className="py-3 px-3 text-center"><div className="flex justify-center"><StatusIcon status={f.akkio} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing comparison */}
        <section className="container mx-auto px-6 mt-16">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            {[
              { name: "SpaceForge", price: "Free / ₹999", highlight: true },
              { name: "Tableau", price: "$75/user/mo", highlight: false },
              { name: "Power BI", price: "$10/user/mo", highlight: false },
              { name: "Akkio", price: "$49/mo", highlight: false },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-5 ${
                  p.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/50 bg-card/40"
                }`}
              >
                <p className={`text-sm font-bold mb-1 ${p.highlight ? "text-primary" : "text-muted-foreground"}`}>{p.name}</p>
                <p className="text-lg font-bold text-foreground">{p.price}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 text-center mt-16">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to switch?</h2>
          <p className="text-muted-foreground mb-6">Upload your data and see SpaceForge in action — no credit card needed.</p>
          <Link to="/data-agent">
            <Button size="lg" className="rounded-full gap-2 font-bold">
              Try Free Now <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default memo(Compare);
