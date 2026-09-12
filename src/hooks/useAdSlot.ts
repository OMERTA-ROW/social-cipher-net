import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdCreative {
  id: string;
  campaign_id: string;
  headline: string;
  body: string | null;
  image_url: string | null;
  cta_label: string;
  cta_url: string;
  advertiser: string | null;
}

export type AdPlacement = "feed" | "discovery" | "shop" | "market" | "stream" | "theater";

/** Paid tiers reduce or remove ads — checked against real entitlements. */
export const useAdsSuppressed = () => {
  const [suppressed, setSuppressed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_entitlements")
        .select("tier_key, status")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (alive) setSuppressed((data ?? []).length > 0);
    })();
    return () => { alive = false; };
  }, []);
  return suppressed;
};

/**
 * Live ad inventory for a placement. Only creatives belonging to running,
 * in-budget campaigns are returned — there is no filler or sample creative.
 */
export const useAdSlot = (placement: AdPlacement) =>
  useQuery<AdCreative[]>({
    queryKey: ["ad-slot", placement],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_creatives")
        .select(
          "id, campaign_id, headline, body, image_url, cta_label, cta_url, ad_campaigns!inner(status, placements, budget_cents, spent_cents, ad_advertisers!inner(company_name))",
        )
        .eq("is_active", true)
        .eq("ad_campaigns.status", "running")
        .contains("ad_campaigns.placements", [placement])
        .limit(20);
      if (error) throw error;
      return (data ?? [])
        .filter((row: any) => row.ad_campaigns.spent_cents < row.ad_campaigns.budget_cents)
        .map((row: any) => ({
          id: row.id,
          campaign_id: row.campaign_id,
          headline: row.headline,
          body: row.body,
          image_url: row.image_url,
          cta_label: row.cta_label,
          cta_url: row.cta_url,
          advertiser: row.ad_campaigns?.ad_advertisers?.company_name ?? null,
        }));
    },
  });

export const recordAdEvent = async (
  creativeId: string,
  type: "impression" | "click",
  placement: AdPlacement,
) => {
  try {
    await supabase.functions.invoke("ad-event", { body: { creativeId, type, placement } });
  } catch {
    /* ad accounting never blocks the reader's experience */
  }
};
