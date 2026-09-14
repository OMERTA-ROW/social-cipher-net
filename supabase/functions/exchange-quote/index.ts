/**
 * Server-validated fee quoting for the CyberLink Exchange area.
 *
 * The browser may ask for a price, never set one. Fee rules are read from
 * `fee_settings` with the service role, the arithmetic runs here on integer
 * minor units, and the result is written to `exchange_quotes` with an explicit
 * expiry. A rule that is not configured returns a setup-required answer — it is
 * never treated as a zero fee, and no transaction is ever initiated here.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CATEGORIES = ["exchange", "wallet", "bank"];

const percentFeeMinor = (amountMinor: number, percentBps: number) =>
  Math.floor((amountMinor * percentBps + 5000) / 10000);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "");
    const operation = String(body.operation ?? "").slice(0, 64);
    const rail = body.rail ? String(body.rail).slice(0, 64) : null;
    const asset = body.asset ? String(body.asset).slice(0, 32) : null;
    const currency = String(body.currency ?? "USD").slice(0, 16).toUpperCase();
    const amountMinor = Number(body.amount_minor);

    if (!CATEGORIES.includes(category) || !operation) {
      return json({ error: "Unknown fee category or operation" }, 400);
    }
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return json({ error: "Enter an amount greater than zero" }, 400);
    }

    let query = admin
      .from("fee_settings")
      .select("*")
      .eq("category", category)
      .eq("operation", operation)
      .eq("currency", currency);
    query = rail ? query.eq("rail", rail) : query.is("rail", null);
    query = asset ? query.eq("asset", asset) : query.is("asset", null);
    const { data: rule, error: ruleError } = await query.maybeSingle();
    if (ruleError) return json({ error: ruleError.message }, 400);

    if (!rule || !rule.is_configured || !rule.is_active) {
      return json({
        ok: false,
        reason: "setup_required",
        message:
          "This fee has not been set up yet, so no price can be given. An administrator must set the rate first.",
      });
    }
    if (rule.effective_from && new Date(rule.effective_from).getTime() > Date.now()) {
      return json({
        ok: false,
        reason: "not_yet_effective",
        message: "This fee rule has a future start date.",
      });
    }
    if (rule.percent_bps == null || rule.fixed_minor == null) {
      return json({ ok: false, reason: "setup_required", message: "This fee rule is incomplete." });
    }

    // Provider and network costs are only accepted when a real integration
    // reports them. Nothing is estimated or invented here.
    const providerFeeMinor = 0;
    const networkFeeMinor = 0;

    let platformFeeMinor = percentFeeMinor(amountMinor, rule.percent_bps) + Number(rule.fixed_minor);
    if (rule.min_fee_minor != null) platformFeeMinor = Math.max(platformFeeMinor, Number(rule.min_fee_minor));
    if (rule.max_fee_minor != null) platformFeeMinor = Math.min(platformFeeMinor, Number(rule.max_fee_minor));

    const totalFeeMinor = platformFeeMinor + providerFeeMinor + networkFeeMinor;
    const totalMinor = rule.payer === "sender" ? amountMinor + totalFeeMinor : amountMinor;
    const netReceivedMinor = rule.payer === "receiver"
      ? Math.max(0, amountMinor - totalFeeMinor)
      : amountMinor;
    const expiresAt = new Date(Date.now() + rule.quote_ttl_seconds * 1000).toISOString();

    const { data: quote, error: insertError } = await admin
      .from("exchange_quotes")
      .insert({
        user_id: user.id,
        category,
        operation,
        rail,
        asset,
        currency,
        minor_unit_scale: rule.minor_unit_scale,
        amount_minor: amountMinor,
        platform_fee_minor: platformFeeMinor,
        provider_fee_minor: providerFeeMinor,
        network_fee_minor: networkFeeMinor,
        total_minor: totalMinor,
        net_received_minor: netReceivedMinor,
        payer: rule.payer,
        breakdown: {
          percent_bps: rule.percent_bps,
          fixed_minor: rule.fixed_minor,
          min_fee_minor: rule.min_fee_minor,
          max_fee_minor: rule.max_fee_minor,
          rule_id: rule.id,
          provider_id: rule.provider_id,
          provider_fee_source: "not_integrated",
          network_fee_source: "not_integrated",
        },
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (insertError) return json({ error: insertError.message }, 400);

    return json({
      ok: true,
      quote,
      // Quoting is priced-only. Execution stays off until a real exchange,
      // wallet or bank provider is integrated.
      execution_enabled: false,
      execution_note:
        "Pricing only. Transfers and trades stay disabled until a payment or exchange provider is connected.",
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
