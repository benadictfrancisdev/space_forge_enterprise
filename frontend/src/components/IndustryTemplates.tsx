import { memo } from "react";
import { ShoppingCart, TrendingDown, Package, Users, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const templates = [
  {
    icon: ShoppingCart,
    name: "E-commerce Churn Predictor",
    desc: "Find which customers are about to leave — and why — before it's too late.",
    rows: "5,000 rows",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  {
    icon: Package,
    name: "Retail Inventory Optimizer",
    desc: "Know exactly what to restock, when, and how much — based on actual sales patterns.",
    rows: "3,000 rows",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  {
    icon: TrendingDown,
    name: "Revenue Drop Diagnoser",
    desc: "Instantly pinpoint why revenue dropped — by region, product, or customer segment.",
    rows: "2,500 rows",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: Users,
    name: "Customer Segmentation",
    desc: "Automatically group your customers by behavior, value, and buying patterns.",
    rows: "4,000 rows",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    icon: BarChart3,
    name: "Sales Performance Tracker",
    desc: "Compare reps, regions, and products — with AI-generated recommendations.",
    rows: "6,000 rows",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];

const IndustryTemplates = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4">Start in One Click</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Don't start from scratch.{" "}
            <span className="text-primary">Pick a template.</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Pre-loaded industry datasets so you can see SpaceForge in action — or use them as a starting point for your own data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
          {templates.map((t) => (
            <Link
              key={t.name}
              to="/data-agent"
              className={`group p-6 rounded-2xl border ${t.border} ${t.bg} hover:shadow-lg transition-all duration-300 cursor-pointer`}
            >
              <div className={`w-10 h-10 rounded-lg ${t.bg} border ${t.border} flex items-center justify-center mb-4`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">{t.name}</h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{t.rows} sample</span>
                <span className={`text-xs font-bold ${t.color} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                  Try it <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/data-agent">
            <Button variant="outline" className="rounded-full px-8 border-primary/30 hover:bg-primary/10">
              Or upload your own data →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default memo(IndustryTemplates);
