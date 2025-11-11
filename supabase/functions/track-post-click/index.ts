import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    // Get the post
    const { data: post, error: postError } = await supabaseClient
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(id)")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("Post not found");
    }

    // Check if user has already paid for clicks
    if (post.monetization_type === "pay_per_click" && userId !== post.user_id) {
      const { data: existingPayment } = await supabaseClient
        .from("post_payments")
        .select("id")
        .eq("post_id", postId)
        .eq("payer_id", userId)
        .eq("payment_type", "pay_per_click")
        .single();

      if (!existingPayment) {
        throw new Error("Payment required");
      }

      // Record the click and add earnings
      await supabaseClient.from("post_clicks").insert({
        post_id: postId,
        clicker_id: userId,
      });

      // Increment click count
      await supabaseClient
        .from("posts")
        .update({ click_count: post.click_count + 1 })
        .eq("id", postId);

      // Check if creator has CyberBasis (25% bonus) or CyberPro (75% bonus) tier
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });
      
      const { data: creatorUser } = await supabaseClient.auth.admin.getUserById(post.user_id);
      let earningAmount = post.price;
      
      if (creatorUser?.user?.email) {
        const customers = await stripe.customers.list({ email: creatorUser.user.email, limit: 1 });
        if (customers.data.length > 0) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 1,
          });
          
          if (subscriptions.data.length > 0) {
            const productId = subscriptions.data[0].items.data[0].price.product;
            // Check tier and apply bonus
            if (productId === "prod_RlNFTN4LJIdK5c") {
              earningAmount = post.price * 1.25; // CyberBasis: 25% bonus
            } else if (productId === "prod_RlNG0uIMPYZazH") {
              earningAmount = post.price * 1.75; // CyberPro: 75% bonus
            }
          }
        }
      }
      
      // Add earnings for the creator
      await supabaseClient.from("creator_earnings").insert({
        creator_id: post.user_id,
        post_id: postId,
        amount: earningAmount,
        earning_type: "pay_per_click",
      });
    }

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