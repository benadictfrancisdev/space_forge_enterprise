import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Brain, BarChart3, CreditCard, Bot, TrendingUp,
  AlertTriangle, FlaskConical, FileText, Code2, GitBranch,
  Database, Sheet, Radio, MessageCircle, Target, Layout, Layers
} from "lucide-react";

const PHASES = [
  { id: 1, label: "Phase 1 â€” Core Engine", color: "hsl(var(--primary))" },
  { id: 2, label: "Phase 2 â€” Intelligence", color: "hsl(var(--chart-4))" },
  { id: 3, label: "Phase 3 â€” Scale", color: "hsl(var(--chart-5))" },
  { id: 4, label: "Phase 4 â€” Enterprise", color: "hsl(var(--chart-6))" },
];

const MODULES = [
  { id: "01", title: "Preprocessing Engine", stack: ["pandas", "polars", "numpy", "scikit-learn"], phase: 1, priority: 1, icon: Cpu, status: "live" },
  { id: "02", title: "Gemini Analysis Pipeline", stack: ["google-generativeai", "json", "pydantic"], phase: 1, priority: 2, icon: Brain, status: "live" },
  { id: "03", title: "NL2SQL Query Engine", stack: ["google-generativeai", "postgresql", "sqlparse"], phase: 1, priority: 3, icon: Database, status: "live" },
  { id: "04", title: "Auto-Visualisation Engine", stack: ["pandas", "scipy.stats", "plotly → React"], phase: 1, priority: 4, icon: BarChart3, status: "live" },
  { id: "05", title: "Credits + Razorpay Billing", stack: ["hmac", "hashlib", "httpx", "django"], phase: 1, priority: 5, icon: CreditCard, status: "live" },
  { id: "06", title: "Autonomous Agent (ADA)", stack: ["apscheduler", "postgresql", "asyncio", "fastapi"], phase: 2, priority: 1, icon: Bot, status: "live" },
  { id: "07", title: "AI Forecasting (Prophet)", stack: ["prophet", "pandas", "numpy", "gemini"], phase: 2, priority: 2, icon: TrendingUp, status: "live" },
  { id: "08", title: "Anomaly Detection", stack: ["scipy.stats", "IsolationForest", "numpy"], phase: 2, priority: 3, icon: AlertTriangle, status: "live" },
  { id: "09", title: "A/B Test Analyser", stack: ["scipy.stats", "statsmodels", "pingouin"], phase: 2, priority: 4, icon: FlaskConical, status: "live" },
  { id: "10", title: "PDF Report Builder", stack: ["reportlab", "weasyprint", "jinja2", "base64"], phase: 2, priority: 5, icon: FileText, status: "live" },
  { id: "11", title: "Developer REST API", stack: ["fastapi", "python-jose", "slowapi"], phase: 3, priority: 1, icon: Code2, status: "planned" },
  { id: "12", title: "Multi-Dataset Correlation", stack: ["pandas", "scipy.stats", "seaborn"], phase: 3, priority: 2, icon: GitBranch, status: "live" },
  { id: "13", title: "Business Context Memory", stack: ["postgresql (pgvector)", "sentence-transformers"], phase: 3, priority: 3, icon: Database, status: "live" },
  { id: "14", title: "Google Sheets Connector", stack: ["gspread", "google-auth", "pandas"], phase: 3, priority: 4, icon: Sheet, status: "planned" },
  { id: "15", title: "Real-Time Dashboard", stack: ["websockets", "asyncio", "redis"], phase: 3, priority: 5, icon: Radio, status: "live" },
  { id: "16", title: "SpaceBot (Conversational)", stack: ["gemini multi-turn", "fastapi history"], phase: 3, priority: 6, icon: MessageCircle, status: "live" },
  { id: "17", title: "KPI Goal Tracker", stack: ["pandas", "postgresql", "apscheduler", "resend"], phase: 3, priority: 7, icon: Target, status: "planned" },
  { id: "18", title: "White-Label Embed", stack: ["fastapi", "python-jose (JWT)", "jinja2"], phase: 4, priority: 1, icon: Layout, status: "planned" },
];

const statusStyles: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  planned: "bg-muted text-muted-foreground border-border",
};

const ArchitectureSection = () => {
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const filtered = activePhase ? MODULES.filter(m => m.phase === activePhase) : MODULES;

  return (
    <section id="architecture" className="py-24 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Layers className="w-3 h-3 mr-1" /> System Architecture
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            18-Module Intelligence Engine
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Production-grade data platform built in 4 phases â€” from preprocessing to autonomous AI agents.
          </p>
        </motion.div>

        {/* Phase Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setActivePhase(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              activePhase === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            All Modules
          </button>
          {PHASES.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activePhase === p.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((mod, i) => {
              const Icon = mod.icon;
              const phase = PHASES.find(p => p.id === mod.phase)!;
              return (
                <motion.div
                  key={mod.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 hover:border-primary/40 hover:shadow-lg transition-all"
                >
                  {/* Number badge */}
                  <span className="absolute top-3 right-3 text-[11px] font-mono font-bold text-muted-foreground/40">
                    {mod.id}
                  </span>

                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{ backgroundColor: `${phase.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: phase.color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                        {mod.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          Phase {mod.phase} Â· Priority {mod.priority}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${statusStyles[mod.status]}`}>
                          {mod.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tech stack pills */}
                  <div className="flex flex-wrap gap-1">
                    {mod.stack.map(tech => (
                      <span
                        key={tech}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap justify-center gap-8 text-center"
        >
          {[
            { value: "18", label: "Total Modules" },
            { value: `${MODULES.filter(m => m.status === "live").length}`, label: "Live Now" },
            { value: "4", label: "Phases" },
            { value: `${MODULES.filter(m => m.status === "planned").length}`, label: "Coming Soon" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
