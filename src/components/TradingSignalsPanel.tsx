import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingDisclaimer from "@/components/market/TradingDisclaimer";
import { getCandles, messageOf, type AssetClass, type Timeframe } from "@/services/marketData";
import { analyze, type TechnicalRead } from "@/lib/marketIndicators";

/**
 * Multi-timeframe technical read-outs. Every number below is computed from
 * live exchange candles; nothing is generated.
 */

interface SignalRow {
  timeframe: Timeframe;
  read: TechnicalRead;
  source: string;
  latency: "realtime" | "delayed";
  asOf: number;
}

interface TradingSignalsPanelProps {
  symbol?: string;
  stockSymbol?: string;
}

const CRYPTO_TFS: Timeframe[] = ["5m", "15m", "1h", "4h", "1D"];
const STOCK_TFS: Timeframe[] = ["15m", "1h", "1D", "1W"];

const TradingSignalsPanel = ({ symbol = "BTC", stockSymbol = "SPY" }: TradingSignalsPanelProps) => {
  const [cryptoRows, setCryptoRows] = useState<SignalRow[]>([]);
  const [stockRows, setStockRows] = useState<SignalRow[]>([]);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const loadRows = useCallback(async (assetClass: AssetClass, ticker: string, timeframes: Timeframe[]) => {
    const results = await Promise.allSettled(timeframes.map((tf) => getCandles(assetClass, ticker, tf)));
    const rows: SignalRow[] = [];
    let lastError: string | null = null;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const read = analyze(r.value.candles);
        if (read) {
          rows.push({ timeframe: timeframes[i], read, source: r.value.source, latency: r.value.latency, asOf: r.value.asOf });
        }
      } else {
        lastError = messageOf(r.reason);
      }
    });
    return { rows, error: rows.length ? null : lastError ?? "No live candles returned" };
  }, []);

  const fetchAll = useCallback(async () => {
    const [crypto, stocks] = await Promise.all([
      loadRows("crypto", symbol, CRYPTO_TFS),
      loadRows("stock", stockSymbol, STOCK_TFS),
    ]);
    setCryptoRows(crypto.rows);
    setCryptoError(crypto.error);
    setStockRows(stocks.rows);
    setStockError(stocks.error);
  }, [loadRows, symbol, stockSymbol]);

  useEffect(() => {
    fetchAll();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchAll();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchAll]);

  const getSignalColor = (signal: string) => {
    if (signal === "BUY") return "text-green-500";
    if (signal === "SELL") return "text-red-500";
    return "text-yellow-500";
  };

  const getSignalIcon = (signal: string) => {
    if (signal === "BUY") return <TrendingUp className="h-4 w-4" />;
    if (signal === "SELL") return <TrendingDown className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const renderSignalCard = (row: SignalRow, ticker: string) => (
    <div
      key={`${ticker}-${row.timeframe}`}
      className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-600/30 rounded-lg p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`${getSignalColor(row.read.action)} flex items-center gap-1`}>
            {getSignalIcon(row.read.action)}
            <span className="font-bold text-sm">{row.read.action}</span>
          </span>
          <Badge variant="outline" className="text-xs border-red-600/30">
            {row.read.confidence}% agreement
          </Badge>
        </div>
        <span className="text-xs text-red-400/70 uppercase">{row.timeframe}</span>
      </div>

      <div className="text-xs text-red-100/70 mb-1">
        Price: ${row.read.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </div>

      <div className="text-xs text-red-100/70 space-y-1">
        <div>RSI: {row.read.rsi != null ? row.read.rsi.toFixed(1) : "—"}</div>
        <div>MACD histogram: {row.read.macd ? row.read.macd.histogram.toFixed(4) : "—"}</div>
        <div>Trend: {row.read.trend}</div>
        <div>
          Support / resistance:{" "}
          {row.read.support != null && row.read.resistance != null
            ? `${row.read.support.toFixed(2)} / ${row.read.resistance.toFixed(2)}`
            : "—"}
        </div>
        <div>Volume vs average: {row.read.volume ? `${row.read.volume.ratio.toFixed(2)}x` : "—"}</div>
      </div>

      <div className="text-xs text-red-400/50 mt-2">
        {row.source} · {row.latency === "realtime" ? "real-time" : "delayed"} · {new Date(row.asOf).toLocaleTimeString()}
      </div>
    </div>
  );

  const top = cryptoRows[0] ?? stockRows[0] ?? null;

  return (
    <Card className="bg-black/95 border-red-600/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-red-500 animate-pulse" />
        <h3 className="font-bold text-red-500">LIVE SIGNALS</h3>
        <Badge variant="outline" className="text-xs border-red-600/30 text-red-400">
          {symbol}
        </Badge>
      </div>
      <MarketSourceBadge
        className="mb-3"
        source={top?.source}
        latency={top?.latency}
        asOf={top?.asOf}
        connected={cryptoRows.length > 0 || stockRows.length > 0}
      />

      <Tabs defaultValue="crypto" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-red-950/30">
          <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
          <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
        </TabsList>

        <TabsContent value="crypto" className="mt-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {cryptoError && !cryptoRows.length ? (
                <MarketUnavailable message={cryptoError} onRetry={fetchAll} />
              ) : (
                cryptoRows.map((row) => renderSignalCard(row, symbol))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stocks" className="mt-4">
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {stockError && !stockRows.length ? (
                <MarketUnavailable message={stockError} onRetry={fetchAll} />
              ) : (
                stockRows.map((row) => renderSignalCard(row, stockSymbol))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <TradingDisclaimer className="mt-3" />
    </Card>
  );
};

export default TradingSignalsPanel;
