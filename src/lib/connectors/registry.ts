/**
 * Universal connector registry.
 *
 * Adding a new service to the whole platform = adding one entry here.
 * Nothing else needs to change: the Connectors page, the status panels in
 * Studio and Streaming, and the multicast targets all read from this list.
 */

export type ConnectorCategory = "social" | "streaming" | "creative";
export type ConnectorMethod = "oauth" | "api_key" | "stream_key";

export interface ConnectorCredentialField {
  key: string;
  label: string;
  placeholder?: string;
  helper?: string;
  /** Rendered as a password field and never returned to the browser again. */
  secret?: boolean;
}

export interface ConnectorService {
  id: string;
  name: string;
  category: ConnectorCategory;
  /** Short line shown under the service name. */
  blurb: string;
  /** Emoji glyph so the grid stays consistent with the rest of the site. */
  glyph: string;
  /** Supported connection methods, in the order they are offered. */
  methods: ConnectorMethod[];
  /** Fields collected for manual key entry. */
  fields?: ConnectorCredentialField[];
  /** What the user can do from inside Cyber Link once connected. */
  capabilities: Array<"post" | "comment" | "feed" | "multicast">;
  /** OAuth provider slug handled by the connector edge functions. */
  oauthProvider?: string;
  docsUrl?: string;
}

const streamFields: ConnectorCredentialField[] = [
  {
    key: "rtmp_url",
    label: "RTMP / ingest URL",
    placeholder: "rtmp://live.example.com/app",
  },
  { key: "stream_key", label: "Stream key", secret: true },
];

export const CONNECTOR_SERVICES: ConnectorService[] = [
  // ---------- Social ----------
  {
    id: "instagram",
    name: "Instagram",
    category: "social",
    blurb: "Post reels and photos, read comments, go live.",
    glyph: "📸",
    methods: ["oauth", "api_key"],
    oauthProvider: "instagram",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: ["post", "comment", "feed", "multicast"],
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
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
    capabilities: ["post", "comment", "feed", "multicast"],
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
    capabilities: ["post", "comment", "feed", "multicast"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "social",
    blurb: "Publish clips and pull your posts in.",
    glyph: "🎵",
    methods: ["oauth", "api_key", "stream_key"],
    oauthProvider: "tiktok",
    fields: [
      { key: "access_token", label: "Access token", secret: true },
      ...streamFields,
    ],
    capabilities: ["post", "comment", "feed", "multicast"],
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
    capabilities: ["post", "comment", "feed"],
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
    capabilities: ["post", "feed"],
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
    capabilities: ["post", "comment", "feed", "multicast"],
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
    capabilities: ["comment", "feed", "multicast"],
  },
  {
    id: "worldstar",
    name: "Worldstar",
    category: "social",
    blurb: "Submit clips and track posts.",
    glyph: "🌟",
    methods: ["api_key"],
    fields: [{ key: "api_key", label: "API key", secret: true }],
    capabilities: ["post", "feed"],
  },

  // ---------- Streaming tooling ----------
  {
    id: "restream",
    name: "Restream",
    category: "streaming",
    blurb: "Fan one stream out to every destination.",
    glyph: "📡",
    methods: ["oauth", "api_key", "stream_key"],
    oauthProvider: "restream",
    fields: [{ key: "api_key", label: "API key", secret: true }, ...streamFields],
    capabilities: ["multicast"],
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
    capabilities: ["multicast"],
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
    capabilities: ["multicast"],
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
    capabilities: ["multicast", "comment"],
  },

  // ---------- Creative ----------
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    category: "creative",
    blurb: "Pull Photoshop, Illustrator and Premiere assets into Studio.",
    glyph: "🅰️",
    methods: ["oauth", "api_key"],
    oauthProvider: "adobe",
    fields: [{ key: "access_token", label: "Access token", secret: true }],
    capabilities: [],
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
    capabilities: [],
  },
];

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
];

export const getService = (id: string) =>
  CONNECTOR_SERVICES.find((s) => s.id === id);

export const servicesByCategory = (category: ConnectorCategory) =>
  CONNECTOR_SERVICES.filter((s) => s.category === category);

export const multicastServices = () =>
  CONNECTOR_SERVICES.filter((s) => s.capabilities.includes("multicast"));

export const creativeServices = () => servicesByCategory("creative");
