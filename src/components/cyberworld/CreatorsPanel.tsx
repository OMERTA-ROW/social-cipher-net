/**
 * Creators on the platform, ranked by their real follower counts.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  followers: number;
}

const CreatorsPanel = () => {
  const [creators, setCreators] = useState<Creator[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: profiles, error: err } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .limit(50);
      if (!alive) return;
      if (err) {
        setError(err.message);
        return;
      }
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: follows } = ids.length
        ? await supabase.from("followers").select("following_id").in("following_id", ids)
        : { data: [] as { following_id: string }[] };
      if (!alive) return;
      const counts = new Map<string, number>();
      (follows ?? []).forEach((row) => {
        counts.set(row.following_id, (counts.get(row.following_id) ?? 0) + 1);
      });
      setCreators(
        (profiles ?? [])
          .map((p) => ({
            id: p.id,
            name: p.display_name || p.username || "Cyber Link member",
            handle: p.username ? `@${p.username}` : "",
            avatar: p.avatar_url,
            followers: counts.get(p.id) ?? 0,
          }))
          .sort((a, b) => b.followers - a.followers)
          .slice(0, 10),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">Creators are unavailable right now.</p>;

  if (!creators) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No creators to show yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {creators.map((creator) => (
        <div
          key={creator.id}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar>
              {creator.avatar && <AvatarImage src={creator.avatar} alt={creator.name} />}
              <AvatarFallback>{creator.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{creator.name}</p>
              <p className="truncate text-sm text-muted-foreground">{creator.handle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {creator.followers.toLocaleString()} follower{creator.followers === 1 ? "" : "s"}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={() => navigate(`/profile/${creator.id}`)}
            >
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreatorsPanel;
