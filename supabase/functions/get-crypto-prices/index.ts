import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  BINANCE_INTERVAL,
  COIN_IDS,
  binanceQuotes,
  coingeckoQuotes,
  corsHeaders,
  cryptoCandles,
  errorResponse,
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
    if (body.action === "candles") {
      const symbol = String(body.symbol ?? "BTC").toUpperCase();
      const timeframe = String(body.timeframe ?? "1h");
      if (!BINANCE_INTERVAL[timeframe]) throw new Error(`Unsupported timeframe: ${timeframe}`);
      const limit = Math.min(Math.max(Number(body.limit ?? 200), 20), 500);
      const candles = await cryptoCandles(symbol, timeframe, limit);
      return json({
        symbol,
        timeframe,
        candles,
        source: "Binance spot klines",
        latency: "realtime",
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
    try {
      quotes = await binanceQuotes(symbols);
    } catch (e) {
      console.error("[get-crypto-prices] binance failed", e);
    }

    const missing = symbols.filter((s) => !quotes.some((q) => q.symbol === s));
    if (missing.length) {
      const fallback = await coingeckoQuotes(missing);
      if (fallback.length) {
        quotes = [...quotes, ...fallback];
        source = quotes.length === fallback.length ? "CoinGecko" : "Binance spot + CoinGecko";
        if (quotes.length === fallback.length) latency = "delayed";
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
