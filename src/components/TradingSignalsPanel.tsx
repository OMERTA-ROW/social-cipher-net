import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  dayTradeScore?: number;
  algorithmScore?: number;
  backtestResults?: any;
  institutionalFlow?: string;
  darkPoolActivity?: string;
  optionsFlow?: any;
  technicalRating?: string;
  dayTradeSetup?: string;
  momentum?: any;
  retailSentiment?: string;
  popularityRank?: number;
}

interface TradingSignalsPanelProps {
  symbol?: string;
}

const TradingSignalsPanel = ({ symbol = "BTC" }: TradingSignalsPanelProps) => {
  const [cryptoSignals, setCryptoSignals] = useState<Signal[]>([]);
  const [stockSignals, setStockSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cryptoPlatforms = ["tradingview", "binance", "cryptoquant", "coinglass"];
  const stockPlatforms = ["alpaca", "quantconnect", "interactivebrokers", "tradingview_stocks", "tdameritrade", "robinhood"];

  const fetchSignals = async (assetType: "crypto" | "stock", platforms: string[]) => {
    try {
      const signalPromises = platforms.map(platform =>
        supabase.functions.invoke('fetch-trading-signals', {
          body: { platform, symbol, assetType }
        })
      );

      const results = await Promise.all(signalPromises);
      const newSignals = results
        .filter(r => r.data)
        .map(r => ({ ...r.data.data, platform: r.data.platform }));
      
      return newSignals;
    } catch (error) {
      console.error(`Error fetching ${assetType} signals:`, error);
      return [];
    }
  };

  const fetchAllSignals = async () => {
    setIsLoading(true);
    const [crypto, stocks] = await Promise.all([
      fetchSignals("crypto", cryptoPlatforms),
      fetchSignals("stock", stockPlatforms)
    ]);
    setCryptoSignals(crypto);
    setStockSignals(stocks);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllSignals();
    const interval = setInterval(fetchAllSignals, 30000); // Update every 30s
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

  const renderSignalCard = (signal: Signal, idx: number) => (
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
        <span className="text-xs text-red-400/70 uppercase">{signal.platform.replace('_', ' ')}</span>
      </div>

      {signal.price && (
        <div className="text-xs text-red-100/70 mb-1">
          Price: ${signal.price.toFixed(2)}
        </div>
      )}

      {signal.indicators && (
        <div className="text-xs text-red-100/70 space-y-1">
          {signal.indicators.rsi && <div>RSI: {signal.indicators.rsi}</div>}
          {signal.indicators.macd && <div>MACD: {signal.indicators.macd}</div>}
          {signal.indicators.fibonacci && <div>Fib: {signal.indicators.fibonacci}</div>}
          {signal.indicators.movingAverage && <div>MA: {signal.indicators.movingAverage}</div>}
          {signal.indicators.bollingerBands && <div>BB: {signal.indicators.bollingerBands}</div>}
          {signal.indicators.adx && <div>ADX: {signal.indicators.adx}</div>}
        </div>
      )}

      {signal.volume && (
        <div className="text-xs text-red-100/70">Volume: {signal.volume}</div>
      )}

      {signal.dayTradeScore && (
        <div className="text-xs text-red-100/70">Day Trade Score: {signal.dayTradeScore}/100</div>
      )}

      {signal.algorithmScore && (
        <div className="text-xs text-red-100/70">Algorithm Score: {signal.algorithmScore}/100</div>
      )}

      {signal.backtestResults && (
        <div className="text-xs text-red-100/70 space-y-1">
          <div>Sharpe Ratio: {signal.backtestResults.sharpeRatio}</div>
          <div>Win Rate: {signal.backtestResults.winRate}</div>
        </div>
      )}

      {signal.institutionalFlow && (
        <div className="text-xs text-red-100/70">Institutional: {signal.institutionalFlow}</div>
      )}

      {signal.darkPoolActivity && (
        <div className="text-xs text-red-100/70">Dark Pool: {signal.darkPoolActivity}</div>
      )}

      {signal.optionsFlow && (
        <div className="text-xs text-red-100/70 space-y-1">
          <div>Call Volume: {signal.optionsFlow.callVolume}</div>
          <div>Put Volume: {signal.optionsFlow.putVolume}</div>
        </div>
      )}

      {signal.technicalRating && (
        <div className="text-xs text-red-100/70">Technical: {signal.technicalRating}</div>
      )}

      {signal.dayTradeSetup && (
        <div className="text-xs text-red-100/70">Setup: {signal.dayTradeSetup}</div>
      )}

      {signal.momentum && (
        <div className="text-xs text-red-100/70 space-y-1">
          <div>Trend: {signal.momentum.trend}</div>
          <div>Strength: {signal.momentum.strength}%</div>
        </div>
      )}

      {signal.retailSentiment && (
        <div className="text-xs text-red-100/70">Sentiment: {signal.retailSentiment}</div>
      )}

      {signal.popularityRank && (
        <div className="text-xs text-red-100/70">Popularity Rank: #{signal.popularityRank}</div>
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
  );

  return (
    <Card className="bg-black/95 border-red-600/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-red-500 animate-pulse" />
        <h3 className="font-bold text-red-500">LIVE SIGNALS</h3>
        <Badge variant="outline" className="text-xs border-red-600/30 text-red-400">
          {symbol}
        </Badge>
      </div>

      <Tabs defaultValue="crypto" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-red-950/30">
          <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
          <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="crypto" className="mt-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {cryptoSignals.map((signal, idx) => renderSignalCard(signal, idx))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stocks" className="mt-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {stockSignals.map((signal, idx) => (
                renderSignalCard(signal, idx)
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default TradingSignalsPanel;
