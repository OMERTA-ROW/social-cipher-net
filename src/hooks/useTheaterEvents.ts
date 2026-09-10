import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TheaterEvent {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  video_url: string | null;
  starts_at: string;
  capacity: number | null;
  status: string;
  is_live: boolean;
}

export const useTheaterEvents = () => {
  const [events, setEvents] = useState<TheaterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data } = await supabase
      .from("theater_events")
      .select(
        "id, host_id, title, description, poster_url, video_url, starts_at, capacity, status, is_live",
      )
      .order("starts_at", { ascending: true })
      .limit(50);

    setEvents((data ?? []) as TheaterEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, userId, refresh: load };
};
