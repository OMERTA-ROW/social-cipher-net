/**
 * What each connected provider can actually do with money, and whether a
 * transfer route between two of them is eligible.
 *
 * A social login is not a payout rail: reading a platform's revenue report says
 * nothing about being able to move money. Every row below is derived from the
 * provider's own documented API surface, and anything not integrated yet is
 * marked as such rather than assumed.
 */

import type { WalletCapability } from "./walletModel";

export interface ProviderCapabilityRow {
  serviceId: string;
  name: string;
  /** Kind of place money can sit or come from. */
  kind: "platform_revenue" | "exchange" | "self_custody" | "internal" | "payments";
  capabilities: WalletCapability[];
  /** True only when the provider is wired up end to end in this project. */
  integrated: boolean;
  note: string;
  docsUrl?: string;
}

export const PROVIDER_CAPABILITIES: ProviderCapabilityRow[] = [
  {
    serviceId: "cyberlink",
    name: "CyberLink balance",
    kind: "internal",
    capabilities: ["read_earnings", "read_balances"],
    integrated: true,
    note: "Money we hold for you on the platform. Payouts run through the withdrawal queue, not an instant rail.",
  },
  {
    serviceId: "youtube",
    name: "YouTube",
    kind: "platform_revenue",
    capabilities: ["read_earnings"],
    integrated: true,
    note: "Estimated revenue only, through the YouTube Analytics API with the monetary scope. No balance and no transfer API.",
    docsUrl: "https://developers.google.com/youtube/analytics/reference/reports/query",
  },
  {
    serviceId: "shopify",
    name: "Shopify",
    kind: "platform_revenue",
    capabilities: ["read_earnings"],
    integrated: true,
    note: "Order totals only. Payouts settle in Shopify Payments, which is not connected here.",
  },
  {
    serviceId: "etsy",
    name: "Etsy",
    kind: "platform_revenue",
    capabilities: ["read_earnings"],
    integrated: true,
    note: "Receipt totals only. Etsy does not expose a payout or transfer API to us.",
  },
  {
    serviceId: "streamlabs",
    name: "Streamlabs",
    kind: "platform_revenue",
    capabilities: ["read_earnings"],
    integrated: true,
    note: "Donation totals only. Funds settle with the donor's payment processor.",
  },
  {
    serviceId: "kraken_account",
    name: "Kraken",
    kind: "exchange",
    capabilities: [],
    integrated: false,
    note: "Read-only keys are stored encrypted. Balance reads and withdrawals stay off until the Kraken integration is built and enabled.",
    docsUrl: "https://support.kraken.com/articles/360000767986-cryptocurrency-withdrawal-fees-and-minimums",
  },
  {
    serviceId: "coinbase_account",
    name: "Coinbase",
    kind: "exchange",
    capabilities: [],
    integrated: false,
    note: "Keys stored encrypted; no balance or transfer calls are made yet.",
  },
  {
    serviceId: "kucoin_account",
    name: "KuCoin",
    kind: "exchange",
    capabilities: [],
    integrated: false,
    note: "Keys stored encrypted; no balance or transfer calls are made yet.",
  },
  {
    serviceId: "bybit_account",
    name: "Bybit",
    kind: "exchange",
    capabilities: [],
    integrated: false,
    note: "Keys stored encrypted; no balance or transfer calls are made yet.",
  },
  {
    serviceId: "evm_wallet",
    name: "Self-custody wallet (EVM)",
    kind: "self_custody",
    capabilities: [],
    integrated: false,
    note: "Address tracking only. We never hold your keys, so we cannot move funds for you.",
  },
  {
    serviceId: "solana_wallet",
    name: "Self-custody wallet (Solana)",
    kind: "self_custody",
    capabilities: [],
    integrated: false,
    note: "Address tracking only. We never hold your keys, so we cannot move funds for you.",
  },
  {
    serviceId: "stripe",
    name: "Stripe",
    kind: "payments",
    capabilities: [],
    integrated: false,
    note: "Stripe handles subscription checkout today. Connect balances and transfers are not enabled on this account.",
    docsUrl: "https://docs.stripe.com/connect/account-balances",
  },
];

