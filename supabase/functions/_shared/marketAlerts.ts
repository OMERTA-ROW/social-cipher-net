/**
 * Structured monitoring for live market-data providers.
 *
 * Every provider failure/recovery is logged as a single-line JSON record
 * (easy to grep/alert on in the function logs) and recorded in
 * `public.provider_health_events` so dashboards can chart real failure rates.
 * Nothing here fabricates market data — it only records what actually happened.
 */

export type ProviderStatus = "failure" | "fallback" | "recovered";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function reportProviderEvent(params: {
  provider: string;
  action: string;
  status: ProviderStatus;
  message?: string;
  symbol?: string;
  timeframe?: string;
  fallbackProvider?: string;
}): void {
  const record = { tag: "market-alert", at: new Date().toISOString(), ...params };
  const line = JSON.stringify(record);
  if (params.status === "failure") console.error(line);
  else console.warn(line);

  if (!SUPABASE_URL || !SERVICE_KEY) return;
  // Fire-and-forget: monitoring must never break a market request.
  fetch(`${SUPABASE_URL}/rest/v1/provider_health_events`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      provider: params.provider,
      action: params.action,
      status: params.status,
      message: params.message?.slice(0, 500) ?? null,
      symbol: params.symbol ?? null,
      timeframe: params.timeframe ?? null,
      fallback_provider: params.fallbackProvider ?? null,
    }),
  }).catch((e) => console.error(JSON.stringify({ tag: "market-alert-sink-failed", error: String(e) })));
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
