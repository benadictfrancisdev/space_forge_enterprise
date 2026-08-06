import { useState } from "react";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { personas, comparisonDimensions } from "@/lib/personaData";
import type { Persona } from "@/lib/personaData";
import {
  BarChart3,
  FlaskConical,
  Rocket,
  Building2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

const personaIcons: Record<string, React.ReactNode> = {
  analyst: <BarChart3 className="h-5 w-5" />,
  scientist: <FlaskConical className="h-5 w-5" />,
  founder: <Rocket className="h-5 w-5" />,
  org: <Building2 className="h-5 w-5" />,
};

const personaColorMap: Record<string, string> = {
  analyst: "hsl(var(--chart-5))",
  scientist: "hsl(var(--chart-4))",
  founder: "hsl(var(--warning))",
  org: "hsl(var(--success))",
};

export default function PersonaReports() {
  const [active, setActive] = useState("analyst");
  const [view, setView] = useState<"structure" | "compare">("structure");
  const p = personas[active];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Persona Reports — Tailored AI Analytics for Analysts, Scientists & Founders | SpaceForge AI"
        description="Explore SpaceForge AI's persona-based analytics reports designed for Analysts, Scientists, Founders and Organizations. See structure, capabilities and comparisons at a glance."
      />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-[4px] uppercase text-muted-foreground font-mono mb-1">
              SpaceForge · Persona Architecture
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Report Structure & Comparison
            </h1>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["structure", "compare"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest transition-all duration-200",
                  view === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "structure" ? "Report Structures" : "Compare All"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Persona Tabs */}
      <div className="border-b border-border bg-card/30">
        <div className="max-w-7xl mx-auto flex">
          {Object.values(personas).map((ps) => (
            <button
              key={ps.id}
              onClick={() => setActive(ps.id)}
              className={cn(
                "flex-1 py-4 px-4 flex flex-col items-center gap-1.5 transition-all duration-200 border-b-2 relative",
                active === ps.id
                  ? "border-primary bg-card/50"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <span className={cn("transition-colors", active === ps.id ? ps.colorClass : "text-muted-foreground")}>
                {personaIcons[ps.id]}
              </span>
              <span
                className={cn(
                  "text-xs font-mono tracking-wide transition-colors",
                  active === ps.id ? ps.colorClass + " font-semibold" : "text-muted-foreground"
                )}
              >
                {ps.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {view === "structure" ? (
            <StructureView key={`structure-${active}`} persona={p} />
          ) : (
            <CompareView key="compare" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StructureView({ persona: p }: { persona: Persona }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Persona Header Card */}
      <Card className={cn("border", p.borderClass)}>
        <CardContent className="p-6 flex items-center gap-6">
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center text-2xl border",
              p.bgClass,
              p.borderClass
            )}
          >
            <span className={p.colorClass}>{p.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-medium text-foreground">{p.label}</h2>
            <p className={cn("text-sm font-mono tracking-wide mt-0.5", p.colorClass)}>
              {p.tagline}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{p.focus}</p>
          </div>
          <div className="text-right hidden md:block max-w-[240px]">
            <div className="flex items-center gap-1.5 justify-end mb-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] tracking-[2px] uppercase text-muted-foreground font-mono">
                AI Usage
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{p.aiUsage}</p>
          </div>
        </CardContent>
      </Card>

      {/* Report Sections Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground font-mono">
            Report Sections · {p.reportSections.length} modules
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {p.reportSections.map((s, i) => (
            <motion.div
              key={s.section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
                {/* Depth accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
                  style={{
                    background: personaColorMap[p.id],
                    opacity: s.depth / 100,
                  }}
                />
                <CardContent className="p-4 pl-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">{s.section}</span>
                    <span className={cn("text-xs font-mono", p.colorClass)}>{s.depth}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.modules.map((m) => (
                      <Badge
                        key={m}
                        variant="outline"
                        className={cn("text-[10px] font-mono px-2 py-0.5", p.badgeClass)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                  <Progress
                    value={s.depth}
                    className="h-1"
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px] tracking-[2px] uppercase font-mono text-success/70">
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {p.strengths.map((s) => (
              <div key={s} className="flex items-center gap-2.5">
                <TrendingUp className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="text-sm text-muted-foreground">{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[11px] tracking-[2px] uppercase font-mono text-warning/70">
              Watch-outs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {p.gaps.map((g) => (
              <div key={g} className="flex items-center gap-2.5">
                <TrendingDown className="h-3.5 w-3.5 text-warning shrink-0" />
                <span className="text-sm text-muted-foreground">{g}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

function CompareView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Capability Matrix */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground font-mono">
            Cross-Persona Capability Matrix
          </span>
        </div>

        <div className="space-y-5">
          {comparisonDimensions.map((dim) => (
            <div key={dim.label}>
              <div className="flex items-center gap-4 mb-2">
                <span className="w-40 text-xs font-mono text-muted-foreground shrink-0">
                  {dim.label}
                </span>
                <div className="flex-1 grid grid-cols-4 gap-3">
                  {Object.values(personas).map((ps) => {
                    const val = dim[ps.id as keyof typeof dim] as number;
                    return (
                      <div key={ps.id} className="flex items-center gap-2">
                        <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden border border-border">
                          <motion.div
                            className="h-full rounded-sm"
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            style={{ background: personaColorMap[ps.id] }}
                          />
                        </div>
                        <span className={cn("text-xs font-mono w-7 text-right", ps.colorClass)}>
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex gap-8 flex-wrap">
          {Object.values(personas).map((ps) => (
            <div key={ps.id} className="flex items-center gap-2">
              <span className={cn("text-lg", ps.colorClass)}>{ps.icon}</span>
              <span className="text-xs font-mono text-muted-foreground">{ps.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Separator />

      {/* Positioning Summary */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground font-mono">
            Positioning Summary
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(personas).map((ps, i) => (
            <motion.div
              key={ps.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={cn("border", ps.borderClass, "h-full")}>
                <CardContent className="p-5">
                  <span className={cn("text-xl", ps.colorClass)}>{ps.icon}</span>
                  <h3 className="text-sm font-medium text-foreground mt-3 mb-1">{ps.label}</h3>
                  <p className={cn("text-xs font-mono tracking-wide mb-3", ps.colorClass)}>
                    {ps.tagline}
                  </p>
                  <Separator className="mb-3" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{ps.focus}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
