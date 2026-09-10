import { supabase } from "@/integrations/supabase/client";
import { resolvePostsMedia } from "@/lib/media";

export interface SocialProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_post_id: string | null;
  like_count: number;
  reply_count: number;
  monetization_type: string;
  price: number;
  is_demo: boolean;
  profile: SocialProfile | null;
  media: Array<{ url: string; type: "image" | "video" }>;
}

const POST_SELECT = `
  id, user_id, content, created_at, parent_post_id, like_count, reply_count,
  monetization_type, price, is_demo,
  profiles!posts_user_id_fkey(id, username, display_name, avatar_url, is_verified),
  post_media(media_url, media_type, display_order)
`;

const mapPost = (row: any): SocialPost => ({
  id: row.id,
  user_id: row.user_id,
  content: row.content,
  created_at: row.created_at,
  parent_post_id: row.parent_post_id,
  like_count: row.like_count ?? 0,
  reply_count: row.reply_count ?? 0,
  monetization_type: row.monetization_type ?? "free",
  price: Number(row.price ?? 0),
  is_demo: !!row.is_demo,
  profile: row.profiles ?? null,
  media: (row.post_media ?? [])
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((m: any) => ({ url: m.media_url, type: (m.media_type === "video" ? "video" : "image") as "image" | "video" })),
});

export const displayNameOf = (p: SocialProfile | null) =>
  p?.display_name || p?.username || "Anonymous";

export const FEED_PAGE_SIZE = 20;

export interface FeedPage {
  posts: SocialPost[];
  /** created_at of the last row; pass back as `cursor` to fetch the next page. */
  nextCursor: string | null;
  hasMore: boolean;
}

const toPage = async (rows: any[], limit: number): Promise<FeedPage> => {
  const posts = await resolvePostsMedia(rows.map(mapPost));
  return {
    posts,
    nextCursor: posts.length ? posts[posts.length - 1].created_at : null,
    hasMore: rows.length === limit,
  };
};

/** Keyset-paginated public feed (uses idx_posts_root_created_at). */
export async function fetchDiscoverFeed(
  limit = FEED_PAGE_SIZE,
  cursor?: string | null
): Promise<FeedPage> {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_post_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  return await toPage(data ?? [], limit);
}

/** Paginated list of the accounts a user follows. */
export async function fetchFollowingIds(
  userId: string,
  limit = 500,
  offset = 0
): Promise<string[]> {
  const { data, error } = await supabase
    .from("followers")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id);
}

/** Paginated list of a user's followers. */
export async function fetchFollowerIds(
  userId: string,
  limit = 50,
  offset = 0
): Promise<string[]> {
  const { data, error } = await supabase
    .from("followers")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((r) => r.follower_id);
}

/** Fetch profile rows for a set of ids in one query. */
export async function fetchProfiles(ids: string[]): Promise<SocialProfile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .in("id", ids);
  if (error) throw error;
  return data ?? [];
}

/** Efficient follower/following counts via a single RPC. */
export async function fetchFollowCounts(userId: string) {
  const { data, error } = await supabase.rpc("get_follow_counts", { target_user: userId });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    followers: row?.followers_count ?? 0,
    following: row?.following_count ?? 0,
  };
}

/** Keyset-paginated feed of posts from followed accounts. */
export async function fetchFollowingFeed(
  userId: string,
  limit = FEED_PAGE_SIZE,
  cursor?: string | null,
  followingIds?: string[]
): Promise<FeedPage> {
  const ids = followingIds ?? (await fetchFollowingIds(userId));
  const authors = Array.from(new Set([...ids, userId]));
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_post_id", null)
    .in("user_id", authors)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  return await toPage(data ?? [], limit);
}


export async function fetchPost(postId: string): Promise<SocialPost | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await resolvePostsMedia([mapPost(data)]);
  return post ?? null;
}

/** Fetches all descendants of a root post and nests them. */
export interface ThreadNode extends SocialPost {
  children: ThreadNode[];
}

export async function fetchThread(rootId: string): Promise<ThreadNode[]> {
  const nodes: ThreadNode[] = [];
  let frontier = [rootId];
  // Breadth-first, bounded depth to keep queries predictable.
  for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
    const { data, error } = await supabase
      .from("posts")
      .select(POST_SELECT)
      .in("parent_post_id", frontier)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const level = await resolvePostsMedia(
      (data ?? []).map((r) => ({ ...mapPost(r), children: [] as ThreadNode[] }))
    );
    nodes.push(...level);
    frontier = level.map((n) => n.id);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: ThreadNode[] = [];
  for (const node of nodes) {
    const parent = node.parent_post_id ? byId.get(node.parent_post_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
