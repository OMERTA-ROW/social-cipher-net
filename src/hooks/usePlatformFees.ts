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
  updated_at: string;
}

/**
 * Platform fee percentages, configured by the owner in the CEO portal.
 * Never hardcoded in the UI — every breakdown reads these live values.
 */
export const usePlatformFees = () =>
  useQuery<FeeRate[]>({
    queryKey: ["platform-fee-rates"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_fee_rates")
        .select("revenue_type, percent, updated_at")
        .order("revenue_type");
      if (error) throw error;
      return (data ?? []) as FeeRate[];
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
