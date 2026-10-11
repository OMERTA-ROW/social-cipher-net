/**
 * Social platform catalogue. Capabilities describe what each provider's
 * official API allows, not what any member has connected. Nothing here
 * implies a connection exists.
 */
export type CapabilityState = "available" | "approval" | "unavailable";
export type CapabilityKey = "profile" | "pages" | "publish" | "schedule" | "comments" | "messages" | "analytics" | "webhooks";

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  profile: "Profile data",
  pages: "Pages / channels",
  publish: "Publishing",
  schedule: "Scheduling",
  comments: "Comments",
  messages: "Messages",
  analytics: "Analytics",
  webhooks: "Webhooks",
};

export const CAPABILITY_STATE_LABELS: Record<CapabilityState, string> = {
  available: "Available",
  approval: "Needs provider approval",
  unavailable: "Not offered by provider API",
};

export interface SocialProvider {
  id: string;
  name: string;
  glyph: string;
  description: string;
  /** Registry service id used for the connection row. */
  serviceId: string;
  /** Server OAuth adapter key in connector-oauth; null when no adapter is built yet. */
  oauthProvider: string | null;
  accountTypes: string;
  setup: string;
  scopes: string[];
  manageUrl: string | null;
  docsUrl: string;
  /** When the provider has no usable public API for third-party apps. */
  unavailableReason?: string;
  capabilities: Record<CapabilityKey, CapabilityState>;
}

