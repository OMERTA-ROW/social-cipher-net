import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-CRYPTO-PRICES] ${step}${detailsStr}`);
};

// CoinGecko IDs for major cryptocurrencies
const COIN_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'MATIC': 'matic-network',
  'BNB': 'binancecoin',
  'AVAX': 'avalanche-2',
  'SOL': 'solana',
  'ADA': 'cardano',
  'DOT': 'polkadot',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    let currencies;
    try {
      const body = await req.json();
      currencies = body.currencies;
    } catch (e) {
      // No body or invalid JSON, use default
      currencies = undefined;
    }
    
    const currencyList = currencies || Object.keys(COIN_IDS);
    
    logStep("Fetching prices for", { currencies: currencyList });

    // Get CoinGecko IDs for requested currencies
    const coinIds = currencyList
      .map((symbol: string) => COIN_IDS[symbol.toUpperCase() as keyof typeof COIN_IDS])
      .filter(Boolean)
      .join(',');

    if (!coinIds) {
      throw new Error("No valid currencies provided");
    }

    // Fetch from CoinGecko API (free tier, no API key required)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    logStep("Prices fetched", { data });

    // Transform response to match our format
    const prices: Record<string, { usd: number; change24h: number }> = {};
    
    for (const [symbol, coinId] of Object.entries(COIN_IDS)) {
      if (data[coinId]) {
        prices[symbol] = {
          usd: data[coinId].usd,
          change24h: data[coinId].usd_24h_change || 0,
        };
      }
    }

    return new Response(
      JSON.stringify({ prices }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
