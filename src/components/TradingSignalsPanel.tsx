import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Signal {
  platform: string;
  signal: string;
  strength?: string;
  price?: number;
  timestamp: string;
  indicators?: any;
  volume?: string;
  onChainMetrics?: any;
  liquidations?: any;
  openInterest?: string;
}

interface TradingSignalsPanelProps {
  symbol?: string;
}

const TradingSignalsPanel = ({ symbol = "BTC" }: TradingSignalsPanelProps) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const platforms = ["tradingview", "binance", "cryptoquant", "coinglass"];

  const fetchSignals = async () => {
    setIsLoading(true);
    try {
      const signalPromises = platforms.map(platform =>
        supabase.functions.invoke('fetch-trading-signals', {
          body: { platform, symbol }
        })
      );

      const results = await Promise.all(signalPromises);
      const newSignals = results
        .filter(r => r.data)
        .map(r => ({ ...r.data.data, platform: r.data.platform }));
      
      setSignals(newSignals);
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [symbol]);

  const getSignalColor = (signal: string) => {
    if (signal.includes("BUY") || signal.includes("ACCUMULATE")) return "text-green-500";
    if (signal.includes("SELL")) return "text-red-500";
    return "text-yellow-500";
  };

  const getSignalIcon = (signal: string) => {
    if (signal.includes("BUY") || signal.includes("ACCUMULATE")) return <TrendingUp className="h-4 w-4" />;
    if (signal.includes("SELL")) return <TrendingDown className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Card className="bg-black/95 border-red-600/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-red-500 animate-pulse" />
        <h3 className="font-bold text-red-500">LIVE SIGNALS</h3>
        <Badge variant="outline" className="text-xs border-red-600/30 text-red-400">
          {symbol}
        </Badge>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {signals.map((signal, idx) => (
            <div
              key={`${signal.platform}-${idx}`}
              className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-600/30 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`${getSignalColor(signal.signal)} flex items-center gap-1`}>
                    {getSignalIcon(signal.signal)}
                    <span className="font-bold text-sm">{signal.signal}</span>
                  </span>
                  {signal.strength && (
                    <Badge variant="outline" className="text-xs border-red-600/30">
                      {signal.strength}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-red-400/70 uppercase">{signal.platform}</span>
              </div>

              {signal.price && (
                <div className="text-xs text-red-100/70 mb-1">
                  Price: ${signal.price.toFixed(2)}
                </div>
              )}

              {signal.indicators && (
                <div className="text-xs text-red-100/70 space-y-1">
                  <div>RSI: {signal.indicators.rsi}</div>
                  <div>MACD: {signal.indicators.macd}</div>
                  <div>Fib: {signal.indicators.fibonacci}</div>
                </div>
              )}

              {signal.volume && (
                <div className="text-xs text-red-100/70">Volume: {signal.volume}</div>
              )}

              {signal.onChainMetrics && (
                <div className="text-xs text-red-100/70 space-y-1">
                  <div>Exchange Netflow: {signal.onChainMetrics.exchangeNetflow}</div>
                  <div>Whale Activity: {signal.onChainMetrics.whaleActivity}</div>
                </div>
              )}

              {signal.liquidations && (
                <div className="text-xs text-red-100/70 space-y-1">
                  <div>Long Liq: {signal.liquidations.long}</div>
                  <div>Short Liq: {signal.liquidations.short}</div>
                </div>
              )}

              <div className="text-xs text-red-400/50 mt-2">
                {new Date(signal.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default TradingSignalsPanel;
