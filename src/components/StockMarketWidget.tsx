import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { useQuotes } from "@/hooks/useMarketData";
import { getStockCandles } from "@/services/marketData";

const MAJOR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "NFLX", name: "Netflix" },
];

const SYMBOLS = MAJOR_STOCKS.map((s) => s.symbol);

export default function StockMarketWidget() {
  const quotes = useQuotes("stock", SYMBOLS, 30000);
  const [spark, setSpark] = useState<Record<string, { value: number }[]>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results = await Promise.allSettled(SYMBOLS.map((s) => getStockCandles(s, "15m")));
      if (cancelled) return;
      const next: Record<string, { value: number }[]> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          next[SYMBOLS[i]] = r.value.candles.slice(-30).map((c) => ({ value: c.close }));
        }
      });
      setSpark(next);
    };
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-4">
      <MarketSourceBadge
        source={quotes.source}
        latency={quotes.latency}
        asOf={quotes.asOf}
        connected={quotes.connected}
        error={quotes.error}
        extra={quotes.market ? `market ${quotes.market.state}${quotes.market.localTime ? ` · ${quotes.market.localTime}` : ""}` : null}
      />

      {quotes.error && !quotes.data ? (
        <MarketUnavailable message={quotes.error} onRetry={quotes.refresh} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MAJOR_STOCKS.map((stock) => {
            const q = quotes.data?.find((item) => item.symbol === stock.symbol);
            const change = q?.changeAbs ?? 0;
            const data = spark[stock.symbol] ?? [];
            return (
              <Card key={stock.symbol} className="hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                      <CardDescription className="text-xs">{q?.name ?? stock.name}</CardDescription>
                    </div>
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">{q ? `$${q.price.toFixed(2)}` : "Unavailable"}</div>
                  {q ? (
                    <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{change >= 0 ? '+' : ''}{change.toFixed(2)} ({q.change24h.toFixed(2)}%)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No live quote</div>
                  )}
                  {data.length > 1 ? (
                    <ResponsiveContainer width="100%" height={60}>
                      <LineChart data={data}>
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={change >= 0 ? '#22c55e' : '#ef4444'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[60px] flex items-center text-xs text-muted-foreground">
                      Intraday history unavailable
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TradingDisclaimer />
    </div>
  );
}
