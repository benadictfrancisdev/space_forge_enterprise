import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-32 md:py-40 relative border-t border-border">
      <div className="container mx-auto px-6 max-w-4xl text-center">
        <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-6">
          Share · Analyze · Decide
        </p>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium text-foreground tracking-[-0.04em] leading-[1.02] mb-8">
          Build once.
          <br />
          <span className="italic font-light text-foreground/55">Share insights everywhere.</span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-[1.6] font-light mb-10">
          Drop in a spreadsheet. SpaceForge builds the dashboard, writes the report, and generates a shareable link — in under a minute.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/data-agent">
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-7 py-3.5 min-h-[48px] gap-2 text-sm font-medium">
              Try with sample data <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/apps/executive">
            <Button variant="outline" className="rounded-full px-7 py-3.5 min-h-[48px] gap-2 text-sm font-medium">
              Enterprise Suite <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            View pricing →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default memo(CTASection);
