import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-QUALIFICATIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    const unauthed = () => new Response(
      JSON.stringify({ qualifies: false, tier: "CyberFree", followerCount: 0, totalViews: 0, needsFollowers: 1000, needsViews: 10000, message: "Sign in to check qualifications" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    if (!authHeader) return unauthed();

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) return unauthed();
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check follower count
    const { data: followerData, error: followerError } = await supabaseClient
      .rpc("get_follower_count", { user_uuid: user.id });
    
    if (followerError) {
      logStep("Error getting follower count", { error: followerError });
      throw followerError;
    }

    const followerCount = followerData || 0;
    logStep("Follower count retrieved", { count: followerCount });

    // Check total views
    const { data: viewData, error: viewError } = await supabaseClient
      .rpc("get_total_views", { user_uuid: user.id });
    
    if (viewError) {
      logStep("Error getting view count", { error: viewError });
      throw viewError;
    }

    const totalViews = viewData || 0;
    logStep("Total views retrieved", { count: totalViews });

    // Check if qualifies for CyberBasis (1000 followers + 10000 views)
    const qualifiesForBasis = followerCount >= 1000 && totalViews >= 10000;
    logStep("Qualification check", { 
      followerCount, 
      totalViews, 
      qualifiesForBasis,
      needsFollowers: Math.max(0, 1000 - followerCount),
      needsViews: Math.max(0, 10000 - totalViews)
    });

    // If qualifies, check if they already have a subscription
    if (qualifiesForBasis) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });

      let hasActiveSubscription = false;
      let checkoutUrl = null;
      
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        hasActiveSubscription = subscriptions.data.length > 0;
      }

      // If they qualify but don't have active subscription, create checkout automatically
      if (!hasActiveSubscription) {
        logStep("Creating automatic checkout for qualified user");
        
        let customerId;
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: { user_id: user.id }
          });
          customerId = customer.id;
          logStep("Created new Stripe customer", { customerId });
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: "price_1SRivYHTVeX8KHmEwCiUejhe", // CyberBasis price ID
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${req.headers.get("origin")}/?subscription_activated=true`,
          cancel_url: `${req.headers.get("origin")}/?subscription_cancelled=true`,
          metadata: {
            tier: "CyberBasis",
            auto_qualified: "true"
          }
        });

        checkoutUrl = session.url;
        logStep("Checkout session created", { sessionId: session.id, url: checkoutUrl });
      }

      logStep("Subscription check", { 
        hasStripeCustomer: customers.data.length > 0,
        hasActiveSubscription,
        checkoutCreated: !!checkoutUrl
      });

      return new Response(
        JSON.stringify({
          qualifies: true,
          tier: "CyberBasis",
          followerCount,
          totalViews,
          hasActiveSubscription,
          checkoutUrl,
          message: hasActiveSubscription 
            ? "You already have an active CyberBasis subscription" 
            : "Congratulations! You've unlocked CyberBasis tier ($50/year) - Complete payment to activate"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        qualifies: false,
        tier: "CyberFree",
        followerCount,
        totalViews,
        needsFollowers: Math.max(0, 1000 - followerCount),
        needsViews: Math.max(0, 10000 - totalViews),
        message: `You need ${Math.max(0, 1000 - followerCount)} more followers and ${Math.max(0, 10000 - totalViews)} more views to qualify for CyberBasis`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
