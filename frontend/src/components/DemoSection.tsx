import { memo } from "react";
import { Play } from "lucide-react";

const DemoSection = () => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-6">
        <p className="text-center text-base text-muted-foreground mb-10 max-w-2xl mx-auto">
          See how teams upload messy spreadsheets and walk away with actionable decisions in under 10 seconds.
        </p>

        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-border shadow-lg">
          <div
            className="relative w-full flex flex-col items-center justify-center py-32"
            style={{
              background: "linear-gradient(135deg, hsl(222 38% 10%) 0%, hsl(222 35% 14%) 100%)",
            }}
          >
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "linear-gradient(hsl(190 95% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(190 95% 50% / 0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />

            <div className="relative z-10 w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5 cursor-pointer hover:scale-105 transition-transform shadow-lg"
              style={{ boxShadow: "0 0 40px hsl(190 95% 50% / 0.4)" }}
            >
              <Play className="w-8 h-8 text-primary-foreground ml-1" />
            </div>
            <p className="relative z-10 text-foreground font-semibold text-lg">SpaceForge — Decision Intelligence Demo</p>
            <p className="relative z-10 text-muted-foreground text-sm mt-1">2 min · Upload data → Get decisions instantly</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(DemoSection);