const caps = (c: Partial<Record<CapabilityKey, CapabilityState>>): Record<CapabilityKey, CapabilityState> => ({
  profile: "unavailable", pages: "unavailable", publish: "unavailable", schedule: "unavailable",
  comments: "unavailable", messages: "unavailable", analytics: "unavailable", webhooks: "unavailable", ...c,
});

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: "facebook", name: "Facebook Pages", glyph: "📘", serviceId: "facebook", oauthProvider: "facebook",
    description: "Manage Facebook Pages you administer through Meta's Graph API.", accountTypes: "Facebook Pages",
    setup: "Meta developer app with Facebook Login; Page permissions pass Meta App Review.",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"], manageUrl: "https://www.facebook.com/settings?tab=business_tools",
    docsUrl: "https://developers.facebook.com/docs/pages-api",
    capabilities: caps({ profile: "available", pages: "available", publish: "approval", schedule: "approval", comments: "approval", messages: "approval", analytics: "approval", webhooks: "approval" }) },
  { id: "instagram", name: "Instagram Professional", glyph: "📸", serviceId: "instagram", oauthProvider: "instagram",
    description: "Business or Creator accounts via the Instagram Graph API.", accountTypes: "Business and Creator accounts",
    setup: "Meta developer app; Instagram account must be Professional. Permissions pass Meta App Review.",
    scopes: ["instagram_business_basic", "instagram_business_content_publish"], manageUrl: "https://www.instagram.com/accounts/manage_access/",
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
    capabilities: caps({ profile: "available", publish: "approval", schedule: "approval", comments: "approval", messages: "approval", analytics: "approval", webhooks: "approval" }) },
  { id: "threads", name: "Threads", glyph: "🧵", serviceId: "threads", oauthProvider: null,
    description: "Meta's Threads API for profiles and posts.", accountTypes: "Threads profiles",
    setup: "Meta developer app with the Threads use case. Server adapter not built yet.",
    scopes: ["threads_basic", "threads_content_publish"], manageUrl: null, docsUrl: "https://developers.facebook.com/docs/threads",
    capabilities: caps({ profile: "available", publish: "approval", comments: "approval", analytics: "approval", webhooks: "approval" }) },
  { id: "x", name: "X (Twitter)", glyph: "𝕏", serviceId: "x", oauthProvider: "x",
    description: "X API v2 with OAuth 2.0 and PKCE.", accountTypes: "Personal and business accounts",
    setup: "X developer project with OAuth 2.0 enabled. Many endpoints need a paid API tier.",
    scopes: ["tweet.read", "users.read", "offline.access"], manageUrl: "https://x.com/settings/connected_apps",
    docsUrl: "https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code",
    capabilities: caps({ profile: "available", publish: "approval", comments: "approval", messages: "approval", analytics: "approval", webhooks: "approval" }) },
  { id: "tiktok", name: "TikTok", glyph: "🎵", serviceId: "tiktok", oauthProvider: "tiktok",
    description: "TikTok Login Kit and Content Posting API.", accountTypes: "Personal, Creator and Business",
    setup: "TikTok developer app with Login Kit; Content Posting needs TikTok audit.",
    scopes: ["user.info.basic"], manageUrl: "https://www.tiktok.com/setting/security",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web",
    capabilities: caps({ profile: "available", publish: "approval", analytics: "approval", webhooks: "approval" }) },
  { id: "youtube", name: "YouTube", glyph: "▶️", serviceId: "youtube", oauthProvider: "google",
    description: "YouTube Data API for channels, videos and comments.", accountTypes: "YouTube channels",
    setup: "Google Cloud OAuth client with YouTube Data API enabled; sensitive scopes need Google verification.",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"], manageUrl: "https://myaccount.google.com/permissions",
    docsUrl: "https://developers.google.com/youtube/v3",
    capabilities: caps({ profile: "available", pages: "available", publish: "approval", schedule: "approval", comments: "approval", analytics: "approval", webhooks: "available" }) },
  { id: "linkedin", name: "LinkedIn", glyph: "💼", serviceId: "linkedin", oauthProvider: "linkedin",
    description: "Sign in with LinkedIn and Share on LinkedIn.", accountTypes: "Members; Company Pages need Marketing API",
    setup: "LinkedIn developer app; Company Page access needs Marketing Developer Platform approval.",
    scopes: ["openid", "profile", "w_member_social"], manageUrl: "https://www.linkedin.com/psettings/permitted-services",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/",
    capabilities: caps({ profile: "available", pages: "approval", publish: "available", comments: "approval", analytics: "approval" }) },
  { id: "pinterest", name: "Pinterest", glyph: "📌", serviceId: "pinterest", oauthProvider: null,
    description: "Pinterest API v5 for boards and Pins.", accountTypes: "Personal and Business",
    setup: "Pinterest developer app; standard access requires review. Server adapter not built yet.",
    scopes: ["user_accounts:read", "boards:read", "pins:write"], manageUrl: "https://www.pinterest.com/settings/security",
    docsUrl: "https://developers.pinterest.com/docs/api/v5/",
    capabilities: caps({ profile: "available", pages: "available", publish: "approval", analytics: "approval" }) },
  { id: "snapchat", name: "Snapchat", glyph: "👻", serviceId: "snapchat", oauthProvider: "snapchat",
    description: "Snap Login Kit for basic identity.", accountTypes: "Snapchat users",
    setup: "Snap Kit developer app with Login Kit. Posting is not available to third-party apps.",
    scopes: ["https://auth.snapchat.com/oauth2/api/user.display_name"], manageUrl: "https://accounts.snapchat.com/accounts/connected_apps",
    docsUrl: "https://developers.snap.com/snap-kit/login-kit/overview",
    capabilities: caps({ profile: "available" }) },
  { id: "reddit", name: "Reddit", glyph: "👽", serviceId: "reddit", oauthProvider: "reddit",
    description: "Reddit Data API with OAuth.", accountTypes: "Reddit users",
    setup: "Reddit app registration; commercial use requires Reddit approval.",
    scopes: ["identity", "read", "submit"], manageUrl: "https://www.reddit.com/prefs/apps",
    docsUrl: "https://www.reddit.com/dev/api/",
    capabilities: caps({ profile: "available", publish: "approval", comments: "approval", messages: "approval" }) },
  { id: "discord", name: "Discord", glyph: "🎮", serviceId: "discord", oauthProvider: "discord",
    description: "Discord OAuth2 for identity and servers.", accountTypes: "Discord users and servers",
    setup: "Discord application with OAuth2 redirect; bot features need a bot token.",
    scopes: ["identify", "guilds"], manageUrl: "https://discord.com/settings/authorized-apps",
    docsUrl: "https://discord.com/developers/docs/topics/oauth2",
    capabilities: caps({ profile: "available", pages: "available", publish: "approval", messages: "approval", webhooks: "available" }) },
  { id: "twitch", name: "Twitch", glyph: "🟣", serviceId: "twitch", oauthProvider: "twitch",
    description: "Twitch Helix API for channels and streams.", accountTypes: "Twitch channels",
    setup: "Twitch developer application with OAuth redirect.",
    scopes: ["user:read:email"], manageUrl: "https://www.twitch.tv/settings/connections",
    docsUrl: "https://dev.twitch.tv/docs/authentication/",
    capabilities: caps({ profile: "available", pages: "available", comments: "approval", analytics: "approval", webhooks: "available" }) },
  { id: "telegram", name: "Telegram", glyph: "✈️", serviceId: "telegram", oauthProvider: null,
    description: "Telegram Login Widget and Bot API.", accountTypes: "Telegram users, channels via bots",
    setup: "Telegram bot via BotFather; uses signed login widget, not OAuth. Server adapter not built yet.",
    scopes: [], manageUrl: null, docsUrl: "https://core.telegram.org/widgets/login",
    capabilities: caps({ profile: "available", publish: "approval", messages: "approval", webhooks: "available" }) },
  { id: "whatsapp", name: "WhatsApp Business", glyph: "💬", serviceId: "whatsapp", oauthProvider: null,
    description: "WhatsApp Business Platform (Cloud API).", accountTypes: "WhatsApp Business accounts",
    setup: "Meta Business verification and embedded signup. Server adapter not built yet.",
    scopes: ["whatsapp_business_management", "whatsapp_business_messaging"], manageUrl: null,
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    capabilities: caps({ profile: "available", messages: "approval", webhooks: "approval" }) },
  { id: "bluesky", name: "Bluesky", glyph: "🦋", serviceId: "bluesky", oauthProvider: null,
    description: "AT Protocol OAuth for Bluesky accounts.", accountTypes: "Bluesky / AT Protocol accounts",
    setup: "AT Protocol OAuth client metadata hosted on the site. Server adapter not built yet.",
    scopes: ["atproto"], manageUrl: "https://bsky.app/settings", docsUrl: "https://docs.bsky.app/docs/advanced-guides/oauth-client",
    capabilities: caps({ profile: "available", publish: "available", comments: "available" }) },
  { id: "mastodon", name: "Mastodon", glyph: "🐘", serviceId: "mastodon", oauthProvider: null,
    description: "Per-server OAuth for Mastodon instances.", accountTypes: "Accounts on any Mastodon server",
    setup: "App registered per Mastodon server at connect time. Server adapter not built yet.",
    scopes: ["read", "write:statuses"], manageUrl: null, docsUrl: "https://docs.joinmastodon.org/spec/oauth/",
    capabilities: caps({ profile: "available", publish: "available", schedule: "available", comments: "available", webhooks: "available" }) },
  { id: "tumblr", name: "Tumblr", glyph: "📝", serviceId: "tumblr", oauthProvider: null,
    description: "Tumblr API with OAuth 2.0.", accountTypes: "Tumblr blogs",
    setup: "Tumblr app registration. Server adapter not built yet.",
    scopes: ["basic", "write"], manageUrl: "https://www.tumblr.com/settings/apps", docsUrl: "https://www.tumblr.com/docs/en/api/v2",
    capabilities: caps({ profile: "available", pages: "available", publish: "available", schedule: "available" }) },
  { id: "medium", name: "Medium", glyph: "Ⓜ️", serviceId: "medium", oauthProvider: null,
    description: "Medium no longer issues API access to new integrations.", accountTypes: "—",
    setup: "Not possible: Medium's API is closed to new integrations.",
    scopes: [], manageUrl: null, docsUrl: "https://github.com/Medium/medium-api-docs",
    unavailableReason: "Medium stopped supporting its public API and does not issue new integration tokens.",
    capabilities: caps({}) },
  { id: "vimeo", name: "Vimeo", glyph: "🎬", serviceId: "vimeo", oauthProvider: null,
    description: "Vimeo API for videos and showcases.", accountTypes: "Vimeo accounts",
    setup: "Vimeo developer app; upload scope needs approval. Server adapter not built yet.",
    scopes: ["public", "private"], manageUrl: "https://vimeo.com/settings/apps", docsUrl: "https://developer.vimeo.com/api/authentication",
    capabilities: caps({ profile: "available", pages: "available", publish: "approval", comments: "available", analytics: "approval", webhooks: "available" }) },
  { id: "flickr", name: "Flickr", glyph: "📷", serviceId: "flickr", oauthProvider: null,
    description: "Flickr API (OAuth 1.0a) for photos.", accountTypes: "Flickr accounts",
    setup: "Flickr API key; non-commercial or approved commercial use. Server adapter not built yet.",
    scopes: ["read"], manageUrl: "https://www.flickr.com/services/auth/list.gne", docsUrl: "https://www.flickr.com/services/api/auth.oauth.html",
    capabilities: caps({ profile: "available", publish: "available", comments: "available" }) },
  { id: "shopify", name: "Shopify social channels", glyph: "🛍️", serviceId: "shopify_social", oauthProvider: null,
    description: "Shopify sales channels where the Admin API exposes them.", accountTypes: "Shopify stores",
    setup: "Shopify app install per store; social channel data is limited to what the Admin API exposes.",
    scopes: ["read_products", "read_publications"], manageUrl: null, docsUrl: "https://shopify.dev/docs/api/admin-graphql",
    capabilities: caps({ profile: "available", pages: "available", analytics: "approval", webhooks: "available" }) },
];

export type ProviderAvailability = "ready" | "setup" | "planned" | "unavailable";

export const AVAILABILITY_TEXT: Record<ProviderAvailability, string> = {
  ready: "Ready to connect",
  setup: "Setup required",
  planned: "Not yet supported",
  unavailable: "Unavailable",
};

/** Ready only when a server adapter exists AND the server reports its credentials configured. */
export const providerAvailability = (p: SocialProvider, configured: readonly string[]): ProviderAvailability => {
  if (p.unavailableReason) return "unavailable";
  if (!p.oauthProvider) return "planned";
  return configured.includes(p.oauthProvider) ? "ready" : "setup";
};

export const getSocialProvider = (id: string | undefined) => SOCIAL_PROVIDERS.find((p) => p.id === id);
export const socialProviderForService = (serviceId: string) => SOCIAL_PROVIDERS.find((p) => p.serviceId === serviceId);
