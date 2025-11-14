import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { productId, tokenAmount } = await req.json();

    if (!productId || !tokenAmount) {
      throw new Error("Missing required parameters");
    }

    // Check if user already received bonus for this product
    const { data: existingBonus } = await supabaseClient
      .from("wallet_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("transaction_type", "subscription_bonus")
      .eq("metadata->>product_id", productId)
      .single();

    if (existingBonus) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Bonus already claimed for this subscription" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError && walletError.code !== "PGRST116") {
      throw walletError;
    }

    const currentBalance = wallet?.balance || 0;
    const newBalance = currentBalance + tokenAmount;

    // Update or insert wallet
    const { error: upsertError } = await supabaseClient
      .from("user_wallets")
      .upsert({
        user_id: user.id,
        balance: newBalance,
        updated_at: new Date().toISOString()
      });

    if (upsertError) throw upsertError;

    // Record transaction
    const { error: transactionError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: tokenAmount,
        transaction_type: "subscription_bonus",
        description: `Pro Subscription Bonus: ${tokenAmount} tokens`,
        status: "completed",
        metadata: {
          product_id: productId,
          bonus_type: "pro_yearly_subscription"
        }
      });

    if (transactionError) throw transactionError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        tokensGranted: tokenAmount,
        newBalance: newBalance
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error granting subscription tokens:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
