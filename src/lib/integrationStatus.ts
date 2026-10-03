/**
 * Display status for account integrations. "Connected" is only ever derived
 * from a server-written row (RLS lets members read but never write it) that
 * carries a provider-verified account id.
 */
export const INTEGRATION_STATES = [
  "Not connected",
  "Connecting",
  "Approval required",
  "Connected",
  "Connection failed",
  "Disconnected",
] as const;
export type IntegrationState = (typeof INTEGRATION_STATES)[number];

export interface ServerConnectionRow {
  status: string | null;
  provider_account_id?: string | null;
  last_error?: string | null;
  health?: string | null;
}

/**
 * The single rule for showing "Connected"/"Active" anywhere in the app: a
 * server-written connected row, a provider-verified account id, and no
 * outstanding provider error. Rows saved from pasted keys, or rows whose
 * provider rejected the token, never qualify. Purely a display rule —
 * nothing is deleted or revoked.
 */
export const isVerifiedConnection = (row: ServerConnectionRow | null | undefined) =>
  !!row &&
  row.status === "connected" &&
  !!row.provider_account_id &&
  !row.last_error &&
  !["failing", "error", "unverified", "replaced"].includes(String(row.health ?? ""));

/** A row that exists but has a provider error / failing health. */
export const connectionNeedsAttention = (row: ServerConnectionRow | null | undefined) =>
  !!row && (row.status === "error" || !!row.last_error || row.health === "failing" || row.health === "error");

export interface StatusInput {
  row: ServerConnectionRow | null;
  missingConfig: string[] | null; // null = config status unknown/unavailable
  connecting: boolean;
  lastResult: "failed" | "disconnected" | null;
}

export const integrationState = ({ row, missingConfig, connecting, lastResult }: StatusInput): IntegrationState => {
  if (connecting) return "Connecting";
  if (isVerifiedConnection(row)) return "Connected";
  if (connectionNeedsAttention(row)) return "Connection failed";
  if (row?.status === "error" || lastResult === "failed") return "Connection failed";
  if (lastResult === "disconnected") return "Disconnected";
  if (missingConfig === null || missingConfig.length > 0) return "Approval required";
  return "Not connected";
};

/** Return-path + result handoff between /integrations, the provider and /auth/callback (tab-scoped). */
const RETURN_KEY = "cl_integration_return";
const RESULT_KEY = "cl_integration_result";

export interface IntegrationResult { serviceId: string | null; ok: boolean; message: string }

const ss = () => { try { return window.sessionStorage; } catch { return null; } };

export const rememberIntegrationReturn = (path: string) => ss()?.setItem(RETURN_KEY, path.startsWith("/") && !path.startsWith("//") ? path : "/integrations");
export const takeIntegrationReturn = (): string => {
  const s = ss(); const v = s?.getItem(RETURN_KEY); s?.removeItem(RETURN_KEY);
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/integrations";
};
export const storeIntegrationResult = (r: IntegrationResult) => ss()?.setItem(RESULT_KEY, JSON.stringify(r));
export const takeIntegrationResult = (): IntegrationResult | null => {
  const s = ss(); const raw = s?.getItem(RESULT_KEY); s?.removeItem(RESULT_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v.ok === "boolean" && typeof v.message === "string" ? { serviceId: typeof v.serviceId === "string" ? v.serviceId : null, ok: v.ok, message: v.message } : null;
  } catch { return null; }
};

/**
 * An integration return carries `state` plus code/error AND this tab started an
 * integration (return marker present). Sign-in and recovery returns lack both.
 */
export const isIntegrationReturn = (search: URLSearchParams, hasPending = Boolean(ss()?.getItem(RETURN_KEY))) =>
  hasPending && search.has("state") && (search.has("code") || search.has("error"));
