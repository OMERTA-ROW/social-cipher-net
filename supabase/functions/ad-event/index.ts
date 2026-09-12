import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Records a real ad impression or click and bills the advertiser's campaign.
 * Billing happens server-side only, from the campaign's own configured rates.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required" }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const viewer = userData.user;
    if (!viewer) return json({ error: "Sign in required" }, 401);

    const { creativeId, type, placement } = await req.json();
    if (!creativeId || (type !== "impression" && type !== "click")) {
      return json({ error: "Invalid event" }, 400);
    }
    const slot = typeof placement === "string" ? placement.slice(0, 32) : "feed";

    const { data: creative, error: creativeError } = await admin
      .from("ad_creatives")
      .select("id, campaign_id, ad_campaigns(id, status, budget_cents, spent_cents, cpc_cents, cpm_cents)")
      .eq("id", creativeId)
      .maybeSingle();
    if (creativeError || !creative) return json({ error: "Creative not found" }, 404);

    const campaign: any = (creative as any).ad_campaigns;
    if (!campaign || campaign.status !== "running") return json({ ok: true, billed: 0 });

    await admin.from(type === "click" ? "ad_clicks" : "ad_impressions").insert({
      creative_id: creative.id,
      campaign_id: campaign.id,
      viewer_id: viewer.id,
      placement: slot,
    });

    const chargeCents =
      type === "click" ? Number(campaign.cpc_cents ?? 0) : Number(campaign.cpm_cents ?? 0) / 1000;
    const remaining = Number(campaign.budget_cents ?? 0) - Number(campaign.spent_cents ?? 0);
    const billed = Math.max(0, Math.min(chargeCents, remaining));

    if (billed > 0) {
      const spent = Number(campaign.spent_cents ?? 0) + billed;
      await admin
        .from("ad_campaigns")
        .update({
          spent_cents: Math.round(spent),
          status: spent >= Number(campaign.budget_cents ?? 0) ? "completed" : "running",
        })
        .eq("id", campaign.id);

      await admin.from("platform_revenue").insert({
        source: "advertising",
        amount: billed / 100,
        reference_type: `ad_${type}`,
        reference_id: campaign.id,
      });
    }

    return json({ ok: true, billed: billed / 100 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
