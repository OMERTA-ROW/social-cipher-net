import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SnipeHit {
  id: string;
  target_user_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  impact_x: number;
  impact_y: number;
  seed: number;
  expires_at: string;
  created_at: string;
}

/**
 * Active sniper hits on a user. Hits expire on their own (duration scales
 * with how many shots the user has taken in the last 30 days), and new hits
 * arrive live so the strike can play for everyone watching.
 */
export const useSnipeStatus = (targetUserId?: string | null) => {
  const [hits, setHits] = useState<SnipeHit[]>([]);
  const [incoming, setIncoming] = useState<SnipeHit | null>(null);
  const known = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!targetUserId) {
      setHits([]);
      return;
    }
    const { data } = await supabase
      .from("snipe_hits")
      .select("*")
      .eq("target_user_id", targetUserId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as SnipeHit[];
    rows.forEach((r) => known.current.add(r.id));
    setHits(rows);
  }, [targetUserId]);

  useEffect(() => {
    known.current = new Set();
    load();
  }, [load]);

  // live shots
  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`snipe-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "snipe_hits",
          filter: `target_user_id=eq.${targetUserId}`,
        },
        (payload) => {
          const hit = payload.new as SnipeHit;
          if (known.current.has(hit.id)) return;
          known.current.add(hit.id);
          setHits((prev) => [...prev, hit]);
          setIncoming(hit);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId]);

  // drop hits as they expire
  useEffect(() => {
    if (hits.length === 0) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setHits((prev) => prev.filter((h) => new Date(h.expires_at).getTime() > now));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [hits.length]);

  const expiresAt = hits.reduce<number>(
    (max, h) => Math.max(max, new Date(h.expires_at).getTime()),
    0,
  );

  return {
    hits,
    count: hits.length,
    expiresAt: expiresAt || null,
    incoming,
    clearIncoming: () => setIncoming(null),
    refresh: load,
  };
};
