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
          target: 'balance_check',
          metadata: {}
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  };

  const logSecurityEvent = async (
    action: string, 
    target: string,
    additionalMetadata: Record<string, any> = {}
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsMonitoring(true);

      const { data, error } = await supabase.functions.invoke('monitor-wallet-security', {
        body: { 
          action, 
          target,
          metadata: {
            timestamp: new Date().toISOString(),
            ...additionalMetadata
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Security monitoring error:', error);
        setIsMonitoring(false);
        return;
      }

      if (data?.blocked) {
        setIsSecure(false);
        toast.error("🚨 Security Alert", {
          description: data.reason || "Malicious activity detected. Account has been flagged and funds confiscated to CyberLink security vault.",
          duration: 5000
        });
        
        // Force logout after delay
        setTimeout(() => {
          supabase.auth.signOut();
          window.location.href = '/';
        }, 3000);
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
