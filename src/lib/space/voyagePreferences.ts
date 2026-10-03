import { CELESTIAL_BODIES } from "@/lib/space/voyagePhysics";
import type { FollowMode, QualityTier, TimeScale } from "@/components/space/voyage/VoyageScene";

export type QualityPref = "auto" | QualityTier;
export interface VoyagePreferences { quality: QualityPref; labels: boolean; guides: boolean; velocity: boolean; follow: FollowMode; thrustScale: number; timeScale: TimeScale; selected: string }
export const VOYAGE_PREFS_KEY = "voyage.sim.preferences.v3";
const DEFAULTS: VoyagePreferences = { quality: "auto", labels: true, guides: true, velocity: true, follow: "selected", thrustScale: 1, timeScale: 1, selected: "earth" };
/** Safe parsing: every field is validated independently; corrupt storage falls back to defaults. */
export function parseVoyagePreferences(raw: string | null): VoyagePreferences {
  let v: Record<string, unknown> = {}; try { const parsed = JSON.parse(raw ?? "{}"); if (parsed && typeof parsed === "object") v = parsed; } catch { /* corrupt */ }
  const bool = (k: keyof VoyagePreferences) => (typeof v[k] === "boolean" ? (v[k] as boolean) : (DEFAULTS[k] as boolean));
  return {
    quality: ["auto", "low", "medium", "high"].includes(v.quality as string) ? (v.quality as QualityPref) : DEFAULTS.quality,
    labels: bool("labels"), guides: bool("guides"), velocity: bool("velocity"),
    follow: v.follow === "ship" || v.follow === "selected" ? v.follow : DEFAULTS.follow,
    thrustScale: typeof v.thrustScale === "number" && Number.isFinite(v.thrustScale) ? Math.min(1, Math.max(0.25, v.thrustScale)) : DEFAULTS.thrustScale,
    timeScale: [1, 10, 100].includes(v.timeScale as number) ? (v.timeScale as TimeScale) : DEFAULTS.timeScale,
    selected: CELESTIAL_BODIES.some(b => b.id === v.selected) ? (v.selected as string) : DEFAULTS.selected,
  };
}
export const supportsWebGL = () => { try { const c = document.createElement("canvas"); return Boolean(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
/** Keys are ignored while typing or when Space/Enter would activate a focused control. */
export function shouldIgnoreKey(target: EventTarget | null, code: string) {
  const el = target as HTMLElement | null; if (!el || !el.tagName) return false;
  if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  const role = el.getAttribute?.("role"); if (role && ["combobox", "listbox", "option", "menuitem", "slider", "switch", "textbox"].includes(role)) return true;
  if ((code === "Space" || code === "Enter") && (el.tagName === "BUTTON" || el.tagName === "A" || role === "button")) return true;
  return false;
}
