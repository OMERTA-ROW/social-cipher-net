import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Reads the caller's live Stripe subscriptions and mirrors them into
 * public.user_entitlements. No plan is ever granted without a real active
 * Stripe subscription behind it.
 */
const PRODUCT_TIERS: Record<string, string> = {
  prod_TOtJnFseC54ChY: "plus",
  prod_TOtRdMUKNeKkFc: "pro",
  prod_VFB4e6LecHM4mM: "terminal",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.email) throw new Error("Not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Payments are not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const activeTiers = new Map<string, string | null>();

    if (customers.data.length > 0) {
      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 20,
      });
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          const productId = typeof item.price.product === "string"
            ? item.price.product
            : item.price.product?.id;
          const tier = productId ? PRODUCT_TIERS[productId] : undefined;
          if (tier) {
            activeTiers.set(
              tier,
              sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            );
          }
        }
      }
    }

    // Grant / refresh what is genuinely active.
    for (const [tier, periodEnd] of activeTiers) {
      await admin.from("user_entitlements").upsert(
        {
          user_id: user.id,
          tier_key: tier,
          status: "active",
          source: "stripe",
          current_period_end: periodEnd,
        },
        { onConflict: "user_id,tier_key" },
      );
    }

    // Revoke Stripe-sourced entitlements that no longer have an active subscription.
    const { data: existing } = await admin
      .from("user_entitlements")
      .select("id, tier_key, status, source")
      .eq("user_id", user.id)
      .eq("source", "stripe");

    for (const row of existing ?? []) {
      if (!activeTiers.has(row.tier_key) && row.status === "active") {
        await admin.from("user_entitlements").update({ status: "canceled" }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ tiers: [...activeTiers.keys()] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
