import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * OAuth provider endpoints. A provider becomes live as soon as its client id
 * and secret are present in Cloud secrets — nothing else needs changing.
 */
const PROVIDERS: Record<
  string,
  { authorizeUrl: string; tokenUrl: string; scope: string }
> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope:
      "https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "pages_manage_posts,pages_read_engagement,publish_video",
  },
  instagram: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "instagram_basic,instagram_content_publish,pages_show_list",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scope: "user.info.basic,video.publish,video.list",
  },
  x: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
  },
  snapchat: {
    authorizeUrl: "https://accounts.snapchat.com/accounts/oauth2/auth",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scope: "snapchat-marketing-api",
  },
  twitch: {
    authorizeUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    scope: "channel:manage:broadcast chat:read chat:edit",
  },
  kick: {
    authorizeUrl: "https://id.kick.com/oauth/authorize",
    tokenUrl: "https://id.kick.com/oauth/token",
    scope: "user:read channel:read chat:write",
  },
  restream: {
    authorizeUrl: "https://api.restream.io/login",
    tokenUrl: "https://api.restream.io/oauth/token",
    scope: "profile.default.read stream.default.read",
  },
  streamlabs: {
    authorizeUrl: "https://streamlabs.com/api/v2.0/authorize",
    tokenUrl: "https://streamlabs.com/api/v2.0/token",
    scope: "donations.read alerts.create",
  },
  streamelements: {
    authorizeUrl: "https://api.streamelements.com/oauth2/authorize",
    tokenUrl: "https://api.streamelements.com/oauth2/token",
    scope: "channel:read tips:read",
  },
  adobe: {
    authorizeUrl: "https://ims-na1.adobelogin.com/ims/authorize/v2",
    tokenUrl: "https://ims-na1.adobelogin.com/ims/token/v3",
    scope: "openid,creative_sdk,AdobeID",
  },
  canva: {
    authorizeUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    scope: "design:meta:read asset:read folder:read",
  },
};

const envKey = (provider: string, suffix: string) =>
  `${provider.toUpperCase()}_${suffix}`;

const signState = async (payload: string) => {
  const secret = Deno.env.get("CONNECTOR_STATE_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // ---- callback: exchange the code, store the token server-side ----
    if (action === "callback") {
      const rawState = String(body.state ?? "");
      const code = String(body.code ?? "");
      const [encoded, signature] = rawState.split(".");
      if (!encoded || !signature || !code) {
        return json({ error: "Invalid authorization response" }, 400);
      }
      if ((await signState(encoded)) !== signature) {
        return json({ error: "Authorization could not be verified" }, 400);
      }
      const state = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
      if (Date.now() > Number(state.exp)) {
        return json({ error: "Authorization link expired, try again" }, 400);
      }

      const provider = String(state.provider);
      const config = PROVIDERS[provider];
      const clientId = Deno.env.get(envKey(provider, "CLIENT_ID"));
      const clientSecret = Deno.env.get(envKey(provider, "CLIENT_SECRET"));
      if (!config || !clientId || !clientSecret) {
        return json({ error: "This service is not configured yet" }, 400);
      }

      const tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: String(state.redirect_uri),
        }),
      });
      const tokenBody = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenBody.access_token) {
        return json(
          { error: tokenBody.error_description ?? "Authorization failed" },
          400,
        );
      }

      const { data: connection, error: connError } = await admin
        .from("user_connections")
        .upsert(
          {
            user_id: state.user_id,
            service_id: state.service_id,
            method: "oauth",
            status: "connected",
            scopes: config.scope.split(/[ ,]/).filter(Boolean),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,service_id" },
        )
        .select("id")
        .single();
      if (connError || !connection) {
        return json({ error: connError?.message ?? "Could not save" }, 400);
      }

      const expiresAt = tokenBody.expires_in
        ? new Date(Date.now() + Number(tokenBody.expires_in) * 1000).toISOString()
        : null;

      await admin.from("connection_secrets").upsert(
        {
          connection_id: connection.id,
          user_id: state.user_id,
          secret_type: "access_token",
          secret_value: String(tokenBody.access_token),
          expires_at: expiresAt,
        },
        { onConflict: "connection_id,secret_type" },
      );

      if (tokenBody.refresh_token) {
        await admin.from("connection_secrets").upsert(
          {
            connection_id: connection.id,
            user_id: state.user_id,
            secret_type: "refresh_token",
            secret_value: String(tokenBody.refresh_token),
          },
          { onConflict: "connection_id,secret_type" },
        );
      }

      return json({ ok: true, service_id: state.service_id });
    }

    // ---- start: build the provider authorize URL ----
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Sign in required" }, 401);
    }
    const {
      data: { user },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Sign in required" }, 401);

    if (action !== "start") return json({ error: "Unknown action" }, 400);

    const provider = String(body.provider ?? "");
    const serviceId = String(body.service_id ?? "");
    const redirectUri = String(body.redirect_uri ?? "");
    const config = PROVIDERS[provider];
    if (!config) return json({ error: "Unsupported service" }, 400);

    const clientId = Deno.env.get(envKey(provider, "CLIENT_ID"));
    if (!clientId) {
      return json(
        {
          error: "not_configured",
          message:
            "This service still needs its developer app credentials before sign-in works.",
        },
        400,
      );
    }

    const payload = btoa(
      JSON.stringify({
        user_id: user.id,
        service_id: serviceId,
        provider,
        redirect_uri: redirectUri,
        exp: Date.now() + 10 * 60 * 1000,
        nonce: crypto.randomUUID(),
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const state = `${payload}.${await signState(payload)}`;

    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", state);

    return json({ ok: true, authorize_url: url.toString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
