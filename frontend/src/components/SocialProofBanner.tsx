import { memo } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya S.",
    role: "Founder, D2C Brand",
    text: "SpaceForge replaced our ₹50K/month analyst. We get the same insights in 10 seconds.",
    rating: 5,
  },
  {
    name: "James K.",
    role: "Head of Analytics, SaaS",
    text: "The AI forecasting caught a revenue dip we would've missed. Saved us $200K in churn.",
    rating: 5,
  },
  {
    name: "Ananya R.",
    role: "CEO, EdTech Startup",
    text: "I upload my Tally exports and get investor-ready reports instantly. Game changer for Indian founders.",
    rating: 5,
  },
  {
    name: "Michael T.",
    role: "Data Lead, FinTech",
    text: "Finally a tool that gives decisions, not dashboards. Our team makes data-driven calls 10x faster.",
    rating: 5,
  },
];

const SocialProofBanner = () => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Loved by <span className="text-primary">founders & analysts</span> worldwide
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            From solo founders in India to enterprise data teams globally — SpaceForge is the decision engine they trust.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/30 transition-colors"
            >
              <Quote className="w-5 h-5 text-primary/40 mb-3" />
              <p className="text-sm text-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          ))}
        </div>

        {/* Trust logos row */}
        <div className="mt-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-5">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/50">
            {["Startups", "D2C Brands", "SaaS Companies", "FinTech", "EdTech", "Consulting Firms"].map((c) => (
              <span key={c} className="text-sm font-semibold tracking-wide">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(SocialProofBanner);
