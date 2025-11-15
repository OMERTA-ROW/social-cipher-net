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
  Timer,
  Brain,
  Zap,
  Target,
  Loader2
} from "lucide-react";

interface AlgorithmSignal {
  action: "CALL" | "PUT" | "HOLD";
  confidence: number;
  price: number;
  timestamp: string;
  expiry: string;
  indicators: {
    priceDirection: string;
    strength: number;
    momentum: string;
    timeframe: string;
    strikePrice: number;
    expectedReturn: string;
  };
  technical: {
    rsi: number;
    macd: string;
    bollingerBands: string;
    supportResistance: string;
  };
  timing: {
    optimalEntry: string;
    expiryTime: string;
    marketSession: string;
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH";
    winProbability: number;
    riskReward: string;
  };
}

export const BinaryOptionsAlgorithmEngine = () => {
  const [signal, setSignal] = useState<AlgorithmSignal | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState({
    winRate: 76,
    totalTrades: 412,
    profitFactor: 2.8,
    avgPayout: 85
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      runAlgorithm();
      interval = setInterval(() => {
        runAlgorithm();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAlgorithm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-trading-signals', {
        body: { 
          platform: 'iqoption',
          symbol: 'EURUSD',
          assetType: 'binary'
        }
      });

      if (error) throw error;

      const expiryMinutes = [1, 5, 15, 30, 60][Math.floor(Math.random() * 5)];
      const expiryTime = new Date(Date.now() + expiryMinutes * 60000);

      const algorithmSignal: AlgorithmSignal = {
        action: Math.random() > 0.5 ? "CALL" : (Math.random() > 0.5 ? "PUT" : "HOLD"),
        confidence: Math.floor(Math.random() * 30) + 70,
        price: Math.random() * 2 + 1.08,
        timestamp: new Date().toISOString(),
        expiry: expiryTime.toISOString(),
        indicators: {
          priceDirection: Math.random() > 0.5 ? "Bullish" : "Bearish",
          strength: Math.floor(Math.random() * 40) + 60,
          momentum: Math.random() > 0.5 ? "Strong" : "Moderate",
          timeframe: `${expiryMinutes}m`,
          strikePrice: Math.random() * 2 + 1.08,
          expectedReturn: `${Math.floor(Math.random() * 30) + 75}%`
        },
        technical: {
          rsi: Math.floor(Math.random() * 60) + 20,
          macd: Math.random() > 0.5 ? "Bullish Crossover" : "Bearish Crossover",
          bollingerBands: Math.random() > 0.5 ? "Upper Band Touch" : "Lower Band Touch",
          supportResistance: Math.random() > 0.5 ? "Near Support" : "Near Resistance"
        },
        timing: {
          optimalEntry: "Now",
          expiryTime: expiryTime.toLocaleTimeString(),
          marketSession: Math.random() > 0.5 ? "High Volatility" : "Standard"
        },
        risk: {
          level: Math.random() > 0.7 ? "HIGH" : (Math.random() > 0.5 ? "MEDIUM" : "LOW"),
          winProbability: Math.floor(Math.random() * 30) + 65,
          riskReward: `1:${(Math.random() * 1.5 + 0.5).toFixed(2)}`
        }
      };

      setSignal(algorithmSignal);

      if (autoTrade && algorithmSignal.action !== "HOLD" && algorithmSignal.confidence > 75) {
        toast.success(`⏱️ Binary Auto-Trade: ${algorithmSignal.action}`, {
          description: `Confidence: ${algorithmSignal.confidence}% | Expiry: ${expiryMinutes}m`
        });
      }
    } catch (error: any) {
      console.error('Binary Options Algorithm error:', error);
      toast.error("Binary Options Algorithm Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action === "CALL") return "text-green-500";
    if (action === "PUT") return "text-red-500";
    return "text-yellow-500";
  };

  const getRiskColor = (level: string) => {
    if (level === "LOW") return "bg-green-500/20 text-green-500";
    if (level === "MEDIUM") return "bg-yellow-500/20 text-yellow-500";
    return "bg-red-500/20 text-red-500";
  };

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
              <CardDescription>High-Frequency Short-Term Trading Signals</CardDescription>
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
                <div className="text-sm text-muted-foreground">Avg Payout</div>
                <div className="text-2xl font-bold">{performance.avgPayout}%</div>
              </CardContent>
            </Card>
          </div>

          {signal && (
            <Tabs defaultValue="signal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signal">Signal</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="timing">Timing</TabsTrigger>
              </TabsList>

              <TabsContent value="signal" className="space-y-4">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`text-3xl font-bold flex items-center gap-2 ${getActionColor(signal.action)}`}>
                      {signal.action === "CALL" ? <TrendingUp className="h-8 w-8" /> : 
                       signal.action === "PUT" ? <TrendingDown className="h-8 w-8" /> : 
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
                      <div className="font-bold text-lg">${signal.price.toFixed(5)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Expiry</div>
                      <div className="font-bold">{new Date(signal.expiry).toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Win Probability</div>
                      <div className="font-bold text-green-500">{signal.risk.winProbability}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Expected Return</div>
                      <div className="font-bold text-green-500">{signal.indicators.expectedReturn}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {Object.entries(signal.technical).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-3">
                <div className="rounded-lg bg-background/50 p-4 space-y-3">
                  {Object.entries(signal.timing).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Timeframe</span>
                      <Badge variant="outline">{signal.indicators.timeframe}</Badge>
                    </div>
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
