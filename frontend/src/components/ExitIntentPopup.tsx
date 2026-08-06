import { memo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ExitIntentPopup = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 0 && !dismissed) {
      // Check if already shown this session
      const shown = sessionStorage.getItem("sf_exit_shown");
      if (!shown) {
        setShow(true);
        sessionStorage.setItem("sf_exit_shown", "1");
      }
    }
  }, [dismissed]);

  useEffect(() => {
    // Only on landing page, after 10 seconds
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative max-w-md w-full mx-4 rounded-2xl border border-border bg-card p-8 shadow-2xl">

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Wait — Don't Leave Empty-Handed!
          </div>

          <h3 className="text-2xl font-bold text-foreground mb-3">
            Get your <span className="text-primary">free data audit</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload any CSV right now and see exactly what SpaceForge finds in your data — <strong className="text-foreground">completely free, no signup required.</strong>
          </p>

          <Link to="/data-agent" onClick={handleDismiss}>
            <Button className="w-full rounded-full h-12 font-bold text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 mb-3">
              Try Free Data Analysis <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            No thanks, I'll pass on free insights
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ExitIntentPopup);
