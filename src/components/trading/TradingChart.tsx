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

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => chartRef.current?.takeScreenshot(true, false) ?? null,
  }), []);

  useEffect(() => {
    if (!holder.current || !candles.length) return;
    const text = css("--muted-foreground", "#94a3b8");
    const grid = "rgba(148,163,184,0.12)";
    const up = css("--primary", "#38bdf8");
    const down = css("--destructive", "#ef4444");

    const chart = createChart(holder.current, {
      autoSize: true,
      width: holder.current.clientWidth || undefined,
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

    const source = chartType === "heikin" ? toHeikin(candles) : candles;
    const t = (ms: number) => (ms / 1000) as Time;

    if (chartType === "line") {
      const s = chart.addSeries(LineSeries, { color: up, lineWidth: 2 });
      s.setData(source.map((c) => ({ time: t(c.time), value: c.close })));
    } else if (chartType === "bars") {
      const s = chart.addSeries(BarSeries, { upColor: up, downColor: down });
      s.setData(source.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
    } else {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderUpColor: up,
        borderDownColor: down,
        wickUpColor: up,
        wickDownColor: down,
      });
      s.setData(source.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
    }

    const closes = source.map((c) => c.close);

    const overlay = (values: (number | null)[], color: string, width: 1 | 2 = 1) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: false });
      s.setData(
        values
          .map((v, i) => (v == null ? null : { time: t(source[i].time), value: v }))
          .filter(Boolean) as { time: Time; value: number }[],
      );
    };

    if (indicators.includes("sma20")) overlay(smaSeries(closes, 20), "#a78bfa");
    if (indicators.includes("sma50")) overlay(smaSeries(closes, 50), "#60a5fa");
    if (indicators.includes("ema20")) {
      const e = emaSeries(closes, 20);
      overlay(closes.map((_, i) => (i < 19 ? null : e[i] ?? null)), "#22d3ee");
    }
    if (indicators.includes("bollinger")) {
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
      overlay(upper, "rgba(167,139,250,0.55)");
      overlay(lower, "rgba(167,139,250,0.55)");
    }
    if (indicators.includes("fib")) {
      const look = source.slice(-120);
      const hi = Math.max(...look.map((c) => c.high));
      const lo = Math.min(...look.map((c) => c.low));
      const s = chart.addSeries(LineSeries, { color: "transparent", lastValueVisible: false, priceLineVisible: false });
      s.setData([{ time: t(source[0].time), value: hi }]);
      [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((level) => {
        s.createPriceLine({
          price: hi - (hi - lo) * level,
          color: "rgba(96,165,250,0.45)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${(level * 100).toFixed(1)}%`,
        });
      });
    }
    if (indicators.includes("volume")) {
      const v = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: "rgba(56,189,248,0.35)",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      v.setData(
        source.map((c) => ({
          time: t(c.time),
          value: c.volume,
          color: c.close >= c.open ? "rgba(56,189,248,0.35)" : "rgba(239,68,68,0.35)",
        })),
      );
    }

    chart.timeScale().fitContent();

    // autoSize keeps the canvas bitmap in sync with the container. Some
    // environments never fire the library's internal size observer, which
    // leaves the drawing surface at its 300x150 default and paints nothing,
    // so we verify the backing bitmaps and size them ourselves if needed.
    const syncBitmaps = () => {
      const host = holder.current;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      chart.resize(w, h, true);
      const dpr = window.devicePixelRatio || 1;
      let repaired = false;
      host.querySelectorAll("canvas").forEach((c) => {
        const want = Math.round(c.clientWidth * dpr);
        const wantH = Math.round(c.clientHeight * dpr);
        if (want > 0 && wantH > 0 && (c.width !== want || c.height !== wantH)) {
          c.width = want;
          c.height = wantH;
          repaired = true;
        }
      });
      if (repaired) chart.resize(w - 1, h, true);
      chart.resize(w, h, true);
      chart.timeScale().fitContent();
    };
    const raf = requestAnimationFrame(syncBitmaps);
    const ro = new ResizeObserver(() => syncBitmaps());
    ro.observe(holder.current);

    return () => {
      cancelAnimationFrame(raf);
      chart.remove();
      chartRef.current = null;
    };

  }, [candles, chartType, indicators]);

  return <div ref={holder} className="w-full" style={{ height }} />;
});

TradingChart.displayName = "TradingChart";

export default TradingChart;
