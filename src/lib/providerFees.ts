/**
 * Shared provider-fee registry.
 *
 * "Standard rate" here means: the provider's own published standard schedule
 * for the applicable product, region, currency, tier and rail — verified
 * against the provider's official documentation, with the URL and the date it
 * was checked recorded. An authenticated account-specific or per-transaction
 * quote always overrides a standard schedule entry.
 *
 * These are provider COSTS, not CyberLink prices. CyberLink's own markup lives
 * in the `fee_settings` table and stays unset until the owner configures it —
 * nothing in this file may be used as a CyberLink rate.
 */

export type FeeVerification = "official_docs" | "authenticated_quote";

export interface FeeComponent {
  /** Percentage part in basis points, null when the schedule does not fix one. */
  percentBps: number | null;
  /** Fixed part in minor units, null when the schedule does not fix one. */
  fixedMinor: number | null;
  minorUnitScale: number;
  currency: string | null;
  payer: "sender" | "receiver" | "platform" | "unknown";
}

export interface ProviderFeeEntry {
  id: string;
  provider: string;
  /** e.g. "Connect payouts", "Crypto withdrawal", "Subscription checkout". */
  product: string;
  rail: string | null;
  /** Country/region the published number applies to, null when unresolved. */
  region: string | null;
  currency: string | null;
  tier: string | null;
  sourceUrl: string;
  checkedOn: string;
  verification: FeeVerification;
  component: FeeComponent | null;
  /**
   * True when the real cost is only known at transaction time (network cost,
   * FX spread, volume tier). Those must come from a live provider quote.
   */
  dynamic: boolean;
  /** Everything that still has to be decided before this can be applied. */
  missing: string[];
  summary: string;
}

/**
 * Providers actually present in this project. Where the published schedule
 * cannot be pinned down without knowing the business country, currency, asset
 * or account tier, the entry stays unresolved and says exactly what is missing.
 */
export const PROVIDER_FEE_REGISTRY: ProviderFeeEntry[] = [
  {
    id: "stripe.connect.account_balances",
    provider: "Stripe",
    product: "Connect account balances (pending vs available)",
    rail: "stripe_connect",
    region: null,
    currency: null,
    tier: null,
    sourceUrl: "https://docs.stripe.com/connect/account-balances",
    checkedOn: "2026-09-14",
    verification: "official_docs",
    component: null,
    dynamic: true,
    missing: [
      "Business country and settlement currency",
      "Whether a Connect platform account is actually opened",
      "Payout schedule and the account's contracted pricing",
    ],
    summary:
      "Documents pending vs available balances, authenticated per-account balance reads, and transfer failures when funds are insufficient. Pricing is contract- and country-specific, so no number is recorded here.",
  },
  {
    id: "stripe.connect.separate_charges_transfers",
    provider: "Stripe",
    product: "Separate charges and transfers",
    rail: "stripe_connect",
    region: null,
    currency: null,
    tier: null,
    sourceUrl: "https://docs.stripe.com/connect/separate-charges-and-transfers",
    checkedOn: "2026-09-14",
    verification: "official_docs",
    component: null,
    dynamic: true,
    missing: ["Connect account type", "Business country", "Contracted Connect pricing"],
    summary:
      "Describes the transfers Stripe Connect supports between a platform and its connected accounts. It is not a universal social-platform payout API — it only moves money already inside Stripe.",
  },
  {
    id: "stripe.checkout.subscriptions",
    provider: "Stripe",
    product: "Subscription checkout (currently used for Terminal and tiers)",
    rail: "card",
    region: null,
    currency: null,
    tier: null,
    sourceUrl: "https://stripe.com/pricing",
    checkedOn: "2026-09-14",
    verification: "official_docs",
    component: null,
    dynamic: true,
    missing: [
      "Business country — Stripe's pricing page localises automatically and the numbers differ per country",
      "Card type and currency mix",
      "Any negotiated rate on the live account",
    ],
    summary:
      "Card processing cost for existing Stripe checkout. Copying the localised published figure without matching the real business country and contract would be wrong, so it is left unresolved.",
  },
  {
    id: "kraken.crypto_withdrawal",
    provider: "Kraken",
    product: "Cryptocurrency withdrawal",
    rail: "on_chain",
    region: null,
    currency: null,
    tier: null,
    sourceUrl: "https://support.kraken.com/articles/360000767986-cryptocurrency-withdrawal-fees-and-minimums",
    checkedOn: "2026-09-14",
    verification: "official_docs",
    component: null,
    dynamic: true,
    missing: [
      "Asset and network for the withdrawal",
      "Whether the Kraken integration is switched on for this account",
      "A live withdrawal quote at transaction time",
    ],
    summary:
      "Kraken publishes a withdrawal fee and a minimum per asset and network, and they change. The applicable figure must come from a live quote for the chosen asset/network, not a cached table.",
  },
  {
    id: "youtube.analytics.estimated_revenue",
    provider: "YouTube",
    product: "Estimated revenue reporting (data source, not a fee)",
    rail: null,
    region: null,
    currency: null,
    tier: null,
    sourceUrl: "https://developers.google.com/youtube/analytics/reference/reports/query",
    checkedOn: "2026-09-14",
    verification: "official_docs",
    component: null,
    dynamic: true,
    missing: ["Nothing — this is a reporting source, it carries no CyberLink fee"],
    summary:
      "Requires OAuth with the monetary scope and only returns data up to the latest available reporting date. It is an estimate, never a spendable balance, and it is not a transfer API.",
  },
];

export function providerFee(id: string): ProviderFeeEntry | undefined {
  return PROVIDER_FEE_REGISTRY.find((entry) => entry.id === id);
}

export interface ProviderFeeContext {
  region?: string | null;
  currency?: string | null;
  asset?: string | null;
  tier?: string | null;
  /** An authenticated quote from the provider always wins over the schedule. */
  authenticatedQuote?: { component: FeeComponent; asOf: string; reference: string } | null;
}

export type ProviderFeeResolution =
  | {
      resolved: true;
      source: "authenticated_quote" | "published_schedule";
      component: FeeComponent;
      entry: ProviderFeeEntry;
      asOf: string;
      reference: string;
    }
  | { resolved: false; entry: ProviderFeeEntry | null; missing: string[] };

/**
 * Resolves what a provider will actually charge. An authenticated quote wins;
 * otherwise the published schedule is used only when every applicability field
 * it depends on is known. Missing information never resolves to zero.
 */
export function resolveProviderFee(id: string, context: ProviderFeeContext = {}): ProviderFeeResolution {
  const entry = providerFee(id);
  if (!entry) {
    return { resolved: false, entry: null, missing: ["Unknown provider fee reference"] };
  }

  if (context.authenticatedQuote) {
    return {
      resolved: true,
      source: "authenticated_quote",
      component: context.authenticatedQuote.component,
      entry,
      asOf: context.authenticatedQuote.asOf,
      reference: context.authenticatedQuote.reference,
    };
  }

  const missing = [...entry.missing];
  if (entry.region == null && !context.region) missing.push("Region/country not set");
  if (entry.currency == null && !context.currency) missing.push("Currency not set");
  if (entry.dynamic && !context.authenticatedQuote) {
    missing.push("A live provider quote is required because this cost varies per transaction");
  }
  if (!entry.component || missing.length > 0) {
    return { resolved: false, entry, missing: [...new Set(missing)] };
  }

  return {
    resolved: true,
    source: "published_schedule",
    component: entry.component,
    entry,
    asOf: entry.checkedOn,
    reference: entry.sourceUrl,
  };
}
