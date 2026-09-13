/**
 * Trading feature gating, wired to the subscription tiers that already exist
 * in this project (free / plus / pro, plus the terminal add-on).
 *
 * There is no parallel tier system here: entitlements are read from
 * `user_entitlements`, the same table the rest of the platform uses.
 */

import { useTier, type TierKey } from "@/lib/tiers";

export type { TierKey };

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

/** Highest active tier the signed-in user holds (shared tier source). */
export function useTradingTier() {
  const { tier, loading, signedIn } = useTier();
  return { tier, limits: TRADING_LIMITS[tier], loading, signedIn };
}

export const nextTierAbove = (tier: TierKey): TierKey | null =>
  RANK[RANK.indexOf(tier) + 1] ?? null;
