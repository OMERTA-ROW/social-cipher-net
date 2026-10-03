import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createCodeVerifier, createOAuthState, oauthRedirectIsAllowed, sanitizeOAuthError, sha256, trustedOAuthRedirect } from "./connectorOAuthSecurity.ts";

Deno.test("OAuth state is random and hashable", async () => {
  const first = createOAuthState();
  const second = createOAuthState();
  assertNotEquals(first, second);
  assertEquals((await sha256(first)).length, 43);
  assert(createCodeVerifier().length >= 43);
});

Deno.test("OAuth redirect allowlist rejects external and malformed routes", () => {
  assert(oauthRedirectIsAllowed("http://localhost:8080/integrations"));
  assertEquals(oauthRedirectIsAllowed("https://evil.example/integrations"), false);
  assertEquals(oauthRedirectIsAllowed("http://localhost:8080/admin"), false);
});

Deno.test("OAuth callback is derived from a trusted request origin", () => {
  assertEquals(trustedOAuthRedirect("https://cyberlink.social"), "https://cyberlink.social/auth/callback");
  assertEquals(trustedOAuthRedirect("https://evil.example"), null);
  assertEquals(trustedOAuthRedirect(null), null);
});

Deno.test("OAuth errors are sanitized", () => {
  assertEquals(sanitizeOAuthError("access_denied"), "Authorization was cancelled. Your existing connection was not changed.");
  assertEquals(sanitizeOAuthError("database password leaked"), "The provider could not complete authorization. Your existing connection was not changed.");
});