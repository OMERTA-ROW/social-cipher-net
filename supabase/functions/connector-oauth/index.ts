import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { putSecret } from "../_shared/connectorVault.ts";
import { audit } from "../_shared/connectorEngine.ts";
import { getDefinition } from "../_shared/connectorManifest.ts";
import {
  createCodeVerifier,
  createOAuthState,
  oauthRedirectIsAllowed,
  OAUTH_ATTEMPT_TTL_MS,
  sanitizeOAuthError,
  sha256,
} from "../_shared/connectorOAuthSecurity.ts";

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
  { authorizeUrl: string; tokenUrl: string; scope: string; pkce?: boolean }
> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope:
      "https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload",
    pkce: true,
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
    pkce: true,
  },
  x: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scope: "tweet.read tweet.write users.read offline.access",
    pkce: true,
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
    pkce: true,
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
    pkce: true,
  },
  reddit: {
    authorizeUrl: "https://www.reddit.com/api/v1/authorize",
    tokenUrl: "https://www.reddit.com/api/v1/access_token",
    scope: "identity read submit history",
    pkce: true,
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scope: "openid profile w_member_social",
    pkce: true,
  },
  discord: {
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify guilds messages.read",
    pkce: true,
  },
  spotify: {
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scope: "user-read-private user-read-email user-top-read",
    pkce: true,
  },
  soundcloud: {
    authorizeUrl: "https://secure.soundcloud.com/authorize",
    tokenUrl: "https://secure.soundcloud.com/oauth/token",
    scope: "non-expiring",
  },
  figma: {
    authorizeUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    scope: "file_read",
  },
  google_drive: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/drive.readonly",
  },
  dropbox: {
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scope: "files.content.read files.metadata.read",
    pkce: true,
  },
  etsy: {
    authorizeUrl: "https://www.etsy.com/oauth/connect",
    tokenUrl: "https://api.etsy.com/v3/public/oauth/token",
    scope: "listings_r transactions_r shops_r",
    pkce: true,
  },
};

const envKey = (provider: string, suffix: string) =>
  `${provider.toUpperCase()}_${suffix}`;

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

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Sign in required" }, 401);
    }
    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Sign in required" }, 401);

    // ---- callback: exchange the code, store the token server-side ----
    if (action === "callback") {
      const rawState = String(body.state ?? "");
      const code = String(body.code ?? "");
      if (!rawState) {
        return json({ error: "Invalid authorization response" }, 400);
      }

      const stateHash = await sha256(rawState);
      const { data: attempt } = await admin
        .from("connector_oauth_attempts")
        .select("id,user_id,service_id,provider,account_key,account_label,code_verifier,redirect_uri,expires_at,consumed_at")
        .eq("state_hash", stateHash)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!attempt || attempt.consumed_at || Date.parse(attempt.expires_at) <= Date.now()) {
        return json({ error: "This authorization attempt expired or was already used. Please try again." }, 400);
      }
      const consumedAt = new Date().toISOString();
      const { data: consumed } = await admin
        .from("connector_oauth_attempts")
        .update({ consumed_at: consumedAt })
        .eq("id", attempt.id)
        .is("consumed_at", null)
        .select("id")
        .maybeSingle();
      if (!consumed) return json({ error: "This authorization attempt was already used. Please try again." }, 409);
      if (body.error || !code) return json({ error: sanitizeOAuthError(body.error) }, 400);

      const provider = String(attempt.provider);
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
           redirect_uri: String(attempt.redirect_uri),
           ...(attempt.code_verifier ? { code_verifier: String(attempt.code_verifier) } : {}),
        }),
      });
      const tokenBody = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenBody.access_token) {
        return json(
          { error: sanitizeOAuthError(tokenBody.error_description ?? tokenBody.error) },
          400,
        );
      }

      const { data: connection, error: connError } = await admin
        .from("user_connections")
        .upsert(
          {
             user_id: user.id,
             service_id: attempt.service_id,
            // One row per linked account. The slot travels in the signed state
            // so a second account never overwrites the first.
             account_key: String(attempt.account_key),
             account_label: attempt.account_label ? String(attempt.account_label) : null,
            method: "oauth",
            status: "connected",
            scopes: config.scope.split(/[ ,]/).filter(Boolean),
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,service_id,account_key" },
        )
        .select("id")
        .single();
      if (connError || !connection) {
        return json({ error: connError?.message ?? "Could not save" }, 400);
      }

      const expiresAt = tokenBody.expires_in
        ? new Date(Date.now() + Number(tokenBody.expires_in) * 1000).toISOString()
        : null;

      await putSecret(admin, {
        connectionId: connection.id,
         userId: user.id,
        type: "access_token",
        value: String(tokenBody.access_token),
        expiresAt,
      });

      if (tokenBody.refresh_token) {
        await putSecret(admin, {
          connectionId: connection.id,
           userId: user.id,
          type: "refresh_token",
          value: String(tokenBody.refresh_token),
        });
      }

      await admin
        .from("user_connections")
        .update({
          expires_at: expiresAt,
          health: "healthy",
          failure_count: 0,
        })
        .eq("id", connection.id);

      await audit(admin, {
         userId: user.id,
        connectionId: connection.id,
         serviceId: attempt.service_id,
        action: "oauth_connect",
        status: "ok",
      });

       return json({ ok: true, service_id: attempt.service_id });
    }

    // ---- start: build the provider authorize URL ----
    // ---- status: which services already have their developer app set up ----
    if (action === "status") {
      const configured = Object.keys(PROVIDERS).filter((p) =>
        Boolean(Deno.env.get(envKey(p, "CLIENT_ID")) && Deno.env.get(envKey(p, "CLIENT_SECRET")))
      );
      return json({
        ok: true,
        configured,
        all: Object.keys(PROVIDERS),
        requirements: {
          client_id: "Set PROVIDER_CLIENT_ID in server function secrets",
          client_secret: "Set PROVIDER_CLIENT_SECRET in server function secrets",
          callback: "Register the exact /integrations URL for each deployed origin",
        },
      });
    }

    if (action !== "start") return json({ error: "Unknown action" }, 400);

    const provider = String(body.provider ?? "");
    const serviceId = String(body.service_id ?? "");
    const redirectUri = String(body.redirect_uri ?? "");
    const config = PROVIDERS[provider];
    if (!config) return json({ error: "Unsupported service" }, 400);
    const definition = getDefinition(serviceId);
    if (!definition || definition.oauthProvider !== provider) {
      return json({ error: "Provider does not match this service" }, 400);
    }
    if (!oauthRedirectIsAllowed(redirectUri)) {
      return json({ error: "Invalid callback address" }, 400);
    }

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

    const state = createOAuthState();
    const verifier = config.pkce ? createCodeVerifier() : null;
    const accountKey = String(body.account_key ?? crypto.randomUUID()).slice(0, 64);
    const { error: attemptError } = await admin.from("connector_oauth_attempts").insert({
      user_id: user.id,
      service_id: serviceId,
      provider,
      account_key: accountKey,
      account_label: typeof body.account_label === "string" ? body.account_label.slice(0, 120) : null,
      state_hash: await sha256(state),
      code_verifier: verifier,
      redirect_uri: redirectUri,
      expires_at: new Date(Date.now() + OAUTH_ATTEMPT_TTL_MS).toISOString(),
    });
    if (attemptError) return json({ error: "Could not start authorization" }, 500);

    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", state);
    if (verifier) {
      url.searchParams.set("code_challenge", await sha256(verifier));
      url.searchParams.set("code_challenge_method", "S256");
    }

    return json({ ok: true, authorize_url: url.toString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
