import * as THREE from "three";

/** Deterministic value noise so planets look the same every reload. */
const mulberry = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export interface PlanetTextureOptions {
  /** Base colour ramp from pole/low to equator/high */
  colors: string[];
  /** Horizontal banding (gas giants) vs blotchy terrain (rocky) */
  banded?: boolean;
  seed?: number;
  /** Extra bright speckles (ice caps, clouds, city lights) */
  speckle?: string;
  size?: number;
}

/**
 * Procedural planet surface. Generated on the client (no network fetch), so the
 * scene can never hang waiting on a remote texture.
 */
export const makePlanetTexture = ({
  colors,
  banded = false,
  seed = 1,
  speckle,
  size = 512,
}: PlanetTextureOptions): THREE.CanvasTexture => {
  const w = size;
  const h = size / 2;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "overlay";
  if (banded) {
    const bands = 22 + Math.floor(rand() * 14);
    for (let i = 0; i < bands; i++) {
      const y = rand() * h;
      const bh = 2 + rand() * (h / bands) * 2.2;
      ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "0,0,0"},${0.05 + rand() * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(w / 2, y, w, bh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // storm spot
    if (rand() > 0.45) {
      ctx.globalCompositeOperation = "source-over";
      const sx = rand() * w;
      const sy = h * (0.35 + rand() * 0.3);
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, h * 0.16);
      g.addColorStop(0, "rgba(226,140,96,0.85)");
      g.addColorStop(1, "rgba(226,140,96,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, h * 0.22, h * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 2 + rand() * (w / 22);
      const dark = rand() > 0.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${dark ? "0,0,0" : "255,255,255"},${0.06 + rand() * 0.2})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = "source-over";
  if (speckle) {
    // polar caps
    const cap = ctx.createLinearGradient(0, 0, 0, h * 0.14);
    cap.addColorStop(0, speckle);
    cap.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cap;
    ctx.fillRect(0, 0, w, h * 0.14);
    const cap2 = ctx.createLinearGradient(0, h, 0, h * 0.86);
    cap2.addColorStop(0, speckle);
    cap2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cap2;
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

/** Soft radial sprite used for the sun glow, flares, comet heads and nebulae. */
export const makeGlowTexture = (
  inner = "rgba(255,255,255,1)",
  mid = "rgba(255,200,120,0.35)",
  size = 256,
): THREE.CanvasTexture => {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Wispy cloud sprite for distant nebulae and galaxy smears. */
export const makeNebulaTexture = (hue: number, seed = 3, size = 256): THREE.CanvasTexture => {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 42; i++) {
    const x = size / 2 + (rand() - 0.5) * size * 0.75;
    const y = size / 2 + (rand() - 0.5) * size * 0.65;
    const r = size * (0.06 + rand() * 0.22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const h = (hue + (rand() - 0.5) * 40 + 360) % 360;
    g.addColorStop(0, `hsla(${h}, 75%, ${45 + rand() * 25}%, ${0.05 + rand() * 0.1})`);
    g.addColorStop(1, "hsla(0,0%,0%,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};
