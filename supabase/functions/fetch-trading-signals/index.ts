import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, symbol } = await req.json();
    
    // Simulated signal data from different platforms
    // In production, these would be real API calls to signal providers
    const signals = {
      tradingview: {
        signal: "BUY",
        strength: "STRONG",
        price: Math.random() * 50000 + 20000,
        indicators: {
          rsi: Math.floor(Math.random() * 30) + 30,
          macd: "Bullish Crossover",
          fibonacci: "Testing 61.8% resistance"
        },
        timestamp: new Date().toISOString()
      },
      binance: {
        signal: Math.random() > 0.5 ? "BUY" : "SELL",
        strength: Math.random() > 0.5 ? "STRONG" : "MODERATE",
        price: Math.random() * 50000 + 20000,
        volume: `${(Math.random() * 1000).toFixed(2)}M`,
        timestamp: new Date().toISOString()
      },
      cryptoquant: {
        signal: Math.random() > 0.6 ? "ACCUMULATE" : "HOLD",
        onChainMetrics: {
          exchangeNetflow: `${(Math.random() * 1000 - 500).toFixed(2)}M`,
          whaleActivity: "High",
          fundingRate: `${(Math.random() * 0.1 - 0.05).toFixed(4)}%`
        },
        timestamp: new Date().toISOString()
      },
      coinglass: {
        signal: "NEUTRAL",
        liquidations: {
          long: `$${(Math.random() * 10).toFixed(2)}M`,
          short: `$${(Math.random() * 10).toFixed(2)}M`
        },
        openInterest: `$${(Math.random() * 5000).toFixed(2)}M`,
        timestamp: new Date().toISOString()
      }
    };

    const platformSignal = signals[platform as keyof typeof signals] || signals.tradingview;

    return new Response(
      JSON.stringify({
        platform,
        symbol,
        data: platformSignal
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching trading signals:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
