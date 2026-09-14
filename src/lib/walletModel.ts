/**
 * Wallet aggregation model.
 *
 * Pure, side-effect free rules for combining money data that arrives from very
 * different places. Three hard rules are encoded here and covered by tests:
 *
 *  1. Revenue/earnings are never added to wallet balances. They are separate
 *     structures with separate types so the two cannot be summed by accident.
 *  2. An unknown balance is `null` — never zero. Unknown wallets are counted
 *     and reported, not silently dropped.
 *  3. Converted (FX) estimates only include assets with a timestamped rate.
 *     Anything missing a rate is excluded and the total is flagged partial.
 */

export type WalletCapability =
  | "read_earnings"
  | "read_balances"
  | "deposit"
  | "withdraw"
  | "transfer";

export type WalletStatus =
  | "ok"
  | "stale"
  | "unsupported"
  | "needs_reconnect"
  | "error"
  | "not_configured";

export interface AttachedWallet {
  /** Row identity inside CyberLink. */
  id: string;
  /** Provider/connector identity, e.g. "kraken_account", "evm", "cyberlink". */
  serviceId: string;
  providerName: string;
  /** Stable provider-account identity (one provider can hold several). */
  accountKey: string;
  accountLabel: string | null;
  isActiveAccount: boolean;
  /** Address, sub-account or ledger reference that identifies the wallet. */
  walletRef: string;
  network: string | null;
  asset: string | null;
  /** Integer minor units. `null` means "we do not know", never zero. */
  balanceMinor: number | null;
  minorUnitScale: number;
  capabilities: WalletCapability[];
  status: WalletStatus;
  detail: string | null;
  /** Where the figure came from, e.g. "Kraken private API" or "on-chain RPC". */
  source: string;
  /** ISO timestamp the figure was read, or null when never read. */
  asOf: string | null;
}

/** Stable identity used to spot the same wallet arriving from two places. */
export function walletIdentity(wallet: AttachedWallet): string {
  return [
    wallet.serviceId.trim().toLowerCase(),
    wallet.accountKey.trim().toLowerCase(),
    (wallet.network ?? "-").trim().toLowerCase(),
    wallet.walletRef.trim().toLowerCase(),
    (wallet.asset ?? "-").trim().toUpperCase(),
  ].join("|");
}

export interface DedupeResult {
  wallets: AttachedWallet[];
  /** Mirrored rows that were folded away, kept for the "why" in the UI. */
  duplicates: AttachedWallet[];
}

/**
 * Folds mirrored wallets (the same provider account + network + address seen
 * through two connectors) into one row so totals are not counted twice. The
 * row with an actual balance and the freshest read wins.
 */
export function dedupeWallets(wallets: AttachedWallet[]): DedupeResult {
  const best = new Map<string, AttachedWallet>();
  const duplicates: AttachedWallet[] = [];

  for (const wallet of wallets) {
    const key = walletIdentity(wallet);
    const current = best.get(key);
    if (!current) {
      best.set(key, wallet);
      continue;
    }
    if (preferWallet(wallet, current)) {
      best.set(key, wallet);
      duplicates.push(current);
    } else {
      duplicates.push(wallet);
    }
  }

  return { wallets: [...best.values()], duplicates };
}

function preferWallet(candidate: AttachedWallet, current: AttachedWallet): boolean {
  const candidateKnown = candidate.balanceMinor != null;
  const currentKnown = current.balanceMinor != null;
  if (candidateKnown !== currentKnown) return candidateKnown;
  const candidateAt = candidate.asOf ? Date.parse(candidate.asOf) : -1;
  const currentAt = current.asOf ? Date.parse(current.asOf) : -1;
  return candidateAt > currentAt;
}

export interface AssetTotal {
  asset: string;
  /** Sum of the balances we actually know, in minor units. */
  knownMinor: number;
  minorUnitScale: number;
  /** Wallets holding this asset whose balance could not be read. */
  unknownWallets: number;
  walletCount: number;
  /** Oldest read among the known balances — the total is only as fresh as this. */
  oldestAsOf: string | null;
}

/** Per-asset totals in the assets' own units. Nothing is converted here. */
export function totalsByAsset(wallets: AttachedWallet[]): AssetTotal[] {
  const map = new Map<string, AssetTotal>();

  for (const wallet of wallets) {
    const asset = (wallet.asset ?? "UNKNOWN").toUpperCase();
    const entry = map.get(asset) ?? {
      asset,
      knownMinor: 0,
      minorUnitScale: wallet.minorUnitScale,
      unknownWallets: 0,
      walletCount: 0,
      oldestAsOf: null,
    };
    entry.walletCount += 1;
    if (wallet.balanceMinor == null) {
      entry.unknownWallets += 1;
    } else {
      entry.knownMinor += wallet.balanceMinor;
      if (wallet.asOf && (!entry.oldestAsOf || wallet.asOf < entry.oldestAsOf)) {
        entry.oldestAsOf = wallet.asOf;
      }
    }
    map.set(asset, entry);
  }

  return [...map.values()].sort((a, b) => a.asset.localeCompare(b.asset));
}

export interface FxRate {
  /** Units of the target currency for one major unit of the asset. */
  rate: number;
  asOf: string;
  source: string;
}

export interface ConvertedTotal {
  targetCurrency: string;
  targetScale: number;
  /** Only the assets that had a timestamped rate. */
  convertedMinor: number;
  included: string[];
  missingRates: string[];
  /** True when at least one asset was left out, or a balance was unknown. */
  partial: boolean;
  unknownWallets: number;
  /** Oldest FX timestamp used, so the estimate can be labelled honestly. */
  rateAsOf: string | null;
  sources: string[];
}

