/**
 * Helpers for sign-in redirects.
 *
 * Return paths are always same-origin relative paths so a crafted `next`
 * parameter can never bounce a signed-in user to another site.
 */

export const safeReturnPath = (raw: string | null | undefined): string => {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
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
  if (target === "/" || target.startsWith("/auth")) return "/auth";
  return `/auth?next=${encodeURIComponent(target)}`;
};
