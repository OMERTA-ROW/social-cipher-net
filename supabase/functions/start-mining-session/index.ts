import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Unauthorized");

    const { miningType, tokenAmount, duration } = await req.json();

    if (!miningType || !tokenAmount || !duration) {
      throw new Error("Missing required fields");
    }

    if (tokenAmount < 1 || tokenAmount > 100000) {
      throw new Error("Token amount must be between 1 and 100,000");
    }

    if (duration < 2 || duration > 4) {
      throw new Error("Duration must be between 2 and 4 days");
    }

    // Check wallet balance
    const { data: wallet } = await supabaseClient
      .from("user_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!wallet || wallet.balance < tokenAmount) {
      throw new Error("Insufficient token balance");
    }

    // Deduct tokens
    const { error: walletError } = await supabaseClient
      .from("user_wallets")
      .update({ balance: wallet.balance - tokenAmount })
      .eq("user_id", user.id);

    if (walletError) throw walletError;

    // Calculate performance multiplier
    const multiplier = 1.0 + ((tokenAmount - 1) / 99999.0) * 99.0;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Create mining session
    const { data: session, error: sessionError } = await supabaseClient
      .from("mining_sessions")
      .insert({
        user_id: user.id,
        mining_type: miningType,
        tokens_paid: tokenAmount,
        performance_multiplier: multiplier,
        days_duration: duration,
        end_date: endDate.toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Log transaction
    await supabaseClient.from("wallet_transactions").insert({
      user_id: user.id,
      amount: -tokenAmount,
      transaction_type: "mining_payment",
      description: `Started ${miningType} mining session for ${duration} days`,
      metadata: { session_id: session.id, mining_type: miningType },
    });

    console.log(`Mining session started: ${session.id} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        session,
        message: `Mining session started! Performance multiplier: ${multiplier.toFixed(2)}x`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error starting mining session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});