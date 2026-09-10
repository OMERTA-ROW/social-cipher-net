// Shared helpers for signing and verifying OAuth `state` values.
// The state is HMAC-signed server-side so a forged/replayed state cannot be
// used to attach an attacker's social account to another user's profile.

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getKeyMaterial(): string {
  const secret =
    Deno.env.get("OAUTH_STATE_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";
  if (!secret) throw new Error("OAuth state secret is not configured");
  return secret;
}

function b64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getKeyMaterial()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

export interface OAuthStatePayload {
  user_id: string;
  platform: string;
  nonce: string;
  iat: number;
}

export async function signOAuthState(user_id: string, platform: string): Promise<string> {
  const payload: OAuthStatePayload = {
    user_id,
    platform,
    nonce: crypto.randomUUID(),
    iat: Date.now(),
  };
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(encoded);
  return `${encoded}.${signature}`;
}

export async function verifyOAuthState(state: string): Promise<OAuthStatePayload> {
  const parts = state.split(".");
  if (parts.length !== 2) throw new Error("Invalid state parameter");

  const [encoded, signature] = parts;
  const expected = await hmac(encoded);

  // constant-length comparison of two equal-length base64url strings
  if (signature.length !== expected.length) throw new Error("Invalid state signature");
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) throw new Error("Invalid state signature");

  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded))) as OAuthStatePayload;

  if (!payload?.user_id || !payload?.platform || typeof payload.iat !== "number") {
    throw new Error("Invalid state payload");
  }
  if (Date.now() - payload.iat > STATE_TTL_MS) {
    throw new Error("State parameter has expired");
  }

  return payload;
}
