/**
 * Encrypted credential vault.
 *
 * Every connector token and key is encrypted with AES-GCM before it touches the
 * database, using a per-connection data key derived from the project master key.
 * Nothing in here is ever returned to the browser — only server code calls it.
 */

const MASTER = () =>
  Deno.env.get("CONNECTOR_ENCRYPTION_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Per-connection data key: HKDF-style derivation from the master secret. */
const dataKey = async (connectionId: string): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(MASTER()),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("cyberlink-connector-v1"),
      info: enc.encode(connectionId),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptSecret = async (
  connectionId: string,
  plaintext: string,
): Promise<string> => {
  const key = await dataKey(connectionId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)),
  );
  return `v1.${b64(iv)}.${b64(cipher)}`;
};

export const decryptSecret = async (
  connectionId: string,
  stored: string,
  encrypted: boolean,
): Promise<string> => {
  // Values written before the vault existed are still plaintext; read them
  // as-is so nobody's existing connection breaks, and they get re-encrypted
  // the next time they are saved or refreshed.
  if (!encrypted || !stored.startsWith("v1.")) return stored;
  const [, ivPart, cipherPart] = stored.split(".");
  const key = await dataKey(connectionId);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivPart) },
    key,
    unb64(cipherPart),
  );
  return dec.decode(plain);
};

export interface SecretBag {
  [key: string]: string;
}

// deno-lint-ignore no-explicit-any
type Admin = any;

export const MAX_SECRET_LENGTH = 16000;

/** Store one credential, encrypted. */
export const putSecret = async (
  admin: Admin,
  opts: {
    connectionId: string;
    userId: string;
    type: string;
    value: string;
    expiresAt?: string | null;
  },
) => {
  // Reject rather than truncate: a cut token is silently corrupt.
  if (opts.value.length > MAX_SECRET_LENGTH) {
    return `Credential "${opts.type.slice(0, 64)}" exceeds ${MAX_SECRET_LENGTH} characters and was not stored`;
  }
  const value = await encryptSecret(opts.connectionId, opts.value);
  const { error } = await admin.from("connection_secrets").upsert(
    {
      connection_id: opts.connectionId,
      user_id: opts.userId,
      secret_type: opts.type.slice(0, 64),
      secret_value: value,
      encrypted: true,
      expires_at: opts.expiresAt ?? null,
    },
    { onConflict: "connection_id,secret_type" },
  );
  return error?.message ?? null;
};

/** Load every credential for a connection, decrypted, server-side only. */
export const getSecrets = async (
  admin: Admin,
  connectionId: string,
): Promise<SecretBag> => {
  const { data } = await admin
    .from("connection_secrets")
    .select("secret_type, secret_value, encrypted")
    .eq("connection_id", connectionId);

  const bag: SecretBag = {};
  for (const row of data ?? []) {
    try {
      bag[row.secret_type] = await decryptSecret(
        connectionId,
        row.secret_value,
        row.encrypted,
      );
    } catch {
      // A credential we cannot decrypt is treated as missing rather than
      // crashing the whole action.
    }
  }
  return bag;
};
