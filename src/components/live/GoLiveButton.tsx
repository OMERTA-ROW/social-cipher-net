import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { startLiveStream } from "@/lib/live";

interface Props {
  /** Section the live belongs to — each section keeps its own live streams. */
  section?: string;
  communitySlug?: string | null;
  /** Fires once the announcement post exists so the caller can refresh. */
  onStarted?: (streamId: string, postId: string) => void;
  className?: string;
}

/**
 * Sits in the composer action row next to Add Photos / Add Videos. Starts a
 * live stream for this section and posts it to the feed, so followers land
 * straight on the live.
 */
const GoLiveButton = ({ section = "main", communitySlug = null, onStarted, className }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starting, setStarting] = useState(false);

  const go = async () => {
    setStarting(true);
    try {
      const { streamId, postId } = await startLiveStream({
        title,
        description,
        section,
        communitySlug,
      });
      toast.success("You are live — it is posted to the feed");
      setOpen(false);
      setTitle("");
      setDescription("");
      onStarted?.(streamId, postId);
      navigate(`/live/${streamId}`);
    } catch (error: any) {
      toast.error(error.message || "Could not start your live");
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Radio className="w-4 h-4 mr-2" />
        Go Live
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Go live</DialogTitle>
            <DialogDescription>
              Your live is posted to this feed the moment it starts, so followers can join it there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="live-title">Title</Label>
              <Input
                id="live-title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is this live about?"
              />
            </div>
            <div>
              <Label htmlFor="live-description">Description (optional)</Label>
              <Textarea
                id="live-description"
                value={description}
                maxLength={300}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={starting}>
              Cancel
            </Button>
            <Button onClick={go} disabled={starting || !title.trim()} className="gap-2 glow-primary">
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              Start live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GoLiveButton;
