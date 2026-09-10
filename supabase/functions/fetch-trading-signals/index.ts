import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  cryptoCandles,
  errorResponse,
  json,
  stockCandles,
  usMarketStatus,
} from "../_shared/marketProviders.ts";
import { analyze } from "../_shared/indicators.ts";

/**
 * Technical read-outs computed from real OHLC candles.
 *
 * Body: { symbol: "BTC", assetType: "crypto" | "stock", timeframe: "1h" }
 *
 * There is no simulated data here: if the upstream feed is unavailable the
 * caller receives an error and must render an unavailable state.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const symbol = String(body.symbol ?? "BTC").toUpperCase();
    const assetType = String(body.assetType ?? "crypto");
    const timeframe = String(body.timeframe ?? "1h");
    if (!/^[A-Z.\-^]{1,12}$/.test(symbol)) throw new Error("Invalid symbol");

    const isStock = assetType === "stock";
    const candles = isStock
      ? await stockCandles(symbol, timeframe)
      : await cryptoCandles(symbol, timeframe, 300);

    const read = analyze(candles);
    if (!read) throw new Error(`Not enough real market history for ${symbol}`);

    return json({
      symbol,
      assetType,
      timeframe,
      analysis: read,
      market: isStock ? usMarketStatus() : { exchange: "Crypto spot", state: "open" },
      source: isStock ? "Yahoo Finance" : "Binance spot klines",
      latency: isStock ? "delayed" : "realtime",
      asOf: Date.now(),
    });
  } catch (error) {
    console.error("[fetch-trading-signals] ERROR", error);
    return errorResponse(error);
  }
});
