import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { backend } from "@/platform";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

async function callPaymentApi(body: Record<string, unknown>) {
  const { data, error } = await backend.functions.invoke("razorpay-payment", {
    body,
  });
  if (error) throw new Error(error.message || "Request failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const openCheckout = useCallback(
    async (planSlug: string, isAnnual: boolean) => {
      if (!user) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Failed to load payment gateway");

        const orderData = await callPaymentApi({
          action: "create-order",
          plan_slug: planSlug,
          is_annual: isAnnual,
          userId: user.id,
        });

        const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "SpaceForge",
          description: `${orderData.plan_name} Plan ${isAnnual ? "(Annual)" : "(Monthly)"}`,
          order_id: orderData.order_id,
          prefill: { email: user.email },
          handler: async (response: any) => {
            try {
              await callPaymentApi({
                action: "verify-payment",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_slug: planSlug,
                is_annual: isAnnual,
                userId: user.id,
              });
              toast({ title: "Payment successful!", description: `Your ${orderData.plan_name} plan is now active.` });
            } catch (err: any) {
              toast({ title: "Verification failed", description: err.message, variant: "destructive" });
            }
          },
          theme: { color: "#1a6ff4" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err: any) {
        toast({ title: "Payment error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const getPaymentHistory = useCallback(async () => {
    if (!user) return null;
    return callPaymentApi({ action: "payment-history", userId: user.id });
  }, [user]);

  const getSubscriptionStatus = useCallback(async () => {
    if (!user) return null;
    return callPaymentApi({ action: "subscription-status", userId: user.id });
  }, [user]);

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    if (!user) return null;
    return callPaymentApi({ action: "cancel-subscription", subscription_id: subscriptionId, userId: user.id });
  }, [user]);

  const requestRefund = useCallback(async (paymentId: string) => {
    if (!user) return null;
    return callPaymentApi({ action: "refund", payment_id: paymentId, userId: user.id });
  }, [user]);

  const createSubscription = useCallback(
    async (planSlug: string, isAnnual: boolean) => {
      if (!user) {
        toast({ title: "Please sign in first", variant: "destructive" });
        return;
      }
      setLoading(true);
      try {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Failed to load payment gateway");

        const subData = await callPaymentApi({
          action: "create-subscription",
          plan_slug: planSlug,
          is_annual: isAnnual,
          userId: user.id,
        });

        const options = {
          key: subData.razorpay_key_id,
          subscription_id: subData.subscription_id,
          name: "SpaceForge",
          description: `${subData.plan_name} Plan (Auto-Renew)`,
          prefill: { email: user.email },
          handler: async (response: any) => {
            try {
              await callPaymentApi({
                action: "verify-payment",
                razorpay_order_id: response.razorpay_order_id || subData.subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_slug: planSlug,
                is_annual: isAnnual,
                userId: user.id,
              });
              toast({ title: "Subscription activated!", description: `Your ${subData.plan_name} plan will auto-renew.` });
            } catch (err: any) {
              toast({ title: "Verification failed", description: err.message, variant: "destructive" });
            }
          },
          theme: { color: "#1a6ff4" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err: any) {
        toast({ title: "Subscription error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  return {
    openCheckout,
    createSubscription,
    getPaymentHistory,
    getSubscriptionStatus,
    cancelSubscription,
    requestRefund,
    loading,
  };
};
