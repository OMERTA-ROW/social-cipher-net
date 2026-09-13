import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import CommentsPanel from "@/components/comments/CommentsPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send } from "lucide-react";
import GoLiveButton from "@/components/live/GoLiveButton";
import {
  SocialPost,
  createSectionPost,
  displayNameOf,
  fetchSectionFeed,
  formatTimestamp,
} from "@/lib/social";

interface Props {
  section: string;
  communitySlug?: string | null;
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * A section's own feed: compose here, read here, comment here. Everything
 * published also flows into the home feed, so no section is a dead end.
 */
const SectionFeed = ({
  section,
  communitySlug = null,
  placeholder = "Share something with this section...",
  emptyLabel = "Nothing posted here yet. Be the first.",
}: Props) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const cursorRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchSectionFeed(section, { community: communitySlug });
      setPosts(page.posts);
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
    } catch (error: any) {
      toast.error(error.message || "Could not load this feed");
    } finally {
      setLoading(false);
    }
  }, [communitySlug, section]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    try {
      const page = await fetchSectionFeed(section, {
        community: communitySlug,
        cursor: cursorRef.current,
      });
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
  }, [communitySlug, hasMore, section]);

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

  const publish = async () => {
    const text = content.trim();
    if (!text) return;
    setPosting(true);
    try {
      await createSectionPost({ content: text, section, communitySlug });
      setContent("");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Could not publish that post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={userId ? placeholder : "Sign in to post here"}
          rows={3}
          maxLength={2000}
          disabled={!userId}
          className="bg-secondary/60 border-border resize-none"
        />
        <div className="flex justify-end items-center gap-2 mt-2">
          <GoLiveButton section={section} communitySlug={communitySlug} onStarted={() => load()} />
          <Button size="sm" onClick={publish} disabled={posting || !content.trim() || !userId}>
            {posting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Post
          </Button>
        </div>
      </Card>

      {loading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
          {emptyLabel}
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="space-y-2">
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
              isVerified={!!post.profile?.is_verified}
              monetizationType={post.monetization_type}
              price={post.price}
              isPaid
              media={post.media}
              isDemo={post.is_demo}
              onReply={() =>
                setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
              }
            />
            {!openComments[post.id] && (
              <button
                type="button"
                onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: true }))}
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 pl-1"
              >
                <MessageCircle className="w-3 h-3" />
                {post.reply_count > 0 ? `${post.reply_count} comments` : "Comment"}
              </button>
            )}
            {openComments[post.id] && (
              <Card className="p-4">
                <CommentsPanel postId={post.id} section={section} />
              </Card>
            )}
          </div>
        ))
      )}
      {hasMore && (
        <div ref={sentinelRef} className="py-2">
          <PostCardSkeleton />
        </div>
      )}
    </div>
  );
};

export default SectionFeed;
