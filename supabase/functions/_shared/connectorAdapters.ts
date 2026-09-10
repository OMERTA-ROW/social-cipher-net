/**
 * Connector adapters.
 *
 * An adapter only translates: it builds the provider request and maps the
 * response into our shapes. Auth, rate limiting, retries, backoff, health and
 * the audit trail all live in the engine.
 */

import { providerFetch, type ProviderResult } from "./connectorEngine.ts";
import type { SecretBag } from "./connectorVault.ts";
import type { Capability } from "./connectorManifest.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface AdapterContext {
  admin: Admin;
  connectionId: string;
  serviceId: string;
  secrets: SecretBag;
  payload: Record<string, unknown>;
}

export type AdapterHandler = (ctx: AdapterContext) => Promise<ProviderResult>;

export type Adapter = Partial<Record<Capability, AdapterHandler>>;

const text = (ctx: AdapterContext) =>
  String(ctx.payload.message ?? ctx.payload.text ?? "").slice(0, 5000);

const bearerToken = (s: SecretBag) =>
  s.access_token ?? s.api_key ?? s.api_token ?? s.integration_token ?? s.bot_token;

const missingToken: ProviderResult = {
  ok: false,
  status: 401,
  detail: "This connection has no usable credential yet. Reconnect it.",
};

const call = (ctx: AdapterContext, url: string, init?: RequestInit) =>
  providerFetch(ctx.admin, {
    connectionId: ctx.connectionId,
    serviceId: ctx.serviceId,
    url,
    init,
  });

/* ------------------------------- Bluesky -------------------------------- */

const blueskySession = async (ctx: AdapterContext) => {
  const res = await call(ctx, "https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: ctx.secrets.handle,
      password: ctx.secrets.app_password,
    }),
  });
  return res;
};

/* ------------------------------- adapters ------------------------------- */

