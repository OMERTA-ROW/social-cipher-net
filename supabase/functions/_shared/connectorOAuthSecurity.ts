const encoder = new TextEncoder();

export const OAUTH_ATTEMPT_TTL_MS = 10 * 60 * 1000;

export const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const sha256 = async (value: string): Promise<string> =>
  base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

export const createOAuthState = (): string => base64Url(crypto.getRandomValues(new Uint8Array(32)));

export const createCodeVerifier = (): string => base64Url(crypto.getRandomValues(new Uint8Array(48)));

export const oauthRedirectIsAllowed = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    const allowedOrigins = new Set([
      "https://cyberlink.social",
      "https://www.cyberlink.social",
      "https://social-cipher-net.lovable.app",
      "https://id-preview--f6447429-4027-45e0-bfb6-e09c4b149510.lovable.app",
      "http://localhost:8080",
    ]);
    return allowedOrigins.has(url.origin) && ["/integrations", "/connectors"].includes(url.pathname);
  } catch {
    return false;
  }
};

export const trustedOAuthRedirect = (requestOrigin: string | null): string | null => {
  if (!requestOrigin) return null;
  try {
    const callback = new URL("/integrations", requestOrigin).toString();
    return oauthRedirectIsAllowed(callback) ? callback : null;
  } catch {
    return null;
  }
};

export const sanitizeOAuthError = (value: unknown): string => {
  const text = typeof value === "string" ? value : "Authorization failed";
  if (/cancel|denied|access_denied/i.test(text)) return "Authorization was cancelled. Your existing connection was not changed.";
  if (/expired|state/i.test(text)) return "This authorization attempt expired. Please try again.";
  return "The provider could not complete authorization. Your existing connection was not changed.";
};