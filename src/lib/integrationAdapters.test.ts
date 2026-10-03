import { describe, expect, it } from "vitest";
import {
  getIntegration,
  grantedScopes,
  missingConfiguration,
  buildAuthorizeUrl,
} from "../../supabase/functions/_shared/accountIntegrations";

const env = (vals: Record<string, string>) => (n: string) => vals[n];

describe("provider adapters", () => {
  it("Stripe never requests read_only and stays blocked until app type is verified", () => {
    const p = getIntegration("stripe")!;
    expect(p.scopes).not.toContain("read_only");
    expect(p.successField).toBe("stripe_user_id");
    const url = buildAuthorizeUrl(p, { clientId: "ca_x", redirectUri: "https://cyberlink.social/auth/callback", state: "s" });
    expect(new URL(url).searchParams.has("scope")).toBe(false);
    const missing = missingConfiguration(p, env({ STRIPE_CONNECT_CLIENT_ID: "a", STRIPE_CONNECT_CLIENT_SECRET: "b" }));
    expect(missing.length).toBe(1);
  });

  it("TikTok uses client_key and Notion uses Basic+JSON", () => {
    const t = getIntegration("tiktok")!;
    expect(new URL(buildAuthorizeUrl(t, { clientId: "k", redirectUri: "https://x/auth/callback", state: "s" })).searchParams.get("client_key")).toBe("k");
    const n = getIntegration("notion")!;
    expect(n.tokenAuth).toBe("basic");
    expect(n.tokenBody).toBe("json");
  });

  it("Gmail integration asks for gmail scope, distinct from sign-in", () => {
    expect(getIntegration("google_workspace")!.scopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("records granted scopes from the provider, not just requested ones", () => {
    const p = getIntegration("google_workspace")!;
    expect(grantedScopes(p, { scope: "openid email" })).toEqual(["openid", "email"]);
    expect(grantedScopes(getIntegration("tiktok")!, { scope: "user.info.basic" })).toEqual(["user.info.basic"]);
  });
});
