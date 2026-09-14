import { describe, expect, it } from "vitest";
import {
  CHART_MAX_HEIGHT,
  CHART_MIN_HEIGHT,
  CHART_STEP,
  clampChartHeight,
  responsiveChartHeight,
  stepChartHeight,
} from "@/lib/chartSize";

describe("chart sizing", () => {
  it("keeps a height inside the global bounds", () => {
    expect(clampChartHeight(10)).toBe(CHART_MIN_HEIGHT);
    expect(clampChartHeight(99_999)).toBe(CHART_MAX_HEIGHT);
    expect(clampChartHeight(420)).toBe(420);
  });

  it("respects a per-chart minimum and maximum", () => {
    expect(clampChartHeight(200, 240, 600)).toBe(240);
    expect(clampChartHeight(900, 240, 600)).toBe(600);
  });

  it("never returns NaN for broken input", () => {
    expect(clampChartHeight(Number.NaN)).toBe(CHART_MIN_HEIGHT);
  });

  it("steps up and down by one increment and stops at the bounds", () => {
    expect(stepChartHeight(300, 1)).toBe(300 + CHART_STEP);
    expect(stepChartHeight(300, -1)).toBe(300 - CHART_STEP);
    expect(stepChartHeight(CHART_MIN_HEIGHT, -1)).toBe(CHART_MIN_HEIGHT);
    expect(stepChartHeight(CHART_MAX_HEIGHT, 1)).toBe(CHART_MAX_HEIGHT);
  });

  it("bounds the height to the viewport so a chart cannot overflow", () => {
    expect(responsiveChartHeight(900, 600)).toBe(480);
    // A short mobile viewport still gets a usable chart.
    expect(responsiveChartHeight(900, 300)).toBe(240);
    expect(responsiveChartHeight(240, 1200)).toBe(240);
  });
});
