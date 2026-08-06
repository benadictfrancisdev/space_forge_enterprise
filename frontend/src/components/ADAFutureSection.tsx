import { Rocket, Cpu, Globe, GitBranch, Layers, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roadmap = [
  {
    icon: Cpu,
    title: "Auto-Fix Data Issues",
    desc: "When your data breaks or formats change, ADA fixes it automatically and re-runs your analysis — you won't even notice.",
    status: "In Development",
  },
  {
    icon: GitBranch,
    title: "Connect Everything",
    desc: "Pull data from your CRM, accounting software, and spreadsheets into one view. ADA finds connections you'd never spot manually.",
    status: "Coming Soon",
  },
  {
    icon: Globe,
    title: "Business Memory",
    desc: "ADA builds a living map of your business — connecting customers, products, and events so every insight gets smarter over time.",
    status: "Research",
  },
  {
    icon: Layers,
    title: "Learns Your Style",
    desc: "The more you use SpaceForge, the better it gets. It learns what matters to you and prioritizes insights accordingly.",
    status: "In Development",
  },
  {
    icon: Workflow,
    title: "Auto-Actions",
    desc: "\"If revenue drops 10%, alert me on WhatsApp.\" Set rules once — ADA handles the rest, from alerts to report generation.",
    status: "Coming Soon",
  },
  {
    icon: Rocket,
    title: "Predict Before It Happens",
    desc: "Get warned about problems before they happen. ADA spots early signals and recommends action while you still have time.",
    status: "Research",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Development":
      return "bg-primary/10 text-primary border-primary/20";
    case "Coming Soon":
      return "bg-accent/10 text-accent-foreground border-accent/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const ADAFutureSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">The Future of ADA</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            What's Next for{" "}
            <span className="text-primary">ADA</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ADA is evolving. Here's a glimpse at the roadmap — from self-healing pipelines to predictive 
            autonomous actions that transform how you interact with data.
          </p>
        </div>

        {/* Roadmap cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmap.map((item, i) => (
            <div
              key={i}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ADAFutureSection;
