import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaUpload from "@/components/MediaUpload";
import { Switch } from "@/components/ui/switch";
import { MentionTextarea } from "@/components/MentionTextarea";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPost: (content: string) => void;
}

const CreatePostDialog = ({ open, onOpenChange, onPost }: CreatePostDialogProps) => {
  const [content, setContent] = useState("");
  const [monetizationType, setMonetizationType] = useState("free");
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'image' | 'video' }>>([]);
  const [isThread, setIsThread] = useState(false);
  const [threadPosts, setThreadPosts] = useState<string[]>([content]);
  const [mentions, setMentions] = useState<string[]>([]);

  const handlePost = async () => {
    const postsToCreate = isThread ? threadPosts.filter(p => p.trim()) : [content];
    
    if (postsToCreate.length === 0 || !postsToCreate[0].trim()) {
      toast.error("Please write something!");
      return;
    }

    if (monetizationType !== "free" && (!price || parseFloat(price) <= 0)) {
      toast.error("Please set a valid price!");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create posts");
        return;
      }

      // Upload media files if any
      let mediaUrls: Array<{ url: string; type: 'image' | 'video' }> = [];
      if (mediaFiles.length > 0) {
        const isPaid = monetizationType !== "free";
        const bucket = isPaid ? 'paid-media' : 'post-media';

        const uploadPromises = mediaFiles.map(async (media) => {
          const fileName = `${user.id}/${Date.now()}-${media.file.name}`;
          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, media.file);

          if (error) throw error;

          // Paid media stays in a private bucket: store the path and hand out
          // short-lived signed links only to the creator and paying viewers.
          if (isPaid) {
            return { url: data.path, type: media.type };
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

          return { url: publicUrl, type: media.type };
        });
        
        mediaUrls = await Promise.all(uploadPromises);
      }

      // Create posts (thread or single)
      let parentPostId: string | null = null;
      
      for (let i = 0; i < postsToCreate.length; i++) {
        const postContent = postsToCreate[i];
        
        const { data: post, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            content: postContent,
            monetization_type: monetizationType,
            price: monetizationType === "free" ? 0 : parseFloat(price),
            parent_post_id: parentPostId,
          })
          .select()
          .single();

        if (postError) throw postError;
        
        // Add media to first post only
        if (i === 0 && mediaUrls.length > 0) {
          const mediaInserts = mediaUrls.map((media, idx) => ({
            post_id: post.id,
            media_url: media.url,
            media_type: media.type,
            display_order: idx,
          }));
          
          const { error: mediaError } = await supabase
            .from("post_media")
            .insert(mediaInserts);
          
          if (mediaError) throw mediaError;
        }
        
        // Set parent for thread
        if (i === 0 && isThread) {
          parentPostId = post.id;
        }
        
        // reply_count is maintained automatically by a database trigger


        // Save mentions for this post
        if (i === 0 && mentions.length > 0) {
          const { data: mentionedUsers } = await supabase
            .from('profiles')
            .select('id, username')
            .in('username', mentions);

          if (mentionedUsers && mentionedUsers.length > 0) {
            const mentionInserts = mentionedUsers.map(u => ({
              post_id: post.id,
              mentioned_user_id: u.id,
              mentioner_user_id: user.id
            }));

            await supabase.from('mentions').insert(mentionInserts);
          }
        }
      }

      toast.success(isThread ? "Thread created!" : "Post created!");
      setContent("");
      setMonetizationType("free");
      setPrice("");
      setMediaFiles([]);
      setThreadPosts([""]);
      setIsThread(false);
      onOpenChange(false);
      onPost(content);
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Post</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 border-2 border-primary/30">
            <AvatarFallback className="bg-secondary text-foreground">
              YU
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Switch
                checked={isThread}
                onCheckedChange={(checked) => {
                  setIsThread(checked);
                  if (checked && threadPosts.length === 0) {
                    setThreadPosts([content, ""]);
                  }
                }}
              />
              <Label className="text-sm text-muted-foreground">Create thread</Label>
            </div>

            {isThread ? (
              <div className="space-y-2">
                {threadPosts.map((post, idx) => (
                  <MentionTextarea
                    key={idx}
                    placeholder={idx === 0 ? "Start your thread... (use @ to mention)" : `Add to thread (${idx + 1})`}
                    value={post}
                    onChange={(value) => {
                      const newPosts = [...threadPosts];
                      newPosts[idx] = value;
                      setThreadPosts(newPosts);
                      if (idx === 0) setContent(value);
                    }}
                    onMentionsChange={idx === 0 ? setMentions : undefined}
                    className="min-h-[80px] bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setThreadPosts([...threadPosts, ""])}
                >
                  Add another post
                </Button>
              </div>
            ) : (
              <MentionTextarea
                placeholder="What's on your mind? (use @ to mention)"
                value={content}
                onChange={setContent}
                onMentionsChange={setMentions}
                className="min-h-[120px] bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            )}
            
            <MediaUpload onFilesChange={setMediaFiles} maxFiles={10} />

            <div className="space-y-2">
              <Label htmlFor="monetization" className="text-foreground">Monetization</Label>
              <Select value={monetizationType} onValueChange={setMonetizationType}>
                <SelectTrigger id="monetization" className="bg-secondary border-border">
                  <SelectValue placeholder="Select monetization type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pay_per_view">Pay Per View</SelectItem>
                  <SelectItem value="pay_per_click">Pay Per Click</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {monetizationType !== "free" && (
              <div className="space-y-2">
                <Label htmlFor="price" className="text-foreground">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                onClick={handlePost}
                disabled={!content.trim() || isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                {isLoading ? "Creating..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;