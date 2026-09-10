import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SecretBag {
  [key: string]: string;
}

/** Per-service request builders. Adding a service = adding a branch here. */
const runAction = async (
  serviceId: string,
  action: string,
  payload: Record<string, unknown>,
  secrets: SecretBag,
): Promise<{ ok: boolean; detail: string; data?: unknown }> => {
  const token = secrets.access_token ?? secrets.api_key ?? secrets.api_token;

  if (!token && action !== "multicast") {
    return { ok: false, detail: "This connection has no usable token yet." };
  }

  const message = String(payload.message ?? "").slice(0, 5000);

  switch (`${serviceId}:${action}`) {
    case "x:post": {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Posted to X" : JSON.stringify(data), data };
    }
    case "x:feed": {
      const res = await fetch(
        "https://api.twitter.com/2/users/me/tweets?max_results=10",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Loaded timeline" : "Could not load", data };
    }
    case "facebook:post": {
      const pageId = secrets.page_id ?? String(payload.page_id ?? "me");
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, access_token: token }),
        },
      );
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Posted to Facebook" : JSON.stringify(data), data };
    }
    case "facebook:feed": {
      const pageId = secrets.page_id ?? "me";
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed?limit=10&access_token=${token}`,
      );
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Loaded feed" : "Could not load", data };
    }
    case "instagram:feed": {
      const res = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink&access_token=${token}`,
      );
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Loaded media" : "Could not load", data };
    }
    case "youtube:feed": {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Loaded channel" : "Could not load", data };
    }
    case "twitch:comment": {
      const res = await fetch("https://api.twitch.tv/helix/chat/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": Deno.env.get("TWITCH_CLIENT_ID") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broadcaster_id: payload.broadcaster_id,
          sender_id: payload.sender_id,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, detail: res.ok ? "Sent to Twitch chat" : JSON.stringify(data), data };
    }
    default:
      return {
        ok: false,
        detail: `${serviceId} does not support ${action} yet.`,
      };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Sign in required" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const {
      data: { user },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    // Multicast: fan a broadcast out to every requested destination at once.
    const serviceIds: string[] =
      action === "multicast"
        ? (Array.isArray(body.service_ids) ? body.service_ids : []).map(String)
        : [String(body.service_id ?? "")];

    if (serviceIds.length === 0 || serviceIds.some((s) => !s)) {
      return json({ error: "No destination selected" }, 400);
    }

    const { data: connections } = await admin
      .from("user_connections")
      .select("id, service_id, status")
      .eq("user_id", user.id)
      .in("service_id", serviceIds);

    const results: Array<{ service_id: string; ok: boolean; detail: string }> = [];

    for (const serviceId of serviceIds) {
      const connection = connections?.find((c) => c.service_id === serviceId);
      if (!connection || connection.status !== "connected") {
        results.push({ service_id: serviceId, ok: false, detail: "Not connected" });
        continue;
      }

      const { data: secretRows } = await admin
        .from("connection_secrets")
        .select("secret_type, secret_value")
        .eq("connection_id", connection.id);

      const secrets: SecretBag = {};
      for (const row of secretRows ?? []) {
        secrets[row.secret_type as string] = row.secret_value as string;
      }

      if (action === "multicast") {
        const hasIngest = Boolean(secrets.rtmp_url && secrets.stream_key);
        results.push({
          service_id: serviceId,
          ok: hasIngest,
          detail: hasIngest
            ? "Ingest ready — broadcasting"
            : "Add this destination's ingest URL and stream key",
        });
        continue;
      }

      const result = await runAction(serviceId, action, payload, secrets);
      results.push({ service_id: serviceId, ok: result.ok, detail: result.detail });

      if (!result.ok) {
        await admin
          .from("user_connections")
          .update({ last_error: result.detail.slice(0, 500) })
          .eq("id", connection.id);
      } else {
        await admin
          .from("user_connections")
          .update({ last_error: null })
          .eq("id", connection.id);
      }
    }

    return json({ ok: results.some((r) => r.ok), results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
