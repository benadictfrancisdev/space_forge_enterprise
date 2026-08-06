import { Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CreditMeter = () => {
  const { credits } = useCredits();
  const navigate = useNavigate();

  const isAdmin = credits.planSlug === "admin";

  // Admin users see a simplified badge
  if (isAdmin) {
    return (
      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Admin Access</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Unlimited AI credits &bull; All features unlocked</p>
      </div>
    );
  }

  const used = credits.monthlyCredits - credits.balance;
  const pct = credits.monthlyCredits > 0 ? Math.round((credits.balance / credits.monthlyCredits) * 100) : 0;
  const low = pct < 20;

  return (
    <div className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-semibold text-foreground">AI Credits</span>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize">{credits.planSlug} plan</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{used} used / {credits.balance} remaining</span>
        <span className={low ? "text-destructive font-medium" : "text-muted-foreground"}>{pct}%</span>
      </div>
      {low && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertTriangle className="w-3 h-3" />
          <span>Credits running low!</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary" onClick={() => navigate("/pricing")}>
            Top up
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreditMeter;
