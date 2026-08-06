import { memo } from "react";
import { FileSpreadsheet, Clock, HelpCircle } from "lucide-react";

const items = [
  {
    n: "01",
    icon: FileSpreadsheet,
    pain: "Your numbers live in five different spreadsheets.",
    fix: "Upload any file — Excel, CSV, JSON or PDF — and SpaceForge unifies it into one clean dashboard you can actually read.",
  },
  {
    n: "02",
    icon: Clock,
    pain: "Building a monthly report eats half your week.",
    fix: "Get a board-ready PDF, PowerPoint and live link in under a minute. Refresh next month with one click.",
  },
  {
    n: "03",
    icon: HelpCircle,
    pain: "Charts everywhere — and still no idea what to do.",
    fix: "Every dashboard comes with plain-English insights and recommendations: what changed, why it changed and what to fix this week.",
  },
];

const PainPoints = () => {
  return (
    <section className="py-28 md:py-36 relative">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="max-w-2xl mb-20">
          <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-5">
            Why teams switch
          </p>
            <h2 className="text-4xl md:text-6xl font-medium text-foreground tracking-[-0.035em] leading-[1.02]">
              Reports show history.
              <br />
              <span className="italic font-light text-foreground/55">SpaceForge shows what's next.</span>
            </h2>
        </div>

        <div className="border-t border-border">
          {items.map((it) => (
            <div
              key={it.n}
              className="grid md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-14 border-b border-border group"
            >
              <div className="md:col-span-2 flex md:block items-center gap-4">
                <span className="text-[11px] tracking-[0.22em] text-muted-foreground/60 tabular-nums">
                  {it.n}
                </span>
                <it.icon className="w-4 h-4 text-foreground/40 mt-3 hidden md:block" />
              </div>
              <div className="md:col-span-5">
                <p className="text-xl md:text-2xl text-foreground font-medium tracking-[-0.015em] leading-snug">
                  {it.pain}
                </p>
              </div>
              <div className="md:col-span-5 md:border-l md:border-border md:pl-10">
                <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-3">
                  SpaceForge
                </p>
                <p className="text-base text-muted-foreground leading-[1.65] font-light">
                  {it.fix}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(PainPoints);
