import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Lock,
  Zap,
  Star,
  Building2,
  FlaskConical,
  BarChart3,
  Brain,
  ShieldAlert,
  Sparkles,
  Activity,
  Target,
  AlertTriangle,
  LineChart,
  Search,
  Bell,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import SEO from "@/components/SEO";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useAuth } from "@/hooks/useAuth";

/* ──────────────────── Plan Definitions ──────────────────── */
const plans = [
  {
    name: "Free",
    slug: "free",
    monthly: 0,
    annual: 0,
    annualTotal: 0,
    credits: "50/mo",
    creditsNum: 50,
    cta: "Get Started",
    popular: false,
    color: "border-border/50",
    mainFeatures: [
      { label: "2 Datasets / month", included: true },
      { label: "Up to 10,000 rows per dataset", included: true },
      { label: "Basic charts & visualisations", included: true },
      { label: "3 AI reports / month", included: true },
      { label: "Basic AI analysis (50 credits)", included: true },
      { label: "1 Dashboard", included: true },
    ],
    lockedFeatures: [
      "Risk Engine",
      "Auto Recommendations",
      "Predictive Insights",
      "Hypothesis Testing",
      "Pattern Detection",
      "Smart Alerts",
    ],
    cognitiveFeatures: [],
  },
  {
    name: "Starter",
    slug: "standard",
    monthly: 4.99,
    annual: 3.99,
    annualTotal: 47.88,
    credits: "200/mo",
    creditsNum: 200,
    cta: "Buy Now",
    popular: false,
    color: "border-blue-500/40",
    mainFeatures: [
      { label: "5 Datasets / month", included: true },
      { label: "Up to 25,000 rows per dataset", included: true },
      { label: "Up to 30 columns per dataset", included: true },
      { label: "10 AI reports / month", included: true },
      { label: "Auto-dashboard generation", included: true },
      { label: "2 Dashboards", included: true },
    ],
    lockedFeatures: [
      "Risk Engine",
      "Auto Recommendations",
      "Scenario Simulation",
    ],
    cognitiveFeatures: [
      { label: "NLP Engine", limit: "10/mo" },
      { label: "Statistical Analysis", limit: "Basic" },
      { label: "Predictive Insights", limit: "3/mo" },
      { label: "Hypothesis Testing", limit: "5/mo" },
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    monthly: 14.99,
    annual: 11.99,
    annualTotal: 143.88,
    credits: "800/mo",
    creditsNum: 800,
    cta: "Buy Now",
    popular: true,
    color: "border-primary",
    mainFeatures: [
      { label: "20 Datasets / month", included: true },
      { label: "Up to 150,000 rows per dataset", included: true },
      { label: "Up to 60 columns per dataset", included: true },
      { label: "30 AI reports / month", included: true },
      { label: "Full auto-dashboard generation", included: true },
      { label: "Unlimited dashboards", included: true },
      { label: "Advanced predictive analytics", included: true },
    ],
    lockedFeatures: [],
    cognitiveFeatures: [
      { label: "Risk Engine", limit: "✓" },
      { label: "Auto Recommendations", limit: "✓" },
      { label: "NLP Engine", limit: "✓" },
      { label: "Statistical Analysis", limit: "✓" },
      { label: "Predictive Insights", limit: "✓" },
      { label: "Hypothesis Testing", limit: "✓" },
      { label: "Pattern Detection", limit: "✓" },
      { label: "Smart Alerts", limit: "✓" },
    ],
  },
  {
    name: "Team",
    slug: "team",
    monthly: 29.99,
    annual: 24.99,
    annualTotal: 299.88,
    credits: "2,000/mo",
    creditsNum: 2000,
    cta: "Buy Now",
    popular: false,
    color: "border-purple-500/40",
    mainFeatures: [
      { label: "Everything in Pro", included: true },
      { label: "50 Datasets / month", included: true },
      { label: "Up to 500,000 rows per dataset", included: true },
      { label: "3-user collaboration", included: true },
      { label: "60 AI reports / month", included: true },
      { label: "Shared team workspace", included: true },
      { label: "Custom AI models", included: true },
      { label: "API & connector integrations", included: true },
      { label: "Priority processing", included: true },
    ],
    lockedFeatures: [],
    cognitiveFeatures: [
      { label: "Dedicated Cognitive Engines", limit: "✓" },
      { label: "Risk Engine", limit: "✓" },
      { label: "Auto Recommendations", limit: "✓" },
      { label: "NLP Engine", limit: "✓" },
      { label: "Statistical Analysis", limit: "✓" },
      { label: "Predictive Insights", limit: "✓" },
      { label: "Hypothesis Testing", limit: "✓" },
      { label: "Pattern Detection", limit: "✓" },
      { label: "Smart Alerts", limit: "✓" },
    ],
  },
];

const topups = [
  { name: "Micro", slug: "micro", price: 2.99, credits: 100 },
  { name: "Power", slug: "power", price: 9.99, credits: 500 },
  { name: "Hyper", slug: "hyper", price: 19.99, credits: 1500 },
];

/* ──────────────────── Feature Comparison Data ──────────────────── */
type FeatureRow = { feature: string; free: string; standard: string; pro: string; team: string };

const analystFeatures: FeatureRow[] = [
  { feature: "NLP Engine", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Statistics", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Hypothesis", free: "—", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Predict", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "ML Workbench", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Causal Model", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Dashboard", free: "1", standard: "3", pro: "✓", team: "✓" },
  { feature: "Charts", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Auto Dashboard", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Live Stream", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Insight Engine", free: "5/mo", standard: "15/mo", pro: "✓", team: "✓" },
  { feature: "Narratives", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Trust Layer", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "SQL Forge", free: "10q/mo", standard: "50q/mo", pro: "✓", team: "✓" },
  { feature: "Time Intelligence", free: "—", standard: "Basic", pro: "✓", team: "✓" },
  { feature: "Behavioral Segmentation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "KPI Comparison Cards", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Smart Imputation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Stakeholder Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Full Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Chat Export", free: "5/mo", standard: "✓", pro: "✓", team: "✓" },
];

const scientistFeatures: FeatureRow[] = [
  { feature: "NLP Engine", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Statistics", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Hypothesis Builder", free: "—", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Experiment Design", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "Feature Engineering", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Model Arena", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "ML Workbench", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Hyperparameter Tuning", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Causal Model", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Predict", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "Research Paper Gen", free: "—", standard: "—", pro: "3/mo", team: "✓" },
  { feature: "Smart Imputation", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Calendar Table Gen", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Pattern Detection", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Trust Layer", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Narratives", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Insight Engine", free: "5/mo", standard: "15/mo", pro: "✓", team: "✓" },
  { feature: "SQL Forge", free: "10q/mo", standard: "50q/mo", pro: "✓", team: "✓" },
  { feature: "Full Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
];

const founderFeatures: FeatureRow[] = [
  { feature: "Business KPIs", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Risk Scoring Engine", free: "—", standard: "Basic", pro: "✓", team: "✓" },
  { feature: "Strategic Actions Engine", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Action Recommendations", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "Scenario Simulation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Investor Report Gen", free: "—", standard: "—", pro: "3/mo", team: "✓" },
  { feature: "KPI Comparison Cards", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "NLP Engine", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Predict", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "Dashboard", free: "1", standard: "3", pro: "✓", team: "✓" },
  { feature: "Insight Engine", free: "5/mo", standard: "15/mo", pro: "✓", team: "✓" },
  { feature: "Narratives", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Trust Layer", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "SQL Forge", free: "10q/mo", standard: "50q/mo", pro: "✓", team: "✓" },
  { feature: "Stakeholder Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Full Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
];

const organizationFeatures: FeatureRow[] = [
  { feature: "Business KPIs", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Risk Scoring Engine", free: "—", standard: "Basic", pro: "✓", team: "✓" },
  { feature: "Strategic Actions Engine", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Action Recommendations", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "Scenario Simulation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Investor Report Gen", free: "—", standard: "—", pro: "3/mo", team: "✓" },
  { feature: "NLP Engine", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Statistics", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Hypothesis", free: "—", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Predict", free: "—", standard: "3/mo", pro: "✓", team: "✓" },
  { feature: "ML Workbench", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Causal Model", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Time Intelligence", free: "—", standard: "Basic", pro: "✓", team: "✓" },
  { feature: "Behavioral Segmentation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "KPI Comparison Cards", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Smart Imputation", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Calendar Table Gen", free: "—", standard: "—", pro: "✓", team: "✓" },
  { feature: "Dashboard", free: "1", standard: "3", pro: "✓", team: "✓" },
  { feature: "Charts", free: "Basic", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Auto Dashboard", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Live Stream", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Insight Engine", free: "5/mo", standard: "15/mo", pro: "✓", team: "✓" },
  { feature: "Narratives", free: "3/mo", standard: "10/mo", pro: "✓", team: "✓" },
  { feature: "Trust Layer", free: "—", standard: "✓", pro: "✓", team: "✓" },
  { feature: "SQL Forge", free: "10q/mo", standard: "50q/mo", pro: "✓", team: "✓" },
  { feature: "Stakeholder Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Full Report", free: "1/mo", standard: "5/mo", pro: "✓", team: "✓" },
  { feature: "Chat Export", free: "5/mo", standard: "✓", pro: "✓", team: "✓" },
  { feature: "Team Collaboration", free: "—", standard: "—", pro: "—", team: "✓" },
  { feature: "Enterprise Automation", free: "—", standard: "—", pro: "—", team: "✓" },
];

/* ──────────────────── Cell renderer ──────────────────── */
const CellValue = ({ value }: { value: string }) => {
  if (value === "✓") return <Check className="w-4 h-4 text-green-500 mx-auto" />;
  if (value === "—") return <Lock className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
};

/* ──────────────────── Cognitive Engine Icon ──────────────────── */
const engineIcons: Record<string, React.ReactNode> = {
  "Risk Engine": <ShieldAlert className="w-3.5 h-3.5" />,
  "Auto Recommendations": <Sparkles className="w-3.5 h-3.5" />,
  "NLP Engine": <Brain className="w-3.5 h-3.5" />,
  "Statistical Analysis": <Activity className="w-3.5 h-3.5" />,
  "Predictive Insights": <LineChart className="w-3.5 h-3.5" />,
  "Hypothesis Testing": <Target className="w-3.5 h-3.5" />,
  "Pattern Detection": <Search className="w-3.5 h-3.5" />,
  "Smart Alerts": <Bell className="w-3.5 h-3.5" />,
  "Dedicated Cognitive Engines": <Brain className="w-3.5 h-3.5" />,
};

/* ──────────────────── Component ──────────────────── */
const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { openCheckout, loading } = useRazorpay();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBuy = (slug: string) => {
    if (slug === "free") { navigate(user ? "/data-agent" : "/auth"); return; }
    if (!user) { navigate("/auth"); return; }
    openCheckout(slug, isAnnual);
  };

  return (
    <div className="min-h-screen relative bg-background">
      <SEO
        title="Pricing — SpaceForge AI | Free, Starter, Pro & Team Plans"
        description="Transparent pricing for SpaceForge AI. Start free with 50 credits/month. Starter from $3.99/mo and Pro from $11.99/mo unlock advanced AI analytics, forecasting, anomaly detection and CEO Mode."
      />
      <SpaceBackground />
      <Navbar />
      <div className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4">Choose Plan</p>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Simple, transparent <span className="text-primary">pricing</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
              Start free, scale when you're ready. No hidden fees, cancel anytime.
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
              <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Annual</span>
              {isAnnual && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Save up to 20%</Badge>}
            </div>
          </div>

          {/* ── Plan Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {plans.map((plan) => (
              <Card
                key={plan.slug}
                 className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                  plan.popular
                    ? "border-2 border-primary shadow-glow ring-1 ring-primary/20"
                    : "border-border"
                }`}
                style={{ background: "hsl(var(--card))" }}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold text-center py-1.5">
                    <Star className="w-3 h-3 inline mr-1" /> MOST POPULAR
                  </div>
                )}
                <CardHeader className={`pb-2 ${plan.popular ? "pt-10" : ""}`}>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      ${isAnnual ? plan.annual.toFixed(2) : plan.monthly}
                    </span>
                    <span className="text-muted-foreground text-sm">{isAnnual ? "/mo" : "/mo"}</span>
                  </div>
                  {isAnnual && plan.annualTotal > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground">${plan.annualTotal}/yr billed annually</p>
                      <p className="text-xs text-green-500 font-medium">
                        Save ${((plan.monthly * 12) - plan.annualTotal).toFixed(2)}/yr
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">{plan.credits} credits</span>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 space-y-4">
                  {/* Main Features */}
                  <div className="space-y-2">
                    {plan.mainFeatures.map((f) => (
                      <div key={f.label} className="flex items-center gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-foreground">{f.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Locked Features */}
                  {plan.lockedFeatures.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      {plan.lockedFeatures.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm opacity-50">
                          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground line-through">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advanced Cognitive Lens Features */}
                  {plan.cognitiveFeatures.length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Advanced Cognitive Lens</span>
                      </div>
                      <div className="space-y-1.5 bg-primary/5 rounded-lg p-2.5">
                        {plan.cognitiveFeatures.map((cf) => (
                          <div key={cf.label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              {engineIcons[cf.label] || <Sparkles className="w-3 h-3" />}
                              <span className="text-foreground">{cf.label}</span>
                            </div>
                            {cf.limit === "✓" ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">{cf.limit}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-auto pt-4">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleBuy(plan.slug)}
                      disabled={loading}
                      style={plan.popular ? { boxShadow: "0 0 20px rgba(26,111,244,0.4)" } : {}}
                    >
                      {plan.cta}
                    </Button>
                    {plan.slug !== "free" && plan.lockedFeatures.length > 0 && (
                      <p className="text-[10px] text-muted-foreground text-center mt-2">
                        <AlertTriangle className="w-3 h-3 inline mr-0.5" /> Some features locked
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── What Does 1 Credit Get You? ── */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">What Does 1 Credit Get You?</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              No guesswork. Here's exactly what each action costs — so you always know what you're spending.
            </p>

            {/* Simple table */}
            <div className="max-w-3xl mx-auto overflow-x-auto rounded-xl border border-border/50 mb-10" style={{ background: "hsl(var(--glass-card-bg))" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-muted-foreground font-medium">What You Do</th>
                    <th className="text-center p-4 text-muted-foreground font-medium">Credits Used</th>
                    <th className="text-center p-4 text-muted-foreground font-medium">Max on Free (50 credits)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {[
                    { action: "Upload & clean a dataset", cost: "0 (free!)", free: "Unlimited" },
                    { action: "Ask SpaceBot a question", cost: "1 credit", free: "up to 50" },
                    { action: "Run a statistical analysis", cost: "1 credit", free: "up to 50" },
                    { action: "Generate an insight report", cost: "2 credits", free: "up to 25" },
                    { action: "Predict future trends", cost: "3 credits", free: "up to 16" },
                    { action: "\"Why did X happen?\" root cause", cost: "4 credits", free: "up to 12" },
                    { action: "Full executive PDF report", cost: "5 credits", free: "up to 10" },
                    { action: "Set an automated ADA alert", cost: "5 credits/mo", free: "up to 10" },
                    { action: "Build charts & dashboards", cost: "0 (free!)", free: "Unlimited" },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="p-4 text-foreground font-medium">{row.action}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          row.cost.includes("free") ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary"
                        }`}>
                          <Zap className="w-3 h-3" /> {row.cost}
                        </span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground text-xs">{row.free}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Typical usage examples */}
            <div className="max-w-3xl mx-auto rounded-xl border border-border/30 p-6" style={{ background: "hsl(var(--glass-card-bg))" }}>
              <h3 className="text-sm font-semibold text-foreground mb-4">💡 Real-World Usage Examples</h3>
              <p className="text-xs text-muted-foreground mb-4">Credits are shared across actions — these are realistic monthly mixes, not maximums.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">🆓 Free User</p>
                  <p className="text-sm font-bold text-foreground">50 credits / month</p>
                  <p className="text-xs text-muted-foreground mt-1">2 datasets, ~20 questions, 5 insight reports and 3 forecasts.</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-400 mb-1">⚡ Starter User</p>
                  <p className="text-sm font-bold text-foreground">200 credits / month</p>
                  <p className="text-xs text-muted-foreground mt-1">5 datasets, 10 full reports, weekly forecasts and automated alerts.</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary mb-1">🚀 Pro User</p>
                  <p className="text-sm font-bold text-foreground">800 credits / month</p>
                  <p className="text-xs text-muted-foreground mt-1">20 datasets, full AI suite, risk engine, investor reports and scenario simulations.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Credit Allocation Cards ── */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Credit Allocations</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Each plan includes monthly AI credits. Credits reset at the start of each billing cycle.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {plans.map((p) => (
                <div key={p.slug} className="text-center p-4 rounded-xl border border-border/30" style={{ background: "hsl(var(--glass-card-bg))" }}>
                  <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-lg font-bold text-primary">{p.credits}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Top-Up Credits ── */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Top-Up Credits</h2>
            <p className="text-muted-foreground text-center mb-8">Need more AI credits? Buy additional packs anytime.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {topups.map((t) => (
                <Card key={t.slug} className="border-border/50 hover:border-primary/50 transition-all" style={{ background: "hsl(var(--glass-card-bg))" }}>
                  <CardContent className="pt-6 text-center space-y-3">
                    <Zap className="w-8 h-8 text-primary mx-auto" />
                    <h3 className="font-bold text-foreground">{t.name}</h3>
                    <p className="text-2xl font-bold text-foreground">${t.price}</p>
                    <p className="text-sm text-muted-foreground">{t.credits.toLocaleString()} credits</p>
                    <Button variant="outline" className="w-full" onClick={() => user ? openCheckout(t.slug, false) : navigate("/auth")} disabled={loading}>
                      Buy Credits
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Cognitive Lens Feature Comparison ── */}
          <div>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Feature Comparison by Cognitive Lens</h2>
            <p className="text-muted-foreground text-center mb-8">See exactly what you get in each mode across all plans.</p>
            <Tabs defaultValue="analyst" className="max-w-5xl mx-auto">
              <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto mb-6">
                <TabsTrigger value="analyst" className="gap-1 text-xs"><BarChart3 className="w-3 h-3" /> Analyst</TabsTrigger>
                <TabsTrigger value="scientist" className="gap-1 text-xs"><FlaskConical className="w-3 h-3" /> Scientist</TabsTrigger>
                <TabsTrigger value="founder" className="gap-1 text-xs"><Star className="w-3 h-3" /> Founder</TabsTrigger>
                <TabsTrigger value="organization" className="gap-1 text-xs"><Building2 className="w-3 h-3" /> Org</TabsTrigger>
              </TabsList>
              {[
                { key: "analyst", data: analystFeatures },
                { key: "scientist", data: scientistFeatures },
                { key: "founder", data: founderFeatures },
                { key: "organization", data: organizationFeatures },
              ].map(({ key, data }) => (
                <TabsContent key={key} value={key}>
                  <div className="overflow-x-auto rounded-xl border border-border/50" style={{ background: "hsl(var(--glass-card-bg))" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left p-3 text-muted-foreground font-medium">Feature</th>
                          {["Free", "Starter", "Pro", "Team"].map((p) => (
                            <th key={p} className={`text-center p-3 font-medium ${p === "Pro" ? "text-primary" : "text-muted-foreground"}`}>{p}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i} className="border-b border-border/20 last:border-0">
                            <td className="p-3 text-foreground font-medium">{row.feature}</td>
                            <td className="p-3 text-center"><CellValue value={row.free} /></td>
                            <td className="p-3 text-center"><CellValue value={row.standard} /></td>
                            <td className="p-3 text-center bg-primary/5"><CellValue value={row.pro} /></td>
                            <td className="p-3 text-center"><CellValue value={row.team} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Pricing;
