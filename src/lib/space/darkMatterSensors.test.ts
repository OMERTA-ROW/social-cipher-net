import { describe, expect, it } from "vitest";
import {
  DARK_MATTER_DEFAULT_ENABLED,
  MAX_SENSOR_NOISE_PERCENT,
  SCAN_DURATION_MS,
  createAnomalies,
  readFieldSensors,
  scanOpacity,
} from "./darkMatterSensors";

describe("fictional dark matter sensor policy", () => {
  it("starts disabled and reports no anomaly data or noise", () => {
    const reading = readFieldSensors(DARK_MATTER_DEFAULT_ENABLED, { x: 1, y: 2, z: 3 }, createAnomalies(100));
    expect(reading).toMatchObject({ enabled: false, distance: null, sensorNoisePercent: 0, signalQualityPercent: 100 });
  });

  it("places immutable zones beyond the supplied orbital envelope", () => {
    const zones = createAnomalies(100);
    expect(Object.isFrozen(zones)).toBe(true);
    expect(zones.every(zone => Math.hypot(zone.center.x, zone.center.y, zone.center.z) - zone.radius > 100)).toBe(true);
    expect(zones.every(zone => Object.isFrozen(zone) && Object.isFrozen(zone.center))).toBe(true);
  });

  it("caps fictional noise at three percent without mutating ship position", () => {
    const zones = createAnomalies(100);
    const ship = { ...zones[0].center };
    const before = { ...ship };
    const reading = readFieldSensors(true, ship, zones);
    expect(reading.inside).toBe(true);
    expect(reading.sensorNoisePercent).toBe(MAX_SENSOR_NOISE_PERCENT);
    expect(reading.signalQualityPercent).toBe(97);
    expect(ship).toEqual(before);
  });

  it("expires scans at four seconds and keeps reduced motion static", () => {
    expect(scanOpacity(true, 1000, 1000, false)).toBe(0);
    expect(scanOpacity(true, 1000, 2000, false)).toBeCloseTo(0.04);
    expect(scanOpacity(true, 1000, 2000, true)).toBe(0.04);
    expect(scanOpacity(true, 1000, 1000 + SCAN_DURATION_MS, false)).toBe(0);
    expect(scanOpacity(false, 1000, 2000, false)).toBe(0);
  });
});