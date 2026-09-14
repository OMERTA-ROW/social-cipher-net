import { describe, expect, it } from "vitest";
import {
  convertTotals,
  dedupeWallets,
  freshness,
  summariseEarnings,
  totalsByAsset,
  trackedFundsMinor,
  walletIdentity,
  type AttachedWallet,
} from "./walletModel";

const wallet = (over: Partial<AttachedWallet>): AttachedWallet => ({
  id: "w1",
  serviceId: "kraken_account",
  providerName: "Kraken",
  accountKey: "main",
  accountLabel: "Main",
  isActiveAccount: true,
  walletRef: "0xABC",
  network: "ethereum",
  asset: "ETH",
  balanceMinor: null,
  minorUnitScale: 8,
  capabilities: [],
  status: "unsupported",
  detail: null,
  source: "test",
  asOf: null,
  ...over,
});

describe("wallet identity and dedupe", () => {
  it("treats the same address on the same account and network as one wallet", () => {
    const a = wallet({ id: "a", walletRef: "0xabc", balanceMinor: null, asOf: null });
    const b = wallet({ id: "b", walletRef: "0xABC", balanceMinor: 500, asOf: "2026-09-14T10:00:00Z", status: "ok" });
    expect(walletIdentity(a)).toBe(walletIdentity(b));

    const { wallets, duplicates } = dedupeWallets([a, b]);
    expect(wallets).toHaveLength(1);
    expect(wallets[0].id).toBe("b"); // the one with a real balance wins
    expect(duplicates).toHaveLength(1);
  });

  it("keeps separate accounts of the same provider apart", () => {
    const a = wallet({ id: "a", accountKey: "main" });
    const b = wallet({ id: "b", accountKey: "second" });
    expect(dedupeWallets([a, b]).wallets).toHaveLength(2);
  });

  it("keeps the same address on two networks apart", () => {
    const a = wallet({ id: "a", network: "ethereum" });
    const b = wallet({ id: "b", network: "polygon" });
    expect(dedupeWallets([a, b]).wallets).toHaveLength(2);
  });

  it("prefers the fresher read when both are known", () => {
    const older = wallet({ id: "old", balanceMinor: 1, asOf: "2026-09-14T09:00:00Z" });
    const newer = wallet({ id: "new", balanceMinor: 2, asOf: "2026-09-14T10:00:00Z" });
    expect(dedupeWallets([older, newer]).wallets[0].id).toBe("new");
  });
});

describe("totals", () => {
  it("never counts an unknown balance as zero", () => {
    const totals = totalsByAsset([
      wallet({ id: "a", asset: "ETH", balanceMinor: 100, asOf: "2026-09-14T10:00:00Z" }),
      wallet({ id: "b", asset: "ETH", walletRef: "0xdef", balanceMinor: null }),
    ]);
    expect(totals).toHaveLength(1);
    expect(totals[0].knownMinor).toBe(100);
    expect(totals[0].unknownWallets).toBe(1);
    expect(totals[0].walletCount).toBe(2);
  });

  it("keeps assets separate", () => {
    const totals = totalsByAsset([
      wallet({ id: "a", asset: "ETH", balanceMinor: 100 }),
      wallet({ id: "b", asset: "BTC", walletRef: "bc1", balanceMinor: 50 }),
    ]);
    expect(totals.map((t) => t.asset)).toEqual(["BTC", "ETH"]);
  });
});