export function capabilityRow(serviceId: string): ProviderCapabilityRow | undefined {
  return PROVIDER_CAPABILITIES.find((row) => row.serviceId === serviceId);
}

export function capabilitiesFor(serviceId: string): WalletCapability[] {
  return capabilityRow(serviceId)?.capabilities ?? [];
}

export type BlockerCode =
  | "unknown_provider"
  | "not_owner"
  | "source_cannot_withdraw"
  | "destination_cannot_deposit"
  | "provider_not_integrated"
  | "fee_not_configured"
  | "execution_disabled"
  | "same_endpoint"
  | "insufficient_available";

export interface Blocker {
  code: BlockerCode;
  message: string;
  /** Exactly what has to happen before this stops blocking. */
  setup: string;
}

export interface RouteRequest {
  fromServiceId: string;
  toServiceId: string;
  /** Ownership already proven server-side for both endpoints. */
  ownsSource: boolean;
  ownsDestination: boolean;
  /** A configured, active CyberLink fee rule exists for this route. */
  feeConfigured: boolean;
  /** Eligible available balance in minor units, null when unknown. */
  availableMinor: number | null;
  amountMinor: number;
  /** Master switch. Stays false until a real money provider is live. */
  executionEnabled?: boolean;
}

export interface RouteDecision {
  eligible: boolean;
  blockers: Blocker[];
}

/**
 * Decides whether a route could ever run. Execution is off project-wide, so a
 * clean route still returns `eligible: false` with `execution_disabled` — the
 * remaining blockers tell the member exactly what else is missing.
 */
export function evaluateRoute(request: RouteRequest): RouteDecision {
  const blockers: Blocker[] = [];
  const from = capabilityRow(request.fromServiceId);
  const to = capabilityRow(request.toServiceId);

  if (!from || !to) {
    blockers.push({
      code: "unknown_provider",
      message: "One side of this transfer is not a provider we know.",
      setup: "Pick a source and destination from your connected accounts.",
    });
    return { eligible: false, blockers };
  }

  if (from.serviceId === to.serviceId) {
    blockers.push({
      code: "same_endpoint",
      message: "The source and destination are the same place.",
      setup: "Choose two different accounts.",
    });
  }
  if (!request.ownsSource || !request.ownsDestination) {
    blockers.push({
      code: "not_owner",
      message: "Both accounts have to be linked to your own profile.",
      setup: "Link the missing account on the Connections page, then try again.",
    });
  }
  if (!from.capabilities.includes("withdraw") && !from.capabilities.includes("transfer")) {
    blockers.push({
      code: "source_cannot_withdraw",
      message: `${from.name} cannot send money out through an API.`,
      setup: from.note,
    });
  }
  if (!to.capabilities.includes("deposit") && !to.capabilities.includes("transfer")) {
    blockers.push({
      code: "destination_cannot_deposit",
      message: `${to.name} cannot receive money through an API.`,
      setup: to.note,
    });
  }
  if (!from.integrated || !to.integrated) {
    const pending = [from, to].filter((p) => !p.integrated).map((p) => p.name).join(" and ");
    blockers.push({
      code: "provider_not_integrated",
      message: `${pending} is not integrated for money movement yet.`,
      setup: "Choose the provider you want to use, then its API app and permissions have to be set up before this route can open.",
    });
  }
  if (!request.feeConfigured) {
    blockers.push({
      code: "fee_not_configured",
      message: "No fee has been set for this route, so it cannot be priced.",
      setup: "Set the rate for this route in Fee settings and switch it on.",
    });
  }
  if (request.availableMinor != null && request.amountMinor > request.availableMinor) {
    blockers.push({
      code: "insufficient_available",
      message: "The amount is more than the available balance on the source account.",
      setup: "Lower the amount or wait for pending funds to become available.",
    });
  }
  if (!request.executionEnabled) {
    blockers.push({
      code: "execution_disabled",
      message: "Money movement is switched off across the whole platform.",
      setup: "It stays off until a payment or exchange provider is chosen, connected and switched on by the owner.",
    });
  }

  return { eligible: blockers.length === 0, blockers };
}
