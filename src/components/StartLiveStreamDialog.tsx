import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Video } from "lucide-react";

interface StartLiveStreamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (title: string, description: string) => void;
}

export function StartLiveStreamDialog({ open, onOpenChange, onStart }: StartLiveStreamDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleStart = () => {
    if (!title.trim()) return;
    onStart(title, description);
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Start Live Stream
          </DialogTitle>
          <DialogDescription>
            Set up your live stream and invite others to join
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Stream Title *</Label>
            <Input
              id="title"
              placeholder="Enter stream title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What's your stream about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!title.trim()}>
            Start Stream
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
