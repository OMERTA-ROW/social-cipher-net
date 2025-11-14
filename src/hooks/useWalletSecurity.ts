import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWalletSecurity = () => {
  const [isSecure, setIsSecure] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    monitorSecurity();
  }, []);

  const monitorSecurity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Log wallet access for security monitoring
      await supabase.functions.invoke('monitor-wallet-security', {
        body: { 
          action: 'wallet_view',
          target: 'balance_check'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  };

  const logSecurityEvent = async (action: string, target: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsMonitoring(true);

      const { data, error } = await supabase.functions.invoke('monitor-wallet-security', {
        body: { action, target },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.blocked) {
        setIsSecure(false);
        toast.error("Security Alert", {
          description: data.reason || "Suspicious activity detected. Your account has been flagged."
        });
        
        // Force logout
        setTimeout(() => {
          supabase.auth.signOut();
        }, 2000);
      }

      setIsMonitoring(false);
    } catch (error: any) {
      console.error('Security event logging error:', error);
      setIsMonitoring(false);
    }
  };

  return {
    isSecure,
    isMonitoring,
    logSecurityEvent,
    monitorSecurity
  };
};
