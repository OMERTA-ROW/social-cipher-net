import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { cached, corsHeaders, errorResponse, getJson, json } from "../_shared/marketProviders.ts";

/**
 * Live DEX token data from DexScreener (free, keyless).
 *
 *  { action: "trending" }            -> boosted/trending pairs
 *  { action: "search", query: "..." } -> pairs matching a query
 */

type Pair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: Record<string, number>;
  liquidity?: { usd?: number };
  volume?: Record<string, number>;
  fdv?: number;
  marketCap?: number;
  txns?: Record<string, { buys: number; sells: number }>;
  pairCreatedAt?: number;
};

function shape(p: Pair) {
  const txns24 = p.txns?.h24 ?? { buys: 0, sells: 0 };
  return {
    chain: p.chainId,
    dex: p.dexId,
    url: p.url,
    pairAddress: p.pairAddress,
    symbol: p.baseToken?.symbol ?? "",
    name: p.baseToken?.name ?? "",
    address: p.baseToken?.address ?? "",
    priceUsd: Number(p.priceUsd ?? 0),
    change5m: Number(p.priceChange?.m5 ?? 0),
    change1h: Number(p.priceChange?.h1 ?? 0),
    change6h: Number(p.priceChange?.h6 ?? 0),
    change24h: Number(p.priceChange?.h24 ?? 0),
    liquidityUsd: Number(p.liquidity?.usd ?? 0),
    volume24h: Number(p.volume?.h24 ?? 0),
    volume1h: Number(p.volume?.h1 ?? 0),
    fdv: Number(p.fdv ?? 0),
    marketCap: Number(p.marketCap ?? p.fdv ?? 0),
    buys24h: txns24.buys ?? 0,
    sells24h: txns24.sells ?? 0,
    pairCreatedAt: p.pairCreatedAt ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "trending");

    if (action === "search") {
      const query = String(body.query ?? "").slice(0, 40);
      if (!query) throw new Error("Provide a search query");
      const data = await cached(`ds:s:${query}`, 30_000, () =>
        getJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`),
      );
      const pairs = ((data as any)?.pairs ?? []).slice(0, 20).map(shape);
      if (!pairs.length) throw new Error(`No live DEX pairs found for "${query}"`);
      return json({ pairs, source: "DexScreener", latency: "realtime", asOf: Date.now() });
    }

    const boosts = await cached("ds:boosts", 60_000, () =>
      getJson("https://api.dexscreener.com/token-boosts/top/v1"),
    );
    const tokens = (boosts as any[]).slice(0, 12);
    const detail = await Promise.allSettled(
      tokens.map((t) =>
        cached(`ds:t:${t.chainId}:${t.tokenAddress}`, 60_000, () =>
          getJson(`https://api.dexscreener.com/latest/dex/tokens/${t.tokenAddress}`),
        ),
      ),
    );
    const pairs = detail
      .flatMap((r) => (r.status === "fulfilled" ? ((r.value as any)?.pairs ?? []).slice(0, 1) : []))
      .map(shape)
      .filter((p) => p.priceUsd > 0)
      .sort((a, b) => b.volume24h - a.volume24h);

    if (!pairs.length) throw new Error("No live DEX data available right now");

    return json({ pairs, source: "DexScreener", latency: "realtime", asOf: Date.now() });
  } catch (error) {
    console.error("[get-token-market] ERROR", error);
    return errorResponse(error);
  }
});
