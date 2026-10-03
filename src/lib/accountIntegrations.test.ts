import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, getIntegration, INTEGRATION_PROVIDERS, missingConfiguration } from "../../supabase/functions/_shared/accountIntegrations";
import { oauthRedirectIsAllowed, sanitizeOAuthError, trustedOAuthRedirect } from "../../supabase/functions/_shared/connectorOAuthSecurity";
import { integrationState, isIntegrationReturn, INTEGRATION_STATES } from "./integrationStatus";

const REQUIRED = ["google_workspace", "microsoft365", "slack", "notion", "discord", "hubspot", "salesforce", "stripe", "x", "tiktok"];

describe("integration registry", () => {
  it("covers every requested provider", () => expect(INTEGRATION_PROVIDERS.map((p) => p.id).sort()).toEqual([...REQUIRED].sort()));
  it("uses https endpoints only", () => {
    for (const p of INTEGRATION_PROVIDERS) {
      expect(p.authorizeUrl.startsWith("https://")).toBe(true);
      expect(p.tokenUrl.startsWith("https://")).toBe(true);
    }
  });
  it("never requests write/publish scopes", () => {
    for (const p of INTEGRATION_PROVIDERS) for (const s of p.scopes) expect(s).not.toMatch(/write|publish|send|modify|upload|full|admin/i);
  });
  it("reports exact missing secrets and is startable only when both exist", () => {
    const p = getIntegration("slack")!;
    expect(missingConfiguration(p, () => undefined)).toEqual(["SLACK_CLIENT_ID backend secret is not set", "SLACK_CLIENT_SECRET backend secret is not set"]);
    expect(missingConfiguration(p, (n) => (n === "SLACK_CLIENT_ID" ? "id" : undefined))).toHaveLength(1);
    expect(missingConfiguration(p, () => "x")).toEqual([]);
  });
  it("builds consent URLs with state, PKCE S256 and the provider's client param", () => {
    const u = new URL(buildAuthorizeUrl(getIntegration("tiktok")!, { clientId: "ck", redirectUri: "https://cyberlink.social/auth/callback", state: "st", codeChallenge: "ch" }));
    expect(u.searchParams.get("client_key")).toBe("ck");
    expect(u.searchParams.get("client_id")).toBeNull();
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("scope")).toBe("user.info.basic");
    const s = new URL(buildAuthorizeUrl(getIntegration("slack")!, { clientId: "c", redirectUri: "r", state: "s", codeChallenge: "ignored" }));
    expect(s.searchParams.get("code_challenge")).toBeNull();
  });
});

describe("callback allowlist", () => {
  it("accepts only /auth/callback on approved origins", () => {
    expect(oauthRedirectIsAllowed("https://cyberlink.social/auth/callback")).toBe(true);
    expect(oauthRedirectIsAllowed("https://www.cyberlink.social/auth/callback")).toBe(true);
    expect(oauthRedirectIsAllowed("https://social-cipher-net.lovable.app/auth/callback")).toBe(true);
    expect(oauthRedirectIsAllowed("https://cyberlink.social/integrations")).toBe(false);
    expect(oauthRedirectIsAllowed("https://evil.example/auth/callback")).toBe(false);
    expect(oauthRedirectIsAllowed("https://cyberlink.social.evil.example/auth/callback")).toBe(false);
  });
  it("derives the callback from a trusted Origin header only", () => {
    expect(trustedOAuthRedirect("https://cyberlink.social")).toBe("https://cyberlink.social/auth/callback");
    expect(trustedOAuthRedirect("https://attacker.example")).toBeNull();
    expect(trustedOAuthRedirect(null)).toBeNull();
  });
  it("maps cancellation and replay to safe messages", () => {
    expect(sanitizeOAuthError("access_denied")).toMatch(/cancelled/);
    expect(sanitizeOAuthError("invalid state")).toMatch(/expired/);
    expect(sanitizeOAuthError("<script>")).not.toMatch(/script/);
  });
});

describe("integration status", () => {
  const base = { row: null, missingConfig: [] as string[] | null, connecting: false, lastResult: null };
  it("uses only the six allowed labels", () => expect(INTEGRATION_STATES).not.toContain("Active"));
  it("needs a server row with a verified provider account for Connected", () => {
    expect(integrationState({ ...base, row: { status: "connected", provider_account_id: "u1" } })).toBe("Connected");
    expect(integrationState({ ...base, row: { status: "connected", provider_account_id: null } })).toBe("Not connected");
    expect(integrationState({ ...base, row: { status: "pending", provider_account_id: "u1" } })).toBe("Not connected");
  });
  it("shows Approval required when config is missing or unknown", () => {
    expect(integrationState({ ...base, missingConfig: ["X_CLIENT_ID backend secret is not set"] })).toBe("Approval required");
    expect(integrationState({ ...base, missingConfig: null })).toBe("Approval required");
  });
  it("covers connecting, failed and disconnected", () => {
    expect(integrationState({ ...base, connecting: true })).toBe("Connecting");
    expect(integrationState({ ...base, lastResult: "failed" })).toBe("Connection failed");
    expect(integrationState({ ...base, row: { status: "error", provider_account_id: "u" } })).toBe("Connection failed");
    expect(integrationState({ ...base, lastResult: "disconnected" })).toBe("Disconnected");
  });
  it("only treats provider returns from an integration this tab started as integration returns", () => {
    const q = new URLSearchParams("code=a&state=b");
    expect(isIntegrationReturn(q, true)).toBe(true);
    expect(isIntegrationReturn(q, false)).toBe(false);
    expect(isIntegrationReturn(new URLSearchParams("code=a"), true)).toBe(false);
    expect(isIntegrationReturn(new URLSearchParams("error=access_denied&state=b"), true)).toBe(true);
  });
});
