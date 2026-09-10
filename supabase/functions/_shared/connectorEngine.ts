/**
 * Connector engine.
 *
 * Adapters only translate provider payloads. Everything shared lives here:
 * rate limiting, retry with backoff, circuit breaking, connection health and
 * the audit trail.
 */

import { getDefinition, type RatePolicy } from "./connectorManifest.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FALLBACK_RATE: RatePolicy = { requests: 30, windowSeconds: 60, burst: 10 };

/* ------------------------------- audit log ------------------------------ */

export const audit = async (
  admin: Admin,
  entry: {
    userId: string;
    connectionId?: string | null;
    serviceId: string;
    action: string;
    status: "ok" | "error" | "rate_limited" | "skipped";
    httpStatus?: number | null;
    detail?: string | null;
  },
) => {
  await admin.from("connector_audit_log").insert({
    user_id: entry.userId,
    connection_id: entry.connectionId ?? null,
    service_id: entry.serviceId,
    action: entry.action,
    status: entry.status,
    http_status: entry.httpStatus ?? null,
    detail: entry.detail ? String(entry.detail).slice(0, 2000) : null,
  });
};

/* ------------------------------ rate limiting --------------------------- */

/**
 * Persisted token bucket, one per connection. Survives cold starts because the
 * state lives in the database rather than in function memory.
 */
export const takeToken = async (
  admin: Admin,
  connectionId: string,
  serviceId: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> => {
  const policy = getDefinition(serviceId)?.ratePolicy ?? FALLBACK_RATE;
  const capacity = policy.requests + policy.burst;
  const perSecond = policy.requests / policy.windowSeconds;
  const now = Date.now();

  const { data: existing } = await admin
    .from("connector_rate_state")
    .select("tokens, refilled_at, blocked_until")
    .eq("connection_id", connectionId)
    .eq("bucket", "default")
    .maybeSingle();

  if (existing?.blocked_until && new Date(existing.blocked_until).getTime() > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (new Date(existing.blocked_until).getTime() - now) / 1000,
      ),
    };
  }

  const lastRefill = existing?.refilled_at
    ? new Date(existing.refilled_at).getTime()
    : now;
  const available = Math.min(
    capacity,
    (existing ? Number(existing.tokens) : capacity) +
      ((now - lastRefill) / 1000) * perSecond,
  );

  if (available < 1) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((1 - available) / perSecond)),
    };
  }

  await admin.from("connector_rate_state").upsert(
    {
      connection_id: connectionId,
      bucket: "default",
      tokens: available - 1,
      refilled_at: new Date(now).toISOString(),
      blocked_until: null,
    },
    { onConflict: "connection_id,bucket" },
  );

  return { allowed: true, retryAfterSeconds: 0 };
};

/** Park a connection after the provider tells us to back off. */
export const backOff = async (
  admin: Admin,
  connectionId: string,
  seconds: number,
) => {
  await admin.from("connector_rate_state").upsert(
    {
      connection_id: connectionId,
      bucket: "default",
      tokens: 0,
      refilled_at: new Date().toISOString(),
      blocked_until: new Date(Date.now() + seconds * 1000).toISOString(),
    },
    { onConflict: "connection_id,bucket" },
  );
};

/* ------------------------------ health ---------------------------------- */

export const markHealthy = async (admin: Admin, connectionId: string) => {
  await admin
    .from("user_connections")
    .update({
      health: "healthy",
      failure_count: 0,
      last_error: null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
};

/**
 * Record a failure. After repeated hard failures the connection is circuit
 * broken and the user is shown a "reconnect needed" state instead of silent
 * retries.
 */
export const markFailure = async (
  admin: Admin,
  connectionId: string,
  message: string,
  httpStatus?: number,
) => {
  const { data } = await admin
    .from("user_connections")
    .select("failure_count")
    .eq("id", connectionId)
    .maybeSingle();

  const count = Number(data?.failure_count ?? 0) + 1;
  const authProblem = httpStatus === 401 || httpStatus === 403;
  const health = authProblem || count >= 5 ? "needs_reconnect" : "degraded";

  await admin
    .from("user_connections")
    .update({
      failure_count: count,
      health,
      status: health === "needs_reconnect" ? "error" : "connected",
      last_error: message.slice(0, 500),
    })
    .eq("id", connectionId);
};

/* ------------------------- provider request wrapper --------------------- */

export interface ProviderResult {
  ok: boolean;
  status: number;
  detail: string;
  data?: unknown;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One provider call with rate budget, retry, jitter and honest error surfacing.
 * Never swallows the provider's own message.
 */
export const providerFetch = async (
  admin: Admin,
  opts: {
    connectionId: string;
    serviceId: string;
    url: string;
    init?: RequestInit;
    attempts?: number;
  },
): Promise<ProviderResult> => {
  const budget = await takeToken(admin, opts.connectionId, opts.serviceId);
  if (!budget.allowed) {
    return {
      ok: false,
      status: 429,
      detail: `Rate limit reached for this connection. Try again in ${budget.retryAfterSeconds}s.`,
    };
  }

  const maxAttempts = opts.attempts ?? 3;
  let last: ProviderResult = { ok: false, status: 0, detail: "No attempt made" };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(opts.url, opts.init);
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        /* provider returned non-JSON; keep the raw text */
      }

      if (res.ok) {
        await markHealthy(admin, opts.connectionId);
        return { ok: true, status: res.status, detail: "ok", data: parsed };
      }

      last = {
        ok: false,
        status: res.status,
        detail: text.slice(0, 1000) || `Request failed with ${res.status}`,
        data: parsed,
      };

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 30);
        await backOff(admin, opts.connectionId, Math.min(retryAfter, 900));
        break;
      }
      // Client errors will not fix themselves on retry.
      if (res.status < 500) break;
    } catch (e) {
      last = {
        ok: false,
        status: 0,
        detail: e instanceof Error ? e.message : "Network error",
      };
    }

    if (attempt < maxAttempts) {
      await sleep(Math.min(2000, 250 * 2 ** attempt) + Math.random() * 200);
    }
  }

  await markFailure(admin, opts.connectionId, last.detail, last.status);
  return last;
};
