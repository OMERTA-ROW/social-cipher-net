import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EngagementStats {
  posts: number;
  likes: number;
  replies: number;
  followers: number;
  following: number;
  engagement: number;
}

const EMPTY: EngagementStats = {
  posts: 0,
  likes: 0,
  replies: 0,
  followers: 0,
  following: 0,
  engagement: 0,
};

/**
 * Live engagement totals for the signed-in account. Everything here is read
 * straight from the account's own records — no cached or estimated figures.
 */
export const useEngagementStats = () => {
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    const [postsRes, followersRes, followingRes] = await Promise.all([
      supabase
        .from("posts")
        .select("like_count, reply_count, repost_count, parent_post_id")
        .eq("user_id", user.id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
    ]);

    const rows = postsRes.data ?? [];
    const likes = rows.reduce((sum, r: { like_count: number | null }) => sum + (r.like_count ?? 0), 0);
    const replies = rows.reduce((sum, r: { reply_count: number | null }) => sum + (r.reply_count ?? 0), 0);
    const reposts = rows.reduce(
      (sum, r: { repost_count?: number | null }) => sum + (r.repost_count ?? 0),
      0,
    );

    setStats({
      posts: rows.filter((r: { parent_post_id: string | null }) => !r.parent_post_id).length,
      likes,
      replies,
      followers: followersRes.count ?? 0,
      following: followingRes.count ?? 0,
      engagement: likes + replies + reposts,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { stats: stats ?? (userId ? EMPTY : null), userId, loading, refresh: load };
};
