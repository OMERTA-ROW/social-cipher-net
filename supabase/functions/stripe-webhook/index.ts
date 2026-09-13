/**
 * Stripe webhook -> entitlement sync.
 *
 * Every request is verified against the Stripe signing secret before anything
 * is written, and each Stripe event id is recorded once, so a replayed or
 * forged call can neither spoof nor duplicate an entitlement.
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const PRODUCT_TIERS: Record<string, string> = {
  prod_TOtJnFseC54ChY: "plus",
  prod_TOtRdMUKNeKkFc: "pro",
  prod_VFB4e6LecHM4mM: "terminal",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2025-08-27.basil",
});

/** Resolve the Cyber Link account behind a Stripe customer. */
async function resolveUserId(
  customerId: string | null,
  metadataUserId: string | null,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const email = customer.email;
  if (!email) return null;
  const { data } = await admin.rpc("user_id_for_email", { _email: email });
  return (data as string | null) ?? null;
}

/** Mirror every active subscription for one customer into user_entitlements. */
async function syncCustomer(customerId: string, userId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 50,
  });

  const active = new Map<string, string | null>();
  for (const sub of subs.data) {
    for (const item of sub.items.data) {
      const productId = typeof item.price.product === "string"
        ? item.price.product
        : item.price.product?.id;
      const tier = productId ? PRODUCT_TIERS[productId] : undefined;
      if (!tier) continue;
      active.set(
        tier,
        sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
      );
    }
  }

  for (const [tier, periodEnd] of active) {
    await admin.from("user_entitlements").upsert(
      {
        user_id: userId,
        tier_key: tier,
        status: "active",
        source: "stripe",
        current_period_end: periodEnd,
      },
      { onConflict: "user_id,tier_key" },
    );
  }

  const { data: existing } = await admin
    .from("user_entitlements")
    .select("id, tier_key, status")
    .eq("user_id", userId)
    .eq("source", "stripe");

  for (const row of existing ?? []) {
    if (!active.has(row.tier_key) && row.status === "active") {
      await admin.from("user_entitlements").update({ status: "canceled" }).eq("id", row.id);
    }
  }

  return [...active.keys()];
}

async function recordPaidInvoice(event: Stripe.Event, invoice: Stripe.Invoice) {
  const gross = Math.max(0, Number(invoice.amount_paid ?? 0) / 100);
  if (gross <= 0) return;

  const firstLine = invoice.lines.data[0];
  const product = firstLine?.pricing?.price_details?.product;
  const productId = typeof product === "string" ? product : product?.id;
  const tier = productId ? PRODUCT_TIERS[productId] : undefined;
  const source = tier === "terminal" ? "terminal_fees" : "subscription_revenue";

  const { error } = await admin.from("platform_revenue").upsert(
    {
      source,
      amount: gross,
      currency: String(invoice.currency ?? "usd").toUpperCase(),
      reference_type: "stripe_invoice",
      gross_amount: gross,
      platform_fee: gross,
      net_amount: 0,
      external_reference: event.id,
    },
    { onConflict: "external_reference" },
  );
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error("Signature verification failed:", err instanceof Error ? err.message : err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: the unique event_id makes a duplicate delivery a no-op.
  const { error: dupeError } = await admin
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (dupeError) {
    if (dupeError.code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Could not record event:", dupeError.message);
    return new Response("Storage error", { status: 500 });
  }

  const relevant = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]);

  try {
    if (relevant.has(event.type)) {
      const object = event.data.object as Record<string, unknown>;
      const customerId = typeof object.customer === "string" ? object.customer : null;
      const metadata = (object.metadata ?? {}) as Record<string, string>;
      const userId = await resolveUserId(customerId, metadata.user_id ?? null);

      if (customerId && userId) {
        const tiers = await syncCustomer(customerId, userId);
        console.log(`Synced ${tiers.join(", ") || "no"} entitlements for ${userId}`);
      } else {
        console.warn(`No account matched for event ${event.id}`);
      }

      if (event.type === "invoice.paid") {
        await recordPaidInvoice(event, event.data.object as Stripe.Invoice);
      }
    }
  } catch (err) {
    console.error("Handler failed:", err instanceof Error ? err.message : err);
    // Failed deliveries must remain retryable. Only successfully processed
    // events stay in the idempotency ledger.
    const { error: cleanupError } = await admin
      .from("stripe_webhook_events")
      .delete()
      .eq("event_id", event.id);
    if (cleanupError) console.error("Could not release failed event:", cleanupError.message);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
