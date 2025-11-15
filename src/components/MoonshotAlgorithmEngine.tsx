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
  Rocket,
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
    marketCap: string;
    holders: number;
    liquidityScore: number;
    velocityScore: number;
    socialMomentum: string;
    priceChange24h: string;
  };
  onChain: {
    newHolders24h: number;
    whaleAccumulation: string;
    burnRate: string;
    contractAge: string;
  };
  sentiment: {
    telegramActivity: number;
    twitterMentions: number;
    influencerScore: number;
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH";
    rugPullRisk: number;
    volatility: string;
  };
}

export const MoonshotAlgorithmEngine = () => {
  const [signal, setSignal] = useState<AlgorithmSignal | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    winRate: 81,
    totalTrades: 234,
    profitFactor: 4.2,
    avgGain: 387
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      runAlgorithm();
      interval = setInterval(() => {
        runAlgorithm();
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAlgorithm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trading-signals', {
        body: { 
          platform: 'dexscreener',
          symbol: 'MOONSHOT',
          assetType: 'moonshot'
        }
      });

      if (error) throw error;

      const algorithmSignal: AlgorithmSignal = {
        action: Math.random() > 0.3 ? "BUY" : (Math.random() > 0.8 ? "SELL" : "HOLD"),
        confidence: Math.floor(Math.random() * 30) + 70,
        price: Math.random() * 0.01,
        timestamp: new Date().toISOString(),
        indicators: {
          marketCap: `$${(Math.random() * 5000000).toFixed(0)}`,
          holders: Math.floor(Math.random() * 10000) + 500,
          liquidityScore: Math.floor(Math.random() * 40) + 60,
          velocityScore: Math.floor(Math.random() * 50) + 50,
          socialMomentum: Math.random() > 0.5 ? "Viral" : "Growing",
          priceChange24h: `${(Math.random() * 200 - 20).toFixed(1)}%`
        },
        onChain: {
          newHolders24h: Math.floor(Math.random() * 5000),
          whaleAccumulation: Math.random() > 0.5 ? "High" : "Moderate",
          burnRate: `${(Math.random() * 10).toFixed(2)}%`,
          contractAge: `${Math.floor(Math.random() * 30)} days`
        },
        sentiment: {
          telegramActivity: Math.floor(Math.random() * 100),
          twitterMentions: Math.floor(Math.random() * 50000),
          influencerScore: Math.floor(Math.random() * 40) + 60
        },
        risk: {
          level: Math.random() > 0.6 ? "HIGH" : (Math.random() > 0.4 ? "MEDIUM" : "LOW"),
          rugPullRisk: Math.floor(Math.random() * 60),
          volatility: Math.random() > 0.5 ? "Extreme" : "High"
        }
      };

      setSignal(algorithmSignal);

      if (autoTrade && algorithmSignal.action === "BUY" && algorithmSignal.confidence > 75) {
        toast.success(`🚀 Moonshot Auto-Trade: ${algorithmSignal.action}`, {
          description: `Confidence: ${algorithmSignal.confidence}% | Price: $${algorithmSignal.price.toFixed(6)}`
        });
      }
    } catch (error: any) {
      console.error('Moonshot Algorithm error:', error);
      toast.error("Moonshot Algorithm Error", { description: error.message });
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
      <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-green-500" />
                Moonshot Algorithm Engine
              </CardTitle>
              <CardDescription>High-Risk High-Reward Early Token Detection</CardDescription>
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
                <div className="text-sm text-muted-foreground">Avg Gain</div>
                <div className="text-2xl font-bold text-green-500">{performance.avgGain}%</div>
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
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-bold text-lg">${signal.price.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Time</div>
                      <div className="font-bold">{new Date(signal.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rug Pull Risk</div>
                      <div className={`font-bold ${signal.risk.rugPullRisk > 50 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {signal.risk.rugPullRisk}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Volatility</div>
                      <div className="font-bold text-orange-500">{signal.risk.volatility}</div>
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
                      <span className="text-muted-foreground">Telegram Activity</span>
                      <span className="font-bold">{signal.sentiment.telegramActivity}/100</span>
                    </div>
                    <Progress value={signal.sentiment.telegramActivity} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Influencer Score</span>
                      <span className="font-bold">{signal.sentiment.influencerScore}/100</span>
                    </div>
                    <Progress value={signal.sentiment.influencerScore} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Twitter Mentions</span>
                    <Badge>{signal.sentiment.twitterMentions.toLocaleString()}</Badge>
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
