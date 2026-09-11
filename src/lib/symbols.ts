/**
 * Ticker resolution for the trading workspace.
 *
 * A symbol typed by the user is routed to the correct live provider:
 * crypto pairs go to the crypto feed, everything else (equities, ETFs, forex,
 * futures, indices, commodities) goes to the equity/global feed.
 * Nothing here fabricates a price — resolution only decides the route.
 */

import type { AssetClass } from "@/services/marketData";

export type MarketKind =
  | "crypto"
  | "equity"
  | "etf"
  | "forex"
  | "future"
  | "index"
  | "commodity";

export interface ResolvedSymbol {
  /** symbol as sent to the provider */
  symbol: string;
  assetClass: AssetClass;
  kind: MarketKind;
}

const CRYPTO = new Set([
  "BTC", "ETH", "USDC", "USDT", "BNB", "SOL", "XRP", "ADA", "DOGE", "AVAX", "DOT",
  "MATIC", "LINK", "LTC", "TRX", "SHIB", "ATOM", "UNI", "XLM", "NEAR", "ARB", "OP",
  "APT", "FIL", "ETC", "ICP", "SUI", "INJ", "TIA", "SEI", "PEPE", "RNDR", "AAVE",
]);

/** Common commodity / index futures roots so labels stay accurate. */
const COMMODITY_FUTURES = new Set(["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "ZC=F", "ZW=F", "PL=F"]);

export function resolveSymbol(raw: string): ResolvedSymbol {
  const s = raw.trim().toUpperCase();
  if (!s) return { symbol: "", assetClass: "crypto", kind: "crypto" };

  // Explicit crypto notations: BTC-USD, BTCUSDT, BTC/USD
  const cryptoPair = s.match(/^([A-Z0-9]{2,10})[-/]?(USD|USDT|USDC)$/);
  if (cryptoPair && (CRYPTO.has(cryptoPair[1]) || cryptoPair[2] !== "USD")) {
    return { symbol: cryptoPair[1], assetClass: "crypto", kind: "crypto" };
  }
  if (CRYPTO.has(s)) return { symbol: s, assetClass: "crypto", kind: "crypto" };

  if (s.startsWith("^")) return { symbol: s, assetClass: "stock", kind: "index" };
  if (s.endsWith("=X")) return { symbol: s, assetClass: "stock", kind: "forex" };
  if (s.endsWith("=F")) {
    return { symbol: s, assetClass: "stock", kind: COMMODITY_FUTURES.has(s) ? "commodity" : "future" };
  }
  // Plain 6-letter FX like EURUSD → Yahoo's =X notation
  if (/^[A-Z]{6}$/.test(s) && /^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF)/.test(s)) {
    return { symbol: `${s}=X`, assetClass: "stock", kind: "forex" };
  }
  return { symbol: s, assetClass: "stock", kind: "equity" };
}

export const KIND_LABEL: Record<MarketKind, string> = {
  crypto: "Crypto",
  equity: "Equity",
  etf: "ETF",
  forex: "Forex",
  future: "Futures",
  index: "Index",
  commodity: "Commodity",
};

/** Starter tickers offered as suggestions — every one resolves to a live feed. */
export const SYMBOL_SUGGESTIONS: { symbol: string; label: string }[] = [
  { symbol: "BTC", label: "Bitcoin" },
  { symbol: "ETH", label: "Ethereum" },
  { symbol: "SOL", label: "Solana" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "TSLA", label: "Tesla" },
  { symbol: "SPY", label: "S&P 500 ETF" },
  { symbol: "QQQ", label: "Nasdaq 100 ETF" },
  { symbol: "^GSPC", label: "S&P 500 index" },
  { symbol: "^IXIC", label: "Nasdaq Composite" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GBPUSD=X", label: "GBP/USD" },
  { symbol: "GC=F", label: "Gold futures" },
  { symbol: "CL=F", label: "Crude oil futures" },
  { symbol: "ES=F", label: "S&P 500 futures" },
];
