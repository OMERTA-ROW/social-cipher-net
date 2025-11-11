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
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id;
    }

    const { linkId } = await req.json();

    // Get the affiliate link
    const { data: link, error: linkError } = await supabaseClient
      .from("external_affiliate_links")
      .select("*")
      .eq("id", linkId)
      .single();

    if (linkError || !link) {
      throw new Error("Affiliate link not found");
    }

    // Record the click
    await supabaseClient.from("external_affiliate_clicks").insert({
      link_id: linkId,
      clicker_id: userId,
    });

    // Increment click count
    await supabaseClient
      .from("external_affiliate_links")
      .update({ click_count: link.click_count + 1 })
      .eq("id", linkId);

    return new Response(
      JSON.stringify({ success: true, redirect_url: link.affiliate_url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
