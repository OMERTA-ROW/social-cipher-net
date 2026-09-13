import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { SocialPost, displayNameOf, fetchUserPosts, formatTimestamp } from "@/lib/social";
import { toast } from "sonner";

interface Props {
  userId: string;
  refreshKey?: number;
}

/** Infinite-scrolling list of one account's posts. */
const ProfilePosts = ({ userId, refreshKey = 0 }: Props) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const page = await fetchUserPosts(userId);
        if (!active) return;
        setPosts(page.posts);
        cursorRef.current = page.nextCursor;
        setHasMore(page.hasMore);
      } catch (error: any) {
        if (active) toast.error(error.message || "Could not load posts");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    try {
      const page = await fetchUserPosts(userId, undefined, cursorRef.current);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
    } catch {
      /* keep what we have */
    } finally {
      busyRef.current = false;
    }
  }, [hasMore, userId]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadMore(),
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, posts.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
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
          isVerified={!!post.profile?.is_verified}
          monetizationType={post.monetization_type}
          price={post.price}
          isPaid
          media={post.media}
          isDemo={post.is_demo}
          linkToThread
        />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="py-2">
          <PostCardSkeleton />
        </div>
      )}
    </div>
  );
};

export default ProfilePosts;
