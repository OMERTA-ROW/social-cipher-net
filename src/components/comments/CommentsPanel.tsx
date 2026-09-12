import { useCallback, useEffect, useRef, useState } from "react";
import PresenceAvatar from "@/components/profile/PresenceAvatar";
import { useLivePresence } from "@/hooks/useLivePresence";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import {
  SocialPost,
  SubjectType,
  displayNameOf,
  ensureSubjectThread,
  fetchComments,
  formatTimestamp,
} from "@/lib/social";

interface Props {
  /** Comment directly under an existing post. */
  postId?: string;
  /** Or comment on any other piece of content on the site. */
  subjectType?: SubjectType;
  subjectId?: string;
  section?: string;
  title?: string;
  /** Stream comments update in real time as they arrive. */
  live?: boolean;
  className?: string;
  emptyLabel?: string;
}

/**
 * One comment system for the whole site. Posts comment straight onto the post;
 * media, theater sessions, streams, charts and products get an anchor post the
 * first time someone comments, so every thread shares the same rules and look.
 */
const CommentsPanel = ({
  postId,
  subjectType,
  subjectId,
  section = "main",
  title,
  live = false,
  className,
  emptyLabel = "No comments yet. Start the conversation.",
}: Props) => {
  const [threadId, setThreadId] = useState<string | null>(postId ?? null);
  const [comments, setComments] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const liveIds = useLivePresence(comments.map((comment) => comment.user_id));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    setThreadId(postId ?? null);
  }, [postId]);

  const loadThread = useCallback(async () => {
    setLoading(true);
    try {
      let id = postId ?? null;
      if (!id && subjectType && subjectId) {
        const { data } = await supabase
          .from("posts")
          .select("id")
          .eq("subject_type", subjectType)
          .eq("subject_id", subjectId)
          .maybeSingle();
        id = (data?.id as string) ?? null;
      }
      setThreadId(id);
      setComments(id ? await fetchComments(id) : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId, subjectId, subjectType]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Live comment column beside a broadcast.
  useEffect(() => {
    if (!live || !threadId) return;
    const channel = supabase
      .channel(`comments:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: `parent_post_id=eq.${threadId}` },
        () => {
          fetchComments(threadId).then(setComments).catch(() => undefined);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [live, threadId]);

  useEffect(() => {
    if (live) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, live]);

  const submit = async () => {
    const text = content.trim();
    if (!text) return;
    if (!userId) {
      toast.error("Sign in to comment");
      return;
    }
    setSending(true);
    try {
      let id = threadId;
      if (!id) {
        if (!subjectType || !subjectId) throw new Error("Nothing to comment on");
        id = await ensureSubjectThread(subjectType, subjectId, { section, title });
        setThreadId(id);
      }
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: text,
        parent_post_id: id,
        section,
        monetization_type: "free",
        price: 0,
      });
      if (error) throw error;
      setContent("");
      setComments(await fetchComments(id));
    } catch (error: any) {
      toast.error(error.message || "Could not post that comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      <div className={live ? "space-y-3 max-h-80 overflow-y-auto pr-1" : "space-y-3"}>
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyLabel}</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <PresenceAvatar src={c.profile?.avatar_url} name={displayNameOf(c.profile)} size={32} isLive={liveIds.has(c.user_id)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{displayNameOf(c.profile)}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {formatTimestamp(c.created_at)}
                  </span>
                </p>
                <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={userId ? "Add a comment..." : "Sign in to comment"}
          rows={live ? 1 : 2}
          maxLength={2000}
          disabled={!userId}
          className="bg-secondary/60 border-border resize-none"
        />
        <Button size="sm" onClick={submit} disabled={sending || !content.trim() || !userId}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default CommentsPanel;
