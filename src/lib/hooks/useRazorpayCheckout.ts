"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { subscriptionService, SubscriptionPlan } from "@/lib/api/subscriptionService";
import { useToast } from "@/components/ui/use-toast";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (document.getElementById("razorpay-checkout-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

interface CheckoutOptions {
  plan: SubscriptionPlan;
  promoCode?: string;
  autoRenew?: boolean;
  onSuccess?: () => void;
}

export function useRazorpayCheckout() {
  const router = useRouter();
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const startCheckout = useCallback(async ({ plan, promoCode = "", autoRenew = true, onSuccess }: CheckoutOptions) => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/subscriptions");
      return;
    }

    if (user?.is_premium && user?.subscription_plan_id === plan.id) {
      toast({ title: "Plan already active", description: "Pick another plan to upgrade.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay. Please refresh and try again.");
      }

      const checkout = await subscriptionService.startCheckout({
        plan_id: plan.id,
        promo_code: promoCode.trim() || undefined,
        auto_renew: autoRenew,
      });

      const rzp = new window.Razorpay({
        key: checkout.razorpayKey,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Bharat Mock",
        description: plan.name || "Subscription",
        order_id: checkout.orderId,
        handler: async (response: any) => {
          try {
            await subscriptionService.confirmPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            await refreshProfile();
            toast({ title: "Subscription activated!", description: "Enjoy your premium access." });
            onSuccess?.();
            router.push("/profile");
          } catch (err: any) {
            toast({
              title: "Payment captured but confirmation failed",
              description: err.message || "Contact support with your payment details.",
              variant: "destructive",
            });
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: { subscriptionId: checkout.subscriptionId },
        theme: { color: "#2563eb" },
      });

      rzp.on("payment.failed", (response: any) => {
        setProcessing(false);
        toast({
          title: "Payment failed",
          description: response.error?.description || "Please try again or use another payment method.",
          variant: "destructive",
        });
      });

      rzp.open();
    } catch (err: any) {
      setProcessing(false);
      toast({
        title: "Checkout failed",
        description: err.message || "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user, router, toast, refreshProfile]);

  return { startCheckout, processing };
}
