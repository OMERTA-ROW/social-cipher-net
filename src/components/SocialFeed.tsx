import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FeedShopTab from "@/components/feed/FeedShopTab";
import FeedMarketTab from "@/components/feed/FeedMarketTab";

import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolvePaidAccess } from "@/lib/paymentAccess";
import SponsoredCard from "@/components/ads/SponsoredCard";
import { useAdSlot, useAdsSuppressed, type AdPlacement } from "@/hooks/useAdSlot";
import { reportIssue } from "@/lib/monitoring";
import { feedErrorMessage, feedLoadAction } from "@/lib/authSession";
import { fetchPostProducts, type StoreProduct } from "@/lib/commerce";
import {
  SocialPost,
  displayNameOf,
  fetchDiscoverFeed,
  fetchFollowingFeed,
  fetchRankedFeed,
  fetchRepostedIds,
  formatTimestamp,
} from "@/lib/social";

type FeedTab = "for-you" | "following" | "discover" | "shop" | "market";

interface SocialFeedProps {
  refreshKey?: number;
}

const SocialFeed = ({ refreshKey = 0 }: SocialFeedProps) => {
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [userId, setUserId] = useState<string | null>(null);
  // True once the auth session has been restored (or confirmed absent).
  // The first feed load waits for this — the ranked-feed function is
  // signed-in-only, and firing it before the session is restored (or as
  // anon) is rejected by the database with a permission error.
  const [authReady, setAuthReady] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const cursorRef = useRef<string | null>(null);
  const offsetRef = useRef(0);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Shoppable posts: the inline cart lives on the home feed only.
  const [postProducts, setPostProducts] = useState<Map<string, StoreProduct[]>>(new Map());
  // Native ad slots: real running campaigns only, hidden for paid tiers.
  const adsSuppressed = useAdsSuppressed();
  const { data: ads } = useAdSlot(tab === "discover" ? "discovery" : tab === "shop" ? "shop" : tab === "market" ? "market" : "feed");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sign-in, sign-out and session restore all resolve auth; a changed
      // user id re-runs the feed effect, so the feed loads automatically.
      // Token refreshes keep the same id and don't trigger a reload.
      setAuthReady(true);
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthReady(true);
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isPostTab = tab === "for-you" || tab === "following" || tab === "discover";

  /** One batched paid-access lookup per page of posts (no per-post queries). */
  const applyAccess = useCallback(async (batch: SocialPost[]) => {
    const { unlocked } = await resolvePaidAccess(batch, userId);
    setUnlockedIds((prev) => new Set([...prev, ...unlocked]));
  }, [userId]);

  const applyProducts = useCallback(async (batch: SocialPost[]) => {
    if (batch.length === 0) return;
    const map = await fetchPostProducts(batch.map((p) => p.id));
    if (map.size === 0) return;
    setPostProducts((prev) => new Map([...prev, ...map]));
  }, []);

  const applyReposts = useCallback(async (batch: SocialPost[]) => {
    if (!userId || batch.length === 0) return;
    const ids = await fetchRepostedIds(batch.map((p) => p.id), userId);
    setRepostedIds((prev) => new Set([...prev, ...ids]));
  }, [userId]);

  const load = useCallback(async () => {
    if (tab === "shop" || tab === "market") return;
    setLoading(true);
    cursorRef.current = null;
    offsetRef.current = 0;
    try {
      let page: { posts: SocialPost[]; nextCursor?: string | null; hasMore: boolean };
      if (tab === "for-you") {
        const ranked = await fetchRankedFeed();
        offsetRef.current = ranked.nextOffset;
        page = { posts: ranked.posts, nextCursor: null, hasMore: ranked.hasMore };
      } else if (tab === "following" && userId) {
        page = await fetchFollowingFeed(userId);
      } else {
        page = await fetchDiscoverFeed();
      }
      setPosts(page.posts);
      setUnlockedIds(new Set());
      setPostProducts(new Map());
      setRepostedIds(new Set());
      cursorRef.current = page.nextCursor ?? null;
      setHasMore(page.hasMore);
      await applyAccess(page.posts);
      await applyReposts(page.posts);
      await applyProducts(page.posts);
    } catch (error: any) {
      reportIssue("feed_load_failed", error, { surface: "social_feed", tab });
      toast.error(feedErrorMessage());
    } finally {
      setLoading(false);
    }
  }, [applyAccess, applyProducts, applyReposts, tab, userId]);


  useEffect(() => {
    const action = feedLoadAction(authReady, userId, tab);
    if (action === "wait" || action === "skip") return;
    if (action === "prompt-sign-in") {
      setPosts([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    load();
  }, [authReady, userId, tab, load, refreshKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !isPostTab || (!userId && tab !== "discover")) return;
    setLoadingMore(true);
    try {
      let page: { posts: SocialPost[]; nextCursor?: string | null; hasMore: boolean };
      if (tab === "for-you") {
        const ranked = await fetchRankedFeed(undefined, offsetRef.current);
        offsetRef.current = ranked.nextOffset;
        page = { posts: ranked.posts, nextCursor: null, hasMore: ranked.hasMore };
      } else if (tab === "following" && userId) {
        page = await fetchFollowingFeed(userId, undefined, cursorRef.current);
      } else {
        page = await fetchDiscoverFeed(undefined, cursorRef.current);
      }
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      cursorRef.current = page.nextCursor ?? null;
      setHasMore(page.hasMore);
      await applyAccess(page.posts);
      await applyReposts(page.posts);
      await applyProducts(page.posts);
    } catch (error: any) {
      reportIssue("feed_load_failed", error, { surface: "social_feed", tab, paging: true });
      toast.error(feedErrorMessage(true));
    } finally {
      setLoadingMore(false);
    }
  }, [applyAccess, applyProducts, applyReposts, hasMore, isPostTab, loadingMore, tab, userId]);

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
    if (!userId && tab !== "discover") {
      return (
        <div className="text-center py-12 space-y-3 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Sign in to see posts.</p>
          <Button asChild size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      );
    }
    if (posts.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          {tab === "following"
            ? "Your signal is quiet. Follow creators from Discovery to see their posts here."
            : "No transmissions yet. Be the first to post."}
        </div>
      );
    }
    const placement: AdPlacement = tab === "discover" ? "discovery" : "feed";
    const slotCreatives = adsSuppressed ? [] : (ads ?? []);
    return (
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div key={post.id} className="relative">
            {slotCreatives.length > 0 && index > 0 && index % 7 === 0 && (
              <div className="mb-4">
                <SponsoredCard
                  creative={slotCreatives[Math.floor(index / 7 - 1) % slotCreatives.length]}
                  placement={placement}
                />
              </div>
            )}
            {post.is_sponsored && (
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Sponsored{post.sponsor_name ? ` · ${post.sponsor_name}` : ""}
              </div>
            )}
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
              liveStreamId={post.subject_type === "live_stream" ? post.subject_id : null}
              timestamp={formatTimestamp(post.created_at)}
              likes={post.like_count}
              comments={post.reply_count}
              replyCount={post.reply_count}
              reposts={post.repost_count}
              isReposted={repostedIds.has(post.id)}
              isVerified={!!post.profile?.is_verified}
              monetizationType={post.monetization_type}
              price={post.price}
              isPaid={post.monetization_type === "free" || post.user_id === userId || unlockedIds.has(post.id)}
              media={post.media}
              isDemo={post.is_demo}
              linkToThread
              products={postProducts.get(post.id) ?? []}
              shoppable
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
      <TabsContent value="shop" className="space-y-4">
        {!adsSuppressed && ads?.[0] && <SponsoredCard creative={ads[0]} placement="shop" />}
        <FeedShopTab />
      </TabsContent>
      <TabsContent value="market" className="space-y-4">
        {!adsSuppressed && ads?.[0] && <SponsoredCard creative={ads[0]} placement="market" />}
        <FeedMarketTab />
      </TabsContent>
    </Tabs>
  );
};

export default SocialFeed;
