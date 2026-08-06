import { useState, useEffect, useCallback } from "react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/utils/adminConfig";

interface CreditState {
  balance: number;
  planSlug: string;
  monthlyCredits: number;
}

export const useCredits = () => {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [credits, setCredits] = useState<CreditState>(
    isAdmin
      ? { balance: 999999, planSlug: "admin", monthlyCredits: 999999 }
      : { balance: 50, planSlug: "free", monthlyCredits: 50 }
  );
  const [loading, setLoading] = useState(false);

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    // Admin users get unlimited credits â€” skip server fetch
    if (isAdminEmail(user.email)) {
      setCredits({ balance: 999999, planSlug: "admin", monthlyCredits: 999999 });
      return;
    }
    setLoading(true);
    try {
      // Use edge function to fetch credits (bypasses RLS issues with Firebase auth)
      const { data, error } = await backend.functions.invoke("razorpay-payment", {
        body: { action: "subscription-status", userId: user.id },
      });

      if (error) {
        console.error("Failed to fetch credits:", error.message);
        return;
      }

      if (data?.credits) {
        setCredits({
          balance: data.credits.balance ?? 50,
          planSlug: data.credits.plan_slug ?? "free",
          monthlyCredits: data.credits.monthly_credits ?? 50,
        });
      } else {
        // Fallback for new users - edge function should auto-provision but safety net
        setCredits({ balance: 50, planSlug: "free", monthlyCredits: 50 });
      }
    } catch (err) {
      console.error("Credit fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  const deductCredits = useCallback(async (amount: number, feature: string) => {
    if (!user) return false;
    // Admin users never lose credits
    if (isAdminEmail(user.email)) return true;
    if (credits.balance < amount) return false;

    try {
      // Use service-role via edge function for deduction
      const { data, error } = await backend.functions.invoke("razorpay-payment", {
        body: {
          action: "deduct-credits",
          userId: user.id,
          amount,
          feature,
        },
      });

      if (error || data?.error) {
        console.error("Deduct credits failed:", error?.message || data?.error);
        return false;
      }

      setCredits((prev) => ({ ...prev, balance: prev.balance - amount }));
      return true;
    } catch (err) {
      console.error("Credit deduction error:", err);
      return false;
    }
  }, [user, credits.balance]);

  return { credits, loading, fetchCredits, deductCredits };
};
