/**
 * Fee model for the CyberLink Exchange area.
 *
 * Every amount is handled as an integer number of minor units (cents, satoshis,
 * wei-scaled units …) so there is never floating-point drift on money. A rule
 * that has not been configured by an administrator is reported as
 * `unconfigured` — it is never silently treated as a zero fee.
 */

export type FeeCategory = "exchange" | "wallet" | "bank";
export type FeePayer = "sender" | "receiver" | "platform";

export interface FeeRule {
  id: string;
  category: FeeCategory;
  /** e.g. "spot_maker", "spot_taker", "conversion", "send", "deposit", "withdrawal" */
  operation: string;
  /** e.g. "ach", "wire", "sepa", "erc20", "lightning" */
  rail: string | null;
  asset: string | null;
  currency: string;
  percent_bps: number | null;
  fixed_minor: number | null;
  min_fee_minor: number | null;
  max_fee_minor: number | null;
  payer: FeePayer;
  minor_unit_scale: number;
  quote_ttl_seconds: number;
  is_configured: boolean;
  is_active: boolean;
  effective_from: string | null;
  provider_id: string | null;
  notes: string | null;
}

export interface FeeQuoteInput {
  amountMinor: number;
  rule: FeeRule | null | undefined;
  /** Charged by the payment/exchange provider, passed through unchanged. */
  providerFeeMinor?: number;
  /** Blockchain network cost, passed through unchanged. */
  networkFeeMinor?: number;
  /** Defaults to now; supplied in tests and by the server. */
  now?: Date;
}

export interface FeeQuote {
  ok: true;
  currency: string;
  minorUnitScale: number;
  payer: FeePayer;
  amountMinor: number;
  platformFeeMinor: number;
  providerFeeMinor: number;
  networkFeeMinor: number;
  totalFeeMinor: number;
  /** What the sender is debited. */
  totalMinor: number;
  /** What the receiver ends up with. */
  netReceivedMinor: number;
  expiresAt: string;
  quoteTtlSeconds: number;
}

export interface FeeQuoteProblem {
  ok: false;
  reason: "unconfigured" | "inactive" | "not_yet_effective" | "invalid_amount" | "invalid_fee";
  message: string;
}

export type FeeQuoteResult = FeeQuote | FeeQuoteProblem;

const isNonNegativeInteger = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** Percentage part, rounded half-up on the integer minor unit. */
export function percentFeeMinor(amountMinor: number, percentBps: number): number {
  return Math.floor((amountMinor * percentBps + 5000) / 10000);
}

export function quoteFee(input: FeeQuoteInput): FeeQuoteResult {
  const { rule } = input;
  const providerFeeMinor = input.providerFeeMinor ?? 0;
  const networkFeeMinor = input.networkFeeMinor ?? 0;
  const now = input.now ?? new Date();

  if (!rule || !rule.is_configured) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "No fee has been set for this operation yet, so it cannot be priced.",
    };
  }
  if (!rule.is_active) {
    return { ok: false, reason: "inactive", message: "This fee rule is saved but not switched on." };
  }
  if (rule.effective_from && new Date(rule.effective_from).getTime() > now.getTime()) {
    return {
      ok: false,
      reason: "not_yet_effective",
      message: `This fee rule starts on ${new Date(rule.effective_from).toLocaleDateString()}.`,
    };
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    return { ok: false, reason: "invalid_amount", message: "Enter an amount greater than zero." };
  }
  if (!isNonNegativeInteger(providerFeeMinor) || !isNonNegativeInteger(networkFeeMinor)) {
    return { ok: false, reason: "invalid_fee", message: "Provider and network costs must be whole, positive amounts." };
  }
  if (rule.percent_bps == null || rule.fixed_minor == null) {
    return { ok: false, reason: "unconfigured", message: "This fee rule is missing its percentage or fixed amount." };
  }

  let platformFeeMinor = percentFeeMinor(input.amountMinor, rule.percent_bps) + rule.fixed_minor;
  if (rule.min_fee_minor != null) platformFeeMinor = Math.max(platformFeeMinor, rule.min_fee_minor);
  if (rule.max_fee_minor != null) platformFeeMinor = Math.min(platformFeeMinor, rule.max_fee_minor);

  const totalFeeMinor = platformFeeMinor + providerFeeMinor + networkFeeMinor;
  const senderPays = rule.payer === "sender";
  const receiverPays = rule.payer === "receiver";

  return {
    ok: true,
    currency: rule.currency,
    minorUnitScale: rule.minor_unit_scale,
    payer: rule.payer,
    amountMinor: input.amountMinor,
    platformFeeMinor,
    providerFeeMinor,
    networkFeeMinor,
    totalFeeMinor,
    totalMinor: senderPays ? input.amountMinor + totalFeeMinor : input.amountMinor,
    netReceivedMinor: receiverPays
      ? Math.max(0, input.amountMinor - totalFeeMinor)
      : input.amountMinor,
    expiresAt: new Date(now.getTime() + rule.quote_ttl_seconds * 1000).toISOString(),
    quoteTtlSeconds: rule.quote_ttl_seconds,
  };
}

export function isQuoteExpired(quote: Pick<FeeQuote, "expiresAt">, now: Date = new Date()): boolean {
  return new Date(quote.expiresAt).getTime() <= now.getTime();
}

/** Formats integer minor units for display without floating-point drift. */
export function formatMinor(amountMinor: number, scale: number, currency?: string): string {
  const negative = amountMinor < 0;
  const digits = Math.abs(amountMinor).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale) || "0";
  const fraction = scale > 0 ? `.${digits.slice(digits.length - scale)}` : "";
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${fraction}${currency ? ` ${currency}` : ""}`;
}

/** Parses a typed decimal amount into integer minor units. Null when invalid. */
export function parseToMinor(value: string, scale: number): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!/^\d*(\.\d*)?$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > scale) return null;
  const minor = Number(`${whole || "0"}${fraction.padEnd(scale, "0")}`);
  return Number.isSafeInteger(minor) ? minor : null;
}
