import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Server-side source of truth: how many bonus tokens each product grants.
// Client-supplied token amounts are ignored entirely.
const TOKEN_BONUS_BY_PRODUCT: Record<string, number> = {
  prod_zozo_premium: 1000,
  prod_draco_premium: 1000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";

    // Only allow-listed products can grant tokens, with a fixed server-side amount
    const tokenAmount = TOKEN_BONUS_BY_PRODUCT[productId];
    if (!tokenAmount) {
      return json({ success: false, message: "This product does not grant bonus tokens" }, 400);
    }

    // --- Verify a real, active paid subscription exists for this user ---
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return json({ error: "Subscription verification unavailable" }, 503);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email ?? "", limit: 1 });
    if (customers.data.length === 0) {
      return json({ success: false, message: "No active subscription found" }, 403);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 20,
    });

    if (subscriptions.data.length === 0) {
      return json({ success: false, message: "No active subscription found" }, 403);
    }

    // Stable identifier for the specific subscription that earns this bonus
    const subscriptionId = subscriptions.data[0].id;

    // --- One bonus per user, per subscription (not per client-chosen product id) ---
    const { data: existingBonus } = await supabaseClient
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("transaction_type", "subscription_bonus")
      .eq("metadata->>subscription_id", subscriptionId)
      .maybeSingle();

    if (existingBonus) {
      return json({ success: false, message: "Bonus already claimed for this subscription" });
    }

    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) throw walletError;

    const newBalance = Number(wallet?.balance || 0) + tokenAmount;

    const { error: upsertError } = await supabaseClient
      .from("user_wallets")
      .upsert(
        { user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (upsertError) throw upsertError;

    const { error: transactionError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: tokenAmount,
        transaction_type: "subscription_bonus",
        description: `Subscription bonus: ${tokenAmount} tokens`,
        status: "completed",
        metadata: {
          product_id: productId,
          subscription_id: subscriptionId,
          bonus_type: "verified_subscription",
        },
      });

    if (transactionError) throw transactionError;

    return json({ success: true, tokensGranted: tokenAmount, newBalance });
  } catch (error) {
    console.error("Error granting subscription tokens:", error);
    return json({ error: "Failed to grant subscription tokens" }, 400);
  }
});
