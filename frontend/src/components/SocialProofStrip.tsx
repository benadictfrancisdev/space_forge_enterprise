import { Star, Trophy, ArrowUpRight } from "lucide-react";

const stats = [
  { value: "60s", label: "to first insight" },
  { value: "4.9", label: "average user rating", icon: true },
  { value: "12k+", label: "reports generated" },
  { value: "100%", label: "data stays private" },
];

export default function SocialProofStrip() {
  return (
    <section className="border-y border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-center mb-5">
          <a
            href="https://startupranked.com/startup/space-forge"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-background px-4 py-1.5 text-[11px] font-medium text-foreground hover:border-foreground/30 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span>
              <span className="font-semibold">#1 Product of All Time</span>
              <span className="text-muted-foreground"> on StartupRanked</span>
            </span>
            <ArrowUpRight className="w-3 h-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
        <p className="text-center text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-5">
          Trusted by founders, ops leads &amp; finance teams
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="inline-flex items-center gap-1.5 text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                {s.value}
                {s.icon && <Star className="w-4 h-4 fill-primary text-primary" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
