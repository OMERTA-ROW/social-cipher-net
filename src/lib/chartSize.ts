/**
 * Shared sizing rules for every chart on the site.
 *
 * The preference is a device/browser setting (localStorage), never account
 * data: nothing here touches the signed-in member's records.
 */

export const CHART_MIN_HEIGHT = 180;
export const CHART_MAX_HEIGHT = 1200;
export const CHART_STEP = 60;
export const CHART_DEFAULT_HEIGHT = 300;

const KEY_PREFIX = "cyberlink:chart-height:";

export const clampChartHeight = (
  value: number,
  min: number = CHART_MIN_HEIGHT,
  max: number = CHART_MAX_HEIGHT,
): number => {
  if (!Number.isFinite(value)) return min;
  const lo = Math.max(CHART_MIN_HEIGHT, Math.min(min, max));
  const hi = Math.min(CHART_MAX_HEIGHT, Math.max(min, max));
  return Math.round(Math.min(hi, Math.max(lo, value)));
};

/** Height bounded to the viewport so a chart can never overflow the screen. */
export const responsiveChartHeight = (
  value: number,
  viewportHeight: number,
  min: number = CHART_MIN_HEIGHT,
): number => {
  const roomy = Math.max(min, Math.round(viewportHeight * 0.8));
  return clampChartHeight(value, min, roomy);
};

export const stepChartHeight = (
  value: number,
  direction: 1 | -1,
  min: number = CHART_MIN_HEIGHT,
  max: number = CHART_MAX_HEIGHT,
): number => clampChartHeight(value + direction * CHART_STEP, min, max);

export const chartHeightKey = (id: string) => `${KEY_PREFIX}${id}`;

export const readChartHeight = (id: string, fallback: number): number => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(chartHeightKey(id));
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? clampChartHeight(parsed) : fallback;
  } catch {
    return fallback;
  }
};

export const writeChartHeight = (id: string, value: number): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(chartHeightKey(id), String(clampChartHeight(value)));
  } catch {
    /* storage disabled — the size simply resets next visit */
  }
};

export const clearChartHeight = (id: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chartHeightKey(id));
  } catch {
    /* ignore */
  }
};