/** Optional converted estimate. Missing rates are excluded, never guessed. */
export function convertTotals(
  totals: AssetTotal[],
  rates: Record<string, FxRate>,
  targetCurrency: string,
  targetScale = 2,
): ConvertedTotal {
  let convertedMinor = 0;
  const included: string[] = [];
  const missingRates: string[] = [];
  const sources = new Set<string>();
  let unknownWallets = 0;
  let rateAsOf: string | null = null;

  for (const total of totals) {
    unknownWallets += total.unknownWallets;
    const rate = rates[total.asset];
    if (!rate || !Number.isFinite(rate.rate) || rate.rate < 0) {
      missingRates.push(total.asset);
      continue;
    }
    const major = total.knownMinor / 10 ** total.minorUnitScale;
    convertedMinor += Math.round(major * rate.rate * 10 ** targetScale);
    included.push(total.asset);
    sources.add(rate.source);
    if (!rateAsOf || rate.asOf < rateAsOf) rateAsOf = rate.asOf;
  }

  return {
    targetCurrency,
    targetScale,
    convertedMinor,
    included,
    missingRates,
    partial: missingRates.length > 0 || unknownWallets > 0,
    unknownWallets,
    rateAsOf,
    sources: [...sources],
  };
}

/**
 * Money actually held, split into buckets. Revenue is deliberately absent from
 * this type: earnings live in `EarningsSummary` and cannot be added here.
 */
export interface FundsBuckets {
  currency: string;
  minorUnitScale: number;
  availableMinor: number;
  pendingMinor: number;
  heldMinor: number;
  paidOutMinor: number;
}

/**
 * What the member still has with us: available + pending + held. Paid-out money
 * has already left and is reported separately, never added back in.
 */
export function trackedFundsMinor(funds: FundsBuckets): number {
  return funds.availableMinor + funds.pendingMinor + funds.heldMinor;
}

export type EarningsKind = "estimated" | "settled";

export interface EarningsEntryInput {
  serviceId: string;
  platformName: string;
  accountKey: string;
  accountLabel: string | null;
  currency: string;
  /** Major units as the provider reported them. */
  amount: number;
  kind: EarningsKind;
  periodStart: string;
  periodEnd: string;
  /** Movement between two CyberLink-held places — excluded from earnings. */
  internalTransfer?: boolean;
  source: string;
  asOf: string;
}

export interface EarningsBucket {
  key: string;
  label: string;
  currency: string;
  amount: number;
  kind: EarningsKind;
  asOf: string;
}

export interface EarningsSummary {
  byCurrency: Array<{ currency: string; estimated: number; settled: number }>;
  byPlatform: EarningsBucket[];
  byAccount: EarningsBucket[];
  excludedInternalTransfers: number;
  /** True when at least one figure is a provider estimate, not settled money. */
  containsEstimates: boolean;
}

/**
 * Groups earnings by platform and by account, keeping every currency separate
 * and dropping internal transfers so nothing is counted twice.
 */
export function summariseEarnings(entries: EarningsEntryInput[]): EarningsSummary {
  const real = entries.filter((e) => !e.internalTransfer);
  const currency = new Map<string, { currency: string; estimated: number; settled: number }>();
  const platform = new Map<string, EarningsBucket>();
  const account = new Map<string, EarningsBucket>();

  for (const entry of real) {
    const cur = currency.get(entry.currency) ?? { currency: entry.currency, estimated: 0, settled: 0 };
    if (entry.kind === "estimated") cur.estimated += entry.amount;
    else cur.settled += entry.amount;
    currency.set(entry.currency, cur);

    const pKey = `${entry.serviceId}|${entry.currency}`;
    const pBucket = platform.get(pKey) ?? {
      key: pKey,
      label: entry.platformName,
      currency: entry.currency,
      amount: 0,
      kind: entry.kind,
      asOf: entry.asOf,
    };
    pBucket.amount += entry.amount;
    if (entry.kind === "estimated") pBucket.kind = "estimated";
    if (entry.asOf < pBucket.asOf) pBucket.asOf = entry.asOf;
    platform.set(pKey, pBucket);

    const aKey = `${entry.serviceId}|${entry.accountKey}|${entry.currency}`;
    const aBucket = account.get(aKey) ?? {
      key: aKey,
      label: entry.accountLabel ?? `${entry.platformName} · ${entry.accountKey}`,
      currency: entry.currency,
      amount: 0,
      kind: entry.kind,
      asOf: entry.asOf,
    };
    aBucket.amount += entry.amount;
    if (entry.kind === "estimated") aBucket.kind = "estimated";
    if (entry.asOf < aBucket.asOf) aBucket.asOf = entry.asOf;
    account.set(aKey, aBucket);
  }

  return {
    byCurrency: [...currency.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    byPlatform: [...platform.values()].sort((a, b) => b.amount - a.amount),
    byAccount: [...account.values()].sort((a, b) => b.amount - a.amount),
    excludedInternalTransfers: entries.length - real.length,
    containsEstimates: real.some((e) => e.kind === "estimated"),
  };
}

/** A read older than this is shown as stale rather than current. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

export function freshness(asOf: string | null, now: Date = new Date()): "never" | "fresh" | "stale" {
  if (!asOf) return "never";
  return now.getTime() - Date.parse(asOf) > STALE_AFTER_MS ? "stale" : "fresh";
}
