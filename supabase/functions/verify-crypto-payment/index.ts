import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-CRYPTO-PAYMENT] ${step}${detailsStr}`);
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

    const { transactionHash, chain, amount, currency } = await req.json();
    
    if (!transactionHash || !chain || !amount || !currency) {
      throw new Error("Missing required parameters");
    }

    logStep("Verifying transaction", { transactionHash, chain, amount, currency });

    // In production, verify the transaction on the blockchain using appropriate RPC endpoint
    // For now, we'll simulate verification
    
    // Get current crypto price
    const priceResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-crypto-prices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currencies: [currency] }),
    });

    const priceData = await priceResponse.json();
    const usdValue = (priceData.prices?.[currency.toUpperCase()]?.usd || 0) * parseFloat(amount);

    logStep("USD value calculated", { usdValue });

    // Record the transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from("crypto_transactions")
      .insert({
        user_id: user.id,
        transaction_hash: transactionHash,
        chain,
        crypto_currency: currency.toUpperCase(),
        crypto_amount: amount,
        usd_value: usdValue,
        transaction_type: "deposit",
        wallet_address: "", // Would get from transaction
        status: "confirmed",
        confirmations: 1,
      })
      .select()
      .single();

    if (txError) throw txError;
    logStep("Transaction recorded", { transactionId: transaction.id });

    // Update user wallet with crypto balance
    const { data: wallet } = await supabaseClient
      .from("user_wallets")
      .select("crypto_balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = (wallet?.crypto_balance as any) || {};
    const currencyKey = currency.toUpperCase();
    const newBalance = {
      ...currentBalance,
      [currencyKey]: {
        amount: (currentBalance[currencyKey]?.amount || 0) + parseFloat(amount),
        usdValue: ((currentBalance[currencyKey]?.amount || 0) + parseFloat(amount)) * (priceData.prices?.[currencyKey]?.usd || 0),
      },
    };

    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .update({ crypto_balance: newBalance })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    logStep("Wallet updated");

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        usd_value: usdValue,
        message: "Crypto payment verified successfully!",
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
