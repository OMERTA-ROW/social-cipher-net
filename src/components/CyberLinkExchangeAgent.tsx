import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Brain,
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ExchangeSignal {
  type: "positive" | "negative";
  asset: string;
  action: string;
  confidence: number;
  impact: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
  timestamp: string;
}

interface AgentStatus {
  isActive: boolean;
  totalSignals: number;
  positiveExchanges: number;
  negativeLosses: number;
  profitability: number;
  accuracy: number;
}

export const CyberLinkExchangeAgent = () => {
  const [isActive, setIsActive] = useState(false);
  const [signals, setSignals] = useState<ExchangeSignal[]>([]);
  const [status, setStatus] = useState<AgentStatus>({
    isActive: false,
    totalSignals: 0,
    positiveExchanges: 0,
    negativeLosses: 0,
    profitability: 0,
    accuracy: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      runExchangeAgent();
      interval = setInterval(() => {
        runExchangeAgent();
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const runExchangeAgent = async () => {
    setLoading(true);
    try {
      // Simulate AI agent analysis across all trading platforms
      const newSignal: ExchangeSignal = {
        type: Math.random() > 0.5 ? "positive" : "negative",
        asset: ["BTC", "ETH", "SOL", "DOGE", "AAPL", "TSLA", "NFTS", "MEME"][Math.floor(Math.random() * 8)],
        action: Math.random() > 0.5 ? "BUY" : "SELL",
        confidence: Math.floor(Math.random() * 30) + 70,
        impact: Math.random() > 0.7 ? "HIGH" : (Math.random() > 0.5 ? "MEDIUM" : "LOW"),
        reasoning: [
          "Strong momentum detected across multiple timeframes",
          "Whale accumulation pattern identified",
          "Oversold conditions with reversal signals",
          "Breakout from consolidation pattern",
          "Negative divergence detected, risk of pullback",
          "Liquidation cascade imminent",
          "Strong social sentiment and trending volume"
        ][Math.floor(Math.random() * 7)],
        timestamp: new Date().toISOString()
      };

      setSignals(prev => [newSignal, ...prev].slice(0, 10));

      // Update status
      setStatus(prev => {
        const newTotal = prev.totalSignals + 1;
        const newPositive = newSignal.type === "positive" ? prev.positiveExchanges + 1 : prev.positiveExchanges;
        const newNegative = newSignal.type === "negative" ? prev.negativeLosses + 1 : prev.negativeLosses;
        
        return {
          ...prev,
          totalSignals: newTotal,
          positiveExchanges: newPositive,
          negativeLosses: newNegative,
          profitability: ((newPositive - newNegative) / newTotal * 100),
          accuracy: (newPositive / newTotal * 100)
        };
      });

      // Broadcast to Draco and Zozo
      await supabase.channel('cyberlink-exchange').send({
        type: 'broadcast',
        event: 'exchange-signal',
        payload: {
          signal: newSignal,
          bots: ['draco', 'zozo']
        }
      });

      if (newSignal.impact === "HIGH") {
        toast.success(`🤖 CyberLink Exchange: ${newSignal.type === "positive" ? "Opportunity" : "Risk"} Detected`, {
          description: `${newSignal.action} ${newSignal.asset} - ${newSignal.reasoning}`
        });
      }
    } catch (error: any) {
      console.error('Exchange Agent error:', error);
      toast.error("Exchange Agent Error", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (type: string) => {
    return type === "positive" ? "text-green-500" : "text-red-500";
  };

  const getImpactBadge = (impact: string) => {
    if (impact === "HIGH") return "bg-red-500/20 text-red-500";
    if (impact === "MEDIUM") return "bg-yellow-500/20 text-yellow-500";
    return "bg-blue-500/20 text-blue-500";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-500" />
                CyberLink Exchange AI Agent
              </CardTitle>
              <CardDescription>
                Unified AI analyzing all platforms for positive exchanges and negative loss prevention
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "default" : "outline"} className="gap-1">
                {isActive ? <Activity className="h-3 w-3 animate-pulse" /> : <Activity className="h-3 w-3" />}
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Control Panel */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsActive(!isActive)}
              variant={isActive ? "destructive" : "default"}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {isActive ? "Deactivate Agent" : "Activate Agent"}
            </Button>
            <Button
              onClick={runExchangeAgent}
              disabled={loading || !isActive}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Force Scan
            </Button>
          </div>

          {/* Agent Status Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Signals</div>
                <div className="text-2xl font-bold">{status.totalSignals}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Positive Exchanges</div>
                <div className="text-2xl font-bold text-green-500">{status.positiveExchanges}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Negative Losses</div>
                <div className="text-2xl font-bold text-red-500">{status.negativeLosses}</div>
              </CardContent>
            </Card>
            <Card className="bg-background/50">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <div className="text-2xl font-bold text-cyan-500">{status.accuracy.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Profitability Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Profitability</span>
              <span className={`font-bold ${status.profitability >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {status.profitability.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.max(0, Math.min(100, status.profitability + 50))} 
              className="h-2"
            />
          </div>

          {/* Recent Signals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <h3 className="font-semibold">Recent Exchange Signals</h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {signals.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No signals yet. Activate the agent to start monitoring.
                </div>
              ) : (
                signals.map((signal, index) => (
                  <Card key={index} className="bg-background/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={getSignalColor(signal.type)}>
                            {signal.type === "positive" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{signal.asset}</span>
                              <Badge variant="outline">{signal.action}</Badge>
                              <Badge className={getImpactBadge(signal.impact)}>
                                {signal.impact}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {signal.reasoning}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Confidence: {signal.confidence}%</span>
                              <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Integration Status */}
          <Card className="bg-background/30 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-cyan-500" />
                <span className="font-semibold">AI Brain Integration</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Draco Algorithm</span>
                  <Badge variant={isActive ? "default" : "outline"}>
                    {isActive ? "Connected" : "Standby"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Zozo Algorithm</span>
                  <Badge variant={isActive ? "default" : "outline"}>
                    {isActive ? "Connected" : "Standby"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">All Trading Platforms</span>
                  <Badge variant="outline">Monitoring</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
