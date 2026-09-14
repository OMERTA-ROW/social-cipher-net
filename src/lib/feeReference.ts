/**
 * Draft fee template and published-source references for the Exchange admin.
 *
 * IMPORTANT: nothing in this file is a CyberLink price. The benchmark figures
 * are provider-published examples, kept only so an administrator can compare
 * structures while deciding real rates. Actual CyberLink rates live in the
 * `fee_settings` table and stay unset until an administrator configures them.
 */

export interface FeeReferenceSource {
  provider: string;
  title: string;
  url: string;
  checkedOn: string;
  summary: string;
}

export const FEE_REFERENCE_SOURCES: FeeReferenceSource[] = [
  {
    provider: "Coinbase Exchange",
    title: "Exchange fees",
    url: "https://help.coinbase.com/en/exchange/trading-and-funding/exchange-fees",
    checkedOn: "2026-09-14",
    summary:
      "Maker/taker tiers stepped by trailing 30-day volume in USD, with separate deposit and withdrawal pricing per funding method and network costs disclosed at transaction time.",
  },
  {
    provider: "Coinbase",
    title: "Pricing and fees",
    url: "https://help.coinbase.com/en/coinbase/trading-and-funding/pricing-and-fees/fees",
    checkedOn: "2026-09-14",
    summary:
      "Splits the cost of a transaction into network cost, service fee and spread, and shows the combined total before the customer confirms.",
  },
  {
    provider: "Kraken",
    title: "Fee schedule",
    url: "https://www.kraken.com/features/fee-schedule",
    checkedOn: "2026-09-14",
    summary:
      "Volume-tiered fee table shared across their products. Read the live page for current numbers — cached or quoted rates go stale quickly.",
  },
];

export type DraftRowStatus = "not_set";

export interface DraftFeeRow {
  category: "exchange" | "wallet" | "bank";
  operation: string;
  label: string;
  rail: string | null;
  basis: string;
  payer: "sender" | "receiver" | "platform";
  /** Structure only — a provider-published example for comparison, never our price. */
  benchmarkExample: string;
  benchmarkSource: string;
  status: DraftRowStatus;
}

/**
 * The shape a complete CyberLink fee schedule needs to cover. Every row is
 * unset until an administrator fills it in; none of these are live prices.
 */
export const DRAFT_FEE_TEMPLATE: DraftFeeRow[] = [
  {
    category: "exchange",
    operation: "spot_maker",
    label: "Spot trade — maker",
    rail: null,
    basis: "Percentage of trade value, optionally tiered by trailing 30-day volume",
    payer: "sender",
    benchmarkExample: "Coinbase Exchange publishes 0.40% for the entry maker tier ($0–$10k, 30-day volume)",
    benchmarkSource: "Coinbase Exchange",
    status: "not_set",
  },
  {
    category: "exchange",
    operation: "spot_taker",
    label: "Spot trade — taker",
    rail: null,
    basis: "Percentage of trade value, optionally tiered by trailing 30-day volume",
    payer: "sender",
    benchmarkExample: "Coinbase Exchange publishes 0.60% for the entry taker tier ($0–$10k, 30-day volume)",
    benchmarkSource: "Coinbase Exchange",
    status: "not_set",
  },
  {
    category: "exchange",
    operation: "conversion",
    label: "Instant conversion / spread",
    rail: null,
    basis: "Percentage spread applied to the quoted rate, plus an optional fixed service fee",
    payer: "sender",
    benchmarkExample: "Coinbase itemises spread and service fee separately from network cost before confirmation",
    benchmarkSource: "Coinbase",
    status: "not_set",
  },
  {
    category: "wallet",
    operation: "send",
    label: "External wallet send",
    rail: "per asset and network",
    basis: "Fixed fee per asset/network plus the actual network cost quoted at send time",
    payer: "sender",
    benchmarkExample: "Providers disclose an estimated network cost per asset at transaction time rather than a flat rate",
    benchmarkSource: "Coinbase",
    status: "not_set",
  },
  {
    category: "bank",
    operation: "deposit",
    label: "Bank deposit",
    rail: "ach / wire / sepa",
    basis: "Fixed fee per rail, optional percentage, with min and max bounds",
    payer: "sender",
    benchmarkExample:
      "Coinbase Exchange lists $10 for an incoming USD wire. Their free ACH price is a retail decision, not a processor cost — our own processor cost is unknown until a provider is chosen.",
    benchmarkSource: "Coinbase Exchange",
    status: "not_set",
  },
  {
    category: "bank",
    operation: "withdrawal",
    label: "Bank withdrawal",
    rail: "ach / wire / sepa",
    basis: "Fixed fee per rail, optional percentage, with min and max bounds",
    payer: "receiver",
    benchmarkExample: "Coinbase Exchange lists $25 for an outgoing USD wire",
    benchmarkSource: "Coinbase Exchange",
    status: "not_set",
  },
];

export const FEE_TEMPLATE_FIELDS = [
  "Percentage rate (basis points)",
  "Fixed amount (minor units)",
  "Minimum and maximum fee",
  "Currency and minor-unit scale",
  "Who pays (sender, receiver or platform)",
  "Provider and network costs, kept separate",
  "Effective date",
  "Quote validity in seconds",
];
