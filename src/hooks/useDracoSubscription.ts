import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type DracoTier = "free" | "basic" | "pro";

export interface DracoSubscriptionStatus {
  subscribed: boolean;
  tier: DracoTier;
  product_id?: string;
  subscription_end?: string;
}

export const DRACO_TIERS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
    features: [
      "Basic chat access",
      "Limited trading signals",
      "5 messages per day"
    ]
  },
  basic: {
    name: "Draco Basic",
    price: 20,
    priceId: "price_1SSUITHTVeX8KHmEOjGT69Im",
    productId: "prod_TPIuTPo3dixGa6",
    features: [
      "Unlimited AI conversations",
      "Basic market analysis",
      "Real-time trading signals",
      "Chart analysis support"
    ]
  },
  pro: {
    name: "Draco Pro",
    price: 40,
    priceId: "price_1SSUIiHTVeX8KHmEuBKPeaMi",
    productId: "prod_TPIukrqfcWbdPQ",
    features: [
      "Everything in Basic",
      "Advanced trading signals",
      "Fibonacci overlay analysis",
      "Priority support",
      "Custom alerts",
      "Market insights reports"
    ]
  }
};

export const useDracoSubscription = () => {
  const [status, setStatus] = useState<DracoSubscriptionStatus>({
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

      const { data, error } = await supabase.functions.invoke('check-draco-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setStatus(data);
    } catch (error) {
      console.error("Error checking Draco subscription:", error);
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

  const startCheckout = async (tier: "basic" | "pro") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to subscribe to Draco",
          variant: "destructive"
        });
        return;
      }

      const priceId = DRACO_TIERS[tier].priceId;
      
      const { data, error } = await supabase.functions.invoke('create-draco-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to manage your subscription",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('draco-customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
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
