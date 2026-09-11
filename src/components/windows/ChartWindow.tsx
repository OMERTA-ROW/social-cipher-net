/**
 * A self-contained live chart, designed to be opened inside a floating window.
 * Each window keeps its own ticker, timeframe, chart type and indicators, and
 * is fed exclusively by the shared live market-data service.
 */

import { useState } from "react";
import { toast } from "sonner";
import ChartPane, { type PaneConfig } from "@/components/trading/ChartPane";
import { useTradingTier } from "@/lib/tradingTiers";

interface Props {
  symbol?: string;
  onClose?: () => void;
}

const ChartWindow = ({ symbol = "BTC", onClose }: Props) => {
  const { limits } = useTradingTier();
  const [pane, setPane] = useState<PaneConfig>({
    id: `win-${symbol}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    timeframe: "1h",
    chartType: "candles",
    indicators: ["sma20"],
  });

  return (
    <div className="h-full min-h-[320px]">
      <ChartPane
        pane={pane}
        limits={limits}
        height={240}
        onChange={setPane}
        onRemove={() => onClose?.()}
        onUpgradeNeeded={(reason) => toast.info(reason)}
      />
    </div>
  );
};

export default ChartWindow;
