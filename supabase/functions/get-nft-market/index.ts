import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { cached, corsHeaders, errorResponse, getJson, json } from "../_shared/marketProviders.ts";

/** CoinGecko NFT collections (free endpoint, ~5-15 min refresh). */
const DEFAULT_COLLECTIONS = [
  "bored-ape-yacht-club",
  "cryptopunks",
  "mutant-ape-yacht-club",
  "azuki",
  "pudgy-penguins",
  "doodles-official",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.collections) && body.collections.length
      ? body.collections.slice(0, 10).map((c: string) => String(c))
      : DEFAULT_COLLECTIONS;

    const results = await Promise.allSettled(
      ids.map((id) =>
        cached(`cg:nft:${id}`, 120_000, () =>
          getJson(`https://api.coingecko.com/api/v3/nfts/${encodeURIComponent(id)}`),
        ),
      ),
    );

    const collections = results.flatMap((r) => {
      if (r.status !== "fulfilled") return [];
      const d: any = r.value;
      return [
        {
          id: d.id,
          name: d.name,
          symbol: d.symbol,
          image: d.image?.small ?? null,
          nativeCurrency: d.native_currency_symbol?.toUpperCase() ?? "ETH",
          floorPrice: Number(d.floor_price?.native_currency ?? 0),
          floorPriceUsd: Number(d.floor_price?.usd ?? 0),
          floorChange24h: Number(d.floor_price_24h_percentage_change?.usd ?? 0),
          volume24h: Number(d.volume_24h?.native_currency ?? 0),
          volume24hUsd: Number(d.volume_24h?.usd ?? 0),
          volumeChange24h: Number(d.volume_24h_percentage_change?.usd ?? 0),
          marketCapUsd: Number(d.market_cap?.usd ?? 0),
          owners: Number(d.number_of_unique_addresses ?? 0),
          supply: Number(d.total_supply ?? 0),
        },
      ];
    });

    if (!collections.length) throw new Error("No live NFT feed available right now");

    return json({
      collections,
      source: "CoinGecko NFT",
      latency: "delayed",
      asOf: Date.now(),
    });
  } catch (error) {
    console.error("[get-nft-market] ERROR", error);
    return errorResponse(error);
  }
});
