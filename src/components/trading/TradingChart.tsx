/**
 * Chart renderer for the trading workspace.
 *
 * Every bar drawn here comes from the live market-data service. There is no
 * synthetic series, no random walk and no filler: if candles are missing the
 * caller renders an unavailable state instead of this component.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  BarSeries,
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import type { Candle } from "@/services/marketData";
import { emaSeries } from "@/lib/marketIndicators";

export type ChartType = "candles" | "line" | "bars" | "heikin";
export type IndicatorKey = "sma20" | "sma50" | "ema20" | "bollinger" | "volume" | "fib";

interface TradingChartProps {
  candles: Candle[];
  chartType: ChartType;
  indicators: IndicatorKey[];
  height?: number;
}

export interface TradingChartHandle {
  takeScreenshot: () => HTMLCanvasElement | null;
}

const css = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
};

const smaSeries = (values: number[], period: number): (number | null)[] =>
  values.map((_, i) => {
    if (i + 1 < period) return null;
    const slice = values.slice(i + 1 - period, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });

const toHeikin = (candles: Candle[]): Candle[] => {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const close = (c.open + c.high + c.low + c.close) / 4;
    const prev = out[i - 1];
    const open = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
    out.push({
      time: c.time,
      open,
      close,
      high: Math.max(c.high, open, close),
      low: Math.min(c.low, open, close),
      volume: c.volume,
    });
  }
  return out;
};

const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ candles, chartType, indicators, height = 260 }, ref) => {
  const holder = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Live polling replaces the candle array every refresh. Applying the new data
  // through this callback keeps the user's pan/zoom instead of rebuilding.
  const applyRef = useRef<((candles: Candle[]) => void) | null>(null);
  const fittedRef = useRef(false);
  const indicatorKey = [...indicators].sort().join(",");

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => chartRef.current?.takeScreenshot(true, false) ?? null,
  }), []);

  // Build the chart and its series once per chart type / indicator selection.
  useEffect(() => {
    if (!holder.current) return;
    const activeIndicators = indicatorKey ? (indicatorKey.split(",") as IndicatorKey[]) : [];
    const text = css("--muted-foreground", "#94a3b8");
    const grid = "rgba(148,163,184,0.12)";
    const up = css("--primary", "#38bdf8");
    const down = css("--destructive", "#ef4444");

    const chart = createChart(holder.current, {
      autoSize: false,
      width: Math.max(holder.current.clientWidth, 320),
      height: holder.current.clientHeight || height,
      layout: { background: { color: "transparent" }, textColor: text, attributionLogo: false },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      handleScale: true,
      handleScroll: true,
    });
    chartRef.current = chart;
    fittedRef.current = false;

    const t = (ms: number) => (ms / 1000) as Time;

    const main =
      chartType === "line"
        ? chart.addSeries(LineSeries, { color: up, lineWidth: 2 })
        : chartType === "bars"
          ? chart.addSeries(BarSeries, { upColor: up, downColor: down })
          : chart.addSeries(CandlestickSeries, {
              upColor: up,
              downColor: down,
              borderUpColor: up,
              borderDownColor: down,
              wickUpColor: up,
              wickDownColor: down,
            });

    const overlaySeries = (color: string, width: 1 | 2 = 1) =>
      chart.addSeries(LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: false });

    const sma20 = activeIndicators.includes("sma20") ? overlaySeries("#a78bfa") : null;
    const sma50 = activeIndicators.includes("sma50") ? overlaySeries("#60a5fa") : null;
    const ema20 = activeIndicators.includes("ema20") ? overlaySeries("#22d3ee") : null;
    const bbUpper = activeIndicators.includes("bollinger") ? overlaySeries("rgba(167,139,250,0.55)") : null;
    const bbLower = activeIndicators.includes("bollinger") ? overlaySeries("rgba(167,139,250,0.55)") : null;
    const fibSeries = activeIndicators.includes("fib")
      ? chart.addSeries(LineSeries, { color: "transparent", lastValueVisible: false, priceLineVisible: false })
      : null;
    const volume = activeIndicators.includes("volume")
      ? chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
          color: "rgba(56,189,248,0.35)",
        })
      : null;
    if (volume) chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    let fibLines: ReturnType<NonNullable<typeof fibSeries>["createPriceLine"]>[] = [];

    const setOverlay = (series: ReturnType<typeof overlaySeries> | null, source: Candle[], values: (number | null)[]) => {
      if (!series) return;
      series.setData(
        values
          .map((v, i) => (v == null ? null : { time: t(source[i].time), value: v }))
          .filter(Boolean) as { time: Time; value: number }[],
      );
    };

    applyRef.current = (next: Candle[]) => {
      if (!next.length) return;
      const source = chartType === "heikin" ? toHeikin(next) : next;

      if (chartType === "line") {
        main.setData(source.map((c) => ({ time: t(c.time), value: c.close })));
      } else {
        main.setData(source.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
      }

      const closes = source.map((c) => c.close);
      setOverlay(sma20, source, smaSeries(closes, 20));
      setOverlay(sma50, source, smaSeries(closes, 50));
      if (ema20) {
        const e = emaSeries(closes, 20);
        setOverlay(ema20, source, closes.map((_, i) => (i < 19 ? null : e[i] ?? null)));
      }
      if (bbUpper && bbLower) {
        const period = 20;
        const mid = smaSeries(closes, period);
        const upper: (number | null)[] = [];
        const lower: (number | null)[] = [];
        closes.forEach((_, i) => {
          const m = mid[i];
          if (m == null) {
            upper.push(null);
            lower.push(null);
            return;
          }
          const slice = closes.slice(i + 1 - period, i + 1);
          const sd = Math.sqrt(slice.reduce((a, v) => a + (v - m) ** 2, 0) / period);
          upper.push(m + 2 * sd);
          lower.push(m - 2 * sd);
        });
        setOverlay(bbUpper, source, upper);
        setOverlay(bbLower, source, lower);
      }
      if (fibSeries) {
        const look = source.slice(-120);
        const hi = Math.max(...look.map((c) => c.high));
        const lo = Math.min(...look.map((c) => c.low));
        fibLines.forEach((line) => fibSeries.removePriceLine(line));
        fibSeries.setData([{ time: t(source[0].time), value: hi }]);
        fibLines = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((level) =>
          fibSeries.createPriceLine({
            price: hi - (hi - lo) * level,
            color: "rgba(96,165,250,0.45)",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `${(level * 100).toFixed(1)}%`,
          }),
        );
      }
      if (volume) {
        volume.setData(
          source.map((c) => ({
            time: t(c.time),
            value: c.volume,
            color: c.close >= c.open ? "rgba(56,189,248,0.35)" : "rgba(239,68,68,0.35)",
          })),
        );
      }

      if (!fittedRef.current) {
        chart.timeScale().fitContent();
        fittedRef.current = true;
      }
    };

    let redrawFrame = 0;
    // Resize through the chart API. Chromium can leave the library's backing
    // canvases at 300x150 inside a resized floating pane; when that happens,
    // update the bitmap once and trigger the chart redraw on the next frame.
    const syncSize = () => {
      const host = holder.current;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      chart.resize(w, h, true);
      const dpr = window.devicePixelRatio || 1;
      let staleBitmap = false;
      host.querySelectorAll("canvas").forEach((canvas) => {
        const desiredWidth = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const desiredHeight = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
          canvas.width = desiredWidth;
          canvas.height = desiredHeight;
          staleBitmap = true;
        }
      });
      if (staleBitmap) {
        cancelAnimationFrame(redrawFrame);
        redrawFrame = requestAnimationFrame(() => {
          chart.resize(Math.max(1, w - 1), h, true);
          requestAnimationFrame(() => {
            chart.resize(w, h, true);
          });
        });
      }
    };
    const raf = requestAnimationFrame(syncSize);
    const ro = new ResizeObserver(() => syncSize());
    ro.observe(holder.current);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(redrawFrame);
      ro.disconnect();
      applyRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, [chartType, indicatorKey, height]);

  // Feed live data in without tearing the chart down.
  useEffect(() => {
    applyRef.current?.(candles);
  }, [candles, chartType, indicatorKey]);

  return <div ref={holder} className="w-full" style={{ height }} />;
});


TradingChart.displayName = "TradingChart";

export default TradingChart;
