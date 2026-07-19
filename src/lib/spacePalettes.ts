// Shared palettes + intensity presets for RealisticSpaceBackground and Voyage
export type PaletteName = "cosmic" | "draco" | "brain" | "solar";
export type IntensityName = "calm" | "normal" | "vivid" | "hyper";

export interface Palette {
  // HSL hue values used by the canvas painter
  nebulaA: number; // main nebula hue
  nebulaB: number; // secondary nebula hue
  aurora: number;  // cursor aurora hue
  shoot: number;   // shooting-star hue
  rippleBase: number; // click ripple base hue
}

export const PALETTES: Record<PaletteName, Palette> = {
  cosmic: { nebulaA: 265, nebulaB: 195, aurora: 180, shoot: 200, rippleBase: 190 },
  draco:  { nebulaA: 12,  nebulaB: 30,  aurora: 18,  shoot: 25,  rippleBase: 10  },
  brain:  { nebulaA: 285, nebulaB: 250, aurora: 300, shoot: 280, rippleBase: 275 },
  solar:  { nebulaA: 40,  nebulaB: 20,  aurora: 45,  shoot: 50,  rippleBase: 35  },
};

export interface Intensity {
  shootRate: number;    // probability per frame of new shooting star
  clickBurst: number;   // shooting stars per click
  auroraRadius: number; // px
  auroraAlpha: number;
  dustReactRadius: number;
  rippleSpeed: number;
}

export const INTENSITIES: Record<IntensityName, Intensity> = {
  calm:   { shootRate: 0.002, clickBurst: 1, auroraRadius: 200, auroraAlpha: 0.18, dustReactRadius: 120, rippleSpeed: 2.4 },
  normal: { shootRate: 0.006, clickBurst: 3, auroraRadius: 260, auroraAlpha: 0.28, dustReactRadius: 150, rippleSpeed: 3.5 },
  vivid:  { shootRate: 0.012, clickBurst: 5, auroraRadius: 320, auroraAlpha: 0.38, dustReactRadius: 180, rippleSpeed: 4.6 },
  hyper:  { shootRate: 0.025, clickBurst: 8, auroraRadius: 400, auroraAlpha: 0.5,  dustReactRadius: 220, rippleSpeed: 6.0 },
};
