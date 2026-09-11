/**
 * Broadcast ingest endpoint.
 *
 * Gives each signed-in user a private RTMP/SRT stream key they can paste into
 * OBS, Streamlabs or Restream, and lets a media server report live/offline
 * state back with a shared webhook secret. Keys are only ever minted here —
 * the browser can read its own key but never writes one.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/connectorEngine.ts";

const RTMP_URL = Deno.env.get("STREAM_INGEST_RTMP_URL") ?? "";
const SRT_URL = Deno.env.get("STREAM_INGEST_SRT_URL") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STREAM_INGEST_WEBHOOK_SECRET") ?? "";

const mintKey = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `clk_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
};

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

const ingestInfo = (row: { stream_key: string; status: string; last_source: string | null; last_seen_at: string | null }) => ({
  stream_key: row.stream_key,
  status: row.status,
  last_source: row.last_source,
  last_seen_at: row.last_seen_at,
  rtmp_url: RTMP_URL || null,
  srt_url: SRT_URL ? `${SRT_URL}?streamid=${encodeURIComponent(row.stream_key)}` : null,
  configured: Boolean(RTMP_URL || SRT_URL),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = admin();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "get");

    // Media-server callback: no user session, shared secret instead.
    if (action === "webhook") {
      if (!WEBHOOK_SECRET || body.secret !== WEBHOOK_SECRET) {
        return json({ error: "Invalid webhook secret" }, 401);
      }
      const key = String(body.stream_key ?? "");
      const live = body.event === "publish" || body.live === true;
      const { data, error } = await supabase
        .from("stream_ingest")
        .update({
          status: live ? "live" : "offline",
          last_source: body.source ? String(body.source).slice(0, 60) : null,
          last_seen_at: new Date().toISOString(),
        })
        .eq("stream_key", key)
        .select("id")
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Unknown stream key" }, 404);
      return json({ ok: true });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required" }, 401);
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Sign in required" }, 401);

    if (action === "rotate") {
      const { data, error } = await supabase
        .from("stream_ingest")
        .upsert(
          { user_id: user.id, stream_key: mintKey(), status: "offline", last_seen_at: null },
          { onConflict: "user_id" },
        )
        .select("stream_key, status, last_source, last_seen_at")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ingest: ingestInfo(data) });
    }

    // Default: read, creating the key on first visit.
    const { data: existing } = await supabase
      .from("stream_ingest")
      .select("stream_key, status, last_source, last_seen_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return json({ ingest: ingestInfo(existing) });

    const { data, error } = await supabase
      .from("stream_ingest")
      .insert({ user_id: user.id, stream_key: mintKey() })
      .select("stream_key, status, last_source, last_seen_at")
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ingest: ingestInfo(data) });
  } catch (e) {
    console.error("stream-ingest failed:", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
