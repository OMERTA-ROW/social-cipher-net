/** Server-only token exchange, identity, refresh and revocation for account integrations. */
import { candidatePaths, type IntegrationProvider, textAt } from "./accountIntegrations.ts";

export interface Creds { clientId: string; clientSecret: string }

const providerFetch = (url: string, init: RequestInit = {}) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });

const tokenRequest = async (p: IntegrationProvider, creds: Creds, params: Record<string, string>) => {
  const headers: Record<string, string> = { Accept: "application/json" };
  const body: Record<string, string> = { ...params };
  if (p.tokenAuth === "basic") {
    headers.Authorization = `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`;
    if (p.id === "x") body.client_id = creds.clientId; // X expects client_id alongside Basic auth for PKCE
  } else {
    body[p.clientIdParam ?? "client_id"] = creds.clientId;
    body.client_secret = creds.clientSecret;
  }
  let payload: string;
  if (p.tokenBody === "json") {
    headers["Content-Type"] = "application/json";
    if (p.id === "notion") headers["Notion-Version"] = "2022-06-28";
    payload = JSON.stringify(body);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(body).toString();
  }
  const res = await providerFetch(p.tokenUrl, { method: "POST", headers, body: payload });
  const json = await res.json().catch(() => ({}));
  return { ok: tokenResponseOk(p, res.ok, json), json: json as Record<string, unknown> };
};

/** Strict success check: HTTP ok, no error, Slack ok!==false, and the provider's proof field present. */
export const tokenResponseOk = (p: IntegrationProvider, httpOk: boolean, json: Record<string, unknown>) => {
  // TikTok wraps errors in a 200 body; Slack reports ok:false.
  const proof = json[p.successField ?? "access_token"];
  return httpOk && !json.error && json.ok !== false && typeof proof === "string" && proof.length > 0;
};

export const exchangeCode = (p: IntegrationProvider, creds: Creds, code: string, redirectUri: string, verifier: string | null) =>
  tokenRequest(p, creds, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    ...(verifier ? { code_verifier: verifier } : {}),
  });

export const refreshToken = (p: IntegrationProvider, creds: Creds, refresh: string) =>
  tokenRequest(p, creds, { grant_type: "refresh_token", refresh_token: refresh });

export const fetchIdentity = async (p: IntegrationProvider, tokenBody: Record<string, unknown>) => {
  const id = p.identity;
  if (id.kind === "token") {
    const pid = textAt(tokenBody, candidatePaths(id.id));
    return pid ? { id: pid, name: textAt(tokenBody, candidatePaths(id.name)), handle: null as string | null } : null;
  }
  const access = String(tokenBody.access_token);
  const url = id.tokenInPath ? `${id.url}${encodeURIComponent(access)}` : id.url;
  const headers: Record<string, string> = { ...(id.headers ?? {}) };
  if (!id.tokenInPath) headers.Authorization = `Bearer ${access}`;
  const res = await providerFetch(url, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || (body as { ok?: boolean }).ok === false) return null;
  const pid = textAt(body, candidatePaths(id.id));
  if (!pid) return null;
  return { id: pid, name: textAt(body, candidatePaths(id.name)), handle: textAt(body, candidatePaths(id.handle)) };
};

/** Returns "revoked", "unsupported" or "failed". Never throws. */
export const revokeToken = async (
  p: IntegrationProvider,
  creds: Creds | null,
  secrets: { access_token?: string; refresh_token?: string; provider_account_id?: string },
): Promise<"revoked" | "unsupported" | "failed"> => {
  if (!p.revoke) return "unsupported";
  const token = secrets.refresh_token ?? secrets.access_token;
  try {
    let res: Response;
    const form = (b: Record<string, string>, extra: Record<string, string> = {}) => ({
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...extra },
      body: new URLSearchParams(b).toString(),
    });
    switch (p.revoke.style) {
      case "form-token":
        if (!token) return "failed";
        res = await providerFetch(p.revoke.url, form({ token }));
        break;
      case "form-token-client":
        if (!token || !creds) return "failed";
        res = await providerFetch(p.revoke.url, form({ token, [p.clientIdParam ?? "client_id"]: creds.clientId, client_secret: creds.clientSecret }));
        break;
      case "basic-token":
        if (!token || !creds) return "failed";
        res = await providerFetch(p.revoke.url, form({ token, client_id: creds.clientId }, { Authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}` }));
        break;
      case "get-token":
        if (!secrets.access_token) return "failed";
        res = await providerFetch(p.revoke.url, { headers: { Authorization: `Bearer ${secrets.access_token}` } });
        break;
      case "stripe-deauthorize":
        if (!creds || !secrets.provider_account_id) return "failed";
        res = await providerFetch(p.revoke.url, form({ client_id: creds.clientId, stripe_user_id: secrets.provider_account_id }, { Authorization: `Bearer ${creds.clientSecret}` }));
        break;
    }
    return res.ok ? "revoked" : "failed";
  } catch {
    return "failed";
  }
};
