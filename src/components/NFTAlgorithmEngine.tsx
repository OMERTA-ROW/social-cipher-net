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
  Image,
  Zap,
  Target,
  Loader2
} from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getNftMarket, messageOf, type Latency, type NftCollection } from "@/services/marketData";

const usd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;

/** Action derived only from the live floor and volume series. */
function derive(c: NftCollection) {
  const reasons: string[] = [];
  let score = 0;
  let signals = 0;

  signals++;
  if (c.floorChange24h > 3) {
    score += 1;
    reasons.push(`Floor +${c.floorChange24h.toFixed(1)}% in 24h`);
  } else if (c.floorChange24h < -3) {
    score -= 1;
    reasons.push(`Floor ${c.floorChange24h.toFixed(1)}% in 24h`);
  } else reasons.push(`Floor flat (${c.floorChange24h.toFixed(1)}%)`);

  signals++;
  if (c.volumeChange24h > 10) {
    score += 1;
    reasons.push(`Volume +${c.volumeChange24h.toFixed(1)}%`);
  } else if (c.volumeChange24h < -10) {
    score -= 1;
    reasons.push(`Volume ${c.volumeChange24h.toFixed(1)}%`);
  } else reasons.push(`Volume ${c.volumeChange24h.toFixed(1)}%`);

  const depth = c.marketCapUsd ? c.volume24hUsd / c.marketCapUsd : 0;
  signals++;
  if (depth > 0.02) {
    score += 1;
    reasons.push(`24h volume ${(depth * 100).toFixed(1)}% of market cap`);
  } else reasons.push(`Thin turnover (${(depth * 100).toFixed(2)}% of market cap)`);

  const normalized = signals ? score / signals : 0;
  const action: "BUY" | "SELL" | "HOLD" = normalized >= 0.4 ? "BUY" : normalized <= -0.4 ? "SELL" : "HOLD";
  const ownerRatio = c.supply ? c.owners / c.supply : 0;
  const risk = c.volume24hUsd < 50_000 ? "HIGH" : c.volume24hUsd < 500_000 ? "MEDIUM" : "LOW";

  return { action, confidence: Math.round(Math.min(95, Math.abs(normalized) * 100)), reasons, depth, ownerRatio, risk };
}

export const NFTAlgorithmEngine = () => {
  const [collections, setCollections] = useState<NftCollection[]>([]);
  const [meta, setMeta] = useState<{ source: string; latency: Latency; asOf: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const runAlgorithm = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNftMarket();
      if (!res.collections.length) throw new Error("No live NFT collections returned");
      setCollections([...res.collections].sort((a, b) => b.volume24hUsd - a.volume24hUsd));
      setMeta({ source: res.source, latency: res.latency, asOf: res.asOf });
      setError(null);
    } catch (e) {
      setCollections([]);
      setError(messageOf(e));
      toast.error("Live NFT feed unavailable", { description: messageOf(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      runAlgorithm();
      interval = window.setInterval(runAlgorithm, 120000);
    }
    return () => window.clearInterval(interval);
  }, [isRunning, runAlgorithm]);

  const top = collections[0] ?? null;
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
      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-purple-500" />
                NFT Algorithm Engine
              </CardTitle>
              <CardDescription>Floor and volume read from live collection data — no simulated values</CardDescription>
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
            connected={!error && collections.length > 0}
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
                <div className="text-sm text-muted-foreground">Collections</div>
                <div className="text-2xl font-bold">{collections.length || "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Top Floor</div>
                <div className="text-2xl font-bold">{top ? `${top.floorPrice.toFixed(2)} ${top.nativeCurrency}` : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">24h Volume</div>
                <div className="text-2xl font-bold text-green-500">{top ? usd(top.volume24hUsd) : "—"}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Floor 24h</div>
                <div className={`text-2xl font-bold ${(top?.floorChange24h ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {top ? `${top.floorChange24h >= 0 ? "+" : ""}${top.floorChange24h.toFixed(1)}%` : "—"}
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
                <TabsTrigger value="onchain">Holders</TabsTrigger>
                <TabsTrigger value="sentiment">Leaderboard</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(signal.action)}`}>
                      {signal.action === "BUY" ? <TrendingUp className="h-8 w-8" /> :
                       signal.action === "SELL" ? <TrendingDown className="h-8 w-8" /> :
                       <Activity className="h-8 w-8" />}
                      {signal.action}
                    </div>
                    <Badge className={getRiskColor(signal.risk)}>
                      {signal.risk} LIQUIDITY RISK
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
                      <div className="text-muted-foreground">Collection</div>
                      <div className="font-bold text-lg">{top.name}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Floor Price</div>
                      <div className="font-bold">{top.floorPrice.toFixed(3)} {top.nativeCurrency} ({usd(top.floorPriceUsd)})</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Market cap</div>
                      <div className="font-bold">{top.marketCapUsd ? usd(top.marketCapUsd) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Turnover</div>
                      <div className="font-bold">{(signal.depth * 100).toFixed(2)}%</div>
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
                    <span className="text-sm text-muted-foreground">Floor change 24h</span>
                    <span className="font-bold">{top.floorChange24h.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume 24h</span>
                    <span className="font-bold">{top.volume24h.toFixed(1)} {top.nativeCurrency} ({usd(top.volume24hUsd)})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume change 24h</span>
                    <span className="font-bold">{top.volumeChange24h.toFixed(2)}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Rarity and mint activity are not shown: no provider is connected for them.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="onchain" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Unique owners</span>
                    <span className="font-bold">{top.owners.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total supply</span>
                    <span className="font-bold">{top.supply.toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Owner / supply ratio</span>
                      <span className="font-bold">{(signal.ownerRatio * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(100, signal.ownerRatio * 100)} className="h-2" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-2">
                  {collections.map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-sm">
                      <span className="font-bold truncate max-w-[45%]">{c.name}</span>
                      <span className="text-muted-foreground">{c.floorPrice.toFixed(2)} {c.nativeCurrency}</span>
                      <span className={c.floorChange24h >= 0 ? "text-green-500" : "text-red-500"}>
                        {c.floorChange24h >= 0 ? "+" : ""}{c.floorChange24h.toFixed(1)}%
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
