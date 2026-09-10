import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Zap,
  Target,
  Loader2
} from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getCryptoCandles, messageOf, type Candle, type Latency, type Timeframe } from "@/services/marketData";
import { analyze, changeOver, type TechnicalRead } from "@/lib/marketIndicators";

type NetworkContext = {
  fearGreed: { value: number; label: string } | null;
  hashRateEhs: number | null;
  difficultyChangePercent: number | null;
  blocksUntilRetarget: number | null;
  source: string;
};

const TIMEFRAME: Timeframe = "1h";

export const BTCAlgorithmEngine = () => {
  const [read, setRead] = useState<TechnicalRead | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [context, setContext] = useState<NetworkContext | null>(null);
  const [meta, setMeta] = useState<{ source: string; latency: Latency; asOf: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCryptoCandles("BTC", TIMEFRAME, 300);
      const analysis = analyze(res.candles);
      if (!analysis) throw new Error("Not enough real price history to compute a signal");
      setCandles(res.candles);
      setRead(analysis);
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf });
      setError(null);
    } catch (e) {
      setRead(null);
      setError(messageOf(e));
      toast.error("Live BTC feed unavailable", { description: messageOf(e) });
    } finally {
      setLoading(false);
    }

    try {
      const { data } = await supabase.functions.invoke("get-crypto-prices", { body: { action: "context" } });
      setContext(data && !data.error ? (data as NetworkContext) : null);
    } catch {
      setContext(null);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      runAlgorithm();
      interval = window.setInterval(runAlgorithm, 30000);
    }
    return () => window.clearInterval(interval);
  }, [isRunning, runAlgorithm]);

  const getActionColor = (action: string) => {
    if (action === "BUY") return "text-green-500";
    if (action === "SELL") return "text-red-500";
    return "text-yellow-500";
  };
  const volatility = read?.atrPercent ?? null;
  const riskLevel = volatility == null ? "UNKNOWN" : volatility > 2 ? "HIGH" : volatility > 1 ? "MEDIUM" : "LOW";
  const getRiskColor = (level: string) => {
    if (level === "LOW") return "bg-green-500/20 text-green-500";
    if (level === "MEDIUM") return "bg-yellow-500/20 text-yellow-500";
    if (level === "HIGH") return "bg-red-500/20 text-red-500";
    return "bg-muted text-muted-foreground";
  };

  const price = read?.price ?? 0;
  const atr = read?.atr ?? 0;
  const change24 = changeOver(candles, 24);
  const change7d = changeOver(candles, 168);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-orange-500" />
                BTC Algorithm Engine
              </CardTitle>
              <CardDescription>Computed from live {TIMEFRAME} Bitcoin candles — no simulated values</CardDescription>
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
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Panel */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? "destructive" : "default"}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {isRunning ? "Stop Algorithm" : "Start Algorithm"}
            </Button>
            <Button
              onClick={runAlgorithm}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Manual Scan
            </Button>
          </div>

          {/* Live market stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Price</div>
                <div className="text-2xl font-bold">{read ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">24h</div>
                <div className={`text-2xl font-bold ${(change24 ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {change24 == null ? "—" : `${change24 >= 0 ? "+" : ""}${change24.toFixed(2)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">7d</div>
                <div className={`text-2xl font-bold ${(change7d ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {change7d == null ? "—" : `${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">ATR (volatility)</div>
                <div className="text-2xl font-bold">{volatility != null ? `${volatility.toFixed(2)}%` : "—"}</div>
              </CardContent>
            </Card>
          </div>

          {error && !read && <MarketUnavailable message={error} onRetry={runAlgorithm} />}

          {/* Current Signal */}
          {read && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="onchain">On-Chain</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(read.action)}`}>
                      {read.action === "BUY" ? <TrendingUp className="h-8 w-8" /> :
                       read.action === "SELL" ? <TrendingDown className="h-8 w-8" /> :
                       <Activity className="h-8 w-8" />}
                      {read.action}
                    </div>
                    <Badge className={getRiskColor(riskLevel)}>
                      {riskLevel} VOLATILITY
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Indicator agreement</span>
                      <span className="font-bold">{read.confidence}%</span>
                    </div>
                    <Progress value={read.confidence} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Current Price</div>
                      <div className="font-bold text-lg">${price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Latest candle</div>
                      <div className="font-bold">
                        {candles.length ? new Date(candles[candles.length - 1].time).toLocaleTimeString() : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">1.5x ATR below</div>
                      <div className="font-bold text-red-500">${(price - atr * 1.5).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">1.5x ATR above</div>
                      <div className="font-bold text-green-500">${(price + atr * 1.5).toFixed(2)}</div>
                    </div>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                    {read.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">RSI (14)</span>
                    <span className="font-bold">{read.rsi != null ? read.rsi.toFixed(1) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">MACD / signal</span>
                    <span className="font-bold">
                      {read.macd ? `${read.macd.macd.toFixed(2)} / ${read.macd.signal.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Support / resistance</span>
                    <span className="font-bold">
                      {read.support != null && read.resistance != null
                        ? `$${read.support.toFixed(0)} / $${read.resistance.toFixed(0)}`
                        : "—"}
                    </span>
                  </div>
                  {read.fibonacci && (
                    <div className="space-y-1 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Fibonacci retracement</span>
                      {Object.entries(read.fibonacci.levels).map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-bold">${value.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume vs 20-bar average</span>
                    <span className="font-bold">{read.volume ? `${read.volume.ratio.toFixed(2)}x` : "—"}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="onchain" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {context ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Network hash rate</span>
                        <span className="font-bold">{context.hashRateEhs != null ? `${context.hashRateEhs.toFixed(0)} EH/s` : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Next difficulty change</span>
                        <span className="font-bold">
                          {context.difficultyChangePercent != null ? `${context.difficultyChangePercent.toFixed(2)}%` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Blocks until retarget</span>
                        <span className="font-bold">{context.blocksUntilRetarget ?? "—"}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Source: {context.source}</p>
                    </>
                  ) : (
                    <MarketUnavailable message="Bitcoin network data did not load." onRetry={runAlgorithm} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {context?.fearGreed ? (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Fear &amp; Greed Index</span>
                          <span className="font-bold">{context.fearGreed.value}/100</span>
                        </div>
                        <Progress value={context.fearGreed.value} className="h-2" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Classification</span>
                        <Badge>{context.fearGreed.label}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Social and news sentiment are not shown: no provider is connected for them.
                      </p>
                    </>
                  ) : (
                    <MarketUnavailable message="Sentiment index did not load." onRetry={runAlgorithm} />
                  )}
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
