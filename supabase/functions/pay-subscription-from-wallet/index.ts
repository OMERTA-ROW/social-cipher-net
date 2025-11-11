import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAY-SUBSCRIPTION-WALLET] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier }: { tier: "basic" | "premium" } = await req.json();
    if (tier !== "basic" && tier !== "premium") {
      throw new Error("Invalid tier specified");
    }

    // Get price for tier
    const prices = {
      basic: { amount: 50, priceId: "price_1SRivYHTVeX8KHmEwCiUejhe", productId: "prod_RlNFTN4LJIdK5c" },
      premium: { amount: 100, priceId: "price_1SRivmHTVeX8KHmEe7Usofwt", productId: "prod_RlNG0uIMPYZazH" }
    };

    const tierPrice = prices[tier];
    logStep("Tier selected", { tier, amount: tierPrice.amount });

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found. Please earn money first to use wallet payment.");
    }

    if (Number(wallet.balance) < tierPrice.amount) {
      throw new Error(`Insufficient balance. Available: $${wallet.balance}, Required: $${tierPrice.amount}`);
    }

    logStep("Balance verified", { available: wallet.balance, required: tierPrice.amount });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }
    logStep("Stripe customer ready", { customerId });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tierPrice.priceId }],
      metadata: {
        payment_method: "wallet",
        user_id: user.id
      }
    });

    logStep("Stripe subscription created", { subscriptionId: subscription.id });

    // Deduct from wallet
    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .update({ balance: Number(wallet.balance) - tierPrice.amount })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    logStep("Wallet balance deducted");

    // Record transaction
    const { error: txError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: -tierPrice.amount,
        transaction_type: "subscription_payment",
        description: `${tier === 'basic' ? 'CyberBasis' : 'CyberPro'} yearly subscription payment`,
        metadata: { 
          tier,
          subscription_id: subscription.id,
          product_id: tierPrice.productId
        },
      });

    if (txError) throw txError;
    logStep("Transaction recorded");

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        tier,
        amount: tierPrice.amount,
        message: "Subscription activated successfully using wallet balance!"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
