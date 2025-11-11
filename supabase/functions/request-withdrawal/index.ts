import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REQUEST-WITHDRAWAL] ${step}${detailsStr}`);
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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { amount } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid withdrawal amount");
    logStep("Withdrawal amount requested", { amount });

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.balance) < amount) {
      throw new Error(`Insufficient balance. Available: $${wallet.balance}`);
    }

    logStep("Balance verified", { available: wallet.balance, requested: amount });

    // Deduct from wallet
    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .update({ balance: Number(wallet.balance) - amount })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    logStep("Wallet balance updated");

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        amount,
        status: "pending",
        payment_method: "stripe",
      })
      .select()
      .single();

    if (withdrawalError) throw withdrawalError;
    logStep("Withdrawal request created", { withdrawalId: withdrawal.id });

    // Record transaction
    const { error: txError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: -amount,
        transaction_type: "withdrawal",
        status: "pending",
        description: "Withdrawal request submitted",
        metadata: { withdrawal_id: withdrawal.id },
      });

    if (txError) throw txError;
    logStep("Transaction recorded");

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawal.id,
        amount,
        message: "Withdrawal request submitted successfully. Processing typically takes 3-5 business days.",
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
