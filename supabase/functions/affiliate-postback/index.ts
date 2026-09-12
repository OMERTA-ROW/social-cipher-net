import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Conversion postback endpoint for affiliate networks and on-platform sales.
 * Callers must present the shared postback secret. Amounts are recorded exactly
 * as reported by the source — nothing is estimated here.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const secret = Deno.env.get("AFFILIATE_POSTBACK_SECRET");
    if (!secret) return json({ error: "Postback secret not configured" }, 500);

    const url = new URL(req.url);
    const provided = req.headers.get("x-postback-secret") ?? url.searchParams.get("secret");
    if (provided !== secret) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const shortCode = String(body.short_code ?? "").trim();
    const gross = Number(body.gross_amount ?? 0);
    const commission = Number(body.commission_amount ?? 0);
    if (!shortCode || !Number.isFinite(commission) || commission < 0) {
      return json({ error: "Invalid conversion payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: link } = await admin
      .from("external_affiliate_links")
      .select("id, user_id, conversion_count, earnings")
      .eq("short_code", shortCode)
      .maybeSingle();
    if (!link) return json({ error: "Unknown link" }, 404);

    const { data: rate } = await admin
      .from("platform_fee_rates")
      .select("percent")
      .eq("revenue_type", "affiliate_conversions")
      .maybeSingle();
    const percent = Number(rate?.percent ?? 0);
    const fee = Math.round(commission * (percent / 100) * 100) / 100;
    const net = Math.round((commission - fee) * 100) / 100;

    const { error } = await admin.from("affiliate_conversions").insert({
      link_id: link.id,
      user_id: link.user_id,
      gross_amount: Number.isFinite(gross) ? gross : 0,
      commission_amount: commission,
      platform_fee: fee,
      net_amount: net,
      currency: String(body.currency ?? "USD").slice(0, 8),
      source: String(body.source ?? "network").slice(0, 32),
      status: String(body.status ?? "confirmed").slice(0, 32),
      external_id: body.external_id ? String(body.external_id).slice(0, 128) : null,
    });
    if (error) throw error;

    await admin
      .from("external_affiliate_links")
      .update({
        conversion_count: Number(link.conversion_count ?? 0) + 1,
        earnings: Math.round((Number(link.earnings ?? 0) + net) * 100) / 100,
      })
      .eq("id", link.id);

    await admin.from("creator_earnings").insert({
      creator_id: link.user_id,
      post_id: null,
      amount: net,
      earning_type: "affiliate_commission",
      gross_amount: commission,
      platform_fee: fee,
      net_amount: net,
      currency: String(body.currency ?? "USD").slice(0, 8),
    });

    if (fee > 0) {
      await admin.from("platform_revenue").insert({
        source: "affiliate_house_cut",
        amount: fee,
        reference_type: "affiliate_link",
        reference_id: link.id,
      });
    }

    return json({ ok: true, net, platform_fee: fee });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
