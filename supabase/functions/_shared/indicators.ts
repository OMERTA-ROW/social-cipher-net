/** Technical indicators computed from real OHLC series. No synthetic values. */

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
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
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
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
        ? "bullish"
        : prevMacd >= prevSignal && macdLine < signalLine
          ? "bearish"
          : "none",
  };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { middle: mean, upper: mean + mult * sd, lower: mean - mult * sd, width: (mult * 2 * sd) / mean };
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
      "0.236": high - span * 0.236,
      "0.382": high - span * 0.382,
      "0.5": high - span * 0.5,
      "0.618": high - span * 0.618,
      "0.786": high - span * 0.786,
    },
  };
}

export function volumeProfile(candles: Candle[], period = 20) {
  if (candles.length < period + 1) return null;
  const recent = candles.slice(-period);
  const avg = recent.reduce((a, c) => a + c.volume, 0) / period;
  const last = candles[candles.length - 1].volume;
  return { average: avg, latest: last, ratio: avg ? last / avg : 0 };
}

export type TechnicalRead = {
  price: number;
  rsi: number | null;
  macd: ReturnType<typeof macd>;
  sma20: number | null;
  sma50: number | null;
  ema200: number | null;
  bollinger: ReturnType<typeof bollinger>;
  atr: number | null;
  atrPercent: number | null;
  fibonacci: ReturnType<typeof fibonacci>;
  volume: ReturnType<typeof volumeProfile>;
  trend: "up" | "down" | "sideways";
  action: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0-100, derived from agreeing indicators
  reasons: string[];
  candleCount: number;
};

/** Aggregates the indicators above into a single, fully derived read. */
export function analyze(candles: Candle[]): TechnicalRead | null {
  if (candles.length < 30) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const r = rsi(closes);
  const m = macd(closes);
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const e200 = ema(closes, Math.min(200, Math.max(30, Math.floor(closes.length / 2))));
  const bb = bollinger(closes);
  const a = atr(candles);
  const vol = volumeProfile(candles);

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
    } else {
      reasons.push(`RSI ${r.toFixed(1)} — neutral`);
    }
  }
  if (m) {
    signals++;
    if (m.histogram > 0) {
      score += 1;
      reasons.push(`MACD histogram positive (${m.histogram.toFixed(4)})`);
    } else {
      score -= 1;
      reasons.push(`MACD histogram negative (${m.histogram.toFixed(4)})`);
    }
  }
  if (s20 != null && s50 != null) {
    signals++;
    if (s20 > s50) {
      score += 1;
      reasons.push("20-period average above 50-period average");
    } else {
      score -= 1;
      reasons.push("20-period average below 50-period average");
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
    } else {
      reasons.push("Price inside Bollinger bands");
    }
  }
  if (e200 != null) {
    signals++;
    if (price > e200) {
      score += 1;
      reasons.push("Price above long-term EMA");
    } else {
      score -= 1;
      reasons.push("Price below long-term EMA");
    }
  }

  const normalized = signals ? score / signals : 0;
  const action: "BUY" | "SELL" | "HOLD" =
    normalized >= 0.4 ? "BUY" : normalized <= -0.4 ? "SELL" : "HOLD";
  const confidence = Math.round(Math.min(95, Math.abs(normalized) * 100));
  const trend = s20 != null && s50 != null ? (s20 > s50 * 1.001 ? "up" : s20 < s50 * 0.999 ? "down" : "sideways") : "sideways";

  return {
    price,
    rsi: r,
    macd: m,
    sma20: s20,
    sma50: s50,
    ema200: e200,
    bollinger: bb,
    atr: a,
    atrPercent: a != null && price ? (a / price) * 100 : null,
    fibonacci: fibonacci(candles),
    volume: vol,
    trend,
    action,
    confidence,
    reasons,
    candleCount: candles.length,
  };
}
