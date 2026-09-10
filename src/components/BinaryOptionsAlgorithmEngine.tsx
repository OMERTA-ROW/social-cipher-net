import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Timer,
  Zap,
  Target,
  Loader2
} from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getStockCandles, messageOf, type Candle, type MarketStatus } from "@/services/marketData";
import { analyze, changeOver, type TechnicalRead } from "@/lib/marketIndicators";

/** EUR/USD spot from the live FX feed. */
const PAIR = "EURUSD=X";
const TIMEFRAME = "5m" as const;

export const BinaryOptionsAlgorithmEngine = () => {
  const [read, setRead] = useState<TechnicalRead | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [meta, setMeta] = useState<{ source: string; latency: "realtime" | "delayed"; asOf: number; market?: MarketStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockCandles(PAIR, TIMEFRAME);
      const analysis = analyze(res.candles);
      if (!analysis) throw new Error("Not enough real price history to compute a signal");
      setCandles(res.candles);
      setRead(analysis);
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf, market: res.market });
      setError(null);
    } catch (e) {
      setRead(null);
      setError(messageOf(e));
      toast.error("Live FX feed unavailable", { description: messageOf(e) });
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
  }, [isRunning, runAlgorithm]);

  const direction = read ? (read.action === "BUY" ? "CALL" : read.action === "SELL" ? "PUT" : "HOLD") : "HOLD";
  const getActionColor = (action: string) => {
    if (action === "CALL") return "text-green-500";
    if (action === "PUT") return "text-red-500";
    return "text-yellow-500";
  };
  const volatility = read?.atrPercent ?? null;
  const riskLevel = volatility == null ? "UNKNOWN" : volatility > 0.25 ? "HIGH" : volatility > 0.1 ? "MEDIUM" : "LOW";
  const getRiskColor = (level: string) => {
    if (level === "LOW") return "bg-green-500/20 text-green-500";
    if (level === "MEDIUM") return "bg-yellow-500/20 text-yellow-500";
    if (level === "HIGH") return "bg-red-500/20 text-red-500";
    return "bg-muted text-muted-foreground";
  };

  const change1 = changeOver(candles, 1);
  const change12 = changeOver(candles, 12);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-500" />
                Binary Options Algorithm Engine
              </CardTitle>
              <CardDescription>EUR/USD read computed from live {TIMEFRAME} candles — no simulated values</CardDescription>
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

          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Spot</div>
                <div className="text-2xl font-bold">{read ? read.price.toFixed(5) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Last Bar</div>
                <div className={`text-2xl font-bold ${(change1 ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {change1 == null ? "—" : `${change1 >= 0 ? "+" : ""}${change1.toFixed(3)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Last Hour</div>
                <div className={`text-2xl font-bold ${(change12 ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {change12 == null ? "—" : `${change12 >= 0 ? "+" : ""}${change12.toFixed(3)}%`}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">ATR (volatility)</div>
                <div className="text-2xl font-bold">{volatility != null ? `${volatility.toFixed(3)}%` : "—"}</div>
              </CardContent>
            </Card>
          </div>

          {error && !read && <MarketUnavailable message={error} onRetry={runAlgorithm} />}

          {read && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="timing">Timing</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(direction)}`}>
                      {direction === "CALL" ? <TrendingUp className="h-8 w-8" /> :
                       direction === "PUT" ? <TrendingDown className="h-8 w-8" /> :
                       <Activity className="h-8 w-8" />}
                      {direction}
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
                      <div className="font-bold text-lg">{read.price.toFixed(5)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Trend</div>
                      <div className="font-bold capitalize">{read.trend}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Support</div>
                      <div className="font-bold">{read.support != null ? read.support.toFixed(5) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Resistance</div>
                      <div className="font-bold">{read.resistance != null ? read.resistance.toFixed(5) : "—"}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Payout and win-rate figures are not shown: no broker feed is connected to supply them.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">RSI (14)</span>
                    <span className="font-bold">{read.rsi != null ? read.rsi.toFixed(1) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">MACD histogram</span>
                    <span className="font-bold">{read.macd ? read.macd.histogram.toFixed(5) : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bollinger upper / lower</span>
                    <span className="font-bold">
                      {read.bollinger ? `${read.bollinger.upper.toFixed(5)} / ${read.bollinger.lower.toFixed(5)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">20 / 50 MA</span>
                    <span className="font-bold">
                      {read.sma20 != null && read.sma50 != null ? `${read.sma20.toFixed(5)} / ${read.sma50.toFixed(5)}` : "—"}
                    </span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                    {read.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Latest candle</span>
                    <span className="font-bold">
                      {candles.length ? new Date(candles[candles.length - 1].time).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bars analysed</span>
                    <span className="font-bold">{read.candleCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Feed latency</span>
                    <span className="font-bold">{meta?.latency === "realtime" ? "real-time" : "delayed"}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Timeframe</span>
                      <Badge variant="outline">{TIMEFRAME}</Badge>
                    </div>
                  </div>
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
