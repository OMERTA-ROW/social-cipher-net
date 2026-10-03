/**
 * Helpers for sign-in redirects.
 *
 * Return paths are always same-origin relative paths so a crafted `next`
 * parameter can never bounce a signed-in user to another site.
 */

export const safeReturnPath = (raw: string | null | undefined): string => {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) return "/";
  return raw;
};

/** The path the user is on right now, safe to hand back after sign-in. */
export const currentReturnPath = (): string => {
  if (typeof window === "undefined") return "/";
  const { pathname, search } = window.location;
  return safeReturnPath(`${pathname}${search}`);
};

/** `/auth` with a same-origin return path attached when there is one worth keeping. */
export const signInPath = (next: string = currentReturnPath()): string => {
  const target = safeReturnPath(next);
  if (target === "/" || /^\/(auth|login|signup|forgot-password|reset-password)(?:[/?#]|$)/.test(target)) return "/login";
  return `/login?next=${encodeURIComponent(target)}`;
};

/**
 * Proof that the current session came from a password-recovery link processed
 * in this tab. An ordinary signed-in session never carries it, so it cannot
 * masquerade as a verified recovery on /reset-password. Expires after 15 min.
 */
const RECOVERY_KEY = "cl_recovery_verified_at";
const RECOVERY_TTL_MS = 15 * 60 * 1000;
export const markRecoveryVerified = () => {
  try { sessionStorage.setItem(RECOVERY_KEY, String(Date.now())); } catch { /* storage blocked */ }
};
export const hasVerifiedRecovery = (now = Date.now()): boolean => {
  try {
    const at = Number(sessionStorage.getItem(RECOVERY_KEY));
    return Number.isFinite(at) && at > 0 && now - at < RECOVERY_TTL_MS;
  } catch { return false; }
};
export const clearRecoveryVerified = () => {
  try { sessionStorage.removeItem(RECOVERY_KEY); } catch { /* storage blocked */ }
};
