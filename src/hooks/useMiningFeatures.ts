import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MiningUnlockStatus {
  draco: boolean;
  zozo: boolean;
  loading: boolean;
}

export const useMiningFeatures = () => {
  const [status, setStatus] = useState<MiningUnlockStatus>({
    draco: false,
    zozo: false,
    loading: true,
  });

  useEffect(() => {
    checkMiningUnlocks();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMiningUnlocks();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMiningUnlocks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setStatus({ draco: false, zozo: false, loading: false });
        return;
      }

      const { data: unlocks } = await supabase
        .from("subscription_unlocks")
        .select("subscription_type")
        .eq("user_id", session.user.id)
        .eq("feature_unlocked", "mining");

      if (unlocks) {
        const dracoUnlocked = unlocks.some(u => u.subscription_type === "draco");
        const zozoUnlocked = unlocks.some(u => u.subscription_type === "zozo");
        
        setStatus({
          draco: dracoUnlocked,
          zozo: zozoUnlocked,
          loading: false,
        });
      } else {
        setStatus({ draco: false, zozo: false, loading: false });
      }
    } catch (error) {
      console.error("Error checking mining unlocks:", error);
      setStatus({ draco: false, zozo: false, loading: false });
    }
  };

  return status;
};