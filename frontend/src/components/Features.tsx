import { memo } from "react";
import { ArrowRight, BarChart3, TrendingUp, Lightbulb, FileText, ShieldCheck, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const primary = {
  icon: BarChart3,
  label: "Instant Dashboards",
  title: "Upload data. Get a shareable dashboard.",
  description:
    "Drop in an Excel, CSV, JSON or PDF file and SpaceForge builds a clean, presentation-ready dashboard — KPIs, trends, breakdowns and a shareable link you can send to anyone.",
  cta: { text: "Try with sample data", href: "/data-agent" },
};

const secondary = [
  {
    icon: Lightbulb,
    label: "AI Insights",
    title: "Plain-English explanations.",
    description: "Not just charts. SpaceForge tells you why revenue moved, which segment drove it and what to do next — in language your team understands.",
  },
  {
    icon: TrendingUp,
    label: "Forecasts",
    title: "See next month, not just last.",
    description: "Revenue, expenses and cash projections built from your own data, refreshed every time you upload.",
  },
  {
    icon: FileText,
    label: "Reports",
    title: "Board-ready in one click.",
    description: "Export polished PDF reports, PowerPoint summaries and Excel workbooks — formatted for investors and stakeholders.",
  },
  {
    icon: Share2,
    label: "Shareable",
    title: "Share a live dashboard link.",
    description: "Send a secure, read-only link to your team, investors, or accountant. No logins, no setup, no spreadsheet wrangling.",
  },
  {
    icon: ShieldCheck,
    label: "Private",
    title: "Your data stays yours.",
    description: "Files are processed in your browser. Only anonymised summaries reach the AI — never raw rows.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-28 md:py-36 relative">
      <div className="container mx-auto px-6 relative z-10 max-w-6xl">
        <div className="max-w-2xl mb-20">
          <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-5">
            What you get
          </p>
          <h2 className="text-4xl md:text-6xl font-medium text-foreground tracking-[-0.035em] leading-[1.02]">
            Everything you'd expect from
            <br />
            <span className="italic font-light text-foreground/55">an AI analytics team.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          <article className="lg:col-span-7 lg:row-span-2 bg-card p-10 md:p-12 flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <primary.icon className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
                  {primary.label}
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-medium text-foreground tracking-[-0.025em] leading-[1.1] mb-5 max-w-md">
                {primary.title}
              </h3>
              <p className="text-base text-muted-foreground leading-[1.65] max-w-md font-light">
                {primary.description}
              </p>
            </div>
            <Link
              to={primary.cta.href}
              className="inline-flex items-center gap-2 mt-8 text-sm font-medium text-primary hover:gap-3 transition-all"
            >
              {primary.cta.text} <ArrowRight className="w-4 h-4" />
            </Link>
          </article>

          {secondary.slice(0, 2).map((f) => (
            <article
              key={f.label}
              className="lg:col-span-5 bg-card p-8 md:p-9 flex flex-col gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <f.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
                  {f.label}
                </span>
              </div>
              <h4 className="text-lg md:text-xl font-medium text-foreground tracking-[-0.015em] leading-snug">
                {f.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-[1.6] font-light">
                {f.description}
              </p>
            </article>
          ))}

          {secondary.slice(2).map((f) => (
            <article
              key={f.label}
              className="lg:col-span-4 bg-card p-8 md:p-9 flex flex-col gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <f.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
                  {f.label}
                </span>
              </div>
              <h4 className="text-lg md:text-xl font-medium text-foreground tracking-[-0.015em] leading-snug">
                {f.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-[1.6] font-light">
                {f.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(Features);
