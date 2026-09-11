/**
 * One independent chart pane: its own ticker, timeframe, chart type and
 * indicators, fed by the shared live market-data service.
 */

import { type PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import { GripVertical, Loader2, Pin, PinOff, Send, Settings2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import MarketSourceBadge from "@/components/market/MarketSourceBadge";
import MarketUnavailable from "@/components/market/MarketUnavailable";
import TradingChart, { type ChartType, type IndicatorKey, type TradingChartHandle } from "./TradingChart";
import { TIMEFRAMES, type Timeframe } from "@/services/marketData";
import { useCandles, useQuotes } from "@/hooks/useMarketData";
import { KIND_LABEL, resolveSymbol } from "@/lib/symbols";
import type { TradingLimits } from "@/lib/tradingTiers";
import { publishChartSnapshot } from "@/lib/chartPost";

export interface PaneConfig {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorKey[];
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candles", label: "Candles" },
  { value: "heikin", label: "Heikin-Ashi" },
  { value: "bars", label: "Bars" },
  { value: "line", label: "Line" },
];

const INDICATORS: { key: IndicatorKey; label: string; advanced?: boolean }[] = [
  { key: "sma20", label: "SMA 20" },
  { key: "sma50", label: "SMA 50" },
  { key: "ema20", label: "EMA 20" },
  { key: "volume", label: "Volume" },
  { key: "bollinger", label: "Bollinger", advanced: true },
  { key: "fib", label: "Fibonacci", advanced: true },
];

interface Props {
  pane: PaneConfig;
  limits: TradingLimits;
  height: number;
  pinned?: boolean;
  onPin?: () => void;
  onDragStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onChange: (pane: PaneConfig) => void;
  onRemove: () => void;
  onUpgradeNeeded: (reason: string) => void;
}

const ChartPane = ({ pane, limits, height, pinned = false, onPin, onDragStart, onChange, onRemove, onUpgradeNeeded }: Props) => {
  const [draft, setDraft] = useState(pane.symbol);
  const [posting, setPosting] = useState(false);
  const chartRef = useRef<TradingChartHandle | null>(null);
  const resolved = useMemo(() => resolveSymbol(pane.symbol), [pane.symbol]);

  const candles = useCandles(resolved.assetClass, resolved.symbol, pane.timeframe, limits.refreshMs);
  const quotes = useQuotes(resolved.assetClass, [resolved.symbol], limits.refreshMs);
  const quote = quotes.data?.[0];

  const toggleIndicator = (key: IndicatorKey, advanced?: boolean) => {
    const on = pane.indicators.includes(key);
    if (!on && advanced && !limits.advancedIndicators) {
      onUpgradeNeeded("Advanced studies (Bollinger, Fibonacci) are part of Plus and Pro.");
      return;
    }
    if (!on && pane.indicators.length >= limits.maxIndicators) {
      onUpgradeNeeded(`Your plan allows ${limits.maxIndicators} indicators per chart.`);
      return;
    }
    onChange({
      ...pane,
      indicators: on ? pane.indicators.filter((i) => i !== key) : [...pane.indicators, key],
    });
  };

  const applySymbol = () => {
    const next = draft.trim().toUpperCase();
    if (next) onChange({ ...pane, symbol: next });
  };

  const postChart = async () => {
    const canvas = chartRef.current?.takeScreenshot();
    if (!canvas || !candles.connected || !candles.source || !candles.asOf) {
      toast.error("This chart needs a connected live data source before it can be posted.");
      return;
    }
    setPosting(true);
    try {
      await publishChartSnapshot(canvas, {
        symbol: resolved.symbol,
        timeframe: pane.timeframe,
        chartType: pane.chartType,
        indicators: pane.indicators,
        source: candles.source,
        asOf: candles.asOf,
      });
      toast.success("Chart posted to your feed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post this chart.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden border-border/60 bg-card/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-2">
        {onDragStart && (
          <Button size="icon" variant="ghost" className="h-8 w-8 cursor-grab touch-none active:cursor-grabbing" onPointerDown={onDragStart} aria-label="Move chart">
            <GripVertical className="h-4 w-4" />
          </Button>
        )}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={applySymbol}
          onKeyDown={(e) => e.key === "Enter" && applySymbol()}
          className="h-8 w-28 text-xs font-semibold uppercase"
          aria-label="Ticker"
        />
        <Badge variant="outline" className="text-[10px]">
          {KIND_LABEL[resolved.kind]}
        </Badge>

        <Select value={pane.timeframe} onValueChange={(v) => onChange({ ...pane, timeframe: v as Timeframe })}>
          <SelectTrigger className="h-8 w-[74px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAMES.map((tf) => (
              <SelectItem key={tf} value={tf} className="text-xs">
                {tf}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pane.chartType} onValueChange={(v) => onChange({ ...pane, chartType: v as ChartType })}>
          <SelectTrigger className="h-8 w-[116px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Indicators">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-2">
            <p className="text-xs font-medium">Indicators</p>
            {INDICATORS.map((i) => (
              <div key={i.key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {i.label}
                  {i.advanced && !limits.advancedIndicators && " · paid"}
                </span>
                <Switch
                  checked={pane.indicators.includes(i.key)}
                  onCheckedChange={() => toggleIndicator(i.key, i.advanced)}
                />
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          {quote && (
            <span className="text-xs font-semibold">
              {quote.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              <span className={quote.change24h >= 0 ? " text-primary" : " text-destructive"}>
                {" "}
                {quote.change24h >= 0 ? "+" : ""}
                {quote.change24h.toFixed(2)}%
              </span>
            </span>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={postChart} disabled={posting || !candles.connected} aria-label="Post chart to feed">
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Post chart to feed</TooltipContent>
            </Tooltip>
            {onPin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant={pinned ? "secondary" : "ghost"} className="h-8 w-8" onClick={onPin} aria-label={pinned ? "Unpin chart" : "Pin chart"}>
                    {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{pinned ? "Unpin chart" : "Pin chart"}</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} aria-label="Close chart">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-2">
        {candles.loading && !candles.data ? (
          <Skeleton className="w-full" style={{ height }} />
        ) : candles.error || !candles.data?.length ? (
          <MarketUnavailable
            message={candles.error ?? `No live feed connected for ${resolved.symbol}.`}
            onRetry={candles.refresh}
          />
        ) : (
          <TradingChart
            ref={chartRef}
            candles={candles.data}
            chartType={pane.chartType}
            indicators={pane.indicators}
            height={height}
          />
        )}
      </div>

      <div className="border-t border-border/60 px-2 py-1">
        <MarketSourceBadge
          connected={candles.connected}
          source={candles.source}
          latency={candles.latency}
          asOf={candles.asOf}
          error={candles.error}
          extra={candles.market ? `${candles.market.exchange} ${candles.market.state}` : null}
        />
      </div>
    </Card>
  );
};

export default ChartPane;
