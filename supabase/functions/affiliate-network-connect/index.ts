import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encryptSecret } from "../_shared/connectorVault.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Connects an external affiliate network (Amazon Associates, ShareASale,
 * Impact, ...). The API key is encrypted server-side and never readable from
 * the browser.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required" }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) return json({ error: "Sign in required" }, 401);

    const { network, accountLabel, apiKey } = await req.json();
    if (typeof network !== "string" || network.trim().length < 2) {
      return json({ error: "Choose a network" }, 400);
    }
    if (typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return json({ error: "Enter the network API key" }, 400);
    }

    const { data: row, error } = await admin
      .from("affiliate_networks")
      .upsert(
        {
          user_id: user.id,
          network: network.trim().slice(0, 64),
          account_label: typeof accountLabel === "string" ? accountLabel.slice(0, 120) : null,
          status: "connected",
        },
        { onConflict: "user_id,network" },
      )
      .select("id")
      .single();
    if (error) throw error;

    const encrypted = await encryptSecret(row.id, apiKey.trim());
    const { error: secretError } = await admin
      .from("affiliate_network_secrets")
      .upsert({ network_id: row.id, api_key_encrypted: encrypted });
    if (secretError) throw secretError;

    return json({ ok: true, id: row.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
