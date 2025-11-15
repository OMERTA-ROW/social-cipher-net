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

    const { subscriptionType } = await req.json();

    if (!subscriptionType || (subscriptionType !== "draco" && subscriptionType !== "zozo")) {
      throw new Error("Invalid subscription type");
    }

    // Check if already unlocked
    const { data: existing } = await supabaseClient
      .from("subscription_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("subscription_type", subscriptionType)
      .eq("feature_unlocked", "mining")
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyUnlocked: true,
          message: "Mining features already unlocked",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create unlock record
    const { error: unlockError } = await supabaseClient
      .from("subscription_unlocks")
      .insert({
        user_id: user.id,
        subscription_type: subscriptionType,
        feature_unlocked: "mining",
        message_sent: false,
      });

    if (unlockError) throw unlockError;

    const miningName = subscriptionType === "draco" ? "DRACO" : "ZoZo";

    console.log(`Mining features unlocked for ${user.id}: ${subscriptionType}`);

    // Insert notification for user
    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: 0,
        transaction_type: "notification",
        description: `🎉 ${miningName} Mining Features Unlocked!`,
        status: "completed",
        metadata: {
          type: "mining_unlock",
          subscription_type: subscriptionType,
          message: `Congratulations! You now have access to the exclusive Miners Hub. Visit the Miners tab in your navigation to connect your mining accounts and start boosting your mining performance with CyberLink tokens. Pay 1-100,000 tokens for 2-4 days of mining sessions. The more you invest, the better your mining performance! 💎`
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `🎉 Congratulations! You've unlocked ${miningName} Mining Features! 
        
The Miners Hub is now available in your navigation. You can now:
• Connect your internal mining operations
• Link external mining accounts
• Use CyberLink tokens to boost mining performance (1-100,000 tokens for 2-4 days)
• The more tokens you invest, the better your mining performance!

Start mining now and watch your earnings grow! 💎`,
        subscriptionType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error unlocking mining features:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});