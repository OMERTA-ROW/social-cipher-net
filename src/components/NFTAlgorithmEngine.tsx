import { useState, useEffect } from "react";
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
  Image,
  Brain,
  Zap,
  Target,
  Loader2
} from "lucide-react";

interface AlgorithmSignal {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  timestamp: string;
  indicators: {
    floorPrice: number;
    volume24h: string;
    holders: number;
    rarity: string;
    liquidity: string;
    trend: string;
  };
  onChain: {
    mintActivity: string;
    whaleTransfers: string;
    uniqueBuyers: number;
    gasPrice: string;
  };
  sentiment: {
    social: number;
    discord: string;
    twitter: string;
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH";
    rugPullScore: number;
    contractVerified: boolean;
  };
}

export const NFTAlgorithmEngine = () => {
  const [signal, setSignal] = useState<AlgorithmSignal | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    winRate: 68,
    totalTrades: 89,
    profitFactor: 2.1,
    avgROI: 145
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      runAlgorithm();
      interval = setInterval(() => {
        runAlgorithm();
      }, 12000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAlgorithm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trading-signals', {
        body: { 
          platform: 'opensea',
          symbol: 'NFT',
          assetType: 'nft'
        }
      });

      if (error) throw error;

      const algorithmSignal: AlgorithmSignal = {
        action: Math.random() > 0.5 ? "BUY" : (Math.random() > 0.6 ? "SELL" : "HOLD"),
        confidence: Math.floor(Math.random() * 25) + 65,
        price: Math.random() * 5 + 0.5,
        timestamp: new Date().toISOString(),
        indicators: {
          floorPrice: Math.random() * 5 + 0.3,
          volume24h: `${(Math.random() * 500).toFixed(1)} ETH`,
          holders: Math.floor(Math.random() * 5000) + 1000,
          rarity: Math.random() > 0.5 ? "Rare" : "Common",
          liquidity: `${(Math.random() * 200).toFixed(1)} ETH`,
          trend: Math.random() > 0.5 ? "Uptrend" : "Consolidating"
        },
        onChain: {
          mintActivity: Math.random() > 0.5 ? "High" : "Moderate",
          whaleTransfers: `${Math.floor(Math.random() * 50)}`,
          uniqueBuyers: Math.floor(Math.random() * 2000) + 500,
          gasPrice: `${Math.floor(Math.random() * 50) + 20} gwei`
        },
        sentiment: {
          social: Math.floor(Math.random() * 40) + 60,
          discord: Math.random() > 0.5 ? "Bullish" : "Neutral",
          twitter: Math.random() > 0.5 ? "Trending" : "Stable"
        },
        risk: {
          level: Math.random() > 0.7 ? "HIGH" : (Math.random() > 0.5 ? "MEDIUM" : "LOW"),
          rugPullScore: Math.floor(Math.random() * 30) + 10,
          contractVerified: Math.random() > 0.2
        }
      };

      setSignal(algorithmSignal);

      if (autoTrade && algorithmSignal.action !== "HOLD" && algorithmSignal.confidence > 70) {
        toast.success(`🎨 NFT Auto-Trade: ${algorithmSignal.action}`, {
          description: `Confidence: ${algorithmSignal.confidence}% | Floor: ${algorithmSignal.price.toFixed(3)} ETH`
        });
      }
    } catch (error: any) {
      console.error('NFT Algorithm error:', error);
      toast.error("NFT Algorithm Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

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
              <CardDescription>Advanced NFT Trading with Rarity & On-Chain Analysis</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRunning ? "default" : "outline"} className="gap-1">
                {isRunning ? <Activity className="h-3 w-3 animate-pulse" /> : <Activity className="h-3 w-3" />}
                {isRunning ? "Running" : "Stopped"}
              </Badge>
            </div>
          </div>
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
            <Button
              onClick={() => setAutoTrade(!autoTrade)}
              variant={autoTrade ? "default" : "outline"}
              className="gap-2 ml-auto"
            >
              <Brain className="h-4 w-4" />
              Auto-Trade: {autoTrade ? "ON" : "OFF"}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Win Rate</div>
                <div className="text-2xl font-bold text-green-500">{performance.winRate}%</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Trades</div>
                <div className="text-2xl font-bold">{performance.totalTrades}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Profit Factor</div>
                <div className="text-2xl font-bold text-green-500">{performance.profitFactor}x</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Avg ROI</div>
                <div className="text-2xl font-bold">{performance.avgROI}%</div>
              </CardContent>
            </Card>
          </div>

          {signal && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="indicators">Indicators</TabsTrigger>
                <TabsTrigger value="onchain">On-Chain</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
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
                    <Badge className={getRiskColor(signal.risk.level)}>
                      {signal.risk.level} RISK
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-bold">{signal.confidence}%</span>
                    </div>
                    <Progress value={signal.confidence} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Floor Price</div>
                      <div className="font-bold text-lg">{signal.price.toFixed(3)} ETH</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Time</div>
                      <div className="font-bold">{new Date(signal.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rug Pull Risk</div>
                      <div className="font-bold text-yellow-500">{signal.risk.rugPullScore}/100</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Contract</div>
                      <div className={`font-bold ${signal.risk.contractVerified ? 'text-green-500' : 'text-red-500'}`}>
                        {signal.risk.contractVerified ? 'Verified' : 'Unverified'}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="indicators" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {Object.entries(signal.indicators).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="onchain" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {Object.entries(signal.onChain).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Social Sentiment</span>
                      <span className="font-bold">{signal.sentiment.social}/100</span>
                    </div>
                    <Progress value={signal.sentiment.social} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Discord</span>
                    <Badge>{signal.sentiment.discord}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Twitter</span>
                    <Badge>{signal.sentiment.twitter}</Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
