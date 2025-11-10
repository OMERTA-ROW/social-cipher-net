import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ZozoTier = "free" | "basic" | "premium";

interface SubscriptionStatus {
  subscribed: boolean;
  tier: ZozoTier;
  product_id: string | null;
  subscription_end: string | null;
}

export const ZOZO_TIERS = {
  free: {
    name: "Free",
    price: "$0",
    features: ["Zozo visible", "No AI assistance", "Just monitors activity"],
  },
  basic: {
    name: "Basic",
    price: "$20/year",
    priceId: "price_1SRivYHTVeX8KHmEwCiUejhe",
    productId: "prod_TOVxsdaBvuE9cZ",
    features: [
      "Active AI conversations",
      "Auto-reply to messages",
      "Thread posting",
      "Notification assistance",
      "Voice features",
    ],
  },
  premium: {
    name: "Premium",
    price: "$40/year",
    priceId: "price_1SRivmHTVeX8KHmEe7Usofwt",
    productId: "prod_TOVxfPqyzEZAKk",
    features: [
      "Everything in Basic",
      "Unlimited AI conversations",
      "Hyperspace access",
      "Priority support",
      "Advanced automation",
      "Auto-live linking",
    ],
  },
};

export const useZozoSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    tier: "free",
    product_id: null,
    subscription_end: null,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ subscribed: false, tier: "free", product_id: null, subscription_end: null });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Subscription check error:", error);
        setStatus({ subscribed: false, tier: "free", product_id: null, subscription_end: null });
      } else {
        setStatus(data);
      }
    } catch (error) {
      console.error("Subscription check failed:", error);
      setStatus({ subscribed: false, tier: "free", product_id: null, subscription_end: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    // Auto-refresh every minute
    const interval = setInterval(checkSubscription, 60000);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => {
      interval && clearInterval(interval);
      subscription?.unsubscribe();
    };
  }, []);

  const startCheckout = async (tier: "basic" | "premium") => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        return;
      }

      const priceId = ZOZO_TIERS[tier].priceId;

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening checkout...");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout");
    }
  };

  const openCustomerPortal = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening subscription management...");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open customer portal");
    }
  };

  return {
    ...status,
    loading,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
  };
};
