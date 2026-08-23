import { Link } from "react-router-dom";
import { AlertTriangle, Activity, Code2, Boxes, Database, ArrowUpRight, FileCode2 } from "lucide-react";

const CARDS = [
  {
    to: "/v2/rules",
    title: "Rules IDE",
    desc: "Author .rule.md telemetry logic — deterministic AST compile, no arbitrary code.",
    icon: FileCode2,
    tag: "rules",
  },
  {
    to: "/v2/incidents",
    title: "Incident Intelligence",
    desc: "Autonomous cause & blast-radius artifacts for breached telemetry rules.",
    icon: AlertTriangle,
    tag: "incidents",
  },
  {
    to: "/v2/metrics",
    title: "Live Metrics",
    desc: "P50 / P90 / P99 latency, event volume and error rates in real time.",
    icon: Activity,
    tag: "telemetry",
  },
  {
    to: "/apps",
    title: "Enterprise Apps",
    desc: "Executive, Journey, Decision, Forecast, Scientist, Reporting, Operations.",
    icon: Boxes,
    tag: "apps",
  },
  {
    to: "/data-agent",
    title: "Data Agent",
    desc: "Upload datasets, profile schema and run privacy-first analytics.",
    icon: Database,
    tag: "data",
  },
  {
    to: "/app/events",
    title: "Event Engine",
    desc: "Ingest, query and monitor tenant telemetry streams.",
    icon: Code2,
    tag: "events",
  },
];

export default function WorkspaceHome() {
  return (
    <div className="p-8 max-w-6xl" data-testid="workspace-home">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Markdown-as-Logic control plane — telemetry rules, incidents and analytics in one surface.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            data-testid={`workspace-card-${c.tag}`}
            className="group rounded-md border border-border bg-card p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-md bg-secondary border border-border grid place-items-center">
                <c.icon className="h-4 w-4 text-primary" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h2 className="mt-4 text-sm font-semibold">{c.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            <span className="mt-4 inline-block px-2.5 py-1 text-[10px] font-mono border border-border rounded-md text-muted-foreground">
              @{c.tag}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
