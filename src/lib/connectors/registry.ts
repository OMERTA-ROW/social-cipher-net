/**
 * Canonical connector manifest.
 *
 * Mirrors the server manifest in supabase/functions/_shared/connectorManifest.ts.
 * It is synced into the `connector_definitions` table by the `connector-registry`
 * function, so services can be enabled, disabled or re-throttled without a deploy.
 *
 * Adding a service = one entry here + (optionally) one adapter in
 * `connectorAdapters.ts`. Nothing in the UI has to change: every surface renders
 * from the declared capabilities.
 */

export type ConnectorCategory =
  | "social"
  | "streaming"
  | "creative"
  | "commerce"
  | "storage"
  | "publishing"
  | "music";

export type ConnectorMethod =
  | "oauth"
  | "api_key"
  | "stream_key"
  | "app_password";

/** What a connector can actually do. Surfaces render from these. */
export type Capability =
  | "read_profile"
  | "read_feed"
  | "read_messages"
  | "read_notifications"
  | "read_analytics"
  | "read_revenue"
  | "publish_text"
  | "publish_image"
  | "publish_video"
  | "publish_audio"
  | "reply_comment"
  | "live_ingest"
  | "commerce"
  | "storage"
  | "import_assets";

/**
 * How hard this integration is to actually turn on. Shown to the user so nobody
 * is promised something that needs a partner agreement we do not have.
 */
export type Availability =
  | "available" // public API, self-serve credentials
  | "review_required" // needs platform app review / business verification
  | "paid_api" // needs a paid API tier
  | "partner_only" // needs a partner agreement
  | "manual_only"; // no usable API — we prepare a package, the user uploads

export interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  helper?: string;
  secret?: boolean;
}

export interface RatePolicy {
  /** Sustained requests allowed per window. */
  requests: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Maximum burst above the sustained rate. */
  burst: number;
}

export interface ContentConstraints {
  maxTextLength?: number;
  mediaTypes?: string[];
  maxVideoSeconds?: number;
  aspectRatios?: string[];
  requiredMetadata?: string[];
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: ConnectorCategory;
  blurb: string;
  glyph: string;
  methods: ConnectorMethod[];
  capabilities: Capability[];
  availability: Availability;
  /** Plain-language reason shown when availability is not "available". */
  availabilityNote?: string;
  oauthProvider?: string;
  fields?: CredentialField[];
  constraints?: ContentConstraints;
  ratePolicy: RatePolicy;
  docsUrl?: string;
  sortOrder?: number;
}

const streamFields: CredentialField[] = [
  { key: "rtmp_url", label: "RTMP / ingest URL", placeholder: "rtmp://live.example.com/app" },
  { key: "stream_key", label: "Stream key", secret: true },
];

const modest: RatePolicy = { requests: 60, windowSeconds: 60, burst: 15 };
const light: RatePolicy = { requests: 20, windowSeconds: 60, burst: 5 };

