/**
 * Single source of truth for Cyber Link subscription tiers and feature gating.
 *
 * Tier keys match `public.subscription_tiers` and `public.user_entitlements`
 * (free / plus / pro, plus the `terminal` add-on). Server-side enforcement
 * lives in RLS via `public.has_paid_plan(uuid)`; this file is the UI mirror.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TierKey = "free" | "plus" | "pro";
export type BillingInterval = "month" | "year";

export interface TierDefinition {
  key: TierKey;
  name: string;
  blurb: string;
  /** price in USD */
  monthly: number;
  yearly: number;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  productId: string | null;
  features: string[];
}

export const TIER_ORDER: TierKey[] = ["free", "plus", "pro"];

export const TIERS: Record<TierKey, TierDefinition> = {
  free: {
    key: "free",
    name: "Free",
    blurb: "Core social features",
    monthly: 0,
    yearly: 0,
    monthlyPriceId: null,
    yearlyPriceId: null,
    productId: null,
    features: [
      "Posting, feed and comments",
      "Messaging and profile media",
      "Single live chart pane",
      "Connected-platform earnings view",
    ],
  },
  plus: {
    key: "plus",
    name: "Plus",
    blurb: "Creator monetization unlocked",
    monthly: 5,
    yearly: 50,
    monthlyPriceId: "price_1UF12zHTVeX8KHmEtfEZPJwH",
    yearlyPriceId: "price_1SS5WmHTVeX8KHmEy9i3Aokb",
    productId: "prod_TOtJnFseC54ChY",
    features: [
      "Everything in Free",
      "Pay-per-view and pay-per-click posts",
      "Affiliate links and affiliate networks",
      "Brand deals, media kit and campaigns",
      "4 chart panes, advanced indicators",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    blurb: "Full platform access",
    monthly: 10,
    yearly: 100,
    monthlyPriceId: "price_1UF133HTVeX8KHmEGT7pfoyJ",
    yearlyPriceId: "price_1SS5eQHTVeX8KHmExN8saFdg",
    productId: "prod_TOtRdMUKNeKkFc",
    features: [
      "Everything in Plus",
      "Ad-free browsing",
      "Terminal included",
      "Multicast publishing and inbox automations",
      "9 chart panes, fastest refresh",
    ],
  },
};

export const TERMINAL_ADDON = {
  key: "terminal" as const,
  name: "Terminal add-on",
  yearly: 8,
  yearlyPriceId: "price_1UEghyHTVeX8KHmENq6kMXeG",
  productId: "prod_VFB4e6LecHM4mM",
};

/** Percentage saved by paying yearly instead of monthly. */
export const yearlyDiscountPercent = (tier: TierDefinition) =>
  tier.monthly > 0 ? Math.round((1 - tier.yearly / (tier.monthly * 12)) * 100) : 0;

export const priceIdFor = (tier: TierDefinition, interval: BillingInterval) =>
  interval === "year" ? tier.yearlyPriceId : tier.monthlyPriceId;

/** Feature flags gated by tier. */
export const FEATURES = {
  payPerView: "plus",
  payPerClick: "plus",
  affiliates: "plus",
  brandDeals: "plus",
  mediaKit: "plus",
  adFree: "pro",
  terminal: "pro",
  multicast: "pro",
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const tierAtLeast = (tier: TierKey, required: TierKey) =>
  TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required);

export const featureAllowed = (tier: TierKey, feature: FeatureKey) =>
  tierAtLeast(tier, FEATURES[feature] as TierKey);

/** Highest active plan the signed-in user holds, from `user_entitlements`. */
export function useTier() {
  const [tier, setTier] = useState<TierKey>("free");
  const [hasTerminal, setHasTerminal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    setSignedIn(Boolean(user));
    if (!user) {
      setTier("free");
      setHasTerminal(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_entitlements")
      .select("tier_key, status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active");

    let best: TierKey = "free";
    let terminal = false;
    for (const row of data ?? []) {
      const ends = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
      if (ends !== null && ends < Date.now()) continue;
      const key = String(row.tier_key);
      if (key === "terminal") terminal = true;
      if ((TIER_ORDER as string[]).includes(key) && tierAtLeast(key as TierKey, best)) {
        best = key as TierKey;
      }
    }
    setTier(best);
    setHasTerminal(terminal || best === "pro");
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    load().catch(() => alive && setLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (alive) load();
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [load]);

  return {
    tier,
    definition: TIERS[tier],
    isPaid: tier !== "free",
    hasTerminal,
    loading,
    signedIn,
    refresh: load,
    can: (feature: FeatureKey) => featureAllowed(tier, feature),
  };
}
