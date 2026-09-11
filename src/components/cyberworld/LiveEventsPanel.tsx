/**
 * Live and recent broadcasts, read straight from the platform's own
 * live_streams records. Nothing here is simulated: if no one is live,
 * the panel says so.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Video } from "lucide-react";

interface StreamRow {
  id: string;
  title: string;
  category: string | null;
  is_live: boolean | null;
  viewer_count: number | null;
  started_at: string | null;
}

interface Props {
  /** Only show broadcasts in this category (e.g. trading). */
  category?: string;
  emptyMessage?: string;
}

const LiveEventsPanel = ({ category, emptyMessage }: Props) => {
  const [streams, setStreams] = useState<StreamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      let query = supabase
        .from("live_streams")
        .select("id,title,category,is_live,viewer_count,started_at")
        .eq("is_live", true)
        .order("started_at", { ascending: false })
        .limit(25);
      if (category) query = query.eq("category", category);
      const { data, error: err } = await query;
      if (!alive) return;
      if (err) setError(err.message);
      else setStreams((data ?? []) as StreamRow[]);
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [category]);

  if (error) {
    return <p className="text-sm text-destructive">Live broadcasts are unavailable right now.</p>;
  }

  if (!streams) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Radio className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? "Nobody is live at the moment."}
        </p>
        <Button size="sm" className="mt-3" onClick={() => navigate("/studio")}>
          Go live
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{stream.title}</p>
              <div className="mt-1 flex items-center gap-2">
                {stream.category && (
                  <Badge variant="outline" className="text-xs">
                    {stream.category}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {(stream.viewer_count ?? 0).toLocaleString()} watching
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/cyber-streamer")}>
            Watch
          </Button>
        </div>
      ))}
    </div>
  );
};

export default LiveEventsPanel;
