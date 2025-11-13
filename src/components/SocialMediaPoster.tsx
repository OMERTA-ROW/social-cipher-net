import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Image } from "lucide-react";

interface SocialMediaPosterProps {
  connectedPlatforms: Array<{
    platform: string;
    platform_name: string;
    is_active: boolean;
  }>;
}

export const SocialMediaPoster = ({ connectedPlatforms }: SocialMediaPosterProps) => {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handlePost = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content to post",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Select platforms",
        description: "Please select at least one platform to post to",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);

    try {
      const results = await Promise.allSettled(
        selectedPlatforms.map(async (platform) => {
          const { data, error } = await supabase.functions.invoke('post-to-platform', {
            body: { platform, content, mediaUrl: mediaUrl || undefined },
          });

          if (error) throw error;
          return { platform, data };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      if (successful.length > 0) {
        toast({
          title: "Posted successfully",
          description: `Posted to ${successful.length} platform(s)`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Some posts failed",
          description: `Failed to post to ${failed.length} platform(s)`,
          variant: "destructive",
        });
      }

      setContent("");
      setMediaUrl("");
      setSelectedPlatforms([]);
    } catch (error: any) {
      toast({
        title: "Error posting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <Card className="p-6 bg-background/80 backdrop-blur border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Post to Social Media</h3>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="media">Media URL (optional)</Label>
          <div className="flex gap-2 mt-1">
            <Image className="w-5 h-5 text-muted-foreground" />
            <Input
              id="media"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Select Platforms</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {connectedPlatforms.map((platform) => (
              <div key={platform.platform} className="flex items-center space-x-2">
                <Checkbox
                  id={platform.platform}
                  checked={selectedPlatforms.includes(platform.platform)}
                  onCheckedChange={() => togglePlatform(platform.platform)}
                />
                <label
                  htmlFor={platform.platform}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {platform.platform_name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button 
          onClick={handlePost} 
          disabled={isPosting || !content.trim() || selectedPlatforms.length === 0}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {isPosting ? "Posting..." : "Post to Selected Platforms"}
        </Button>
      </div>
    </Card>
  );
};