export const CONNECTOR_MANIFEST: ConnectorDefinition[] = [
  // ---------------- Social ----------------
  {
    id: "instagram",
    name: "Instagram",
    category: "social",
    blurb: "Post reels and photos, read comments, go live.",
    glyph: "📸",
    methods: ["oauth", "api_key"],
    oauthProvider: "instagram",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: [
      "read_profile",
      "read_feed",
      "read_analytics",
      "publish_image",
      "publish_video",
      "reply_comment",
      "live_ingest",
    ],
    availability: "review_required",
    availabilityNote:
      "Meta requires app review and a business or creator account before posting works.",
    constraints: { maxTextLength: 2200, mediaTypes: ["image/jpeg", "video/mp4"] },
    ratePolicy: { requests: 200, windowSeconds: 3600, burst: 20 },
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
    sortOrder: 10,
  },
  {
    id: "facebook",
    name: "Facebook",
    category: "social",
    blurb: "Publish to your page and stream live.",
    glyph: "🔵",
    methods: ["oauth", "api_key", "stream_key"],
    oauthProvider: "facebook",
    fields: [
      { key: "page_id", label: "Page ID" },
      { key: "access_token", label: "Page access token", secret: true },
      ...streamFields,
    ],
    capabilities: [
      "read_profile",
      "read_feed",
      "read_analytics",
      "publish_text",
      "publish_image",
      "publish_video",
      "reply_comment",
      "live_ingest",
    ],
    availability: "review_required",
    availabilityNote: "Meta app review is required for page publishing permissions.",
    constraints: { maxTextLength: 63206 },
    ratePolicy: { requests: 200, windowSeconds: 3600, burst: 20 },
    sortOrder: 20,
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "social",
    blurb: "Upload video, reply to comments, multicast live.",
    glyph: "▶️",
    methods: ["oauth", "stream_key"],
    oauthProvider: "google",
    fields: streamFields,
    capabilities: [
      "read_profile",
      "read_feed",
      "read_analytics",
      "read_revenue",
      "publish_video",
      "reply_comment",
      "live_ingest",
    ],
    availability: "available",
    constraints: {
      maxTextLength: 5000,
      mediaTypes: ["video/mp4", "video/quicktime"],
      requiredMetadata: ["title", "privacy_status"],
    },
    ratePolicy: { requests: 100, windowSeconds: 60, burst: 20 },
    sortOrder: 30,
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "social",
    blurb: "Publish clips and pull your posts in.",
    glyph: "🎵",
    methods: ["oauth", "api_key", "stream_key"],
    oauthProvider: "tiktok",
    fields: [{ key: "access_token", label: "Access token", secret: true }, ...streamFields],
    capabilities: ["read_profile", "read_feed", "publish_video", "live_ingest"],
    availability: "review_required",
    availabilityNote: "TikTok must approve the Content Posting API for your app.",
    constraints: { maxTextLength: 2200, maxVideoSeconds: 600, aspectRatios: ["9:16"] },
    ratePolicy: light,
    sortOrder: 40,
  },
  {
    id: "x",
    name: "X",
    category: "social",
    blurb: "Post, reply and read your timeline.",
    glyph: "✖️",
    methods: ["oauth", "api_key"],
    oauthProvider: "x",
    fields: [
      { key: "api_key", label: "API key", secret: true },
      { key: "api_secret", label: "API secret", secret: true },
      { key: "access_token", label: "Access token", secret: true },
      { key: "access_secret", label: "Access token secret", secret: true },
    ],
    capabilities: ["read_profile", "read_feed", "publish_text", "publish_image", "reply_comment"],
    availability: "paid_api",
    availabilityNote: "X charges for API access; posting and reading need a paid tier.",
    constraints: { maxTextLength: 280 },
    ratePolicy: { requests: 50, windowSeconds: 900, burst: 5 },
    sortOrder: 50,
  },
  {
    id: "bluesky",
    name: "Bluesky",
    category: "social",
    blurb: "Post and read your timeline with an app password.",
    glyph: "🦋",
    methods: ["app_password"],
    fields: [
      { key: "handle", label: "Handle", placeholder: "you.bsky.social" },
      { key: "app_password", label: "App password", secret: true },
    ],
    capabilities: ["read_profile", "read_feed", "publish_text", "publish_image", "reply_comment"],
    availability: "available",
    constraints: { maxTextLength: 300 },
    ratePolicy: modest,
    sortOrder: 55,
  },
  {
    id: "mastodon",
    name: "Mastodon",
    category: "social",
    blurb: "Post and read from any Mastodon server.",
    glyph: "🐘",
    methods: ["api_key"],
    fields: [
      { key: "instance_url", label: "Server URL", placeholder: "https://mastodon.social" },
      { key: "access_token", label: "Access token", secret: true },
    ],
    capabilities: ["read_profile", "read_feed", "publish_text", "publish_image", "reply_comment"],
    availability: "available",
    constraints: { maxTextLength: 500 },
    ratePolicy: modest,
    sortOrder: 56,
  },
  {
    id: "reddit",
    name: "Reddit",
    category: "social",
    blurb: "Submit posts and read your feed.",
    glyph: "👽",
    methods: ["oauth", "api_key"],
    oauthProvider: "reddit",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["read_profile", "read_feed", "publish_text", "reply_comment"],
    availability: "available",
    constraints: { maxTextLength: 40000 },
    ratePolicy: { requests: 60, windowSeconds: 600, burst: 10 },
    sortOrder: 57,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "social",
    blurb: "Share updates to your profile or page.",
    glyph: "💼",
    methods: ["oauth"],
    oauthProvider: "linkedin",
    capabilities: ["read_profile", "publish_text", "publish_image"],
    availability: "review_required",
    availabilityNote: "Posting scopes require LinkedIn partner approval.",
    constraints: { maxTextLength: 3000 },
    ratePolicy: light,
    sortOrder: 58,
  },
  {
    id: "snapchat",
    name: "Snapchat",
    category: "social",
    blurb: "Share stories and spotlight clips.",
    glyph: "👻",
    methods: ["oauth", "api_key"],
    oauthProvider: "snapchat",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["read_profile", "publish_video"],
    availability: "review_required",
    availabilityNote: "Snapchat approval is needed before publishing is enabled.",
    ratePolicy: light,
    sortOrder: 59,
  },
  {
    id: "twitch",
    name: "Twitch",
    category: "social",
    blurb: "Chat, clips and live multicast.",
    glyph: "🟣",
    methods: ["oauth", "stream_key"],
    oauthProvider: "twitch",
    fields: streamFields,
    capabilities: ["read_profile", "read_feed", "read_analytics", "reply_comment", "live_ingest"],
    availability: "available",
    ratePolicy: { requests: 800, windowSeconds: 60, burst: 50 },
    sortOrder: 60,
  },
  {
    id: "kick",
    name: "Kick",
    category: "social",
    blurb: "Stream and read chat.",
    glyph: "🟢",
    methods: ["oauth", "stream_key"],
    oauthProvider: "kick",
    fields: streamFields,
    capabilities: ["read_profile", "read_feed", "reply_comment", "live_ingest"],
    availability: "available",
    ratePolicy: modest,
    sortOrder: 61,
  },
  {
    id: "discord",
    name: "Discord",
    category: "social",
    blurb: "Post to your servers and read channels.",
    glyph: "🗨️",
    methods: ["oauth", "api_key"],
    oauthProvider: "discord",
    fields: [{ key: "bot_token", label: "Bot token", secret: true }],
    capabilities: ["read_profile", "read_feed", "read_messages", "publish_text", "reply_comment"],
    availability: "available",
    constraints: { maxTextLength: 2000 },
    ratePolicy: modest,
    sortOrder: 62,
  },
  {
    id: "worldstar",
    name: "Worldstar",
    category: "social",
    blurb: "Submit clips and track posts.",
    glyph: "🌟",
    methods: ["api_key"],
    fields: [{ key: "api_key", label: "API key", secret: true }],
    capabilities: ["publish_video", "read_feed"],
    availability: "partner_only",
    availabilityNote: "No public API — needs a direct arrangement with Worldstar.",
    ratePolicy: light,
    sortOrder: 63,
  },

  // ---------------- Streaming tooling ----------------
  {
    id: "restream",
    name: "Restream",
    category: "streaming",
    blurb: "Fan one stream out to every destination.",
    glyph: "📡",
    methods: ["oauth", "api_key", "stream_key"],
    oauthProvider: "restream",
    fields: [{ key: "api_key", label: "API key", secret: true }, ...streamFields],
    capabilities: ["live_ingest", "read_profile"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 70,
  },
  {
    id: "streamlabs",
    name: "Streamlabs",
    category: "streaming",
    blurb: "Alerts, overlays and tips.",
    glyph: "🎛️",
    methods: ["oauth", "api_key"],
    oauthProvider: "streamlabs",
    fields: [{ key: "api_token", label: "API token", secret: true }],
    capabilities: ["read_notifications", "read_analytics", "read_revenue"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 71,
  },
  {
    id: "obs",
    name: "OBS Studio",
    category: "streaming",
    blurb: "Point OBS at Cyber Link with your ingest details.",
    glyph: "🎥",
    methods: ["stream_key"],
    fields: [
      { key: "websocket_url", label: "OBS WebSocket URL", placeholder: "ws://localhost:4455" },
      { key: "websocket_password", label: "WebSocket password", secret: true },
      ...streamFields,
    ],
    capabilities: ["live_ingest"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 72,
  },
  {
    id: "streamelements",
    name: "StreamElements",
    category: "streaming",
    blurb: "Overlays, loyalty and chat bot.",
    glyph: "🧩",
    methods: ["oauth", "api_key"],
    oauthProvider: "streamelements",
    fields: [
      { key: "channel_id", label: "Channel ID" },
      { key: "jwt_token", label: "JWT token", secret: true },
    ],
    capabilities: ["read_notifications", "reply_comment", "live_ingest"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 73,
  },

  // ---------------- Creative ----------------
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    category: "creative",
    blurb: "Pull Photoshop, Illustrator and Premiere assets into Studio.",
    glyph: "🅰️",
    methods: ["oauth", "api_key"],
    oauthProvider: "adobe",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["import_assets", "read_profile"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 80,
  },
  {
    id: "canva",
    name: "Canva",
    category: "creative",
    blurb: "Import your Canva designs and brand assets.",
    glyph: "🎨",
    methods: ["oauth", "api_key"],
    oauthProvider: "canva",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["import_assets", "read_profile"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 81,
  },
  {
    id: "figma",
    name: "Figma",
    category: "creative",
    blurb: "Bring frames and components into Studio.",
    glyph: "🖼️",
    methods: ["oauth", "api_key"],
    oauthProvider: "figma",
    fields: [{ key: "access_token", label: "Personal access token", secret: true }],
    capabilities: ["import_assets", "read_profile"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 82,
  },

  // ---------------- Storage ----------------
  {
    id: "google_drive",
    name: "Google Drive",
    category: "storage",
    blurb: "Use your Drive files as Studio source material.",
    glyph: "📁",
    methods: ["oauth"],
    oauthProvider: "google_drive",
    capabilities: ["storage", "import_assets", "read_profile"],
    availability: "available",
    ratePolicy: modest,
    sortOrder: 90,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    category: "storage",
    blurb: "Import masters and artwork straight from Dropbox.",
    glyph: "🗄️",
    methods: ["oauth", "api_key"],
    oauthProvider: "dropbox",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["storage", "import_assets"],
    availability: "available",
    ratePolicy: modest,
    sortOrder: 91,
  },

  // ---------------- Publishing ----------------
  {
    id: "wordpress",
    name: "WordPress",
    category: "publishing",
    blurb: "Publish long-form writing to your own site.",
    glyph: "📝",
    methods: ["api_key", "app_password"],
    fields: [
      { key: "site_url", label: "Site URL", placeholder: "https://example.com" },
      { key: "username", label: "Username" },
      { key: "app_password", label: "Application password", secret: true },
    ],
    capabilities: ["publish_text", "publish_image", "read_feed", "reply_comment"],
    availability: "available",
    ratePolicy: modest,
    sortOrder: 100,
  },
  {
    id: "medium",
    name: "Medium",
    category: "publishing",
    blurb: "Syndicate articles to Medium.",
    glyph: "📰",
    methods: ["api_key"],
    fields: [{ key: "integration_token", label: "Integration token", secret: true }],
    capabilities: ["publish_text", "read_profile"],
    availability: "available",
    ratePolicy: light,
    sortOrder: 101,
  },

  // ---------------- Commerce ----------------
  {
    id: "shopify",
    name: "Shopify",
    category: "commerce",
    blurb: "Pull products, orders and revenue into the dashboard.",
    glyph: "🛍️",
    methods: ["api_key"],
    fields: [
      { key: "shop_domain", label: "Store domain", placeholder: "my-store.myshopify.com" },
      { key: "admin_token", label: "Admin API token", secret: true },
    ],
    capabilities: ["commerce", "read_analytics", "read_revenue", "read_profile"],
    availability: "available",
    ratePolicy: modest,
    sortOrder: 110,
  },
  {
    id: "etsy",
    name: "Etsy",
    category: "commerce",
    blurb: "Track listings and sales alongside everything else.",
    glyph: "🧵",
    methods: ["oauth"],
    oauthProvider: "etsy",
    capabilities: ["commerce", "read_analytics", "read_revenue"],
    availability: "review_required",
    availabilityNote: "Etsy reviews apps before granting production API access.",
    ratePolicy: light,
    sortOrder: 111,
  },

  // ---------------- Music ----------------
  {
    id: "spotify",
    name: "Spotify",
    category: "music",
    blurb: "Read your artist profile, tracks and listener stats.",
    glyph: "🎧",
    methods: ["oauth"],
    oauthProvider: "spotify",
    capabilities: ["read_profile", "read_analytics", "read_feed"],
    availability: "available",
    availabilityNote: "Read-only: Spotify has no public API for uploading music.",
    ratePolicy: modest,
    sortOrder: 120,
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    category: "music",
    blurb: "Upload tracks and read plays and comments.",
    glyph: "☁️",
    methods: ["oauth", "api_key"],
    oauthProvider: "soundcloud",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["publish_audio", "read_feed", "read_analytics", "reply_comment"],
    availability: "review_required",
    availabilityNote: "SoundCloud currently issues API keys case by case.",
    constraints: { mediaTypes: ["audio/wav", "audio/mpeg", "audio/flac"] },
    ratePolicy: light,
    sortOrder: 121,
  },
  {
    id: "music_distribution",
    name: "Music distribution package",
    category: "music",
    blurb: "Build a store-ready delivery package for your distributor.",
    glyph: "💿",
    methods: ["api_key"],
    fields: [
      { key: "distributor", label: "Distributor name", placeholder: "DistroKid, TuneCore..." },
      { key: "api_key", label: "Partner API key (if you have one)", secret: true },
    ],
    capabilities: ["publish_audio"],
    availability: "manual_only",
    availabilityNote:
      "Major distributors have no public API. Studio prepares the master, artwork, metadata and rights, then you upload once.",
    constraints: {
      mediaTypes: ["audio/wav", "audio/flac"],
      requiredMetadata: ["title", "artist", "isrc", "release_date", "rights_holder", "splits"],
    },
    ratePolicy: light,
    sortOrder: 122,
  },
];

export const getDefinition = (id: string) =>
  CONNECTOR_MANIFEST.find((c) => c.id === id);

/* ------------------------------------------------------------------ */
/* App-facing view of the manifest.                                    */
/* The live catalogue is served by the `connector-registry` function;  */
/* this static copy is the fallback so the page still renders if the   */
/* catalogue cannot be reached.                                        */
/* ------------------------------------------------------------------ */

export type ConnectorService = ConnectorDefinition;
export const CONNECTOR_SERVICES = CONNECTOR_MANIFEST;

export const CONNECTOR_CATEGORIES: Array<{
  id: ConnectorCategory;
  label: string;
  description: string;
}> = [
  {
    id: "social",
    label: "Social platforms",
    description: "Post, comment, read feeds and multicast live.",
  },
  {
    id: "streaming",
    label: "Streaming tools",
    description: "Keep using the broadcast software you already run.",
  },
  {
    id: "creative",
    label: "Creative suites",
    description: "Bring your existing projects and assets into Studio.",
  },
  {
    id: "publishing",
    label: "Publishing",
    description: "Send long-form writing out to your own sites.",
  },
  {
    id: "music",
    label: "Music",
    description: "Track your releases and prepare distribution packages.",
  },
  {
    id: "commerce",
    label: "Commerce",
    description: "Products, orders and revenue in the same dashboard.",
  },
  {
    id: "storage",
    label: "Cloud storage",
    description: "Pull source files straight into Studio.",
  },
];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Ready to connect",
  review_required: "Needs platform approval",
  paid_api: "Needs a paid API plan",
  partner_only: "Needs a partner agreement",
  manual_only: "Prepared here, uploaded by you",
};

export const getService = (id: string) =>
  CONNECTOR_SERVICES.find((s) => s.id === id);

export const servicesByCategory = (category: ConnectorCategory) =>
  CONNECTOR_SERVICES.filter((s) => s.category === category);

export const withCapability = (capability: Capability) =>
  CONNECTOR_SERVICES.filter((s) => s.capabilities.includes(capability));

export const PUBLISH_CAPABILITIES: Capability[] = [
  "publish_text",
  "publish_image",
  "publish_video",
  "publish_audio",
];

export const canPublish = (service: ConnectorService) =>
  PUBLISH_CAPABILITIES.some((c) => service.capabilities.includes(c));

export const multicastServices = () => withCapability("live_ingest");

export const creativeServices = () => [
  ...servicesByCategory("creative"),
  ...servicesByCategory("storage"),
];
