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

    const { postId } = await req.json();

    // Get the post to check monetization type
    const { data: post, error: postError } = await supabaseClient
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(id)")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    // Check if user has already paid for this view
    if (post.monetization_type === "pay_per_view" && userId !== post.user_id) {
      const { data: existingPayment } = await supabaseClient
        .from("post_payments")
        .select("id")
        .eq("post_id", postId)
        .eq("payer_id", userId)
        .eq("payment_type", "pay_per_view")
        .single();

      if (!existingPayment) {
        throw new Error("Payment required");
      }
    }

    // Track the view
    await supabaseClient.from("post_views").insert({
      post_id: postId,
      viewer_id: userId,
    });

    // Increment view count
    await supabaseClient
      .from("posts")
      .update({ view_count: post.view_count + 1 })
      .eq("id", postId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});