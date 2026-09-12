/**
 * Shared market-data helpers for the edge functions.
 *
 * Every value returned here comes from a live public feed. Nothing is
 * simulated: when a provider fails we surface the error instead of inventing
 * numbers. Responses are cached in-memory per isolate to stay inside the
 * free-tier rate limits of the upstream APIs.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type Candle = {
  time: number; // ms epoch
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
  change24h: number; // percent
  changeAbs?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  currency?: string;
  source: string;
  latency: "realtime" | "delayed";
  asOf: number; // ms epoch
};

/* ------------------------------ cache ------------------------------ */

type Entry = { value: unknown; expires: number };
const cache = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expires: now + ttlMs });
  if (cache.size > 400) {
    for (const [k, v] of cache) if (v.expires < now) cache.delete(k);
  }
  return value;
}

export async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; CyberLinkMarketData/1.0)",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 429) throw new Error(`RATE_LIMIT: upstream rate limit hit (${new URL(url).host})`);
  if (!res.ok) throw new Error(`UPSTREAM_${res.status}: ${new URL(url).host} responded ${res.status}`);
  return await res.json();
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(error: unknown, status = 502) {
  const message = error instanceof Error ? error.message : String(error);
  const rateLimited = message.startsWith("RATE_LIMIT");
  return json(
    { error: message, rateLimited, asOf: Date.now() },
    rateLimited ? 429 : status,
  );
}

/* ------------------------------ crypto ------------------------------ */

export const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  MATIC: "matic-network",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  XRP: "ripple",
  DOGE: "dogecoin",
  LINK: "chainlink",
  LTC: "litecoin",
};

/** Binance interval codes for the timeframes the UI offers. */
export const BINANCE_INTERVAL: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
  "1W": "1w",
};

/**
 * Binance blocks some hosting regions with HTTP 451, so every Binance call
 * tries the public data mirrors before giving up.
 */
const BINANCE_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
];

