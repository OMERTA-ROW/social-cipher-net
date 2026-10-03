/** Fictional exploration sensors only. No physics imports or mutable world access. */
export type Position = Readonly<{ x: number; y: number; z: number }>;
export type Anomaly = Readonly<{ id: string; center: Position; radius: number }>;

export const DARK_MATTER_DEFAULT_ENABLED = false;
export const DARK_MATTER_TOOLTIP = "Dark matter is invisible; this is a fictional sensor visualization for exploration.";
export const DARK_MATTER_LABEL = "Dark Matter Field visualization — fictional";
export const MAX_SENSOR_NOISE_PERCENT = 3;
export const SCAN_DURATION_MS = 4000;

/** Scale zones from the existing outer orbital envelope; never alter that envelope. */
export function createAnomalies(outerEnvelope: number): readonly Anomaly[] {
  if (!Number.isFinite(outerEnvelope) || outerEnvelope <= 0) throw new Error("A positive orbital envelope is required");
  return Object.freeze([
    Object.freeze({ id: "DM-01", center: Object.freeze({ x: outerEnvelope * 2.8, y: outerEnvelope * 1.3, z: -outerEnvelope * 2.4 }), radius: outerEnvelope * 0.12 }),
    Object.freeze({ id: "DM-02", center: Object.freeze({ x: -outerEnvelope * 3.7, y: -outerEnvelope * 1.7, z: outerEnvelope * 2.9 }), radius: outerEnvelope * 0.16 }),
  ]);
}

export function readFieldSensors(enabled: boolean, ship: Position | null, anomalies: readonly Anomaly[]) {
  const clear = { enabled, density: "Low" as "Low" | "Moderate" | "High", anomalyId: null as string | null, distance: null as number | null, sensorNoisePercent: 0, signalQualityPercent: 100, inside: false };
  if (!enabled || !ship || ![ship.x, ship.y, ship.z].every(Number.isFinite)) return clear;

  let nearest: Anomaly | undefined;
  let nearestSurface = Infinity;
  let centerDistance = Infinity;
  for (const zone of anomalies) {
    if (!(zone.radius > 0) || !Number.isFinite(zone.radius)) continue;
    const distance = Math.hypot(ship.x - zone.center.x, ship.y - zone.center.y, ship.z - zone.center.z);
    const surface = Math.max(0, distance - zone.radius);
    if (surface < nearestSurface) {
      nearest = zone;
      nearestSurface = surface;
      centerDistance = distance;
    }
  }
  if (!nearest || !Number.isFinite(nearestSurface)) return clear;

  const fraction = Math.max(0, Math.min(1, 1 - centerDistance / nearest.radius));
  const sensorNoisePercent = MAX_SENSOR_NOISE_PERCENT * fraction * fraction * (3 - 2 * fraction);
  return {
    enabled,
    density: (fraction > 0.66 ? "High" : fraction > 0 ? "Moderate" : "Low") as "Low" | "Moderate" | "High",
    anomalyId: nearest.id,
    distance: nearestSurface,
    sensorNoisePercent,
    signalQualityPercent: 100 - sensorNoisePercent,
    inside: centerDistance <= nearest.radius,
  };
}

/** Single user-triggered scan, never a loop. Reduced motion uses a static reveal. */
export function scanOpacity(enabled: boolean, startMs: number | null, nowMs: number, reducedMotion: boolean): number {
  if (!enabled || startMs === null || !Number.isFinite(startMs) || !Number.isFinite(nowMs)) return 0;
  const elapsed = nowMs - startMs;
  if (elapsed < 0 || elapsed >= SCAN_DURATION_MS) return 0;
  if (reducedMotion) return 0.04;
  return 0.04 * Math.min(1, elapsed / 250) * Math.min(1, (SCAN_DURATION_MS - elapsed) / 1000);
}