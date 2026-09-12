import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

/**
 * Confirms with Stripe that a store order was actually paid, then fulfils it
 * exactly once: order marked paid, stock decremented, buyer cart emptied.
 * Payment state is never trusted from the client.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: userData } = await anon.auth.getUser(token);
    const user = userData.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";
    if (!orderId) return json({ error: "Missing order" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error: orderError } = await service
      .from("orders")
      .select("id, buyer_id, status, stripe_session_id")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.buyer_id !== user.id) return json({ error: "Order not found" }, 404);
    if (order.status === "paid") return json({ status: "paid", alreadyFulfilled: true });
    if (!order.stripe_session_id) return json({ status: order.status });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Payments are not configured yet" }, 503);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (session.payment_status !== "paid") {
      return json({ status: order.status, paymentStatus: session.payment_status });
    }

    const { data: fulfilled, error: fulfilError } = await service.rpc("fulfill_paid_order", {
      _order_id: order.id,
    });
    if (fulfilError) throw fulfilError;

    return json({ status: "paid", fulfilled: fulfilled === true });
  } catch (error) {
    console.error("verify-store-order error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
