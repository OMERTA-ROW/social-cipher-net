import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth providers whose developer app is configured on the server. Fails
 * closed: any error or malformed reply means no provider is offered.
 */
export const useConfiguredProviders = () => {
  const [configured, setConfigured] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.functions
      .invoke("connector-oauth", { body: { action: "status" } })
      .then(({ data, error }) => {
        if (!active) return;
        const list = !error && Array.isArray(data?.configured) ? data.configured.filter((v: unknown) => typeof v === "string") : [];
        setConfigured(list);
      })
      .catch(() => { if (active) setConfigured([]); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  return { configured, loaded };
};
