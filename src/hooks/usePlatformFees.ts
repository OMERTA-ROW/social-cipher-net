import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RevenueType =
  | "gifts"
  | "tips"
  | "creator_subscriptions"
  | "shop_sales"
  | "affiliate_conversions";

export interface FeeRate {
  revenue_type: string;
  percent: number;
  updated_at?: string;
}

const REVENUE_TYPES: RevenueType[] = [
  "gifts",
  "tips",
  "creator_subscriptions",
  "shop_sales",
  "affiliate_conversions",
];

/**
 * Platform fee percentages, configured by the owner in the CEO portal.
 *
 * Read through the `get_platform_fee` lookup rather than the fee table
 * directly: the table itself is no longer readable from the browser, so every
 * read is scoped to one revenue type and recorded in the security audit log.
 * A type that has no configured rate resolves to 0 rather than a guess.
 */
export const usePlatformFees = () =>
  useQuery<FeeRate[]>({
    queryKey: ["platform-fee-rates"],
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all(
        REVENUE_TYPES.map(async (type) => {
          const { data, error } = await supabase.rpc("get_platform_fee", {
            _revenue_type: type,
          });
          if (error) throw error;
          return { revenue_type: type, percent: Number(data ?? 0) } as FeeRate;
        })
      );
      return results;
    },
  });

export const feePercentOf = (rates: FeeRate[] | undefined, type: RevenueType) =>
  Number(rates?.find((r) => r.revenue_type === type)?.percent ?? 0);

export const splitAmount = (gross: number, percent: number) => {
  const fee = Math.round(gross * (percent / 100) * 100) / 100;
  return { gross, fee, net: Math.round((gross - fee) * 100) / 100 };
};

export const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount || 0);
