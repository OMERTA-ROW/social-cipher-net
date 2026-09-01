import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  SocialPost,
  ThreadNode,
  displayNameOf,
  fetchPost,
  fetchThread,
  formatTimestamp,
} from "@/lib/social";

const ReplyComposer = ({
  parentId,
  onPosted,
  compact = false,
}: { parentId: string; onPosted: () => void; compact?: boolean }) => {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const text = content.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast.error("Replies are limited to 2000 characters");
      return;
    }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to reply");
      setSending(false);
      return;
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: text,
      parent_post_id: parentId,
      monetization_type: "free",
      price: 0,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContent("");
    onPosted();
  };

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Transmit a reply..."
        rows={compact ? 2 : 3}
        maxLength={2000}
        className="bg-secondary/60 border-border resize-none"
      />
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={submit} disabled={sending || !content.trim()}>
          {sending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
          Reply
        </Button>
      </div>
    </div>
  );
};

const ReplyNode = ({
  node,
  depth,
  onChanged,
}: { node: ThreadNode; depth: number; onChanged: () => void }) => {
  const [replying, setReplying] = useState(false);

  return (
    <div
      className="relative pl-4 border-l border-primary/25"
      style={{ marginLeft: depth === 0 ? 0 : 12 }}
    >
      <PostCard
        postId={node.id}
        authorId={node.user_id}
        author={displayNameOf(node.profile)}
        handle={node.profile?.username}
        avatar={node.profile?.avatar_url || undefined}
        content={node.content}
        timestamp={formatTimestamp(node.created_at)}
        likes={node.like_count}
        comments={node.reply_count}
        replyCount={node.reply_count}
        isVerified={!!node.profile?.is_verified}
        media={node.media}
        onReply={() => setReplying((v) => !v)}
      />
      {replying && (
        <ReplyComposer
          parentId={node.id}
          compact
          onPosted={() => { setReplying(false); onChanged(); }}
        />
      )}
      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <ReplyNode key={child.id} node={child} depth={depth + 1} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
};

const Thread = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [replies, setReplies] = useState<ThreadNode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const [root, tree] = await Promise.all([fetchPost(postId), fetchThread(postId)]);
      setPost(root);
      setReplies(tree);
    } catch (error: any) {
      toast.error(error.message || "Failed to load thread");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {loading ? (
          <PostCardSkeleton />
        ) : !post ? (
          <Card className="p-8 text-center text-muted-foreground">This transmission no longer exists.</Card>
        ) : (
          <>
            <div className="relative">
              <div className="absolute right-4 top-4 z-10">
                <FollowButton targetUserId={post.user_id} />
              </div>
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
                media={post.media}
                onReply={() => document.getElementById("root-reply")?.scrollIntoView({ behavior: "smooth" })}
              />
            </div>

            <div id="root-reply">
              <ReplyComposer parentId={post.id} onPosted={load} />
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-3">
              {post.reply_count || replies.length} {(post.reply_count || replies.length) === 1 ? "reply" : "replies"}
            </h2>
            <div className="space-y-4">
              {replies.map((node) => (
                <ReplyNode key={node.id} node={node} depth={0} onChanged={load} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Thread;
