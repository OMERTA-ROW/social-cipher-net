/**
 * Single source of truth for all market data in the app.
 *
 * Every widget reads through this layer. It talks only to our own edge
 * functions (provider keys never reach the browser), de-duplicates in-flight
 * requests, caches briefly, and always reports the provider, its latency and
 * the timestamp of the data. There are no synthetic fallbacks: on failure the
 * caller gets an error so the UI can show an explicit unavailable state.
 */

import { supabase } from "@/integrations/supabase/client";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W";
export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

export type AssetClass = "crypto" | "stock";
export type Latency = "realtime" | "delayed";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Quote = {
  symbol: string;
  name?: string;
  price: number;
  change24h: number;
  changeAbs?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  currency?: string;
  exchange?: string;
  previousClose?: number;
  source: string;
  latency: Latency;
  asOf: number;
};

export type NftCollection = {
  id: string;
  name: string;
  symbol?: string;
  image?: string | null;
  nativeCurrency: string;
  floorPrice: number;
  floorPriceUsd: number;
  floorChange24h: number;
  volume24h: number;
  volume24hUsd: number;
  volumeChange24h: number;
  marketCapUsd: number;
  owners: number;
  supply: number;
};

export type MarketStatus = {
  exchange: string;
  state: string;
  localTime?: string;
};

export type Sourced<T> = T & {
  source: string;
  latency: Latency;
  asOf: number;
  market?: MarketStatus;
};

export class MarketDataError extends Error {
  rateLimited: boolean;
  constructor(message: string, rateLimited = false) {
    super(message);
    this.name = "MarketDataError";
    this.rateLimited = rateLimited;
  }
}

/* --------------------------- request plumbing --------------------------- */

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

async function call<T>(fn: string, body: Record<string, unknown>, key: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      // Edge function returns a JSON body with a readable message on failure.
      let message = error.message || "Market feed unavailable";
      let rateLimited = false;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const parsed = await ctx.clone().json();
          if (parsed?.error) message = parsed.error;
          rateLimited = Boolean(parsed?.rateLimited);
        } catch {
          /* keep the original message */
        }
      }
      throw new MarketDataError(message, rateLimited);
    }
    if (!data || (data as { error?: string }).error) {
      throw new MarketDataError((data as { error?: string })?.error ?? "Market feed unavailable");
    }
    cache.set(key, { value: data, expires: Date.now() + ttlMs });
    return data as T;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

/* ------------------------------- providers ------------------------------- */

export async function getCryptoQuotes(symbols: string[]): Promise<Sourced<{ quotes: Quote[] }>> {
  const list = symbols.map((s) => s.toUpperCase()).sort();
  return call("get-crypto-prices", { action: "quotes", symbols: list }, `cq:${list.join(",")}`, 8_000);
}

export async function getCryptoCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = 200,
): Promise<Sourced<{ symbol: string; timeframe: Timeframe; candles: Candle[] }>> {
  return call(
    "get-crypto-prices",
    { action: "candles", symbol, timeframe, limit },
    `cc:${symbol}:${timeframe}:${limit}`,
    timeframe === "1m" ? 15_000 : 45_000,
  );
}

export async function getStockQuotes(symbols: string[]): Promise<Sourced<{ quotes: Quote[] }>> {
  const list = symbols.map((s) => s.toUpperCase()).sort();
  return call("get-stock-market", { action: "quotes", symbols: list }, `sq:${list.join(",")}`, 20_000);
}

export async function getStockCandles(
  symbol: string,
  timeframe: Timeframe,
): Promise<Sourced<{ symbol: string; timeframe: Timeframe; candles: Candle[] }>> {
  return call("get-stock-market", { action: "candles", symbol, timeframe }, `sc:${symbol}:${timeframe}`, 60_000);
}

export async function getMarketStatus(): Promise<Sourced<{ market: MarketStatus }>> {
  return call("get-stock-market", { action: "status" }, "mstatus", 30_000);
}

export async function getNftMarket(collections?: string[]): Promise<Sourced<{ collections: NftCollection[] }>> {
  return call("get-nft-market", { collections }, `nft:${(collections ?? []).join(",")}`, 120_000);
}

/** Asset-class agnostic helpers so widgets can stay provider-neutral. */
export function getQuotes(assetClass: AssetClass, symbols: string[]) {
  return assetClass === "stock" ? getStockQuotes(symbols) : getCryptoQuotes(symbols);
}

export function getCandles(assetClass: AssetClass, symbol: string, timeframe: Timeframe) {
  return assetClass === "stock" ? getStockCandles(symbol, timeframe) : getCryptoCandles(symbol, timeframe);
}

export async function getTechnicals(
  symbol: string,
  assetType: AssetClass,
  timeframe: Timeframe = "1h",
): Promise<Sourced<{ symbol: string; analysis: Record<string, unknown> }>> {
  return call(
    "fetch-trading-signals",
    { symbol, assetType, timeframe },
    `ta:${assetType}:${symbol}:${timeframe}`,
    30_000,
  );
}

/* -------------------------------- helpers -------------------------------- */

export function formatAsOf(asOf?: number | null): string {
  if (!asOf) return "—";
  const diff = Date.now() - asOf;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return new Date(asOf).toLocaleTimeString();
}

export function messageOf(error: unknown): string {
  if (error instanceof MarketDataError) return error.message;
  if (error instanceof Error) return error.message;
  return "Market feed unavailable";
}
