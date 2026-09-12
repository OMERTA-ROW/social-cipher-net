import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, BadgeCheck, Lock, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StoryRing from "@/components/StoryRing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LinkPreview from "@/components/post/LinkPreview";
import PostProductCard from "@/components/shop/PostProductCard";
import { extractUrls } from "@/lib/links";
import { toggleRepost } from "@/lib/social";
import type { StoreProduct } from "@/lib/commerce";

interface PostCardProps {
  postId: string;
  author: string;
  authorId?: string;
  handle?: string | null;
  avatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isVerified?: boolean;
  monetizationType?: string;
  price?: number;
  isPaid?: boolean;
  hasStory?: boolean;
  isLive?: boolean;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
  replyCount?: number;
  reposts?: number;
  isReposted?: boolean;
  /** Seeded sample content marker */
  isDemo?: boolean;
  /** Navigate to the thread view when the card / reply button is clicked */
  linkToThread?: boolean;
  onPaymentRequired?: () => void;
  onReply?: () => void;
  /** Products attached to this post. Cart controls render on the home feed only. */
  products?: StoreProduct[];
  /** True only when the card is rendered inside the home feed. */
  shoppable?: boolean;
}

const PostCard = ({
  postId,
  author,
  authorId,
  handle,
  avatar,
  content,
  timestamp,
  likes,
  comments,
  isVerified,
  monetizationType = "free",
  price = 0,
  isPaid = false,
  hasStory = false,
  isLive = false,
  media = [],
  replyCount = 0,
  reposts = 0,
  isReposted = false,
  isDemo = false,
  linkToThread = false,
  onPaymentRequired,
  onReply,
  products = [],
  shoppable = false
}: PostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [busy, setBusy] = useState(false);
  const [reposted, setReposted] = useState(isReposted);
  const [repostCount, setRepostCount] = useState(reposts);
  const links = extractUrls(content).slice(0, 2);
  const isLocked = (monetizationType === "pay_per_view" || monetizationType === "pay_per_click") && !isPaid;

  useEffect(() => setLikeCount(likes), [likes]);
  useEffect(() => setRepostCount(reposts), [reposts]);
  useEffect(() => setReposted(isReposted), [isReposted]);

  useEffect(() => {
    let active = true;
    const loadLike = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (active) setIsLiked(!!data);
    };
    loadLike();
    return () => { active = false; };
  }, [postId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onPaymentRequired?.();
      return;
    }
    if (busy) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to like posts");
      setBusy(false);
      return;
    }

    const next = !isLiked;
    setIsLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));

    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);

    if (error) {
      setIsLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error("Could not update like");
    }
    setBusy(false);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onPaymentRequired?.();
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to repost");
      return;
    }
    const next = !reposted;
    setReposted(next);
    setRepostCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await toggleRepost(postId, user.id, !next);
      toast.success(next ? "Reposted" : "Repost removed");
    } catch {
      setReposted(!next);
      setRepostCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error("Could not update repost");
    }
  };

  const goToThread = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onPaymentRequired?.();
      return;
    }
    if (onReply) {
      onReply();
      return;
    }
    navigate(`/post/${postId}`);
  };

  return (
    <Card
      className="bg-card/70 backdrop-blur-xl border-border/60 hover:border-primary/50 transition-all duration-300 p-6"
      onClick={linkToThread && !isLocked ? () => navigate(`/post/${postId}`) : undefined}
      role={linkToThread ? "link" : undefined}
    >
      <div className="flex items-start gap-4">
        <StoryRing
          avatar={avatar}
          author={author}
          hasStory={hasStory}
          isLive={isLive}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {authorId ? (
              <Link
                to={`/profile/${authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-foreground hover:text-primary transition-colors"
              >
                {author}
              </Link>
            ) : (
              <h3 className="font-semibold text-foreground">{author}</h3>
            )}
            {isVerified && (
              <BadgeCheck className="w-5 h-5 text-primary fill-current" />
            )}
            {handle && <span className="text-sm text-muted-foreground">@{handle}</span>}
            <span className="text-sm text-muted-foreground">· {timestamp}</span>
            {isDemo && (
              <span className="ml-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                Demo
              </span>
            )}

          </div>

          {monetizationType !== "free" && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                {monetizationType === "pay_per_view" ? "💰 Pay Per View" : "🔗 Pay Per Click"}
              </span>
              <span className="font-semibold">${price}</span>
            </div>
          )}

          {isLocked ? (
            <div className="relative mb-4">
              <div className="blur-sm">
                <p className="text-foreground leading-relaxed">{content.substring(0, 50)}...</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                <button
                  onClick={(e) => { e.stopPropagation(); onPaymentRequired?.(); }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Unlock for ${price}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-foreground mb-4 leading-relaxed whitespace-pre-wrap break-words">{content}</p>

              {media.length > 0 && (
                <div className={`grid gap-2 mb-4 ${
                  media.length === 1 ? 'grid-cols-1' :
                  media.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {media.map((item, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-lg overflow-hidden bg-secondary/60 flex items-center justify-center ${
                        media.length === 1 ? '' : 'aspect-square'
                      }`}
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={`Post media ${idx + 1}`}
                          loading="lazy"
                          className={
                            media.length === 1
                              ? 'w-full max-h-[560px] object-contain'
                              : 'w-full h-full object-contain'
                          }
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          onClick={(e) => e.stopPropagation()}
                          className={
                            media.length === 1
                              ? 'w-full max-h-[560px] object-contain'
                              : 'w-full h-full object-contain'
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {links.map((url) => (
                <LinkPreview key={url} url={url} />
              ))}

              {shoppable && products.length > 0 && (
                <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                  <PostProductCard products={products} />
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`gap-2 ${isLiked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={goToThread}
            >
              <MessageCircle className="w-5 h-5" />
              <span>{replyCount || comments}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              className={`gap-2 ${reposted ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
              title="Repost"
            >
              <Repeat2 className="w-5 h-5" />
              <span>{repostCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(`${window.location.origin}/post/${postId}`);
                toast.success("Post link copied");
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
