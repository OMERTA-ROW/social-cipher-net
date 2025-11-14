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
    name: "CyberFree",
    price: "$0",
    features: [
      "Full platform access",
      "No payment required",
      "No restrictions",
      "Upgrade at 1K followers + 10K views"
    ],
    tokenBonus: 0
  },
  basic: {
    name: "CyberBasis",
    price: "$50/year",
    priceId: "price_1SRivYHTVeX8KHmEwCiUejhe",
    productId: "prod_RlNFTN4LJIdK5c",
    features: [
      "Auto-unlocked at milestones",
      "Active AI conversations",
      "Auto-reply to messages",
      "Thread posting",
      "Notification assistance",
      "Voice features",
    ],
    tokenBonus: 0
  },
  premium: {
    name: "CyberPro",
    price: "$100/year",
    priceId: "price_1SRivmHTVeX8KHmEe7Usofwt",
    productId: "prod_RlNG0uIMPYZazH",
    features: [
      "Everything in CyberBasis",
      "Unlimited AI conversations",
      "Hyperspace access",
      "Priority support",
      "Advanced automation",
      "Auto-live linking",
      "🎁 10,000 Bonus Tokens on signup",
      "💰 Token-based payment features"
    ],
    tokenBonus: 10000
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

      // Check subscription status
      const { data: subData, error: subError } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (subError) {
        console.error("Subscription check error:", subError);
        setStatus({ subscribed: false, tier: "free", product_id: null, subscription_end: null });
      } else {
        // If free tier, check if they qualify for auto-upgrade
        if (!subData?.subscribed || subData?.tier === "CyberFree") {
          const { data: qualData } = await supabase.functions.invoke("check-qualifications", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (qualData?.qualifies && !qualData?.hasActiveSubscription && qualData?.checkoutUrl) {
            // User qualifies - automatically open checkout
            toast.success(qualData.message || "You've unlocked CyberBasis! Redirecting to payment...", {
              duration: 3000
            });
            
            setTimeout(() => {
              window.open(qualData.checkoutUrl, "_blank");
            }, 1500);
          } else if (qualData?.qualifies && qualData?.hasActiveSubscription) {
            toast.success("CyberBasis subscription is active!");
          }
        }
        setStatus(subData);
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

  const startCheckout = async (tier: "basic" | "premium", useWallet: boolean = false) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        return;
      }

      const tierConfig = ZOZO_TIERS[tier];

      if (useWallet) {
        const { data, error } = await supabase.functions.invoke("pay-subscription-from-wallet", {
          body: { tier },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        toast.success(data.message || "Subscription activated!");
        
        // Grant bonus tokens for Premium tier
        if (tier === "premium" && tierConfig.tokenBonus) {
          await supabase.functions.invoke('grant-subscription-tokens', {
            body: { 
              productId: tierConfig.productId,
              tokenAmount: tierConfig.tokenBonus 
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          toast.success(`${tierConfig.tokenBonus} bonus tokens added to your wallet!`);
        }
        
        checkSubscription();
      } else {
        const priceId = tierConfig.priceId;

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
          
          // Grant bonus tokens for Premium tier after checkout
          if (tier === "premium" && tierConfig.tokenBonus) {
            setTimeout(async () => {
              await supabase.functions.invoke('grant-subscription-tokens', {
                body: { 
                  productId: tierConfig.productId,
                  tokenAmount: tierConfig.tokenBonus 
                },
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });
            }, 5000);
          }
        }
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to start checkout");
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
