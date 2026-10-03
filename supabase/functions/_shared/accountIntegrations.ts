/**
 * Per-member account integrations (separate from CyberLink sign-in).
 *
 * Each entry uses the provider's documented OAuth 2.0 endpoints with the
 * smallest scope set that supports the listed feature. A provider is only
 * startable when its developer-app client id and secret exist in backend
 * secrets; otherwise the UI shows "Approval required" with the exact reason.
 * Pure data + helpers: no Deno APIs, so it is unit-testable from Vitest.
 */

export interface IntegrationProvider {
  id: string;
  name: string;
  feature: string;
  /** Secret name prefix: <PREFIX>_CLIENT_ID / <PREFIX>_CLIENT_SECRET. */
  secretPrefix: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeSeparator?: " " | ",";
  /** Name of the client-id query/body parameter (TikTok uses client_key). */
  clientIdParam?: string;
  pkce: boolean;
  /** "basic" sends client credentials via HTTP Basic (X, Notion). */
  tokenAuth?: "body" | "basic";
  tokenBody?: "form" | "json";
  extraAuthorize?: Record<string, string>;
  identity:
    | { kind: "userinfo"; url: string; id: string[]; name?: string[]; handle?: string[]; headers?: Record<string, string>; tokenInPath?: boolean }
    | { kind: "token"; id: string[]; name?: string[] };
  revoke?: { url: string; style: "form-token" | "form-token-client" | "basic-token" | "get-token" | "stripe-deauthorize" };
  refreshable: boolean;
  docsUrl: string;
  /** Owner-side requirement beyond client id/secret, shown with Approval required. */
  ownerNote?: string;
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "google_workspace", name: "Google Workspace / Gmail", feature: "Read your Gmail inbox for the unified inbox.",
    secretPrefix: "GOOGLE_WORKSPACE",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"], pkce: true,
    extraAuthorize: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    identity: { kind: "userinfo", url: "https://openidconnect.googleapis.com/v1/userinfo", id: ["sub"], name: ["email"], handle: ["email"] },
    revoke: { url: "https://oauth2.googleapis.com/revoke", style: "form-token" }, refreshable: true,
    docsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
    ownerNote: "gmail.readonly is a restricted scope: Google OAuth verification is required before non-test users can consent.",
  },
  {
    id: "microsoft365", name: "Microsoft 365", feature: "Read your Outlook mail for the unified inbox.",
    secretPrefix: "MICROSOFT365",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "offline_access", "User.Read", "Mail.Read"], pkce: true,
    identity: { kind: "userinfo", url: "https://graph.microsoft.com/v1.0/me", id: ["id"], name: ["displayName"], handle: ["userPrincipalName"] },
    refreshable: true, docsUrl: "https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow",
    ownerNote: "Microsoft has no token-revocation endpoint; disconnect deletes stored credentials and members can remove consent at myapps.microsoft.com.",
  },
  {
    id: "slack", name: "Slack", feature: "Identify your Slack account and workspace.",
    secretPrefix: "SLACK",
    authorizeUrl: "https://slack.com/openid/connect/authorize", tokenUrl: "https://slack.com/api/openid.connect.token",
    scopes: ["openid", "profile", "email"], pkce: false,
    identity: { kind: "userinfo", url: "https://slack.com/api/openid.connect.userInfo", id: ["sub"], name: ["name"], handle: ["email"] },
    revoke: { url: "https://slack.com/api/auth.revoke", style: "get-token" }, refreshable: false,
    docsUrl: "https://api.slack.com/authentication/sign-in-with-slack",
  },
  {
    id: "notion", name: "Notion", feature: "Read pages you explicitly share with CyberLink.",
    secretPrefix: "NOTION",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize", tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [], pkce: false, tokenAuth: "basic", tokenBody: "json", extraAuthorize: { owner: "user" },
    identity: { kind: "token", id: ["owner", "user", "id"], name: ["workspace_name"] },
    refreshable: false, docsUrl: "https://developers.notion.com/docs/authorization",
    ownerNote: "Notion has no revocation endpoint; members remove access under Notion Settings > Connections.",
  },
  {
    id: "discord", name: "Discord", feature: "Identify your Discord account.",
    secretPrefix: "DISCORD",
    authorizeUrl: "https://discord.com/oauth2/authorize", tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify"], pkce: true,
    identity: { kind: "userinfo", url: "https://discord.com/api/users/@me", id: ["id"], name: ["global_name", "username"], handle: ["username"] },
    revoke: { url: "https://discord.com/api/oauth2/token/revoke", style: "form-token-client" }, refreshable: true,
    docsUrl: "https://discord.com/developers/docs/topics/oauth2",
  },
  {
    id: "hubspot", name: "HubSpot", feature: "Read CRM contacts.",
    secretPrefix: "HUBSPOT",
    authorizeUrl: "https://app.hubspot.com/oauth/authorize", tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: ["oauth", "crm.objects.contacts.read"], pkce: false,
    identity: { kind: "userinfo", url: "https://api.hubapi.com/oauth/v1/access-tokens/", tokenInPath: true, id: ["user_id"], name: ["hub_domain"], handle: ["user"] },
    refreshable: true, docsUrl: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide",
    ownerNote: "HubSpot has no per-token revocation for access tokens; disconnect deletes stored credentials.",
  },
  {
    id: "salesforce", name: "Salesforce", feature: "Read CRM records through the Salesforce API.",
    secretPrefix: "SALESFORCE",
    authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize", tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    scopes: ["openid", "api", "refresh_token"], pkce: true,
    identity: { kind: "userinfo", url: "https://login.salesforce.com/services/oauth2/userinfo", id: ["user_id"], name: ["name"], handle: ["email"] },
    revoke: { url: "https://login.salesforce.com/services/oauth2/revoke", style: "form-token" }, refreshable: true,
    docsUrl: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm",
  },
  {
    id: "stripe", name: "Stripe", feature: "Read-only view of your Stripe account balance and payouts.",
    secretPrefix: "STRIPE_CONNECT",
    authorizeUrl: "https://connect.stripe.com/oauth/authorize", tokenUrl: "https://connect.stripe.com/oauth/token",
    scopes: ["read_only"], pkce: false,
    identity: { kind: "token", id: ["stripe_user_id"] },
    revoke: { url: "https://connect.stripe.com/oauth/deauthorize", style: "stripe-deauthorize" }, refreshable: true,
    docsUrl: "https://docs.stripe.com/connect/oauth-reference",
    ownerNote: "Uses Stripe Connect OAuth: STRIPE_CONNECT_CLIENT_ID is the platform ca_… id and STRIPE_CONNECT_CLIENT_SECRET is the platform secret key.",
  },
  {
    id: "x", name: "X", feature: "Identify your X account and read your posts.",
    secretPrefix: "X",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize", tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["users.read", "tweet.read", "offline.access"], pkce: true, tokenAuth: "basic",
    identity: { kind: "userinfo", url: "https://api.twitter.com/2/users/me", id: ["data", "id"], name: ["data", "name"], handle: ["data", "username"] },
    revoke: { url: "https://api.twitter.com/2/oauth2/revoke", style: "basic-token" }, refreshable: true,
    docsUrl: "https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code",
  },
  {
    id: "tiktok", name: "TikTok", feature: "Identify your TikTok account.",
    secretPrefix: "TIKTOK",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/", tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic"], scopeSeparator: ",", clientIdParam: "client_key", pkce: true,
    identity: { kind: "userinfo", url: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", id: ["data", "user", "open_id"], name: ["data", "user", "display_name"] },
    revoke: { url: "https://open.tiktokapis.com/v2/oauth/revoke/", style: "form-token-client" }, refreshable: true,
    docsUrl: "https://developers.tiktok.com/doc/oauth-user-access-token-management",
    ownerNote: "TikTok Login Kit requires an approved app; CLIENT_ID holds the TikTok client key.",
  },
];

