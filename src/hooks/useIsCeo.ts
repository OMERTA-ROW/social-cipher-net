import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Owner/CEO access gate. Backed by the server-side `has_role` check, so it
 * cannot be spoofed from the client.
 */
export const useIsCeo = () => {
  const [isCeo, setIsCeo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) { setIsCeo(false); setLoading(false); }
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!alive) return;
      setIsCeo(!!data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { isCeo, loading };
};
