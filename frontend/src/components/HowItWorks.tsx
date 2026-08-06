import { memo } from "react";
import { Zap, Settings, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AnimatedLiveChart from "./AnimatedLiveChart";

const features = [
  {
    icon: Zap,
    title: "Instant anomaly detection",
    description: "ML-powered alerts fire the moment metrics deviate from expected patterns.",
  },
  {
    icon: Settings,
    title: "Root cause analysis",
    description: "Follow the causal chain through your data graph automatically.",
  },
  {
    icon: MessageSquare,
    title: "Natural language queries",
    description: "Ask your data anything in plain English. SpaceForge compiles it to optimized SQL.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Left column */}
          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-2 tracking-tight leading-tight">
              Your data,
            </h2>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-primary">
              fully alive
            </h2>
            <p className="text-base text-muted-foreground max-w-md mb-10 leading-relaxed">
              SpaceForge doesn't just store and query — it actively watches, learns, and alerts. The platform thinks alongside your team.
            </p>

            {/* Feature list with animated line connector */}
            <div className="space-y-8 mb-10 relative">
              <div className="absolute left-5 top-10 bottom-10 w-[1px] bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
              {features.map((f, i) => (
                <div key={i} className="flex gap-4 group" style={{ animationDelay: `${i * 0.15}s` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative z-10 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground mb-1">{f.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link to="/auth">
                <Button className="rounded-full px-6 py-3 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold tracking-wider uppercase btn-shimmer">
                  Explore Platform <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" className="rounded-full px-6 py-3 border-border text-foreground hover:bg-secondary text-sm font-bold tracking-wider uppercase">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>

          {/* Right column — Animated Live Chart */}
          <div className="hidden lg:block">
            <AnimatedLiveChart className="h-[320px]" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(HowItWorks);
