import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StoryRing from "./StoryRing";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface StoryUser {
  id: string;
  username: string;
  avatar_url?: string;
  hasStory: boolean;
  isLive: boolean;
}

const StoriesBar = () => {
  const [users, setUsers] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoriesAndLive();
  }, []);

  const fetchStoriesAndLive = async () => {
    try {
      // Fetch active stories (not expired)
      const { data: stories } = await supabase
        .from("stories")
        .select("user_id, profiles(id, username, avatar_url)")
        .gt("expires_at", new Date().toISOString());

      // Fetch active live streams
      const { data: liveStreams } = await supabase
        .from("live_streams")
        .select("user_id, profiles(id, username, avatar_url)")
        .eq("is_live", true);

      // Combine and deduplicate users
      const userMap = new Map<string, StoryUser>();

      stories?.forEach((story: any) => {
        const profile = story.profiles;
        if (profile) {
          userMap.set(profile.id, {
            id: profile.id,
            username: profile.username || "User",
            avatar_url: profile.avatar_url,
            hasStory: true,
            isLive: false,
          });
        }
      });

      liveStreams?.forEach((stream: any) => {
        const profile = stream.profiles;
        if (profile) {
          const existing = userMap.get(profile.id);
          if (existing) {
            existing.isLive = true;
          } else {
            userMap.set(profile.id, {
              id: profile.id,
              username: profile.username || "User",
              avatar_url: profile.avatar_url,
              hasStory: false,
              isLive: true,
            });
          }
        }
      });

      // Sort: live users first, then story users
      const sortedUsers = Array.from(userMap.values()).sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return 0;
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching stories and live:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="w-full border-b border-border/50 bg-black">
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col items-center gap-2 min-w-[80px]">
              <StoryRing
                avatar={user.avatar_url}
                author={user.username}
                hasStory={user.hasStory}
                isLive={user.isLive}
                size="lg"
                onClick={() => {
                  // TODO: Open story/live viewer
                  console.log("View content for:", user.username);
                }}
              />
              <span className="text-xs text-foreground/70 truncate max-w-[80px] text-center">
                {user.username}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default StoriesBar;
