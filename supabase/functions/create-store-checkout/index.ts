import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestItem {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: userData } = await anon.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const items: RequestItem[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0 || items.length > 50) return json({ error: "Invalid cart" }, 400);
    for (const item of items) {
      if (typeof item.product_id !== "string" || !Number.isInteger(item.quantity) ||
          item.quantity < 1 || item.quantity > 99) {
        return json({ error: "Invalid cart item" }, 400);
      }
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Prices and stock are always resolved server-side, never trusted from the client.
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: productError } = await service
      .from("products")
      .select("id, seller_id, title, price, shipping_cost, stock_quantity, status, image_url")
      .in("id", productIds);
    if (productError) throw productError;

    const variantIds = items.map((i) => i.variant_id).filter(Boolean) as string[];
    const { data: variants } = variantIds.length
      ? await service
          .from("product_variants")
          .select("id, product_id, name, price, stock_quantity")
          .in("id", variantIds)
      : { data: [] as any[] };

    const lineItems: any[] = [];
    const orderItems: any[] = [];
    let total = 0;

    for (const item of items) {
      const product = (products ?? []).find((p) => p.id === item.product_id);
      if (!product || product.status !== "active") {
        return json({ error: "One of these products is no longer available" }, 400);
      }
      const variant = item.variant_id
        ? (variants ?? []).find((v: any) => v.id === item.variant_id)
        : null;
      if (item.variant_id && !variant) return json({ error: "Option unavailable" }, 400);

      const stock = variant ? variant.stock_quantity : product.stock_quantity;
      if (stock !== null && stock !== undefined && stock < item.quantity) {
        return json({ error: `${product.title} does not have enough stock` }, 400);
      }

      const unitPrice = Number(variant ? variant.price : product.price);
      total += unitPrice * item.quantity;

      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(unitPrice * 100),
          product_data: {
            name: variant ? `${product.title} — ${variant.name}` : product.title,
            images: product.image_url ? [product.image_url] : undefined,
          },
        },
      });
      orderItems.push({
        product_id: product.id,
        variant_id: variant?.id ?? null,
        seller_id: product.seller_id,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({ buyer_id: user.id, status: "pending", total_amount: total, currency: "usd" })
      .select("id")
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await service
      .from("order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
    if (itemsError) throw itemsError;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ error: "Payments are not configured yet" }, 503);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: lineItems,
      mode: "payment",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IE", "SE", "ES", "IT"] },
      metadata: { order_id: order.id, buyer_id: user.id },
      success_url: `${origin}/shop?order=success&order_id=${order.id}`,
      cancel_url: `${origin}/shop?order=cancelled`,
    });

    await service.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return json({ url: session.url, orderId: order.id });
  } catch (error) {
    console.error("create-store-checkout error", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
