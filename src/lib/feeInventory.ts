/**
 * Every place on the site that shows or calculates a fee, and where that
 * number comes from. This is the audit list: if a surface appears here with
 * `policy: "platform"` it must read `fee_settings` through the server fee
 * engine, and if it shows a provider cost it must cite a registry entry.
 */

export type FeePolicy =
  | "platform" // CyberLink's own rate, from fee_settings — unset until the owner configures it
  | "provider" // a provider's own cost, from the provider fee registry or a live quote
  | "mixed"
  | "none"; // no fee is charged on this surface

export interface FeeSurface {
  id: string;
  label: string;
  route: string;
  component: string;
  policy: FeePolicy;
  /** Provider fee registry ids this surface may cite. */
  registryIds: string[];
  status: "routed" | "unresolved" | "not_applicable";
  note: string;
}

export const FEE_SURFACES: FeeSurface[] = [
  {
    id: "wallet.transfer",
    label: "Wallet transfer quote",
    route: "/wallet",
    component: "TransferPanel",
    policy: "mixed",
    registryIds: ["stripe.connect.separate_charges_transfers", "kraken.crypto_withdrawal"],
    status: "unresolved",
    note: "Server-priced through the fee engine. No CyberLink rate is set and no money provider is connected, so every route is blocked with its reason.",
  },
  {
    id: "wallet.withdrawal",
    label: "Wallet withdrawal request",
    route: "/wallet",
    component: "WalletCard",
    policy: "platform",
    registryIds: [],
    status: "unresolved",
    note: "Withdrawals are queued for manual review. The payout cost depends on the payout provider, which has not been chosen.",
  },
  {
    id: "exchange.quote",
    label: "Exchange fee estimate",
    route: "/exchange",
    component: "FeeQuoteCalculator",
    policy: "mixed",
    registryIds: ["kraken.crypto_withdrawal"],
    status: "unresolved",
    note: "Quotes come from the exchange-quote function. Rules are unset, so it returns an honest 'not priced yet'.",
  },
  {
    id: "exchange.admin",
    label: "Fee settings (owner only)",
    route: "/exchange",
    component: "FeeSettingsAdmin",
    policy: "platform",
    registryIds: [],
    status: "routed",
    note: "The only place a CyberLink rate can be set. Writes are restricted to the admin role server-side.",
  },
  {
    id: "subscription.checkout",
    label: "Subscription and Terminal checkout",
    route: "/subscription",
    component: "Subscription",
    policy: "provider",
    registryIds: ["stripe.checkout.subscriptions"],
    status: "unresolved",
    note: "Prices are set per Stripe product. Stripe's processing cost is not shown to members and is not fixed until the business country and contract are known.",
  },
  {
    id: "marketplace.sale",
    label: "Shop / marketplace sale split",
    route: "/shop",
    component: "process-sale",
    policy: "platform",
    registryIds: ["stripe.checkout.subscriptions"],
    status: "unresolved",
    note: "The house cut reads platform_fee_rates server-side. Rates are configured by the owner, never guessed here.",
  },
  {
    id: "monetization.earnings",
    label: "Monetization earnings and payouts",
    route: "/monetization",
    component: "Monetization",
    policy: "platform",
    registryIds: [],
    status: "unresolved",
    note: "Shows recorded earnings. Payout cost appears only once a payout provider is connected.",
  },
  {
    id: "tokens.purchase",
    label: "Token purchase",
    route: "/tokens",
    component: "TokenPurchase",
    policy: "provider",
    registryIds: ["stripe.checkout.subscriptions"],
    status: "unresolved",
    note: "Charged through Stripe checkout at the listed price; the processing cost is absorbed, not itemised.",
  },
];

export function surfacesByPolicy(policy: FeePolicy): FeeSurface[] {
  return FEE_SURFACES.filter((s) => s.policy === policy);
}

export function unresolvedSurfaces(): FeeSurface[] {
  return FEE_SURFACES.filter((s) => s.status === "unresolved");
}
