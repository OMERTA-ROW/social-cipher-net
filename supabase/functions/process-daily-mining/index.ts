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

    // Get all active mining sessions
    const { data: sessions } = await supabaseClient
      .from("mining_sessions")
      .select("*")
      .eq("status", "active")
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString());

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active sessions to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const session of sessions) {
      // Check if already processed today
      const today = new Date().toISOString().split("T")[0];
      const { data: existingEarning } = await supabaseClient
        .from("mining_earnings")
        .select("*")
        .eq("session_id", session.id)
        .eq("mining_date", today)
        .single();

      if (existingEarning) {
        continue; // Already processed today
      }

      // Calculate daily mining amount
      // Base rate: 10 tokens per day, multiplied by performance
      const baseDailyRate = 10;
      const dailyEarning = baseDailyRate * session.performance_multiplier;

      // Add mining earning
      await supabaseClient.from("mining_earnings").insert({
        session_id: session.id,
        user_id: session.user_id,
        mining_type: session.mining_type,
        amount_mined: dailyEarning,
        mining_date: today,
      });

      // Update session total
      const newTotal = session.total_mined + dailyEarning;
      await supabaseClient
        .from("mining_sessions")
        .update({ total_mined: newTotal })
        .eq("id", session.id);

      // Credit user wallet
      const { data: wallet } = await supabaseClient
        .from("user_wallets")
        .select("balance")
        .eq("user_id", session.user_id)
        .single();

      if (wallet) {
        await supabaseClient
          .from("user_wallets")
          .update({ balance: wallet.balance + dailyEarning })
          .eq("user_id", session.user_id);

        // Log transaction
        await supabaseClient.from("wallet_transactions").insert({
          user_id: session.user_id,
          amount: dailyEarning,
          transaction_type: "mining_reward",
          description: `${session.mining_type} mining reward`,
          metadata: { session_id: session.id },
        });
      }

      // Check if session expired
      if (new Date(session.end_date) <= new Date()) {
        await supabaseClient
          .from("mining_sessions")
          .update({ status: "completed" })
          .eq("id", session.id);
      }

      results.push({
        session_id: session.id,
        user_id: session.user_id,
        amount_mined: dailyEarning,
      });
    }

    console.log(`Processed ${results.length} mining sessions`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing mining:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});