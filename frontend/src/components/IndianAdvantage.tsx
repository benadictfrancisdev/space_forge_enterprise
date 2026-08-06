import { memo } from "react";
import { IndianRupee, Plug, Globe } from "lucide-react";

const tools = [
  { name: "Tally", desc: "One-click sync" },
  { name: "Zoho Books", desc: "Auto-import" },
  { name: "Vyapar", desc: "Direct connect" },
  { name: "Busy", desc: "Seamless sync" },
];

const IndianAdvantage = () => {
  return (
    <section className="py-12 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-transparent to-primary/5 p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">Built for India</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                One-click sync with the tools{" "}
                <span className="text-accent">Indian businesses actually use</span>
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No more exporting Excel sheets from Tally every week. Connect your accounting software once and get real-time insights — automatically.
              </p>
            </div>

            {/* Right — Tool badges */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:border-accent/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Plug className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(IndianAdvantage);
