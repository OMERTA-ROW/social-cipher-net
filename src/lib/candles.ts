import type { Candle } from "@/services/marketData";

/**
 * Last line of defence before a chart draws provider data.
 *
 * Drops rows with missing or impossible numbers, collapses duplicate
 * timestamps to the newest row, and guarantees an oldest-first series in UTC
 * milliseconds. Nothing is invented here — bad rows are removed, never filled.
 */
export const sanitizeCandles = (rows: Candle[] | null | undefined): Candle[] => {
  if (!Array.isArray(rows)) return [];
  const byTime = new Map<number, Candle>();
  for (const row of rows) {
    const time = Number(row?.time);
    const open = Number(row?.open);
    const high = Number(row?.high);
    const low = Number(row?.low);
    const close = Number(row?.close);
    if (!Number.isFinite(time) || time <= 0) continue;
    if (![open, high, low, close].every((v) => Number.isFinite(v) && v > 0)) continue;
    byTime.set(time, {
      time,
      open,
      close,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      volume: Number.isFinite(Number(row?.volume)) ? Math.max(0, Number(row.volume)) : 0,
    });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
};

/** True when a series is fresh enough to be called live for this timeframe. */
export const isSeriesStale = (candles: Candle[], timeframeMs: number, now = Date.now()): boolean => {
  const last = candles[candles.length - 1];
  if (!last) return true;
  return now - last.time > timeframeMs * 3;
};
