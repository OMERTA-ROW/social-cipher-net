import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPost: (content: string) => void;
}

const CreatePostDialog = ({ open, onOpenChange, onPost }: CreatePostDialogProps) => {
  const [content, setContent] = useState("");

  const handlePost = () => {
    if (content.trim()) {
      onPost(content);
      setContent("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Post</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 border-2 border-primary/30">
            <AvatarFallback className="bg-secondary text-foreground">
              YU
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={handlePost}
                disabled={!content.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
