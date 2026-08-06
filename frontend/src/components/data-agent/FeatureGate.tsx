import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/utils/adminConfig";

interface FeatureGateProps {
  feature: string;
  creditCost?: number;
  requiredPlan?: string;
  children: React.ReactNode;
}

const planRank: Record<string, number> = { free: 0, standard: 1, pro: 2, team: 3, enterprise: 4 };

const FeatureGate = ({ feature, creditCost = 1, requiredPlan = "free", children }: FeatureGateProps) => {
  const { credits, deductCredits } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Admin bypass — full access for admin emails
  const isAdmin = isAdminEmail(user?.email);
  if (isAdmin) {
    return <>{children}</>;
  }

  const userRank = planRank[credits.planSlug] ?? 0;
  const requiredRank = planRank[requiredPlan] ?? 0;
  const planLocked = userRank < requiredRank;
  const creditLocked = credits.balance < creditCost;

  if (planLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/50 bg-secondary/20">
        <Lock className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Feature Locked</p>
        <p className="text-xs text-muted-foreground mb-4">
          Upgrade to <span className="capitalize font-semibold text-primary">{requiredPlan}</span> plan to unlock {feature}.
        </p>
        <Button size="sm" onClick={() => navigate("/pricing")}>Upgrade Plan</Button>
      </div>
    );
  }

  if (creditLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-border/50 bg-secondary/20">
        <Lock className="w-10 h-10 text-yellow-500/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Insufficient Credits</p>
        <p className="text-xs text-muted-foreground mb-4">
          {feature} requires {creditCost} credits. You have {credits.balance} remaining.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate("/pricing")}>Top Up Credits</Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGate;