export const ADAPTERS: Record<string, Adapter> = {
  x: {
    publish_text: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text(ctx) }),
      });
    },
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.twitter.com/2/users/me/tweets?max_results=10", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  },

  facebook: {
    publish_text: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      const pageId = ctx.secrets.page_id ?? String(ctx.payload.page_id ?? "me");
      return call(ctx, `https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text(ctx), access_token: token }),
      });
    },
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      const pageId = ctx.secrets.page_id ?? "me";
      return call(
        ctx,
        `https://graph.facebook.com/v21.0/${pageId}/feed?limit=10&access_token=${token}`,
      );
    },
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`,
      );
    },
  },

  instagram: {
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        `https://graph.instagram.com/me/media?fields=id,caption,media_url,permalink,timestamp&access_token=${token}`,
      );
    },
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${token}`,
      );
    },
  },

  youtube: {
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=10",
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    reply_comment: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(
        ctx,
        "https://www.googleapis.com/youtube/v3/comments?part=snippet",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              parentId: String(ctx.payload.parent_id ?? ""),
              textOriginal: text(ctx),
            },
          }),
        },
      );
    },
  },

  twitch: {
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": Deno.env.get("TWITCH_CLIENT_ID") ?? "",
        },
      });
    },
    reply_comment: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.twitch.tv/helix/chat/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": Deno.env.get("TWITCH_CLIENT_ID") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          broadcaster_id: ctx.payload.broadcaster_id,
          sender_id: ctx.payload.sender_id,
          message: text(ctx),
        }),
      });
    },
  },

  bluesky: {
    read_profile: async (ctx) => {
      const session = await blueskySession(ctx);
      if (!session.ok) return session;
      return session;
    },
    publish_text: async (ctx) => {
      const session = await blueskySession(ctx);
      if (!session.ok) return session;
      const s = session.data as { accessJwt?: string; did?: string };
      if (!s?.accessJwt || !s?.did) {
        return { ok: false, status: 401, detail: "Bluesky sign-in failed" };
      }
      return call(ctx, "https://bsky.social/xrpc/com.atproto.repo.createRecord", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${s.accessJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: s.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text: text(ctx).slice(0, 300),
            createdAt: new Date().toISOString(),
          },
        }),
      });
    },
    read_feed: async (ctx) => {
      const session = await blueskySession(ctx);
      if (!session.ok) return session;
      const s = session.data as { accessJwt?: string; did?: string };
      if (!s?.accessJwt) {
        return { ok: false, status: 401, detail: "Bluesky sign-in failed" };
      }
      return call(
        ctx,
        `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${s.did}&limit=20`,
        { headers: { Authorization: `Bearer ${s.accessJwt}` } },
      );
    },
  },

  mastodon: {
    publish_text: async (ctx) => {
      const base = String(ctx.secrets.instance_url ?? "").replace(/\/$/, "");
      const token = bearerToken(ctx.secrets);
      if (!base || !token) return missingToken;
      return call(ctx, `${base}/api/v1/statuses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: text(ctx).slice(0, 500) }),
      });
    },
    read_feed: async (ctx) => {
      const base = String(ctx.secrets.instance_url ?? "").replace(/\/$/, "");
      const token = bearerToken(ctx.secrets);
      if (!base || !token) return missingToken;
      return call(ctx, `${base}/api/v1/timelines/home?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    read_profile: async (ctx) => {
      const base = String(ctx.secrets.instance_url ?? "").replace(/\/$/, "");
      const token = bearerToken(ctx.secrets);
      if (!base || !token) return missingToken;
      return call(ctx, `${base}/api/v1/accounts/verify_credentials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  },

  reddit: {
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://oauth.reddit.com/api/v1/me", {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "CyberLinkSocial/1.0" },
      });
    },
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://oauth.reddit.com/best?limit=20", {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "CyberLinkSocial/1.0" },
      });
    },
  },

  discord: {
    read_profile: async (ctx) => {
      const token = ctx.secrets.bot_token ?? ctx.secrets.access_token;
      if (!token) return missingToken;
      const isBot = Boolean(ctx.secrets.bot_token);
      return call(ctx, "https://discord.com/api/v10/users/@me", {
        headers: { Authorization: isBot ? `Bot ${token}` : `Bearer ${token}` },
      });
    },
    publish_text: async (ctx) => {
      const token = ctx.secrets.bot_token;
      const channelId = String(ctx.payload.channel_id ?? ctx.secrets.channel_id ?? "");
      if (!token || !channelId) {
        return { ok: false, status: 400, detail: "A bot token and channel are required." };
      }
      return call(ctx, `https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: text(ctx).slice(0, 2000) }),
      });
    },
  },

  wordpress: {
    publish_text: async (ctx) => {
      const site = String(ctx.secrets.site_url ?? "").replace(/\/$/, "");
      const user = ctx.secrets.username;
      const pass = ctx.secrets.app_password;
      if (!site || !user || !pass) return missingToken;
      return call(ctx, `${site}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(ctx.payload.title ?? "Untitled"),
          content: text(ctx),
          status: "publish",
        }),
      });
    },
    read_feed: async (ctx) => {
      const site = String(ctx.secrets.site_url ?? "").replace(/\/$/, "");
      if (!site) return missingToken;
      return call(ctx, `${site}/wp-json/wp/v2/posts?per_page=10`);
    },
  },

  medium: {
    read_profile: async (ctx) => {
      const token = ctx.secrets.integration_token;
      if (!token) return missingToken;
      return call(ctx, "https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    publish_text: async (ctx) => {
      const token = ctx.secrets.integration_token;
      if (!token) return missingToken;
      const me = await call(ctx, "https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!me.ok) return me;
      const userId = (me.data as { data?: { id?: string } })?.data?.id;
      if (!userId) return { ok: false, status: 400, detail: "Could not read Medium account" };
      return call(ctx, `https://api.medium.com/v1/users/${userId}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(ctx.payload.title ?? "Untitled"),
          contentFormat: "markdown",
          content: text(ctx),
          publishStatus: "public",
        }),
      });
    },
  },

  shopify: {
    commerce: async (ctx) => {
      const shop = String(ctx.secrets.shop_domain ?? "").replace(/^https?:\/\//, "");
      const token = ctx.secrets.admin_token;
      if (!shop || !token) return missingToken;
      return call(ctx, `https://${shop}/admin/api/2024-10/products.json?limit=20`, {
        headers: { "X-Shopify-Access-Token": token },
      });
    },
    read_profile: async (ctx) => {
      const shop = String(ctx.secrets.shop_domain ?? "").replace(/^https?:\/\//, "");
      const token = ctx.secrets.admin_token;
      if (!shop || !token) return missingToken;
      return call(ctx, `https://${shop}/admin/api/2024-10/shop.json`, {
        headers: { "X-Shopify-Access-Token": token },
      });
    },
  },

  spotify: {
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    read_feed: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.spotify.com/v1/me/top/tracks?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  },

  soundcloud: {
    read_profile: async (ctx) => {
      const token = bearerToken(ctx.secrets);
      if (!token) return missingToken;
      return call(ctx, "https://api.soundcloud.com/me", {
        headers: { Authorization: `OAuth ${token}` },
      });
    },
  },
};

export const getAdapter = (serviceId: string): Adapter | undefined =>
  ADAPTERS[serviceId];
