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
  Rocket,
  Zap,
  Target,
  Loader2
} from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getTokenMarket, messageOf, type TokenPair, type Latency } from "@/services/marketData";

const usd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;

/** Derives an action purely from the live DEX metrics of the pair. */
function derive(pair: TokenPair) {
  const reasons: string[] = [];
  let score = 0;
  let signals = 0;

  signals++;
  if (pair.change1h > 2) {
    score += 1;
    reasons.push(`1h price ${pair.change1h.toFixed(1)}%`);
  } else if (pair.change1h < -2) {
    score -= 1;
    reasons.push(`1h price ${pair.change1h.toFixed(1)}%`);
  } else reasons.push(`1h price flat (${pair.change1h.toFixed(1)}%)`);

  signals++;
  if (pair.change24h > 10) {
    score += 1;
    reasons.push(`24h price +${pair.change24h.toFixed(1)}%`);
  } else if (pair.change24h < -10) {
    score -= 1;
    reasons.push(`24h price ${pair.change24h.toFixed(1)}%`);
  } else reasons.push(`24h price ${pair.change24h.toFixed(1)}%`);

  const totalTx = pair.buys24h + pair.sells24h;
  const buyShare = totalTx ? pair.buys24h / totalTx : 0.5;
  signals++;
  if (buyShare > 0.55) {
    score += 1;
    reasons.push(`Buy pressure ${(buyShare * 100).toFixed(0)}% of trades`);
  } else if (buyShare < 0.45) {
    score -= 1;
    reasons.push(`Sell pressure ${((1 - buyShare) * 100).toFixed(0)}% of trades`);
  } else reasons.push("Buys and sells balanced");

  const turnover = pair.liquidityUsd ? pair.volume24h / pair.liquidityUsd : 0;
  signals++;
  if (turnover > 1) {
    score += 1;
    reasons.push(`Volume ${turnover.toFixed(1)}x liquidity`);
  } else {
    reasons.push(`Volume ${turnover.toFixed(2)}x liquidity`);
  }

  const normalized = signals ? score / signals : 0;
  const action: "BUY" | "SELL" | "HOLD" = normalized >= 0.4 ? "BUY" : normalized <= -0.4 ? "SELL" : "HOLD";
  const ageDays = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 86_400_000 : null;
  const liquidityRisk =
    pair.liquidityUsd < 50_000 ? "HIGH" : pair.liquidityUsd < 250_000 ? "MEDIUM" : "LOW";

  return {
    action,
    confidence: Math.round(Math.min(95, Math.abs(normalized) * 100)),
    reasons,
    buyShare,
    turnover,
    ageDays,
    liquidityRisk,
  };
}

export const MoonshotAlgorithmEngine = () => {
  const [pairs, setPairs] = useState<TokenPair[]>([]);
  const [meta, setMeta] = useState<{ source: string; latency: Latency; asOf: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTokenMarket();
      if (!res.pairs.length) throw new Error("No live DEX pairs returned");
      setPairs(res.pairs);
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf });
      setError(null);
    } catch (e) {
      setPairs([]);
      setError(messageOf(e));
      toast.error("Live DEX feed unavailable", { description: messageOf(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      runAlgorithm();
      interval = window.setInterval(runAlgorithm, 60000);
    }
    return () => window.clearInterval(interval);
  }, [isRunning, runAlgorithm]);

  const top = pairs[0] ?? null;
  const signal = top ? derive(top) : null;

  const getActionColor = (action: string) => {
    if (action === "BUY") return "text-green-500";
    if (action === "SELL") return "text-red-500";
    return "text-yellow-500";
  };
  const getRiskColor = (level: string) => {
    if (level === "LOW") return "bg-green-500/20 text-green-500";
    if (level === "MEDIUM") return "bg-yellow-500/20 text-yellow-500";
    return "bg-red-500/20 text-red-500";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-green-500" />
                Moonshot Algorithm Engine
              </CardTitle>
              <CardDescription>Live DEX pairs, ranked by real 24h volume — no simulated values</CardDescription>
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
            connected={!error && pairs.length > 0}
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
                <div className="text-sm text-muted-foreground">Pairs Scanned</div>
                <div className="text-2xl font-bold">{pairs.length || "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Top 24h Volume</div>
                <div className="text-2xl font-bold text-green-500">{top ? usd(top.volume24h) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Liquidity</div>
                <div className="text-2xl font-bold">{top ? usd(top.liquidityUsd) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">24h Move</div>
                <div className={`text-2xl font-bold ${(top?.change24h ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {top ? `${top.change24h >= 0 ? "+" : ""}${top.change24h.toFixed(1)}%` : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {error && !top && <MarketUnavailable message={error} onRetry={runAlgorithm} />}

          {top && signal && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="indicators">Indicators</TabsTrigger>
                <TabsTrigger value="onchain">On-Chain</TabsTrigger>
                <TabsTrigger value="sentiment">Watchlist</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(signal.action)}`}>
                      {signal.action === "BUY" ? <TrendingUp className="h-8 w-8" /> :
                       signal.action === "SELL" ? <TrendingDown className="h-8 w-8" /> :
                       <Activity className="h-8 w-8" />}
                      {signal.action} {top.symbol}
                    </div>
                    <Badge className={getRiskColor(signal.liquidityRisk)}>
                      {signal.liquidityRisk} LIQUIDITY RISK
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Metric agreement</span>
                      <span className="font-bold">{signal.confidence}%</span>
                    </div>
                    <Progress value={signal.confidence} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-bold text-lg">${top.priceUsd < 0.01 ? top.priceUsd.toFixed(8) : top.priceUsd.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Chain / DEX</div>
                      <div className="font-bold capitalize">{top.chain} · {top.dex}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pair age</div>
                      <div className="font-bold">{signal.ageDays != null ? `${signal.ageDays.toFixed(0)} days` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Market cap</div>
                      <div className="font-bold">{top.marketCap ? usd(top.marketCap) : "—"}</div>
                    </div>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                    {signal.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="indicators" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">5m / 1h / 6h / 24h</span>
                    <span className="font-bold">
                      {top.change5m.toFixed(1)}% · {top.change1h.toFixed(1)}% · {top.change6h.toFixed(1)}% · {top.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume 1h / 24h</span>
                    <span className="font-bold">{usd(top.volume1h)} · {usd(top.volume24h)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume / liquidity</span>
                    <span className="font-bold">{signal.turnover.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fully diluted valuation</span>
                    <span className="font-bold">{top.fdv ? usd(top.fdv) : "—"}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="onchain" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Buys (24h)</span>
                    <span className="font-bold text-green-500">{top.buys24h.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sells (24h)</span>
                    <span className="font-bold text-red-500">{top.sells24h.toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Buy share</span>
                      <span className="font-bold">{(signal.buyShare * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={signal.buyShare * 100} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pair</span>
                    <a href={top.url} target="_blank" rel="noreferrer" className="font-bold text-primary underline">
                      View on DexScreener
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Holder counts and social sentiment are not shown: no provider is connected for them.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-2">
                  {pairs.slice(0, 8).map((p) => (
                    <div key={p.pairAddress} className="flex justify-between items-center text-sm">
                      <span className="font-bold">{p.symbol}</span>
                      <span className="text-muted-foreground">{usd(p.volume24h)} vol</span>
                      <span className={p.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                        {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(1)}%
                      </span>
                    </div>
                  ))}
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
