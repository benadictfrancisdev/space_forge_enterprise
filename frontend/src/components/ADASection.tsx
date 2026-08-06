import { Brain, Zap, Eye, RefreshCw, Bell, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Eye, title: "Always Watching", desc: "Monitors your data 24/7 for changes, anomalies, and emerging patterns — so you don't have to." },
  { icon: Zap, title: "Instant Analysis", desc: "Runs trend detection, anomaly spotting, and pattern recognition automatically. You just get the answers." },
  { icon: Bell, title: "Proactive Alerts", desc: "Pings you on WhatsApp, Email, or Slack the moment something needs your attention. No manual checking." },
  { icon: RefreshCw, title: "Set It & Forget It", desc: "Configure once, and your Virtual Analyst works forever — continuously learning from your data." },
  { icon: Shield, title: "Trust Score on Every Insight", desc: "Every finding shows a confidence score (e.g. 98%) so you know exactly how reliable it is." },
  { icon: Brain, title: "Remembers Your Business", desc: "Learns your past analyses and business context to deliver increasingly relevant, personalized insights." },
];

const ADASection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">The Heart of SpaceForge</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Your 24/7{" "}
            <span className="text-primary">Virtual Analyst</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ADA watches your data while you sleep and pings you the moment something needs your attention. 
            No dashboards to check, no reports to build — just decisions delivered to you.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((f, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Visual flow */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-foreground mb-3">How It Works</h3>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {["Connect Data", "ADA Monitors", "Finds Insights", "Alerts You"].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">{step}</span>
                    {i < 3 && <span className="text-muted-foreground hidden sm:inline">→</span>}
                  </div>
                ))}
              </div>
            </div>
            <Link to="/data-agent">
              <Button size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Brain className="w-5 h-5 mr-2" />
                Try It Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ADASection;