export const getIntegration = (id: string) => INTEGRATION_PROVIDERS.find((p) => p.id === id);

export const integrationScope = (p: IntegrationProvider) => p.scopes.join(p.scopeSeparator ?? " ");

/** Missing-configuration reasons; empty means the provider can start OAuth. */
export const missingConfiguration = (
  p: IntegrationProvider,
  env: (name: string) => string | undefined,
): string[] => {
  const missing: string[] = [];
  if (!env(`${p.secretPrefix}_CLIENT_ID`)) missing.push(`${p.secretPrefix}_CLIENT_ID backend secret is not set`);
  if (!env(`${p.secretPrefix}_CLIENT_SECRET`)) missing.push(`${p.secretPrefix}_CLIENT_SECRET backend secret is not set`);
  return missing;
};

/** Build the consent URL. state/challenge are created and stored server-side. */
export const buildAuthorizeUrl = (
  p: IntegrationProvider,
  opts: { clientId: string; redirectUri: string; state: string; codeChallenge?: string | null },
): string => {
  const url = new URL(p.authorizeUrl);
  url.searchParams.set(p.clientIdParam ?? "client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  if (p.scopes.length) url.searchParams.set("scope", integrationScope(p));
  url.searchParams.set("state", opts.state);
  if (p.pkce && opts.codeChallenge) {
    url.searchParams.set("code_challenge", opts.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  for (const [k, v] of Object.entries(p.extraAuthorize ?? {})) url.searchParams.set(k, v);
  return url.toString();
};

export const readPath = (value: unknown, path: string[]): unknown => {
  let current = value;
  for (const segment of path) {
    if (Array.isArray(current) && /^\d+$/.test(segment)) current = current[Number(segment)];
    else if (current && typeof current === "object") current = (current as Record<string, unknown>)[segment];
    else return undefined;
  }
  return current;
};

export const textAt = (value: unknown, paths: string[][]): string | null => {
  for (const path of paths) {
    const v = readPath(value, path);
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 255);
    if (typeof v === "number") return String(v);
  }
  return null;
};

/** Paths may be a nested path (["data","id"]) or a list of alternative top-level keys. */
export const candidatePaths = (path?: string[]): string[][] =>
  !path ? [] : [path, ...path.map((k) => [k])];
