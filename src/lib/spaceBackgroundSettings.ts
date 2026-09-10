import { useSyncExternalStore } from "react";

export type SpaceBgMode = "full" | "lite" | "off";
/** solar = realistic solar system (default), mining = alien world mining run */
export type SpaceBgView = "solar" | "mining";

export interface SpaceBgSettings {
  /** full = 3D solar system, lite = cheap starfield, off = static gradient only */
  mode: SpaceBgMode;
  /** which scene the background renders */
  view: SpaceBgView;
  /** 0 = background at full brightness, 1 = fully dimmed to flat colour */
  dim: number;
}

const STORAGE_KEY = "cyberlink.space-bg";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** Rough capability probe for phones / integrated GPUs / low-memory devices. */
export const isLowPowerDevice = () => {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const smallScreen = window.matchMedia("(max-width: 900px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMem = (nav.deviceMemory ?? 8) <= 4;
  return (smallScreen && coarse) || fewCores || lowMem;
};

const defaults = (): SpaceBgSettings => ({
  mode: prefersReducedMotion() ? "off" : isLowPowerDevice() ? "lite" : "full",
  view: "solar",
  dim: 0.12,
});

let state: SpaceBgSettings = (() => {
  if (typeof window === "undefined") return { mode: "off", view: "solar", dim: 0.35 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<SpaceBgSettings>;
    const base = defaults();
    return {
      mode: (["full", "lite", "off"] as const).includes(parsed.mode as SpaceBgMode)
        ? (parsed.mode as SpaceBgMode)
        : base.mode,
      view: parsed.view === "mining" ? "mining" : "solar",
      dim: typeof parsed.dim === "number" ? Math.min(1, Math.max(0, parsed.dim)) : base.dim,
    };
  } catch {
    return defaults();
  }
})();

const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const setSpaceBgSettings = (patch: Partial<SpaceBgSettings>) => {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable */
  }
  emit();
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = () => state;

export const useSpaceBgSettings = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
