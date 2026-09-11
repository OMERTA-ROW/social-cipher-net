import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client monitoring. Emits structured, greppable console entries so
 * regressions (paid-post permission denials, feed load failures) surface in the
 * project's error logs and alerting instead of being silently swallowed.
 * Permission/RLS failures are additionally forwarded to the security audit log
 * so they can raise a production alert.
 */


export type MonitoredArea =
  | "post_payments_permission_denied"
  | "post_payments_check_failed"
  | "feed_load_failed"
  | "stories_load_failed";

export const MONITOR_TAG = "[cyberlink-monitor]";

interface MonitorDetail {
  [key: string]: unknown;
}

const counters = new Map<MonitoredArea, number>();
const lastReportedAt = new Map<string, number>();
const THROTTLE_MS = 10_000;

/** Postgres permission-denied / RLS rejection codes. */
const PERMISSION_CODES = new Set(["42501", "PGRST301", "PGRST116"]);

export function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  if (e.code && PERMISSION_CODES.has(e.code)) return true;
  if (e.status === 401 || e.status === 403) return true;
  return /permission denied|not authorized|row-level security/i.test(e.message ?? "");
}

export function monitorCount(area: MonitoredArea): number {
  return counters.get(area) ?? 0;
}

/** Reports a monitored failure. Repeated identical failures are throttled. */
export function reportIssue(area: MonitoredArea, error: unknown, detail: MonitorDetail = {}): void {
  counters.set(area, monitorCount(area) + 1);

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error ?? "unknown error");

  const key = `${area}:${message}`;
  const now = Date.now();
  const previous = lastReportedAt.get(key) ?? 0;
  if (now - previous < THROTTLE_MS) return;
  lastReportedAt.set(key, now);

  const permissionError = isPermissionError(error);
  const path = typeof window !== "undefined" ? window.location?.pathname : undefined;

  console.error(`${MONITOR_TAG} ${area}`, {
    area,
    message,
    occurrences: monitorCount(area),
    permissionError,
    path,
    at: new Date(now).toISOString(),
    ...detail,
  });

  // Permission / RLS rejections raise a production alert via the audit log.
  if (permissionError || area === "post_payments_permission_denied") {
    void supabase.functions
      .invoke("security-alerts", {
        body: { action: "report", event_type: area, message, path, detail },
      })
      .catch(() => {
        /* alerting must never break the UI */
      });
  }
}


/** Test/diagnostic helper. */
export function resetMonitoring(): void {
  counters.clear();
  lastReportedAt.clear();
}
