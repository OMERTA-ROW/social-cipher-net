/**
 * Cross-platform earnings.
 *
 * Reads live money data from every connected service that actually exposes a
 * revenue endpoint, normalises it into one shape and returns it alongside the
 * user's on-platform CyberLink earnings. Nothing is estimated: a service with
 * no money API is reported as unavailable with the reason.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getSecrets } from "../_shared/connectorVault.ts";
import { audit, corsHeaders, json } from "../_shared/connectorEngine.ts";
import { getDefinition } from "../_shared/connectorManifest.ts";
import { getAdapter } from "../_shared/connectorAdapters.ts";

type Status = "ok" | "unsupported" | "error" | "needs_reconnect";

interface EarningsEntry {
  service_id: string;
  name: string;
  glyph: string;
  status: Status;
  amount: number | null;
  currency: string;
  detail: string | null;
  fetched_at: string;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Turns each provider's own payload into { amount, currency }. */
const normalise = (
  serviceId: string,
  data: unknown,
): { amount: number; currency: string } | null => {
  // deno-lint-ignore no-explicit-any
  const d = data as any;
  switch (serviceId) {
    case "youtube": {
      const row = d?.rows?.[0];
      if (!Array.isArray(row)) return { amount: 0, currency: "USD" };
      return { amount: num(row[0]), currency: "USD" };
    }
    case "shopify": {
      const orders = Array.isArray(d?.orders) ? d.orders : [];
      const amount = orders.reduce((s: number, o: any) => s + num(o?.total_price), 0);
      return { amount, currency: orders[0]?.currency ?? "USD" };
    }
    case "etsy": {
      const rows = Array.isArray(d?.results) ? d.results : [];
      const amount = rows.reduce((s: number, r: any) => {
        const g = r?.grandtotal;
        return s + (g?.divisor ? num(g.amount) / num(g.divisor) : num(g?.amount));
      }, 0);
      return { amount, currency: rows[0]?.grandtotal?.currency_code ?? "USD" };
    }
    case "streamlabs": {
      const rows = Array.isArray(d?.data) ? d.data : [];
      const amount = rows.reduce((s: number, r: any) => s + num(r?.amount), 0);
      return { amount, currency: rows[0]?.currency ?? "USD" };
    }
    default:
      return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body.days ?? 30), 1), 365);
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const payload = {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    };

    const { data: connections } = await admin
      .from("user_connections")
      .select("id, service_id, status, health, account_name")
      .eq("user_id", user.id)
      .eq("status", "connected");

    const entries: EarningsEntry[] = [];

    for (const connection of connections ?? []) {
      const definition = getDefinition(connection.service_id);
      const name = definition?.name ?? connection.service_id;
      const glyph = definition?.glyph ?? "🔗";
      const base = { service_id: connection.service_id, name, glyph, currency: "USD" };
      const fetched_at = new Date().toISOString();

      const handler = getAdapter(connection.service_id)?.read_revenue;
      const supports = definition?.capabilities.includes("read_revenue") && handler;

      if (!supports) {
        entries.push({
          ...base,
          status: "unsupported",
          amount: null,
          detail: `${name} has no public earnings API, so no figure can be shown.`,
          fetched_at,
        });
        continue;
      }

      if (connection.health === "needs_reconnect") {
        entries.push({
          ...base,
          status: "needs_reconnect",
          amount: null,
          detail: `Reconnect ${name} to read its earnings.`,
          fetched_at,
        });
        continue;
      }

      const secrets = await getSecrets(admin, connection.id);
      const result = await handler({
        admin,
        connectionId: connection.id,
        serviceId: connection.service_id,
        secrets,
        payload,
      });

      if (!result.ok) {
        entries.push({
          ...base,
          status: "error",
          amount: null,
          detail: result.detail ?? "The provider did not return earnings.",
          fetched_at,
        });
      } else {
        const value = normalise(connection.service_id, result.data);
        entries.push({
          ...base,
          status: value ? "ok" : "unsupported",
          amount: value?.amount ?? null,
          currency: value?.currency ?? "USD",
          detail: value ? null : `${name} returned no earnings figure.`,
          fetched_at,
        });
      }

      await audit(admin, {
        userId: user.id,
        connectionId: connection.id,
        serviceId: connection.service_id,
        action: "revenue",
        status: result.ok ? "ok" : result.status === 429 ? "rate_limited" : "error",
        httpStatus: result.status,
        detail: result.ok ? null : result.detail,
      });
    }

    // On-platform CyberLink earnings for the same window.
    const { data: creatorRows } = await admin
      .from("creator_earnings")
      .select("amount, earning_type, created_at")
      .eq("creator_id", user.id)
      .gte("created_at", start.toISOString());

    const cyberlink = (creatorRows ?? []).reduce((s, r) => s + num(r.amount), 0);
    entries.unshift({
      service_id: "cyberlink",
      name: "Cyber Link Social",
      glyph: "🛰️",
      status: "ok",
      amount: cyberlink,
      currency: "USD",
      detail: null,
      fetched_at: new Date().toISOString(),
    });

    const total = entries
      .filter((e) => e.status === "ok" && typeof e.amount === "number")
      .reduce((s, e) => s + (e.amount ?? 0), 0);

    return json({
      ok: true,
      period: { days, start: payload.start_date, end: payload.end_date },
      total,
      currency: "USD",
      entries,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
