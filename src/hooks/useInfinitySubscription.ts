import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type InfinityTier = "free" | "quantum" | "cosmic";

export interface InfinitySubscriptionStatus {
  subscribed: boolean;
  tier: InfinityTier;
  product_id?: string;
  subscription_end?: string;
}

export const INFINITY_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
    features: [
      "Basic infinity loop",
      "Limited automation",
      "3 AI cycles per day"
    ],
    tokenBonus: 0
  },
  quantum: {
    name: "Infinity Quantum",
    price: 360,
    priceId: "price_infinity_quantum",
    productId: "prod_infinity_quantum",
    features: [
      "Unlimited infinity loops",
      "Advanced automation",
      "Continuous AI monitoring",
      "Character enhancement system",
      "Spaceship auto-updates"
    ],
    tokenBonus: 0
  },
  cosmic: {
    name: "Infinity Cosmic",
    price: 600,
    priceId: "price_infinity_cosmic",
    productId: "prod_infinity_cosmic",
    features: [
      "Everything in Quantum",
      "Multi-AI coordination",
      "Predictive intelligence",
      "Reality bending features",
      "Infinite parallel processing",
      "🎁 10,000 Bonus Tokens on signup",
      "💫 Cross-dimensional insights"
    ],
    tokenBonus: 10000
  }
};

export const useInfinitySubscription = () => {
  const [status, setStatus] = useState<InfinitySubscriptionStatus>({
    subscribed: false,
    tier: "free"
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setStatus({ subscribed: false, tier: "free" });
        return;
      }

      // For now, return free tier - can be extended with actual subscription check
      setStatus({ subscribed: false, tier: "free" });
    } catch (error) {
      console.error("Error checking Infinity subscription:", error);
      setStatus({ subscribed: false, tier: "free" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });

    return () => subscription.unsubscribe();
  }, []);

  const startCheckout = async (tier: "quantum" | "cosmic") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe to Infinity AI",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Infinity Subscription",
        description: `${tier} tier coming soon!`,
      });
    } catch (error) {
      console.error("Error starting checkout:", error);
      toast({
        title: "Checkout Error",
        description: "Failed to start checkout process",
        variant: "destructive"
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      toast({
        title: "Customer Portal",
        description: "Portal coming soon!",
      });
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Portal Error",
        description: "Failed to open customer portal",
        variant: "destructive"
      });
    }
  };

  return {
    status,
    loading,
    checkSubscription,
    startCheckout,
    openCustomerPortal
  };
};