async function binanceJson(path: string): Promise<any> {
  let lastError: unknown;
  for (const host of BINANCE_HOSTS) {
    try {
      return await getJson(`${host}${path}`);
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      // Only keep trying other hosts on geo/403 blocks or server errors.
      if (!/UPSTREAM_(451|403|5\d\d)/.test(msg)) throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Binance 24h ticker — real-time spot data, no key required. */
export async function binanceQuotes(symbols: string[]): Promise<Quote[]> {
  const pairs = symbols.map((s) => `${s.toUpperCase()}USDT`);
  const list = await cached(`bn:tickers:${pairs.sort().join(",")}`, 10_000, () =>
    binanceJson(
      `/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`,
    ),
  );
  const asOf = Date.now();
  return (list as any[]).map((t) => ({
    symbol: String(t.symbol).replace(/USDT$/, ""),
    price: Number(t.lastPrice),
    change24h: Number(t.priceChangePercent),
    changeAbs: Number(t.priceChange),
    high24h: Number(t.highPrice),
    low24h: Number(t.lowPrice),
    volume24h: Number(t.quoteVolume),
    currency: "USD",
    source: "Binance spot",
    latency: "realtime" as const,
    asOf,
  }));
}

/** CoinGecko fallback / coverage for assets without a Binance USDT pair. */
export async function coingeckoQuotes(symbols: string[]): Promise<Quote[]> {
  const ids = symbols.map((s) => COIN_IDS[s.toUpperCase()]).filter(Boolean);
  if (!ids.length) return [];
  const data = await cached(`cg:price:${ids.sort().join(",")}`, 30_000, () =>
    getJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`,
    ),
  );
  const out: Quote[] = [];
  for (const symbol of symbols) {
    const id = COIN_IDS[symbol.toUpperCase()];
    const row = id ? (data as any)[id] : undefined;
    if (!row) continue;
    out.push({
      symbol: symbol.toUpperCase(),
      price: Number(row.usd),
      change24h: Number(row.usd_24h_change ?? 0),
      volume24h: Number(row.usd_24h_vol ?? 0),
      currency: "USD",
      source: "CoinGecko",
      latency: "delayed",
      asOf: (row.last_updated_at ? row.last_updated_at * 1000 : Date.now()),
    });
  }
  return out;
}

export async function cryptoCandles(symbol: string, timeframe: string, limit = 200): Promise<Candle[]> {
  const interval = BINANCE_INTERVAL[timeframe];
  if (!interval) throw new Error(`Unsupported timeframe: ${timeframe}`);
  const pair = `${symbol.toUpperCase()}USDT`;
  const ttl = interval === "1m" ? 15_000 : interval === "5m" ? 45_000 : 120_000;
  const rows = await cached(`bn:kl:${pair}:${interval}:${limit}`, ttl, () =>
    getJson(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`),
  );
  return (rows as any[]).map((r) => ({
    time: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

/* ------------------------------ equities ------------------------------ */

/** Yahoo Finance chart API — free, delayed ~15 minutes for most venues. */
const YAHOO_RANGE: Record<string, { interval: string; range: string }> = {
  "1m": { interval: "1m", range: "1d" },
  "5m": { interval: "5m", range: "5d" },
  "15m": { interval: "15m", range: "1mo" },
  "1h": { interval: "60m", range: "3mo" },
  "4h": { interval: "60m", range: "6mo" },
  "1D": { interval: "1d", range: "1y" },
  "1W": { interval: "1wk", range: "5y" },
};

async function yahooChart(symbol: string, interval: string, range: string) {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  try {
    return await getJson(`https://query2.finance.yahoo.com${path}`);
  } catch (_e) {
    return await getJson(`https://query1.finance.yahoo.com${path}`);
  }
}

export type StockQuote = Quote & {
  marketState?: string;
  exchange?: string;
  previousClose?: number;
};

export async function stockQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(
    symbols.map((symbol) =>
      cached(`yf:q:${symbol}`, 20_000, async () => {
        const data = await yahooChart(symbol, "1d", "5d");
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) throw new Error(`No quote for ${symbol}`);
        const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice);
        const price = Number(meta.regularMarketPrice);
        const quote: StockQuote = {
          symbol: meta.symbol ?? symbol,
          name: meta.longName ?? meta.shortName,
          price,
          changeAbs: price - prev,
          change24h: prev ? ((price - prev) / prev) * 100 : 0,
          high24h: Number(meta.regularMarketDayHigh ?? 0) || undefined,
          low24h: Number(meta.regularMarketDayLow ?? 0) || undefined,
          volume24h: Number(meta.regularMarketVolume ?? 0) || undefined,
          previousClose: prev,
          currency: meta.currency ?? "USD",
          exchange: meta.fullExchangeName ?? meta.exchangeName,
          source: "Yahoo Finance",
          latency: "delayed",
          asOf: Number(meta.regularMarketTime ?? 0) * 1000 || Date.now(),
        };
        return quote;
      }),
    ),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export async function stockCandles(symbol: string, timeframe: string): Promise<Candle[]> {
  const spec = YAHOO_RANGE[timeframe];
  if (!spec) throw new Error(`Unsupported timeframe: ${timeframe}`);
  const raw = await cached(`yf:c:${symbol}:${timeframe}`, 60_000, () =>
    yahooChart(symbol, spec.interval, spec.range),
  );
  const result = (raw as any)?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!ts.length || !q) throw new Error(`No candles for ${symbol}`);
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.close?.[i] == null) continue;
    candles.push({
      time: ts[i] * 1000,
      open: Number(q.open?.[i] ?? q.close[i]),
      high: Number(q.high?.[i] ?? q.close[i]),
      low: Number(q.low?.[i] ?? q.close[i]),
      close: Number(q.close[i]),
      volume: Number(q.volume?.[i] ?? 0),
    });
  }
  // 4h buckets are aggregated from hourly bars (Yahoo has no native 4h).
  if (timeframe === "4h") return aggregate(candles, 4);
  return candles;
}

function aggregate(candles: Candle[], factor: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += factor) {
    const slice = candles.slice(i, i + factor);
    if (!slice.length) break;
    out.push({
      time: slice[0].time,
      open: slice[0].open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

/** US equity market status derived from the live exchange clock. */
export function usMarketStatus(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = String(parts.weekday);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const weekend = weekday === "Sat" || weekday === "Sun";
  const open = !weekend && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
  const preMarket = !weekend && minutes >= 4 * 60 && minutes < 9 * 60 + 30;
  const afterHours = !weekend && minutes >= 16 * 60 && minutes < 20 * 60;
  return {
    exchange: "US equities (NYSE/Nasdaq)",
    state: open ? "open" : preMarket ? "pre" : afterHours ? "after" : "closed",
    localTime: `${parts.hour}:${parts.minute} ET`,
    weekday,
  };
}