describe("FX conversion", () => {
  const totals = [
    { asset: "ETH", knownMinor: 2_00000000, minorUnitScale: 8, unknownWallets: 0, walletCount: 1, oldestAsOf: null },
    { asset: "DOGE", knownMinor: 100_00000000, minorUnitScale: 8, unknownWallets: 0, walletCount: 1, oldestAsOf: null },
  ];

  it("excludes assets with no rate and flags the total as partial", () => {
    const out = convertTotals(
      totals,
      { ETH: { rate: 2000, asOf: "2026-09-14T10:00:00Z", source: "CoinGecko" } },
      "USD",
    );
    expect(out.convertedMinor).toBe(400000); // $4,000.00
    expect(out.missingRates).toEqual(["DOGE"]);
    expect(out.partial).toBe(true);
    expect(out.rateAsOf).toBe("2026-09-14T10:00:00Z");
  });

  it("is not partial when every asset has a rate and nothing is unknown", () => {
    const out = convertTotals(
      totals,
      {
        ETH: { rate: 2000, asOf: "2026-09-14T10:00:00Z", source: "CoinGecko" },
        DOGE: { rate: 0.1, asOf: "2026-09-14T10:05:00Z", source: "CoinGecko" },
      },
      "USD",
    );
    expect(out.partial).toBe(false);
    expect(out.convertedMinor).toBe(400000 + 1000);
  });

  it("stays partial when a balance could not be read", () => {
    const out = convertTotals(
      [{ ...totals[0], unknownWallets: 1 }],
      { ETH: { rate: 2000, asOf: "2026-09-14T10:00:00Z", source: "CoinGecko" } },
      "USD",
    );
    expect(out.partial).toBe(true);
    expect(out.unknownWallets).toBe(1);
  });
});

describe("earnings vs balances", () => {
  const base = {
    serviceId: "youtube",
    platformName: "YouTube",
    accountKey: "chan-1",
    accountLabel: "Main channel",
    currency: "USD",
    kind: "estimated" as const,
    periodStart: "2026-08-15",
    periodEnd: "2026-09-14",
    source: "YouTube Analytics API",
    asOf: "2026-09-14T10:00:00Z",
  };

  it("drops internal transfers so nothing is double counted", () => {
    const summary = summariseEarnings([
      { ...base, amount: 100 },
      { ...base, amount: 40, internalTransfer: true, serviceId: "cyberlink", platformName: "CyberLink" },
    ]);
    expect(summary.excludedInternalTransfers).toBe(1);
    expect(summary.byCurrency[0].estimated).toBe(100);
  });

  it("keeps currencies apart and marks estimates", () => {
    const summary = summariseEarnings([
      { ...base, amount: 100 },
      { ...base, amount: 50, currency: "EUR" },
      { ...base, amount: 25, currency: "USD", kind: "settled", serviceId: "etsy", platformName: "Etsy" },
    ]);
    expect(summary.byCurrency.map((c) => c.currency)).toEqual(["EUR", "USD"]);
    expect(summary.byCurrency.find((c) => c.currency === "USD")).toMatchObject({ estimated: 100, settled: 25 });
    expect(summary.containsEstimates).toBe(true);
  });

  it("groups several accounts of one platform separately", () => {
    const summary = summariseEarnings([
      { ...base, amount: 100, accountKey: "chan-1" },
      { ...base, amount: 60, accountKey: "chan-2", accountLabel: "Second channel" },
    ]);
    expect(summary.byPlatform).toHaveLength(1);
    expect(summary.byPlatform[0].amount).toBe(160);
    expect(summary.byAccount).toHaveLength(2);
  });

  it("does not let revenue reach the funds total", () => {
    const funds = {
      currency: "USD",
      minorUnitScale: 2,
      availableMinor: 1000,
      pendingMinor: 500,
      heldMinor: 250,
      paidOutMinor: 9999,
    };
    // Paid-out money has left; revenue is not part of this type at all.
    expect(trackedFundsMinor(funds)).toBe(1750);
  });
});

describe("freshness", () => {
  const now = new Date("2026-09-14T10:30:00Z");
  it("reports never, fresh and stale", () => {
    expect(freshness(null, now)).toBe("never");
    expect(freshness("2026-09-14T10:25:00Z", now)).toBe("fresh");
    expect(freshness("2026-09-14T09:00:00Z", now)).toBe("stale");
  });
});
