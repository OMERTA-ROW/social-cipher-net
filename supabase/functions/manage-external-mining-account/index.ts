import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Columns safe to return to clients — never api_key / api_secret
const SAFE_COLUMNS =
  "id, user_id, account_name, account_type, platform, wallet_address, mining_type, is_active, optimization_level, metadata, created_at, updated_at";

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

    const { action, accountData, accountId } = await req.json();

    // Verify user has Draco or Zozo subscription
    const { data: unlocks } = await supabaseClient
      .from("subscription_unlocks")
      .select("subscription_type")
      .eq("user_id", user.id)
      .eq("feature_unlocked", "mining");

    if (!unlocks || unlocks.length === 0) {
      throw new Error("You need a yearly Draco or Zozo subscription to manage external mining accounts");
    }

    if (action === "create") {
      // Validate that user has the subscription for this mining type
      const hasSubscription = unlocks.some(u => u.subscription_type === accountData.mining_type);
      if (!hasSubscription) {
        throw new Error(`You need a ${accountData.mining_type.toUpperCase()} subscription for this mining type`);
      }

      const { data, error } = await supabaseClient
        .from("external_mining_accounts")
        .insert({
          user_id: user.id,
          account_name: accountData.account_name,
          account_type: accountData.account_type,
          platform: accountData.platform,
          api_key: accountData.api_key,
          api_secret: accountData.api_secret,
          wallet_address: accountData.wallet_address,
          mining_type: accountData.mining_type,
          optimization_level: accountData.optimization_level || "standard",
          metadata: accountData.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`External mining account created for user ${user.id}: ${data.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          account: data,
          message: `Successfully created ${accountData.account_name} mining account!`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "update") {
      const { data, error } = await supabaseClient
        .from("external_mining_accounts")
        .update({
          account_name: accountData.account_name,
          platform: accountData.platform,
          api_key: accountData.api_key,
          api_secret: accountData.api_secret,
          wallet_address: accountData.wallet_address,
          is_active: accountData.is_active,
          optimization_level: accountData.optimization_level,
          metadata: accountData.metadata,
        })
        .eq("id", accountId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          account: data,
          message: "Mining account updated successfully!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "delete") {
      const { error } = await supabaseClient
        .from("external_mining_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Mining account deleted successfully!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "search") {
      const { data, error } = await supabaseClient
        .from("external_mining_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("mining_type", accountData.mining_type);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          accounts: data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error managing external mining account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});