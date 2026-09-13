import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import MediaUpload from "@/components/MediaUpload";
import GoLiveButton from "@/components/live/GoLiveButton";
import LinkPreview from "@/components/post/LinkPreview";
import { extractUrls } from "@/lib/links";
import { attachProductToPost } from "@/lib/commerce";

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  /** Fires after a post is published so the caller can refresh the feed. */
  onPublished?: (postId: string) => void;
}

/**
 * Profile composer: text and links share one box; media upload stays a
 * separate section beneath it. Publishes straight to the public feed.
 */
const PostComposer = ({ avatarUrl, displayName, onPublished }: Props) => {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<
    Array<{ file: File; preview: string; type: "image" | "video" }>
  >([]);

  const [myProducts, setMyProducts] = useState<Array<{ id: string; title: string }>>([]);
  const [productId, setProductId] = useState<string>("");

  // Sellers can attach one of their products; the buy controls show on the home feed.
  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: seller } = await supabase
        .from("seller_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!seller?.id) return;
      const { data } = await supabase
        .from("products")
        .select("id, title")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (alive) setMyProducts((data ?? []) as Array<{ id: string; title: string }>);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const urls = useMemo(() => extractUrls(content).slice(0, 2), [content]);
  const initials = (displayName ?? "You").slice(0, 2).toUpperCase();

  const publish = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Write something or add media first");
      return;
    }
    setPosting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to post");
        return;
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert({ user_id: user.id, content: content.trim(), monetization_type: "free", price: 0 })
        .select("id")
        .single();
      if (error) throw error;

      if (mediaFiles.length > 0) {
        const uploaded = await Promise.all(
          mediaFiles.map(async (media, idx) => {
            const path = `${user.id}/${Date.now()}-${idx}-${media.file.name}`;
            const { data, error: upErr } = await supabase.storage
              .from("post-media")
              .upload(path, media.file);
            if (upErr) throw upErr;
            const {
              data: { publicUrl },
            } = supabase.storage.from("post-media").getPublicUrl(data.path);
            return {
              post_id: post.id,
              media_url: publicUrl,
              media_type: media.type,
              display_order: idx,
            };
          }),
        );
        const { error: mediaErr } = await supabase.from("post_media").insert(uploaded);
        if (mediaErr) throw mediaErr;
      }

      if (productId) {
        try {
          await attachProductToPost(post.id, productId);
        } catch {
          toast.error("Posted, but the product could not be attached");
        }
      }

      setContent("");
      setMediaFiles([]);
      setProductId("");
      toast.success("Posted to your feed");
      onPublished?.(post.id);
    } catch (error: any) {
      toast.error(error.message || "Could not publish your post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="bg-card/70 backdrop-blur-xl border-border/60 p-4 sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/30">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" className="object-cover" />}
          <AvatarFallback className="bg-secondary text-foreground">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something, or paste a link…"
            rows={3}
            className="resize-none bg-background/40"
          />

          {urls.map((url) => (
            <LinkPreview key={url} url={url} compact />
          ))}

          {/* Media upload stays its own section, as before. */}
          <div className="border-t border-border/40 pt-3">
            <MediaUpload
              onFilesChange={setMediaFiles}
              maxFiles={6}
              extraActions={<GoLiveButton section="main" />}
            />
          </div>

          {myProducts.length > 0 && (
            <div className="flex items-center gap-2 border-t border-border/40 pt-3">
              <label htmlFor="composer-product" className="text-xs text-muted-foreground">
                Sell a product with this post
              </label>
              <select
                id="composer-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">None</option>
                {myProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={publish} disabled={posting} className="gap-2 glow-primary">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostComposer;
