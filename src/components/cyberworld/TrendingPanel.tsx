/**
 * Trending topics, counted from real posts on the platform. Tags are derived
 * from post content over the most recent posts; there are no invented counts.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";

interface Tag {
  tag: string;
  count: number;
}

const TrendingPanel = () => {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error: err } = await supabase
        .from("posts")
        .select("content")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      if (err) {
        setError(err.message);
        return;
      }
      const counts = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const matches = (row.content ?? "").match(/#[\p{L}\p{N}_]{2,40}/gu) ?? [];
        new Set(matches.map((m) => m.toLowerCase())).forEach((tag) => {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        });
      });
      setTags(
        [...counts.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      );
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (error) return <p className="text-sm text-destructive">Trending topics are unavailable right now.</p>;

  if (!tags) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No topics are trending yet — add a #tag to a post to start one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tags.map((item, index) => (
        <div
          key={item.tag}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold">
              {index + 1}
            </div>
            <div>
              <p className="font-medium">{item.tag}</p>
              <p className="text-sm text-muted-foreground">
                {item.count.toLocaleString()} recent post{item.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
};

export default TrendingPanel;
