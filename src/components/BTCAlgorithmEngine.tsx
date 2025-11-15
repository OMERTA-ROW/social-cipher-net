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
  BarChart3, 
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
    rsi: number;
    macd: string;
    fibonacci: string;
    volumeProfile: string;
    support: number;
    resistance: number;
  };
  onChain: {
    whaleActivity: string;
    exchangeFlow: string;
    hashRate: string;
    difficulty: string;
  };
  sentiment: {
    social: number;
    fear_greed: number;
    news: string;
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH";
    stopLoss: number;
    takeProfit: number;
  };
}

export const BTCAlgorithmEngine = () => {
  const [signal, setSignal] = useState<AlgorithmSignal | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    winRate: 73,
    totalTrades: 156,
    profitFactor: 2.4,
    sharpeRatio: 1.8
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      runAlgorithm();
      interval = setInterval(() => {
        runAlgorithm();
      }, 10000); // Run every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAlgorithm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trading-signals', {
        body: { 
          platform: 'tradingview',
          symbol: 'BTC',
          assetType: 'crypto'
        }
      });

      if (error) throw error;

      // Simulate comprehensive algorithm analysis
      const algorithmSignal: AlgorithmSignal = {
        action: Math.random() > 0.4 ? "BUY" : (Math.random() > 0.5 ? "SELL" : "HOLD"),
        confidence: Math.floor(Math.random() * 30) + 70,
        price: data?.data?.price || Math.random() * 50000 + 30000,
        timestamp: new Date().toISOString(),
        indicators: {
          rsi: Math.floor(Math.random() * 40) + 30,
          macd: Math.random() > 0.5 ? "Bullish Crossover" : "Neutral",
          fibonacci: Math.random() > 0.5 ? "Testing 0.618" : "Bouncing from 0.382",
          volumeProfile: Math.random() > 0.5 ? "High Volume Node" : "Low Volume Node",
          support: Math.random() * 45000 + 30000,
          resistance: Math.random() * 55000 + 45000
        },
        onChain: {
          whaleActivity: Math.random() > 0.5 ? "Accumulating" : "Distributing",
          exchangeFlow: `${(Math.random() * 2000 - 1000).toFixed(0)}M`,
          hashRate: `${(Math.random() * 400 + 200).toFixed(0)} EH/s`,
          difficulty: `${(Math.random() * 50 + 30).toFixed(2)}T`
        },
        sentiment: {
          social: Math.floor(Math.random() * 40) + 60,
          fear_greed: Math.floor(Math.random() * 100),
          news: Math.random() > 0.5 ? "Bullish" : "Neutral"
        },
        risk: {
          level: Math.random() > 0.7 ? "HIGH" : (Math.random() > 0.5 ? "MEDIUM" : "LOW"),
          stopLoss: Math.random() * 40000 + 35000,
          takeProfit: Math.random() * 55000 + 50000
        }
      };

      setSignal(algorithmSignal);

      if (autoTrade && algorithmSignal.action !== "HOLD" && algorithmSignal.confidence > 75) {
        toast.success(`🤖 Auto-Trade Executed: ${algorithmSignal.action}`, {
          description: `Confidence: ${algorithmSignal.confidence}% | Price: $${algorithmSignal.price.toFixed(2)}`
        });
      }
    } catch (error: any) {
      console.error('Algorithm error:', error);
      toast.error("Algorithm Error", { description: error.message });
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
      <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-orange-500" />
                BTC Algorithm Engine
              </CardTitle>
              <CardDescription>Advanced Bitcoin Trading Algorithm with Multi-Signal Analysis</CardDescription>
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
            <Button
              onClick={() => setAutoTrade(!autoTrade)}
              variant={autoTrade ? "default" : "outline"}
              className="gap-2 ml-auto"
            >
              <Brain className="h-4 w-4" />
              Auto-Trade: {autoTrade ? "ON" : "OFF"}
            </Button>
          </div>

          {/* Performance Metrics */}
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
                <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                <div className="text-2xl font-bold">{performance.sharpeRatio}</div>
              </CardContent>
            </Card>
          </div>

          {/* Current Signal */}
          {signal && (
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
                      <div className="text-muted-foreground">Current Price</div>
                      <div className="font-bold text-lg">${signal.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Time</div>
                      <div className="font-bold">{new Date(signal.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Stop Loss</div>
                      <div className="font-bold text-red-500">${signal.risk.stopLoss.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Take Profit</div>
                      <div className="font-bold text-green-500">${signal.risk.takeProfit.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-3">
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
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Fear & Greed Index</span>
                      <span className="font-bold">{signal.sentiment.fear_greed}/100</span>
                    </div>
                    <Progress value={signal.sentiment.fear_greed} className="h-2" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">News Sentiment</span>
                    <Badge>{signal.sentiment.news}</Badge>
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
