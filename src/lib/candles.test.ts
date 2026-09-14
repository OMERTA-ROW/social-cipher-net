import { describe, expect, it } from "vitest";
import { isSeriesStale, sanitizeCandles } from "@/lib/candles";

const c = (time: number, close: number) => ({
  time,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
});

describe("candle validation", () => {
  it("returns an empty series for missing data instead of inventing bars", () => {
    expect(sanitizeCandles(null)).toEqual([]);
    expect(sanitizeCandles(undefined)).toEqual([]);
    expect(sanitizeCandles([])).toEqual([]);
  });

  it("orders bars oldest first", () => {
    const out = sanitizeCandles([c(3000, 3), c(1000, 1), c(2000, 2)]);
    expect(out.map((x) => x.time)).toEqual([1000, 2000, 3000]);
  });

  it("drops rows with broken or impossible numbers", () => {
    const out = sanitizeCandles([
      c(1000, 1),
      { time: 2000, open: Number.NaN, high: 2, low: 2, close: 2, volume: 0 },
      { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 0 },
      { time: 3000, open: 1, high: 1, low: 1, close: -5, volume: 0 },
    ]);
    expect(out.map((x) => x.time)).toEqual([1000]);
  });

  it("keeps only the newest row for a duplicated timestamp", () => {
    const out = sanitizeCandles([c(1000, 10), c(1000, 11)]);
    expect(out).toHaveLength(1);
    expect(out[0].close).toBe(11);
  });

  it("repairs a high/low that contradicts the open and close", () => {
    const out = sanitizeCandles([{ time: 1000, open: 10, high: 9, low: 11, close: 12, volume: 5 }]);
    expect(out[0].high).toBe(12);
    expect(out[0].low).toBe(10);
  });

  it("treats a series with no recent bar as stale", () => {
    const hour = 3_600_000;
    const now = 100 * hour;
    expect(isSeriesStale([c(now - hour, 1)], hour, now)).toBe(false);
    expect(isSeriesStale([c(now - 10 * hour, 1)], hour, now)).toBe(true);
    expect(isSeriesStale([], hour, now)).toBe(true);
  });
});
