import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handlePost = async () => {
    if (!content.trim()) {
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

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content,
        monetization_type: monetizationType,
        price: monetizationType === "free" ? 0 : parseFloat(price),
      });

      if (error) throw error;

      toast.success("Post created!");
      setContent("");
      setMonetizationType("free");
      setPrice("");
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
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
            />

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