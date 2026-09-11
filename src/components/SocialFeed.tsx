import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeedShopTab from "@/components/feed/FeedShopTab";
import FeedMarketTab from "@/components/feed/FeedMarketTab";

import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolvePaidAccess } from "@/lib/paymentAccess";
import { reportIssue } from "@/lib/monitoring";
import {
  SocialPost,
  displayNameOf,
  fetchDiscoverFeed,
  fetchFollowingFeed,
  formatTimestamp,
} from "@/lib/social";

type FeedTab = "for-you" | "following" | "discover" | "shop" | "market";

interface SocialFeedProps {
  refreshKey?: number;
}

const SocialFeed = ({ refreshKey = 0 }: SocialFeedProps) => {
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const isPostTab = tab === "for-you" || tab === "following" || tab === "discover";

  /** One batched paid-access lookup per page of posts (no per-post queries). */
  const applyAccess = useCallback(async (batch: SocialPost[]) => {
    const { unlocked } = await resolvePaidAccess(batch, userId);
    setUnlockedIds((prev) => new Set([...prev, ...unlocked]));
  }, [userId]);

  const load = useCallback(async () => {
    if (tab === "shop" || tab === "market") return;
    setLoading(true);
    cursorRef.current = null;
    try {
      const page = tab === "following" && userId
        ? await fetchFollowingFeed(userId)
        : await fetchDiscoverFeed();
      setPosts(page.posts);
      setUnlockedIds(new Set());
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
      await applyAccess(page.posts);
    } catch (error: any) {
      reportIssue("feed_load_failed", error, { surface: "social_feed", tab });
      toast.error(error.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [applyAccess, tab, userId]);


  useEffect(() => { load(); }, [load, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !isPostTab) return;
    setLoadingMore(true);
    try {
      const page = tab === "following" && userId
        ? await fetchFollowingFeed(userId, undefined, cursorRef.current)
        : await fetchDiscoverFeed(undefined, cursorRef.current);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
      await applyAccess(page.posts);
    } catch (error: any) {
      reportIssue("feed_load_failed", error, { surface: "social_feed", tab, paging: true });
      toast.error(error.message || "Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  }, [applyAccess, hasMore, isPostTab, loadingMore, tab, userId]);

  // Infinite scroll is the default behaviour everywhere — no toggle, no button.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading, posts.length, tab]);

  const handlePaymentRequired = async (post: SocialPost) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-post-payment", {
        body: { postId: post.id, paymentType: post.monetization_type },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
      toast.error(error.message || "Failed to start payment");
    }
  };


  const renderList = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      );
    }
    if (posts.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          {tab === "following"
            ? "Your signal is quiet. Follow creators from Discover to fill this feed."
            : "No transmissions yet. Be the first to post."}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="relative">
            {tab !== "following" && post.user_id !== userId && (
              <div className="absolute right-4 top-4 z-10">
                <FollowButton targetUserId={post.user_id} />
              </div>
            )}
            <PostCard
              postId={post.id}
              authorId={post.user_id}
              author={displayNameOf(post.profile)}
              handle={post.profile?.username}
              avatar={post.profile?.avatar_url || undefined}
              content={post.content}
              timestamp={formatTimestamp(post.created_at)}
              likes={post.like_count}
              comments={post.reply_count}
              replyCount={post.reply_count}
              isVerified={!!post.profile?.is_verified}
              monetizationType={post.monetization_type}
              price={post.price}
              isPaid={post.monetization_type === "free" || post.user_id === userId}
              media={post.media}
              isDemo={post.is_demo}
              linkToThread
              onPaymentRequired={() => handlePaymentRequired(post)}
            />
          </div>
        ))}
        {hasMore && (
          <div ref={sentinelRef} className="py-4 space-y-4">
            <PostCardSkeleton />
          </div>
        )}
      </div>
    );
  };


  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as FeedTab)}>
      <TabsList className="mb-4">
        <TabsTrigger value="for-you">For You</TabsTrigger>
        <TabsTrigger value="following">Following</TabsTrigger>
        <TabsTrigger value="discover">Discovery</TabsTrigger>
        <TabsTrigger value="shop">Shop</TabsTrigger>
        <TabsTrigger value="market">Market</TabsTrigger>
      </TabsList>
      <TabsContent value="for-you">{renderList()}</TabsContent>
      <TabsContent value="following">{renderList()}</TabsContent>
      <TabsContent value="discover">{renderList()}</TabsContent>
      <TabsContent value="shop"><FeedShopTab /></TabsContent>
      <TabsContent value="market"><FeedMarketTab /></TabsContent>
    </Tabs>
  );
};

export default SocialFeed;
