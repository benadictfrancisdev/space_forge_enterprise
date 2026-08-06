import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, FlaskConical, Rocket, Building2, ArrowRight, Brain, Sparkles, Shield, Activity, LineChart, Target } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import SpaceBackground from "@/components/SpaceBackground";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";

type CognitiveMode = "analyst" | "scientist" | "founder" | "organization";

const CognitiveLanding = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CognitiveMode | null>(null);

  const modes = [
    {
      value: "analyst" as const,
      label: "Analyst",
      icon: BarChart3,
      tagline: "Facts & Patterns",
      description: "Explore data with statistical rigor, hypothesis testing, and AI-powered pattern detection.",
      color: theme === "dark" ? "#00c8ff" : "#ACB9CC",
      features: ["NLP Engine", "Statistics", "ML Workbench", "Dashboards"],
    },
    {
      value: "scientist" as const,
      label: "Scientist",
      icon: FlaskConical,
      tagline: "Discovery & Rigor",
      description: "Design experiments, engineer features, and build reproducible research workflows.",
      color: theme === "dark" ? "#39ff14" : "#008000",
      features: ["Hypothesis Builder", "Model Arena", "Feature Engineering", "Research Papers"],
    },
    {
      value: "founder" as const,
      label: "Founder",
      icon: Rocket,
      tagline: "Decisions & Growth",
      description: "Business KPIs, risk scoring, scenario simulation, and investor-ready reporting.",
      color: theme === "dark" ? "#ff073a" : "#cc0000",
      features: ["Risk Engine", "Investor Report", "Scenario Sim", "Actions"],
    },
    {
      value: "organization" as const,
      label: "Organization",
      icon: Building2,
      tagline: "Ops & Strategy",
      description: "Full enterprise suite combining analyst depth with founder-level business intelligence.",
      color: theme === "dark" ? "#ffe600" : "#be29ec",
      features: ["All Analyst Tools", "All Founder Tools", "Team Collaboration", "Automation"],
    },
  ];

  const topCards = [
    { icon: Brain, label: "AI-Powered Analysis", desc: "50+ cognitive features driven by advanced AI models", color: "hsl(var(--primary))" },
    { icon: Shield, label: "Enterprise Security", desc: "Role-based access with encrypted data processing", color: "hsl(var(--primary))" },
  ];
  const bottomCards = [
    { icon: Activity, label: "Real-Time Insights", desc: "Live data streams with automated anomaly detection", color: "hsl(var(--primary))" },
    { icon: Sparkles, label: "Smart Automation", desc: "Workflow triggers, scheduled reports, and auto-alerts", color: "hsl(var(--primary))" },
  ];

  const handleContinue = () => {
    if (selected) {
      navigate(`/data-agent?mode=${selected}`);
    }
  };

  return (
    <div className="min-h-screen relative bg-background">
      <SEO
        title="Cognitive Modes — Analyst, Scientist, Founder & Organization | SpaceForge AI"
        description="Choose your cognitive lens on SpaceForge AI. Analyst, Scientist, Founder, or Organization mode — tailored AI analytics dashboards for every decision-making style."
      />
      <SpaceBackground />
      <Navbar />
      <div className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Choose Your <span className="text-primary">Cognitive Lens</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each lens unlocks a specialized AI workspace tailored to your role and workflow.
            </p>
          </div>

          {/* Top 2 medium cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-3xl mx-auto">
            {topCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="rounded-xl border border-border/40 p-5 flex items-start gap-4 backdrop-blur-md"
                  style={{ background: "hsl(var(--card) / 0.6)" }}
                >
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4 Cognitive Mode Squares */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-4xl mx-auto">
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = selected === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setSelected(m.value)}
                  className={cn(
                    "relative aspect-square rounded-2xl border-2 p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer",
                    "hover:scale-[1.03] hover:shadow-lg"
                  )}
                  style={{
                    borderColor: isActive ? m.color : "hsl(var(--border))",
                    background: isActive ? `${m.color}14` : "hsl(var(--card) / 0.6)",
                    boxShadow: isActive ? `0 0 30px ${m.color}30, 0 0 60px ${m.color}10` : "none",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: `${m.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: m.color }} />
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-sm font-bold",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {m.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.tagline}</p>
                  </div>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ background: m.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom 2 medium cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-3xl mx-auto">
            {bottomCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="rounded-xl border border-border/40 p-5 flex items-start gap-4 backdrop-blur-md"
                  style={{ background: "hsl(var(--card) / 0.6)" }}
                >
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected mode detail + CTA */}
          {selected && (
            <div className="max-w-3xl mx-auto">
              <div
                className="rounded-2xl border border-border/40 p-6 mb-6 backdrop-blur-md"
                style={{ background: "hsl(var(--card) / 0.6)" }}
              >
                {(() => {
                  const m = modes.find(x => x.value === selected)!;
                  const Icon = m.icon;
                  return (
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                      <div className="p-3 rounded-xl shrink-0" style={{ background: `${m.color}20` }}>
                        <Icon className="w-8 h-8" style={{ color: m.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground">{m.label} Mode</h3>
                        <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {m.features.map(f => (
                            <span key={f} className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground bg-muted/30">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-center">
                <Button size="lg" onClick={handleContinue} className="gap-2 px-8">
                  Launch {modes.find(x => x.value === selected)?.label} Mode
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!selected && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Select a cognitive lens above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CognitiveLanding;
