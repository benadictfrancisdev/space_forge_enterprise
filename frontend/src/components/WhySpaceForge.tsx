import { memo } from "react";
import { Activity, Layers, LayoutGrid, Database, Shield, Workflow, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { icon: Activity, title: "Real-Time Pulse", description: "See what's happening in your business right now. Get instant alerts when sales spike, costs creep up, or customers start leaving.", color: "text-primary", bgColor: "bg-primary/10", link: "/data-agent" },
  { icon: Layers, title: "Future-Sight Forecasting", description: "Predict next month's revenue, inventory needs, and growth opportunities with 90%+ accuracy. No data science degree needed.", color: "text-accent", bgColor: "bg-accent/10", link: "/data-agent" },
  { icon: LayoutGrid, title: "One-Click Dashboards", description: "Beautiful dashboards that build themselves from your data. Share live views with your team or investors in one click.", color: "text-purple-400", bgColor: "bg-purple-400/10", link: "/data-agent" },
  { icon: Database, title: "All Your Data, One Place", description: "Connect every spreadsheet, database, and tool you use. Query everything — past and present — with the same simple interface.", color: "text-primary", bgColor: "bg-primary/10", link: "/data-agent" },
  { icon: Shield, title: "Enterprise-Grade Trust", description: "Role-based access, audit trails, and data lineage tracking. Your data stays private — raw data never leaves your browser.", color: "text-accent", bgColor: "bg-accent/10", link: "/data-agent" },
  { icon: Workflow, title: "Set It & Forget It", description: "Build automated workflows visually. Schedule reports, trigger alerts, and chain actions — zero code required.", color: "text-purple-400", bgColor: "bg-purple-400/10", link: "/data-agent" },
];

const WhySpaceForge = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            What You Get
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-center text-foreground mb-4 tracking-tight">
          From raw data to{" "}
          <br className="hidden md:block" />
          <span className="text-accent">real decisions</span>
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
          Every tool designed so you spend less time in spreadsheets and more time growing your business.
        </p>

        {/* Module Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modules.map((mod, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-8 hover:border-primary/30 transition-colors group">
              <div className={`w-12 h-12 rounded-xl ${mod.bgColor} flex items-center justify-center mb-6`}>
                <mod.icon className={`w-6 h-6 ${mod.color}`} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{mod.description}</p>
              <Link to={mod.link} className={`inline-flex items-center gap-1.5 text-xs font-bold ${mod.color} uppercase tracking-wider group-hover:gap-2.5 transition-all`}>
                Learn more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(WhySpaceForge);
