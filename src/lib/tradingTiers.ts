/**
 * Trading feature gating, wired to the subscription tiers that already exist
 * in this project (free / plus / pro, plus the terminal add-on).
 *
 * There is no parallel tier system here: entitlements are read from
 * `user_entitlements`, the same table the rest of the platform uses.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TierKey = "free" | "plus" | "pro";

export interface TradingLimits {
  /** how many chart panes may be open at once */
  maxPanes: number;
  /** grid choices the tier may pick from */
  grids: number[];
  /** indicators per pane */
  maxIndicators: number;
  /** advanced studies (MACD/Bollinger/Fibonacci) */
  advancedIndicators: boolean;
  /** saved layouts + watchlists */
  maxLayouts: number;
  /** connected wallets / brokerage keys */
  maxConnections: number;
  /** poll interval for live quotes, ms */
  refreshMs: number;
  label: string;
}

export const TRADING_LIMITS: Record<TierKey, TradingLimits> = {
  free: {
    maxPanes: 1,
    grids: [1],
    maxIndicators: 2,
    advancedIndicators: false,
    maxLayouts: 1,
    maxConnections: 1,
    refreshMs: 60_000,
    label: "Free",
  },
  plus: {
    maxPanes: 4,
    grids: [1, 2, 4],
    maxIndicators: 5,
    advancedIndicators: true,
    maxLayouts: 5,
    maxConnections: 3,
    refreshMs: 30_000,
    label: "Plus",
  },
  pro: {
    maxPanes: 9,
    grids: [1, 2, 4, 6, 9],
    maxIndicators: 12,
    advancedIndicators: true,
    maxLayouts: 50,
    maxConnections: 20,
    refreshMs: 10_000,
    label: "Pro",
  },
};

const RANK: TierKey[] = ["free", "plus", "pro"];

/** Highest active tier the signed-in user holds. */
export function useTradingTier() {
  const [tier, setTier] = useState<TierKey>("free");
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!alive) return;
      setSignedIn(Boolean(user));
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("user_entitlements")
        .select("tier_key, status")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (!alive) return;
      let best: TierKey = "free";
      for (const row of data ?? []) {
        const key = String(row.tier_key) as TierKey;
        if (RANK.includes(key) && RANK.indexOf(key) > RANK.indexOf(best)) best = key;
      }
      setTier(best);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { tier, limits: TRADING_LIMITS[tier], loading, signedIn };
}

export const nextTierAbove = (tier: TierKey): TierKey | null =>
  RANK[RANK.indexOf(tier) + 1] ?? null;
