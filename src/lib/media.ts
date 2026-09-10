import { supabase } from "@/integrations/supabase/client";

/** Private bucket holding media that belongs to paid posts. */
export const PAID_MEDIA_BUCKET = "paid-media";

/** Paid media is stored as a bucket path, free media as an absolute public URL. */
export const isPaidMediaPath = (url: string) => !!url && !/^https?:\/\//i.test(url);

type MediaItem = { url: string; type: "image" | "video" };

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabase.storage
    .from(PAID_MEDIA_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  for (const row of data ?? []) {
    if (row?.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}

/**
 * Turns stored paid-media paths into short-lived signed URLs.
 * Access is enforced by storage rules: only the creator or a paying viewer
 * gets a working link, everyone else has the item dropped.
 */
export async function resolvePostsMedia<P extends { media: MediaItem[] }>(
  posts: P[]
): Promise<P[]> {
  const paths = Array.from(
    new Set(
      posts.flatMap((p) => p.media ?? []).map((m) => m.url).filter(isPaidMediaPath)
    )
  );
  if (paths.length === 0) return posts;

  const signed = await signPaths(paths);
  return posts.map((p) => ({
    ...p,
    media: (p.media ?? [])
      .map((m) => (isPaidMediaPath(m.url) ? { ...m, url: signed.get(m.url) ?? "" } : m))
      .filter((m) => !!m.url),
  }));
}
