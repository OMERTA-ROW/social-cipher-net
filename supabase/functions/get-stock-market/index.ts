import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  errorResponse,
  json,
  stockCandles,
  stockQuotes,
  usMarketStatus,
} from "../_shared/marketProviders.ts";

/**
 * Live equity market data (Yahoo Finance, delayed).
 *
 *  { action: "quotes",  symbols: ["AAPL", ...] }
 *  { action: "candles", symbol: "AAPL", timeframe: "1D" }
 *  { action: "status" }
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
    const action = String(body.action ?? "quotes");

    if (action === "status") {
      return json({ market: usMarketStatus(), source: "Exchange calendar", asOf: Date.now() });
    }

    if (action === "candles") {
      const symbol = String(body.symbol ?? "").toUpperCase();
      if (!/^[A-Z.\-^=]{1,14}$/.test(symbol)) throw new Error("Invalid symbol");
      const timeframe = String(body.timeframe ?? "1D");
      const candles = await stockCandles(symbol, timeframe);
      if (!candles.length) throw new Error(`No candles returned for ${symbol}`);
      return json({
        symbol,
        timeframe,
        candles,
        market: usMarketStatus(),
        source: "Yahoo Finance",
        latency: "delayed",
        asOf: Date.now(),
      });
    }

    const symbols: string[] = (body.symbols ?? []).map((s: string) => String(s).toUpperCase());
    if (!symbols.length || symbols.length > 40) throw new Error("Provide 1-40 symbols");
    for (const s of symbols) {
      if (!/^[A-Z.\-^=]{1,14}$/.test(s)) throw new Error(`Invalid symbol: ${s}`);
    }
    const quotes = await stockQuotes(symbols);
    if (!quotes.length) throw new Error("No live equity feed available right now");

    return json({
      quotes,
      market: usMarketStatus(),
      source: "Yahoo Finance",
      latency: "delayed",
      asOf: Date.now(),
    });
  } catch (error) {
    console.error("[get-stock-market] ERROR", error);
    return errorResponse(error);
  }
});
