import { describe, expect, it } from "vitest";
import { type FeeRule, formatMinor, isQuoteExpired, parseToMinor, percentFeeMinor, quoteFee } from "./fees";

const rule = (overrides: Partial<FeeRule> = {}): FeeRule => ({
  id: "rule-1",
  category: "exchange",
  operation: "spot_taker",
  rail: null,
  asset: null,
  currency: "USD",
  percent_bps: 60,
  fixed_minor: 0,
  min_fee_minor: null,
  max_fee_minor: null,
  payer: "sender",
  minor_unit_scale: 2,
  quote_ttl_seconds: 60,
  is_configured: true,
  is_active: true,
  effective_from: "2020-01-01T00:00:00.000Z",
  provider_id: null,
  notes: null,
  ...overrides,
});

const NOW = new Date("2026-09-14T08:00:00.000Z");

describe("quoteFee", () => {
  it("refuses to price an unconfigured rule instead of charging zero", () => {
    const missing = quoteFee({ amountMinor: 10_000, rule: null, now: NOW });
    const draft = quoteFee({ amountMinor: 10_000, rule: rule({ is_configured: false }), now: NOW });
    expect(missing.ok).toBe(false);
    expect(draft.ok).toBe(false);
    if (missing.ok === false) expect(missing.reason).toBe("unconfigured");
  });

  it("refuses a configured but switched-off rule", () => {
    const result = quoteFee({ amountMinor: 10_000, rule: rule({ is_active: false }), now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.reason).toBe("inactive");
  });

  it("refuses a rule that has not reached its effective date", () => {
    const result = quoteFee({ amountMinor: 10_000, rule: rule({ effective_from: "2026-10-01T00:00:00.000Z" }), now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.reason).toBe("not_yet_effective");
  });

  it("rejects non-positive and non-integer amounts", () => {
    expect(quoteFee({ amountMinor: 0, rule: rule(), now: NOW }).ok).toBe(false);
    expect(quoteFee({ amountMinor: -100, rule: rule(), now: NOW }).ok).toBe(false);
    expect(quoteFee({ amountMinor: 10.5, rule: rule(), now: NOW }).ok).toBe(false);
  });

  it("adds percentage and fixed parts on exact minor units", () => {
    const result = quoteFee({
      amountMinor: 123_456,
      rule: rule({ percent_bps: 150, fixed_minor: 25 }),
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    // 123456 * 1.50% = 1851.84 -> 1852, plus a 25 fixed fee.
    expect(result.platformFeeMinor).toBe(1877);
    expect(result.totalMinor).toBe(123_456 + 1877);
    expect(result.netReceivedMinor).toBe(123_456);
  });

  it("applies the minimum and maximum fee bounds", () => {
    const floored = quoteFee({ amountMinor: 100, rule: rule({ min_fee_minor: 99 }), now: NOW });
    const capped = quoteFee({ amountMinor: 10_000_000, rule: rule({ max_fee_minor: 500 }), now: NOW });
    if (floored.ok) expect(floored.platformFeeMinor).toBe(99);
    if (capped.ok) expect(capped.platformFeeMinor).toBe(500);
  });

  it("keeps provider and network costs separate from the platform fee", () => {
    const result = quoteFee({
      amountMinor: 50_000,
      rule: rule({ category: "wallet", operation: "send", percent_bps: 10, fixed_minor: 0 }),
      providerFeeMinor: 120,
      networkFeeMinor: 340,
      now: NOW,
    });
    if (result.ok === false) throw new Error("expected a quote");
    expect(result.platformFeeMinor).toBe(50);
    expect(result.providerFeeMinor).toBe(120);
    expect(result.networkFeeMinor).toBe(340);
    expect(result.totalFeeMinor).toBe(510);
    expect(result.totalMinor).toBe(50_510);
  });

  it("deducts from the amount when the receiver pays", () => {
    const result = quoteFee({
      amountMinor: 20_000,
      rule: rule({ category: "bank", operation: "withdrawal", rail: "wire", payer: "receiver", percent_bps: 0, fixed_minor: 2_500 }),
      now: NOW,
    });
    if (result.ok === false) throw new Error("expected a quote");
    expect(result.totalMinor).toBe(20_000);
    expect(result.netReceivedMinor).toBe(17_500);
  });

  it("never returns a negative net amount", () => {
    const result = quoteFee({
      amountMinor: 100,
      rule: rule({ payer: "receiver", percent_bps: 0, fixed_minor: 5_000 }),
      now: NOW,
    });
    if (result.ok === false) throw new Error("expected a quote");
    expect(result.netReceivedMinor).toBe(0);
  });

  it("stamps an expiry from the rule's quote lifetime", () => {
    const result = quoteFee({ amountMinor: 1_000, rule: rule({ quote_ttl_seconds: 30 }), now: NOW });
    if (result.ok === false) throw new Error("expected a quote");
    expect(result.expiresAt).toBe("2026-09-14T08:00:30.000Z");
    expect(isQuoteExpired(result, NOW)).toBe(false);
    expect(isQuoteExpired(result, new Date("2026-09-14T08:00:31.000Z"))).toBe(true);
  });
});

describe("minor unit helpers", () => {
  it("rounds the percentage part half-up", () => {
    expect(percentFeeMinor(1_005, 50)).toBe(5); // 5.025 -> 5
    expect(percentFeeMinor(1_010, 50)).toBe(5); // 5.05 -> 5
    expect(percentFeeMinor(1_100, 50)).toBe(6); // 5.5 -> 6
  });

  it("formats and parses without floating point drift", () => {
    expect(formatMinor(123_456_789, 2, "USD")).toBe("1,234,567.89 USD");
    expect(formatMinor(7, 8)).toBe("0.00000007");
    expect(parseToMinor("0.10", 2)).toBe(10);
    expect(parseToMinor("1,234.56", 2)).toBe(123_456);
    expect(parseToMinor("1.005", 2)).toBeNull();
    expect(parseToMinor("abc", 2)).toBeNull();
  });
});
