import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { postId } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find the session for this post and user
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const relevantSession = sessions.data.find(
      (s: any) => s.metadata?.postId === postId && s.metadata?.userId === user.id && s.payment_status === "paid"
    );

    if (!relevantSession) {
      throw new Error("No completed payment found");
    }

    // Get post details
    const { data: post } = await supabaseClient
      .from("posts")
      .select("user_id, price")
      .eq("id", postId)
      .single();

    if (!post) throw new Error("Post not found");

    // Record payment
    await supabaseClient.from("post_payments").insert({
      post_id: postId,
      payer_id: user.id,
      amount: post.price,
      stripe_payment_id: relevantSession.payment_intent as string,
      payment_type: relevantSession.metadata?.paymentType,
      status: "completed",
    });

    // If pay_per_view, add earnings immediately
    if (relevantSession.metadata?.paymentType === "pay_per_view") {
      // Check if creator has CyberBasis tier for 25% bonus
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
            // Check if it's CyberBasis tier (product ID from check-subscription)
            if (productId === "prod_RZD21c1yFmV61s") {
              earningAmount = post.price * 1.25; // 25% bonus
            }
          }
        }
      }
      
      await supabaseClient.from("creator_earnings").insert({
        creator_id: post.user_id,
        post_id: postId,
        amount: earningAmount,
        earning_type: "pay_per_view",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});