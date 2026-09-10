import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AssetClass,
  type Candle,
  type MarketStatus,
  type NftCollection,
  type Quote,
  type Timeframe,
  getCandles,
  getMarketStatus,
  getNftMarket,
  getQuotes,
  getTechnicals,
  messageOf,
} from "@/services/marketData";

export type FeedState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  connected: boolean;
  source: string | null;
  latency: "realtime" | "delayed" | null;
  asOf: number | null;
  market?: MarketStatus;
  refresh: () => void;
};

function useFeed<T>(
  load: () => Promise<{ value: T; source: string; latency: "realtime" | "delayed"; asOf: number; market?: MarketStatus } | null>,
  intervalMs: number,
  deps: unknown[],
): FeedState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ source: string | null; latency: "realtime" | "delayed" | null; asOf: number | null; market?: MarketStatus }>({
    source: null,
    latency: null,
    asOf: null,
  });
  const mounted = useRef(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    try {
      const result = await loadRef.current();
      if (!mounted.current || !result) return;
      setData(result.value);
      setMeta({ source: result.source, latency: result.latency, asOf: result.asOf, market: result.market });
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(messageOf(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    run();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, intervalMs);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    error,
    loading,
    connected: !error && data != null,
    source: meta.source,
    latency: meta.latency,
    asOf: meta.asOf,
    market: meta.market,
    refresh: run,
  };
}

export function useQuotes(assetClass: AssetClass, symbols: string[], intervalMs = 15_000): FeedState<Quote[]> {
  const key = symbols.join(",");
  return useFeed<Quote[]>(
    async () => {
      const res = await getQuotes(assetClass, symbols);
      return { value: res.quotes, source: res.source, latency: res.latency, asOf: res.asOf, market: res.market };
    },
    intervalMs,
    [assetClass, key, intervalMs],
  );
}

export function useCandles(
  assetClass: AssetClass,
  symbol: string,
  timeframe: Timeframe,
  intervalMs = 30_000,
): FeedState<Candle[]> {
  return useFeed<Candle[]>(
    async () => {
      const res = await getCandles(assetClass, symbol, timeframe);
      return { value: res.candles, source: res.source, latency: res.latency, asOf: res.asOf, market: res.market };
    },
    intervalMs,
    [assetClass, symbol, timeframe, intervalMs],
  );
}

export function useTechnicalRead(
  symbol: string,
  assetClass: AssetClass,
  timeframe: Timeframe = "1h",
  intervalMs = 30_000,
) {
  return useFeed<Record<string, unknown>>(
    async () => {
      const res = await getTechnicals(symbol, assetClass, timeframe);
      return { value: res.analysis, source: res.source, latency: res.latency, asOf: res.asOf, market: res.market };
    },
    intervalMs,
    [symbol, assetClass, timeframe, intervalMs],
  );
}

export function useNftMarket(collections?: string[], intervalMs = 120_000): FeedState<NftCollection[]> {
  const key = (collections ?? []).join(",");
  return useFeed<NftCollection[]>(
    async () => {
      const res = await getNftMarket(collections);
      return { value: res.collections, source: res.source, latency: res.latency, asOf: res.asOf };
    },
    intervalMs,
    [key, intervalMs],
  );
}

export function useMarketStatus(intervalMs = 60_000): FeedState<MarketStatus> {
  return useFeed<MarketStatus>(
    async () => {
      const res = await getMarketStatus();
      return { value: res.market, source: res.source, latency: res.latency ?? "delayed", asOf: res.asOf };
    },
    intervalMs,
    [intervalMs],
  );
}
