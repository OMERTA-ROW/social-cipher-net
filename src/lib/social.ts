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
  repost_count: number;
  monetization_type: string;
  price: number;
  is_demo: boolean;
  is_sponsored: boolean;
  sponsor_name: string | null;
  affiliate_link_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  profile: SocialProfile | null;
  media: Array<{ url: string; type: "image" | "video" }>;
}

const POST_SELECT = `
  id, user_id, content, created_at, parent_post_id, like_count, reply_count, repost_count,
  monetization_type, price, is_demo, is_sponsored, sponsor_name, affiliate_link_id,
  subject_type, subject_id,
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
  repost_count: row.repost_count ?? 0,
  monetization_type: row.monetization_type ?? "free",
  price: Number(row.price ?? 0),
  is_demo: !!row.is_demo,
  is_sponsored: !!row.is_sponsored,
  sponsor_name: row.sponsor_name ?? null,
  affiliate_link_id: row.affiliate_link_id ?? null,
  subject_type: row.subject_type ?? null,
  subject_id: row.subject_id ?? null,
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

/**
 * Ranked "For You" feed: engagement (likes, replies, reposts, views) decayed by
 * age, so popular recent posts surface first. Offset-paginated to match the
 * ranking function.
 */
export async function fetchRankedFeed(
  limit = FEED_PAGE_SIZE,
  offset = 0
): Promise<{ posts: SocialPost[]; nextOffset: number; hasMore: boolean }> {
  const { data: ranked, error } = await supabase.rpc("get_ranked_feed", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const ids = (ranked ?? []).map((r: any) => r.post_id);
  if (ids.length === 0) return { posts: [], nextOffset: offset, hasMore: false };

  const { data, error: postsError } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", ids);
  if (postsError) throw postsError;

  const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  const rows = (data ?? []).sort(
    (a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
  const posts = await resolvePostsMedia(rows.map(mapPost));
  return { posts, nextOffset: offset + ids.length, hasMore: ids.length === limit };
}

/** Posts authored by one account, newest first. */
export async function fetchUserPosts(
  userId: string,
  limit = FEED_PAGE_SIZE,
  cursor?: string | null
): Promise<FeedPage> {
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .is("parent_post_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error) throw error;
  return await toPage(data ?? [], limit);
}

/** Toggles a repost for the signed-in user. Returns the new state. */
export async function toggleRepost(postId: string, userId: string, reposted: boolean) {
  if (reposted) {
    const { error } = await supabase
      .from("post_reposts")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from("post_reposts").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  return true;
}

/** Which of these posts the viewer has already reposted. */
export async function fetchRepostedIds(postIds: string[], userId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("post_reposts")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.post_id));
}

/* ------------------------------------------------------------------ *
 * Sections, community branches and subject-anchored comment threads.
 * Every section of the site posts into the same table; `section` (and
 * optionally `community_slug`) is what makes a section feel like its
 * own feed while everything still flows into the home feed.
 * ------------------------------------------------------------------ */

export const SECTIONS = [
  "main",
  "profile",
  "arena",
  "trading",
  "studio",
  "theater",
  "community",
  "discovery",
  "pool",
  "live",
  "trending",
  "events",
  "shop",
  "cyberworld",
] as const;
export type SectionKey = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<string, string> = {
  main: "Home",
  profile: "Profile",
  arena: "Arena",
  trading: "Trading",
  studio: "Studio",
  theater: "Movie Theater",
  community: "Community",
  discovery: "Discovery",
  pool: "Pool",
  live: "Live Studio",
  trending: "Trending",
  events: "Live Events",
  shop: "Shop",
  cyberworld: "Cyber World",
};

/** Feed for one section, optionally narrowed to a community branch. */
export async function fetchSectionFeed(
  section: string,
  options: { community?: string | null; limit?: number; cursor?: string | null } = {}
): Promise<FeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_post_id", null)
    // Plain posts plus live announcements; other anchors stay out of feeds.
    .or("subject_type.is.null,subject_type.eq.live_stream")
    .eq("section", section)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.community) query = query.eq("community_slug", options.community);
  if (options.cursor) query = query.lt("created_at", options.cursor);
  const { data, error } = await query;
  if (error) throw error;
  return await toPage(data ?? [], limit);
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_by: string;
}

export async function fetchCommunities(): Promise<Community[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description, icon, created_by")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Community[];
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

export async function createCommunity(input: {
  name: string;
  description?: string;
}): Promise<Community> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to create a community");
  const slug = slugify(input.name);
  if (!slug) throw new Error("Give the community a name");
  const { data, error } = await supabase
    .from("communities")
    .insert({
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_by: user.id,
    })
    .select("id, slug, name, description, icon, created_by")
    .single();
  if (error) throw error;
  return data as Community;
}

/** Publish a post into a section (and optional community branch). */
export async function createSectionPost(input: {
  content: string;
  section?: string;
  communitySlug?: string | null;
  parentPostId?: string | null;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post");
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: input.content.trim(),
      section: input.section ?? "main",
      community_slug: input.communitySlug ?? null,
      parent_post_id: input.parentPostId ?? null,
      monetization_type: "free",
      price: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type SubjectType =
  | "media"
  | "album"
  | "theater_event"
  | "live_stream"
  | "chart"
  | "product";

/**
 * Returns the id of the anchor post that owns the comment thread for a piece
 * of content, creating it on first use. Every comment on the site therefore
 * lives in the same posts/replies system.
 */
export async function ensureSubjectThread(
  subjectType: SubjectType,
  subjectId: string,
  meta: { section?: string; title?: string } = {}
): Promise<string> {
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to comment");

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: meta.title ?? "",
      section: meta.section ?? "main",
      subject_type: subjectType,
      subject_id: subjectId,
      monetization_type: "free",
      price: 0,
    })
    .select("id")
    .single();

  if (error) {
    // Someone else created the anchor first — re-read it.
    const { data: race } = await supabase
      .from("posts")
      .select("id")
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (race?.id) return race.id as string;
    throw error;
  }
  return data.id as string;
}

/** Flat, chronological comments under an anchor or post. */
export async function fetchComments(parentId: string, limit = 100): Promise<SocialPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("parent_post_id", parentId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return await resolvePostsMedia((data ?? []).map(mapPost));
}
