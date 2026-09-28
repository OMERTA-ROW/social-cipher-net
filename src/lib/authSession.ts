/**
 * Auth-session helpers shared by startup code and the feed.
 * Pure functions so they can be regression-tested without a browser.
 */

/** True when a stored value looks like a real serialized session object. */
export function isValidStoredSession(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && typeof parsed === "object" && typeof parsed.access_token === "string";
  } catch {
    return false;
  }
}

/** Serialize a session for storage; never lets an object coerce to "[object Object]". */
export function serializeSession(session: unknown): string {
  return typeof session === "string" ? session : JSON.stringify(session);
}

interface StorageLike {
  length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  removeItem(k: string): void;
}

/**
 * Removes corrupted auth-token entries (e.g. "[object Object]") so the auth
 * client starts cleanly signed-out instead of failing to restore.
 * Returns the keys that were removed.
 */
export function purgeCorruptAuthSessions(storage: StorageLike): string[] {
  const removed: string[] = [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && /^sb-.+-auth-token$/.test(k)) keys.push(k);
  }
  for (const k of keys) {
    if (!isValidStoredSession(storage.getItem(k))) {
      storage.removeItem(k);
      removed.push(k);
    }
  }
  return removed;
}

export type FeedTabKind = "for-you" | "following" | "discover" | "shop" | "market";
export type FeedAction = "wait" | "prompt-sign-in" | "load" | "skip";

/** Decide what the feed should do given auth state. Ranked feed needs a session. */
export function feedLoadAction(authReady: boolean, userId: string | null, tab: FeedTabKind): FeedAction {
  if (tab === "shop" || tab === "market") return "skip";
  if (!authReady) return "wait";
  // Discovery is a public feed; only For You (ranked RPC) and Following need a session.
  if (!userId) return tab === "discover" ? "load" : "prompt-sign-in";
  return "load";
}

/** User-facing feed error text; never passes raw database messages through. */
export function feedErrorMessage(paging = false): string {
  return paging
    ? "Couldn't load more posts. Please try again in a moment."
    : "Couldn't load posts. Please try again in a moment.";
}
