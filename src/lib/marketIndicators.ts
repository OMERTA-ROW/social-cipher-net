/** Client-side technical indicators. Every value is derived from real candles. */

import type { Candle } from "@/services/marketData";

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  const s = emaSeries(values, period);
  return s.length ? s[s.length - 1] : null;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + gain / period / avgLoss);
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  if (values.length < slow + signal) return null;
  const fastS = emaSeries(values, fast);
  const slowS = emaSeries(values, slow);
  const offset = fastS.length - slowS.length;
  const line = slowS.map((v, i) => fastS[i + offset] - v);
  const signalS = emaSeries(line, signal);
  if (!signalS.length) return null;
  const macdLine = line[line.length - 1];
  const signalLine = signalS[signalS.length - 1];
  const prevMacd = line[line.length - 2] ?? macdLine;
  const prevSignal = signalS[signalS.length - 2] ?? signalLine;
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
    crossover:
      prevMacd <= prevSignal && macdLine > signalLine
        ? ("bullish" as const)
        : prevMacd >= prevSignal && macdLine < signalLine
          ? ("bearish" as const)
          : ("none" as const),
  };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return { middle: mean, upper: mean + mult * sd, lower: mean - mult * sd, width: mean ? (mult * 2 * sd) / mean : 0 };
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p), Math.abs(c.low - p)));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function fibonacci(candles: Candle[], lookback = 100) {
  const slice = candles.slice(-lookback);
  if (!slice.length) return null;
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const span = high - low;
  return {
    high,
    low,
    levels: {
      "23.6%": high - span * 0.236,
      "38.2%": high - span * 0.382,
      "50.0%": high - span * 0.5,
      "61.8%": high - span * 0.618,
      "78.6%": high - span * 0.786,
    },
  };
}

export function volumeProfile(candles: Candle[], period = 20) {
  if (candles.length < period + 1) return null;
  const recent = candles.slice(-period);
  const average = recent.reduce((a, c) => a + c.volume, 0) / period;
  const latest = candles[candles.length - 1].volume;
  return { average, latest, ratio: average ? latest / average : 0 };
}

export function changeOver(candles: Candle[], bars: number): number | null {
  if (bars <= 0 || candles.length < bars + 1) return null;
  const then = candles[candles.length - 1 - bars].close;
  const now = candles[candles.length - 1].close;
  return then ? ((now - then) / then) * 100 : null;
}

export type TechnicalRead = {
  price: number;
  rsi: number | null;
  macd: ReturnType<typeof macd>;
  sma20: number | null;
  sma50: number | null;
  emaLong: number | null;
  bollinger: ReturnType<typeof bollinger>;
  atr: number | null;
  atrPercent: number | null;
  fibonacci: ReturnType<typeof fibonacci>;
  volume: ReturnType<typeof volumeProfile>;
  trend: "up" | "down" | "sideways";
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasons: string[];
  support: number | null;
  resistance: number | null;
  candleCount: number;
};

/** Full technical read of a real candle series. Returns null when history is too short. */
export function analyze(candles: Candle[]): TechnicalRead | null {
  if (!candles || candles.length < 30) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const r = rsi(closes);
  const m = macd(closes);
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const longPeriod = Math.min(200, Math.max(30, Math.floor(closes.length / 2)));
  const eLong = ema(closes, longPeriod);
  const bb = bollinger(closes);
  const a = atr(candles);
  const fib = fibonacci(candles);

  const reasons: string[] = [];
  let score = 0;
  let signals = 0;

  if (r != null) {
    signals++;
    if (r < 30) {
      score += 1;
      reasons.push(`RSI ${r.toFixed(1)} — oversold`);
    } else if (r > 70) {
      score -= 1;
      reasons.push(`RSI ${r.toFixed(1)} — overbought`);
    } else reasons.push(`RSI ${r.toFixed(1)} — neutral`);
  }
  if (m) {
    signals++;
    if (m.histogram > 0) {
      score += 1;
      reasons.push("MACD histogram positive");
    } else {
      score -= 1;
      reasons.push("MACD histogram negative");
    }
  }
  if (s20 != null && s50 != null) {
    signals++;
    if (s20 > s50) {
      score += 1;
      reasons.push("20-period MA above 50-period MA");
    } else {
      score -= 1;
      reasons.push("20-period MA below 50-period MA");
    }
  }
  if (bb) {
    signals++;
    if (price < bb.lower) {
      score += 1;
      reasons.push("Price below lower Bollinger band");
    } else if (price > bb.upper) {
      score -= 1;
      reasons.push("Price above upper Bollinger band");
    } else reasons.push("Price inside Bollinger bands");
  }
  if (eLong != null) {
    signals++;
    if (price > eLong) {
      score += 1;
      reasons.push(`Price above ${longPeriod}-period EMA`);
    } else {
      score -= 1;
      reasons.push(`Price below ${longPeriod}-period EMA`);
    }
  }

  const normalized = signals ? score / signals : 0;
  const action: "BUY" | "SELL" | "HOLD" =
    normalized >= 0.4 ? "BUY" : normalized <= -0.4 ? "SELL" : "HOLD";

  const window = candles.slice(-60);
  const support = window.length ? Math.min(...window.map((c) => c.low)) : null;
  const resistance = window.length ? Math.max(...window.map((c) => c.high)) : null;

  return {
    price,
    rsi: r,
    macd: m,
    sma20: s20,
    sma50: s50,
    emaLong: eLong,
    bollinger: bb,
    atr: a,
    atrPercent: a != null && price ? (a / price) * 100 : null,
    fibonacci: fib,
    volume: volumeProfile(candles),
    trend: s20 != null && s50 != null ? (s20 > s50 * 1.001 ? "up" : s20 < s50 * 0.999 ? "down" : "sideways") : "sideways",
    action,
    confidence: Math.round(Math.min(95, Math.abs(normalized) * 100)),
    reasons,
    support,
    resistance,
    candleCount: candles.length,
  };
}
