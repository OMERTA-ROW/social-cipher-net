import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { signOAuthState, verifyOAuthState } from "./oauthState.ts";

Deno.test("legacy signed state requires one-time server consumption", async () => {
  Deno.env.set("OAUTH_STATE_SECRET", "test-only-state-secret-with-enough-entropy");
  const state = await signOAuthState("00000000-0000-4000-8000-000000000001", "google");
  const used = new Set<string>();
  const consume = async ({ nonce }: { nonce: string }) => {
    if (used.has(nonce)) return false;
    used.add(nonce);
    return true;
  };

  const first = await verifyOAuthState(state, consume);
  assertEquals(first.platform, "google");
  await assertRejects(() => verifyOAuthState(state, consume), Error, "already used");
});

Deno.test("legacy signed state is rejected when server consumption fails", async () => {
  Deno.env.set("OAUTH_STATE_SECRET", "test-only-state-secret-with-enough-entropy");
  const state = await signOAuthState("00000000-0000-4000-8000-000000000001", "google");
  await assertRejects(() => verifyOAuthState(state, async () => false), Error, "already used");
});