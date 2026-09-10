import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  Target,
  Loader2,
  Search
} from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getStockCandles, messageOf, type Candle, type MarketStatus } from "@/services/marketData";
import { analyze, changeOver, type TechnicalRead } from "@/lib/marketIndicators";

const TIMEFRAME = "5m" as const;

const compact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0);

export const StockAlgorithmEngine = () => {
  const [symbol, setSymbol] = useState("SPY");
  const [read, setRead] = useState<TechnicalRead | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [meta, setMeta] = useState<{ source: string; latency: "realtime" | "delayed"; asOf: number; market?: MarketStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockCandles(symbolRef.current, TIMEFRAME);
      const analysis = analyze(res.candles);
      if (!analysis) throw new Error("Not enough real price history to compute a signal");
      setCandles(res.candles);
      setRead(analysis);
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf, market: res.market });
      setError(null);
    } catch (e) {
      setRead(null);
      setError(messageOf(e));
      toast.error("Live equity feed unavailable", { description: messageOf(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      runAlgorithm();
      interval = window.setInterval(runAlgorithm, 20000);
    }
    return () => window.clearInterval(interval);
  }, [isRunning, symbol, runAlgorithm]);

  const getActionColor = (action: string) => {
    if (action === "BUY") return "text-green-500";
    if (action === "SELL") return "text-red-500";
    return "text-yellow-500";
  };

  const atr = read?.atr ?? 0;
  const price = read?.price ?? 0;
  const change1 = changeOver(candles, 1);
  const changeSession = changeOver(candles, Math.min(78, candles.length - 1));

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Stock & Day Trading Algorithm
              </CardTitle>
              <CardDescription>Signals computed from live {TIMEFRAME} candles — no simulated values</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRunning ? "default" : "outline"} className="gap-1">
                {isRunning ? <Activity className="h-3 w-3 animate-pulse" /> : <Activity className="h-3 w-3" />}
                {isRunning ? "Running" : "Stopped"}
              </Badge>
            </div>
          </div>
          <MarketSourceBadge
            className="mt-2"
            source={meta?.source}
            latency={meta?.latency}
            asOf={meta?.asOf}
            connected={!error && !!read}
            extra={meta?.market ? `market ${meta.market.state}` : null}
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Panel */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., SPY, AAPL)"
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? "destructive" : "default"}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {isRunning ? "Stop" : "Start"}
            </Button>
            <Button
              onClick={runAlgorithm}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Scan
            </Button>
          </div>

          {/* Live market stats derived from the real series */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Last Price</div>
                <div className="text-2xl font-bold">{read ? `$${price.toFixed(2)}` : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Last Bar</div>
                <div className={`text-2xl font-bold ${(change1 ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {change1 == null ? "—" : `${change1 >= 0 ? "+" : ""}${change1.toFixed(2)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Session Move</div>
                <div className={`text-2xl font-bold ${(changeSession ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {changeSession == null ? "—" : `${changeSession >= 0 ? "+" : ""}${changeSession.toFixed(2)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">ATR (volatility)</div>
                <div className="text-2xl font-bold">{read?.atrPercent != null ? `${read.atrPercent.toFixed(2)}%` : "—"}</div>
              </CardContent>
            </Card>
          </div>

          {error && !read && <MarketUnavailable message={error} onRetry={runAlgorithm} />}

          {read && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="daytrade">Day Trade</TabsTrigger>
                <TabsTrigger value="patterns">Levels</TabsTrigger>
                <TabsTrigger value="volume">Volume</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(read.action)}`}>
                      {read.action === "BUY" ? <TrendingUp className="h-8 w-8" /> :
                       read.action === "SELL" ? <TrendingDown className="h-8 w-8" /> :
                       <Activity className="h-8 w-8" />}
                      {read.action} {symbol}
                    </div>
                    <Badge variant="outline" className="text-lg">
                      ${price.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Indicator agreement</span>
                      <span className="font-bold">{read.confidence}%</span>
                    </div>
                    <Progress value={read.confidence} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">RSI (14)</div>
                      <div className="font-bold">{read.rsi != null ? read.rsi.toFixed(1) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Trend</div>
                      <div className="font-bold capitalize">{read.trend}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Timeframe</div>
                      <div className="font-bold">{TIMEFRAME}</div>
                    </div>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                    {read.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="daytrade" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">ATR-based levels</span>
                    <Badge variant="outline">{read.candleCount} real bars</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Entry Zone</span>
                      <span className="font-bold">${(price - atr * 0.25).toFixed(2)} - ${(price + atr * 0.25).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Stop Loss (1.5 ATR)</span>
                      <span className="font-bold text-red-500">${(price - atr * 1.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Target 1 (1.5 ATR)</span>
                      <span className="font-bold text-green-500">${(price + atr * 1.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Target 2 (3 ATR)</span>
                      <span className="font-bold text-green-500">${(price + atr * 3).toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Levels are arithmetic projections from the live ATR, not predictions.</p>
                </div>
              </TabsContent>

              <TabsContent value="patterns" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Support (60 bars)</span>
                    <span className="font-bold">{read.support != null ? `$${read.support.toFixed(2)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Resistance (60 bars)</span>
                    <span className="font-bold">{read.resistance != null ? `$${read.resistance.toFixed(2)}` : "—"}</span>
                  </div>
                  {read.fibonacci && (
                    <div className="space-y-1 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Fibonacci retracement</span>
                      {Object.entries(read.fibonacci.levels).map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-bold">${value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="volume" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Latest Bar Volume</span>
                    <span className="font-bold">{read.volume ? compact(read.volume.latest) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">20-bar Average</span>
                    <span className="font-bold">{read.volume ? compact(read.volume.average) : "—"}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Volume Ratio</span>
                      <span className="font-bold">{read.volume ? `${read.volume.ratio.toFixed(2)}x` : "—"}</span>
                    </div>
                    <Progress value={Math.min(100, (read.volume?.ratio ?? 0) * 50)} className="h-2" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <MarketUnavailable message="No live options-flow provider is connected, so call/put volume is not shown." />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <TradingDisclaimer />
        </CardContent>
      </Card>
    </div>
  );
};
