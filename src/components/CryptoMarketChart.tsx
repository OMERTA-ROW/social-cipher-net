import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import FibonacciOverlay from "./FibonacciOverlay";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { useCandles, useQuotes } from "@/hooks/useMarketData";
import { TIMEFRAMES, type Timeframe } from "@/services/marketData";

const CRYPTO_SYMBOLS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "SOL", name: "Solana" },
];

const SYMBOLS = CRYPTO_SYMBOLS.map((c) => c.symbol);

export default function CryptoMarketChart() {
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [fibLevels, setFibLevels] = useState<number[]>([]);
  const [activeSymbol, setActiveSymbol] = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");

  const quotes = useQuotes("crypto", SYMBOLS, 15000);
  const candles = useCandles("crypto", activeSymbol, timeframe, timeframe === "1m" ? 15000 : 30000);

  useEffect(() => {
    if (!activeSymbol) setActiveSymbol(SYMBOLS[0]);
  }, [activeSymbol]);

  const handleFibonacciRequest = (levels: number[]) => {
    setFibLevels(levels);
    setShowFibonacci(true);
    setTimeout(() => setShowFibonacci(false), 10000);
  };

  const quoteFor = (symbol: string) => quotes.data?.find((q) => q.symbol === symbol);

  const chartData = (candles.data ?? []).map((c) => ({
    time: new Date(c.time).toLocaleString("en-US",
      timeframe === "1D" || timeframe === "1W"
        ? { month: "short", day: "numeric" }
        : { hour: "2-digit", minute: "2-digit" }),
    price: c.close,
  }));

  if (quotes.loading && !quotes.data) {
    return <div className="text-center py-8">Loading crypto markets...</div>;
  }

  return (
    <>
      <div className="space-y-4">
      <MarketSourceBadge
        source={quotes.source}
        latency={quotes.latency}
        asOf={quotes.asOf}
        connected={quotes.connected}
        error={quotes.error}
      />

      {quotes.error && !quotes.data && (
        <MarketUnavailable message={quotes.error} onRetry={quotes.refresh} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CRYPTO_SYMBOLS.slice(0, 4).map((crypto) => {
          const q = quoteFor(crypto.symbol);
          return (
            <Card key={crypto.symbol} className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{crypto.name}</CardDescription>
                <CardTitle className="text-xl">
                  {q ? `$${q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Unavailable"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q ? (
                  <div className={`flex items-center gap-1 text-sm ${q.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {q.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(q.change24h).toFixed(2)}%
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No live quote</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs
        value={activeSymbol}
        className="w-full"
        onValueChange={(value) => setActiveSymbol(value)}
      >
        <TabsList className="grid grid-cols-4 md:grid-cols-8">
          {CRYPTO_SYMBOLS.map((crypto) => (
            <TabsTrigger key={crypto.symbol} value={crypto.symbol}>
              {crypto.symbol}
            </TabsTrigger>
          ))}
        </TabsList>

        {CRYPTO_SYMBOLS.map((crypto) => {
          const swingHigh = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0;
          const swingLow = chartData.length ? Math.min(...chartData.map((d) => d.price)) : 0;

          return (
            <TabsContent key={crypto.symbol} value={crypto.symbol}>
              <Card>
                <CardHeader>
                  <CardTitle>{crypto.name} Price Chart</CardTitle>
                  <CardDescription>Real exchange candles - Call Draco for Fibonacci analysis</CardDescription>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          tf === timeframe
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <MarketSourceBadge
                    className="pt-1"
                    source={candles.source}
                    latency={candles.latency}
                    asOf={candles.asOf}
                    connected={candles.connected}
                    extra={candles.data ? `${candles.data.length} candles` : null}
                  />
                </CardHeader>
                <CardContent className="relative">
                  {candles.error && !candles.data ? (
                    <MarketUnavailable message={candles.error} onRetry={candles.refresh} />
                  ) : (
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`gradient-${crypto.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" className="text-xs" minTickGap={40} />
                          <YAxis className="text-xs" domain={["dataMin", "dataMax"]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="hsl(var(--primary))"
                            fillOpacity={1}
                            fill={`url(#gradient-${crypto.symbol})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      {activeSymbol === crypto.symbol && (
                        <FibonacciOverlay
                          levels={fibLevels}
                          isActive={showFibonacci}
                          chartHeight={300}
                          swingHigh={swingHigh}
                          swingLow={swingLow}
                        />
                      )}
                    </div>
                  )}
                  <TradingDisclaimer className="pt-3" />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
      </div>
    </>
  );
}
