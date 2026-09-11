import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EarningsStatus = "ok" | "unsupported" | "error" | "needs_reconnect";

export interface EarningsEntry {
  service_id: string;
  name: string;
  glyph: string;
  status: EarningsStatus;
  amount: number | null;
  currency: string;
  detail: string | null;
  fetched_at: string;
}

export interface EarningsSnapshot {
  total: number;
  currency: string;
  entries: EarningsEntry[];
  period: { days: number; start: string; end: string };
  generated_at: string;
}

/**
 * Live earnings across every connected platform. Values come straight from each
 * provider's own API through the connector layer — never estimated here.
 */
export const useCrossPlatformEarnings = (days = 30) =>
  useQuery<EarningsSnapshot>({
    queryKey: ["cross-platform-earnings", days],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in to see your earnings");

      const { data, error } = await supabase.functions.invoke("connector-earnings", {
        body: { days },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as EarningsSnapshot;
    },
  });
