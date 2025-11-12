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
    const { platform, symbol, assetType = "crypto" } = await req.json();
    
    // Simulated signal data from different platforms
    // In production, these would be real API calls to signal providers
    const cryptoSignals = {
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

    const stockSignals = {
      alpaca: {
        signal: Math.random() > 0.5 ? "BUY" : "SELL",
        strength: Math.random() > 0.6 ? "STRONG" : "MODERATE",
        price: Math.random() * 500 + 50,
        dayTradeScore: Math.floor(Math.random() * 40) + 60,
        volume: `${(Math.random() * 50).toFixed(2)}M`,
        indicators: {
          movingAverage: "Above 50-day MA",
          bollingerBands: "Testing upper band"
        },
        timestamp: new Date().toISOString()
      },
      quantconnect: {
        signal: Math.random() > 0.4 ? "BUY" : "HOLD",
        algorithmScore: Math.floor(Math.random() * 30) + 70,
        price: Math.random() * 500 + 50,
        backtestResults: {
          sharpeRatio: (Math.random() * 2 + 1).toFixed(2),
          winRate: `${Math.floor(Math.random() * 20) + 60}%`
        },
        timestamp: new Date().toISOString()
      },
      interactivebrokers: {
        signal: Math.random() > 0.5 ? "ACCUMULATE" : "HOLD",
        institutionalFlow: Math.random() > 0.5 ? "Bullish" : "Neutral",
        price: Math.random() * 500 + 50,
        darkPoolActivity: `${(Math.random() * 10).toFixed(2)}M`,
        optionsFlow: {
          callVolume: `${(Math.random() * 5000).toFixed(0)}`,
          putVolume: `${(Math.random() * 5000).toFixed(0)}`
        },
        timestamp: new Date().toISOString()
      },
      tradingview_stocks: {
        signal: "BUY",
        strength: "MODERATE",
        price: Math.random() * 500 + 50,
        technicalRating: "Strong Buy",
        indicators: {
          rsi: Math.floor(Math.random() * 30) + 40,
          macd: Math.random() > 0.5 ? "Bullish" : "Bearish",
          adx: Math.floor(Math.random() * 40) + 20
        },
        timestamp: new Date().toISOString()
      },
      tdameritrade: {
        signal: Math.random() > 0.6 ? "BUY" : "NEUTRAL",
        dayTradeSetup: Math.random() > 0.5 ? "Breakout" : "Pullback",
        price: Math.random() * 500 + 50,
        momentum: {
          trend: "Uptrend",
          strength: Math.floor(Math.random() * 30) + 60
        },
        timestamp: new Date().toISOString()
      },
      robinhood: {
        signal: Math.random() > 0.5 ? "BUY" : "SELL",
        retailSentiment: Math.random() > 0.5 ? "Very Bullish" : "Bullish",
        price: Math.random() * 500 + 50,
        popularityRank: Math.floor(Math.random() * 100) + 1,
        timestamp: new Date().toISOString()
      }
    };

    const signals = assetType === "stock" ? stockSignals : cryptoSignals;
    const defaultPlatform = assetType === "stock" ? "alpaca" : "tradingview";

    const platformSignal = signals[platform as keyof typeof signals] || signals[defaultPlatform as keyof typeof signals];

    return new Response(
      JSON.stringify({
        platform,
        symbol,
        assetType,
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
