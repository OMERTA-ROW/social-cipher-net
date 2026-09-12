import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Real, realtime presence sourced only from active live_streams rows. */
export const useLivePresence = (userIds: string[]) => {
  const key = useMemo(() => [...new Set(userIds.filter(Boolean))].sort().join(","), [userIds]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) {
      setLiveIds(new Set());
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("user_id")
        .in("user_id", ids)
        .eq("is_live", true);
      if (active) setLiveIds(new Set((data ?? []).map((row) => row.user_id)));
    };
    load();
    const channel = supabase
      .channel(`live-presence-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [key]);

  return liveIds;
};
