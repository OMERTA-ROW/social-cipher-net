import { supabase } from "@/integrations/supabase/client";
import { cacheInvalidate, cached } from "@/lib/queryCache";
import { isPermissionError, reportIssue } from "@/lib/monitoring";

/**
 * Paid-post access checks.
 *
 * Access is ultimately enforced server-side (RLS on post_payments plus signed
 * URLs on the private paid-media bucket). The flags here only drive the UI, so
 * when the check itself fails we must NOT show a paywall to someone who may
 * already have paid — we fail open in the UI and report the failure instead.
 */

const TTL_MS = 30_000;

export interface PaidPostInput {
  id: string;
  user_id: string;
  monetization_type: string | null;
}

export interface PaidAccessResult {
  /** post id -> viewer may see the content in the UI */
  unlocked: Set<string>;
  /** true when the access check could not be completed and the UI failed open */
  degraded: boolean;
}

/** Batched lookup of the posts a viewer has paid for. One query for all ids. */
export async function fetchPaidPostIds(postIds: string[], viewerId: string): Promise<Set<string>> {
  const ids = Array.from(new Set(postIds)).filter(Boolean).sort();
  if (ids.length === 0) return new Set();

  const key = `payments:${viewerId}:${ids.join(",")}`;
  return cached(key, TTL_MS, async () => {
    const { data, error } = await supabase
      .from("post_payments")
      .select("post_id")
      .eq("payer_id", viewerId)
      .in("post_id", ids);

    if (error) throw error;
    return new Set((data ?? []).map((row: { post_id: string }) => row.post_id));
  });
}

export function invalidatePaymentAccess(): void {
  cacheInvalidate("payments:");
}

/**
 * Resolves which posts a viewer can see.
 * - signed out: only free posts are unlocked
 * - signed in: free posts, own posts and paid posts are unlocked
 * - check failed: paid posts are NOT rendered as locked (degraded = true)
 */
export async function resolvePaidAccess(
  posts: PaidPostInput[],
  viewerId: string | null,
): Promise<PaidAccessResult> {
  const unlocked = new Set<string>();
  const needsCheck: string[] = [];

  for (const post of posts) {
    if ((post.monetization_type ?? "free") === "free") {
      unlocked.add(post.id);
    } else if (viewerId && post.user_id === viewerId) {
      unlocked.add(post.id);
    } else if (viewerId) {
      needsCheck.push(post.id);
    }
  }

  if (!viewerId || needsCheck.length === 0) {
    return { unlocked, degraded: false };
  }

  try {
    const paid = await fetchPaidPostIds(needsCheck, viewerId);
    for (const id of paid) unlocked.add(id);
    return { unlocked, degraded: false };
  } catch (error) {
    reportIssue(
      isPermissionError(error) ? "post_payments_permission_denied" : "post_payments_check_failed",
      error,
      { postCount: needsCheck.length },
    );
    // Fail open in the UI: never paywall a viewer who might already have paid.
    for (const id of needsCheck) unlocked.add(id);
    return { unlocked, degraded: true };
  }
}
