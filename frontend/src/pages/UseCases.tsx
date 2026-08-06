import { memo } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, TrendingUp, Users, ShoppingCart, Factory, GraduationCap,
  Landmark, Stethoscope, Briefcase, BarChart3
} from "lucide-react";

const Footer = lazy(() => import("@/components/Footer"));

const useCases = [
  {
    icon: ShoppingCart,
    title: "E-Commerce & D2C Brands",
    subtitle: "Predict demand, reduce returns, maximize LTV",
    bullets: [
      "Revenue forecasting with seasonal decomposition",
      "Customer churn prediction before it happens",
      "Product performance anomaly detection",
      "Inventory optimization with AI recommendations",
    ],
    stat: "32% avg revenue uplift",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Landmark,
    title: "FinTech & Banking",
    subtitle: "Risk scoring, fraud detection, compliance analytics",
    bullets: [
      "Transaction anomaly detection in real-time",
      "Loan default probability scoring",
      "Regulatory compliance dashboards",
      "Cash flow forecasting with confidence intervals",
    ],
    stat: "10x faster risk analysis",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Factory,
    title: "Manufacturing & Supply Chain",
    subtitle: "Optimize operations, predict failures, reduce waste",
    bullets: [
      "Predictive maintenance from sensor data",
      "Supply chain bottleneck identification",
      "Quality control anomaly flagging",
      "Production planning with demand forecasts",
    ],
    stat: "22% waste reduction",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Stethoscope,
    title: "Healthcare & Pharma",
    subtitle: "Patient outcomes, resource optimization, trial analytics",
    bullets: [
      "Patient readmission risk prediction",
      "Resource utilization analytics",
      "Clinical trial data analysis",
      "Operational KPI dashboards",
    ],
    stat: "40% faster insights",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: GraduationCap,
    title: "EdTech & Education",
    subtitle: "Student engagement, retention, curriculum optimization",
    bullets: [
      "Student dropout prediction",
      "Course completion funnel analysis",
      "Engagement pattern recognition",
      "Revenue attribution per channel",
    ],
    stat: "28% retention improvement",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Briefcase,
    title: "SaaS & Startups",
    subtitle: "MRR tracking, cohort analysis, investor-ready reports",
    bullets: [
      "MRR/ARR forecasting with growth trends",
      "Cohort retention and churn analysis",
      "CAC vs LTV optimization",
      "Automated investor reporting",
    ],
    stat: "3x faster board decks",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
];

const UseCases = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Use Cases — AI Analytics for E-Commerce, SaaS, Manufacturing & More | SpaceForge AI"
        description="Discover how SpaceForge AI delivers industry-specific analytics — revenue forecasting, churn prediction, anomaly detection and demand planning across E-Commerce, SaaS, Manufacturing, Healthcare, Finance and Education."
      />
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-6 text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            AI Analytics for <span className="text-primary">Every Industry</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            From D2C brands in India to global SaaS companies — SpaceForge turns any dataset into actionable decisions in under 10 seconds. No data team required.
          </p>
          <Link to="/data-agent">
            <Button size="lg" className="rounded-full gap-2 font-bold">
              Try Free Analysis <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>

        {/* Use case cards */}
        <section className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${uc.bg} mb-4`}>
                  <uc.icon className={`w-5 h-5 ${uc.color}`} />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">{uc.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{uc.subtitle}</p>
                <ul className="space-y-2 mb-5">
                  {uc.bullets.map((b) => (
                    <li key={b} className="text-sm text-foreground/80 flex items-start gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className={`text-xs font-bold ${uc.color} ${uc.bg} rounded-full px-3 py-1 inline-block`}>
                  {uc.stat}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 text-center mt-16">
          <h2 className="text-2xl font-bold text-foreground mb-3">Don't see your industry?</h2>
          <p className="text-muted-foreground mb-6">SpaceForge works with any tabular data. Upload a CSV and see for yourself.</p>
          <Link to="/data-agent">
            <Button size="lg" variant="outline" className="rounded-full gap-2">
              Upload Your Data Free <ArrowRight className="w-4 h-4" />
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

export default memo(UseCases);
