import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  BINANCE_INTERVAL,
  COIN_IDS,
  binanceQuotes,
  cached,
  coingeckoQuotes,
  corsHeaders,
  cryptoCandleSeries,
  reportProviderEvent,

  errorResponse,
  getJson,
  json,
  type Quote,
} from "../_shared/marketProviders.ts";

/**
 * Live crypto market data.
 *
 *  { action: "quotes",  symbols: ["BTC", ...] }
 *  { action: "candles", symbol: "BTC", timeframe: "1h", limit: 200 }
 *
 * Legacy callers that post { currencies: [...] } (or nothing) still receive
 * the original `{ prices: { BTC: { usd, change24h } } }` shape.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    if (body.action === "context") {
      // Real Bitcoin network + market-sentiment context.
      const [fngRes, hashRes, diffRes] = await Promise.allSettled([
        cached("ctx:fng", 300_000, () => getJson("https://api.alternative.me/fng/?limit=1")),
        cached("ctx:hash", 300_000, () => getJson("https://mempool.space/api/v1/mining/hashrate/3d")),
        cached("ctx:diff", 300_000, () => getJson("https://mempool.space/api/v1/difficulty-adjustment")),
      ]);
      const fng = fngRes.status === "fulfilled" ? (fngRes.value as any)?.data?.[0] : null;
      const hashes = hashRes.status === "fulfilled" ? (hashRes.value as any)?.hashrates ?? [] : [];
      const latestHash = hashes.length ? Number(hashes[hashes.length - 1].avgHashrate) : null;
      const diff = diffRes.status === "fulfilled" ? (diffRes.value as any) : null;
      if (!fng && latestHash == null && !diff) throw new Error("No live network context available");
      return json({
        fearGreed: fng ? { value: Number(fng.value), label: fng.value_classification } : null,
        hashRateEhs: latestHash != null ? latestHash / 1e18 : null,
        difficultyChangePercent: diff?.difficultyChange ?? null,
        blocksUntilRetarget: diff?.remainingBlocks ?? null,
        source: "mempool.space + alternative.me",
        latency: "delayed",
        asOf: Date.now(),
      });
    }

    if (body.action === "candles") {
      const symbol = String(body.symbol ?? "BTC").toUpperCase();
      const timeframe = String(body.timeframe ?? "1h");
      if (!BINANCE_INTERVAL[timeframe]) throw new Error(`Unsupported timeframe: ${timeframe}`);
      const limit = Math.min(Math.max(Number(body.limit ?? 200), 20), 500);
      const series = await cryptoCandleSeries(symbol, timeframe, limit);
      return json({
        symbol,
        timeframe,
        candles: series.candles,
        source: series.source,
        latency: series.latency,
        asOf: Date.now(),
      });
    }


    const symbols: string[] = (body.symbols ?? body.currencies ?? Object.keys(COIN_IDS)).map(
      (s: string) => String(s).toUpperCase(),
    );
    if (!symbols.length) throw new Error("No currencies provided");

    let quotes: Quote[] = [];
    let source = "Binance spot";
    let latency: "realtime" | "delayed" = "realtime";
    let binanceFailure: string | null = null;
    try {
      quotes = await binanceQuotes(symbols);
    } catch (e) {
      binanceFailure = e instanceof Error ? e.message : String(e);
      reportProviderEvent({
        provider: "Binance spot",
        action: "crypto_quotes",
        status: "failure",
        message: binanceFailure,
        symbol: symbols.join(","),
      });
    }

    const missing = symbols.filter((s) => !quotes.some((q) => q.symbol === s));
    if (missing.length) {
      try {
        const fallback = await coingeckoQuotes(missing);
        if (fallback.length) {
          quotes = [...quotes, ...fallback];
          source = quotes.length === fallback.length ? "CoinGecko" : "Binance spot + CoinGecko";
          if (quotes.length === fallback.length) latency = "delayed";
          if (binanceFailure) {
            reportProviderEvent({
              provider: "Binance spot",
              action: "crypto_quotes",
              status: "fallback",
              fallbackProvider: "CoinGecko",
              message: binanceFailure,
              symbol: missing.join(","),
            });
          }
        }
      } catch (e) {
        reportProviderEvent({
          provider: "CoinGecko",
          action: "crypto_quotes",
          status: "failure",
          message: e instanceof Error ? e.message : String(e),
          symbol: missing.join(","),
        });
      }
    }

    if (!quotes.length) throw new Error("No live crypto feed available right now");


    // legacy shape kept alongside the richer quote list
    const prices: Record<string, { usd: number; change24h: number }> = {};
    for (const q of quotes) prices[q.symbol] = { usd: q.price, change24h: q.change24h };

    return json({ quotes, prices, source, latency, asOf: Date.now() });
  } catch (error) {
    console.error("[get-crypto-prices] ERROR", error);
    return errorResponse(error);
  }
});
