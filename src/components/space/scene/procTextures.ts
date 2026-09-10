import * as THREE from "three";

/**
 * Canvas-generated PBR maps for the mining vessel and its crew.
 * Everything is produced in code at runtime — no image files, no CDN calls —
 * so the ship and aliens carry real surface detail, roughness variation and
 * normal relief instead of flat shaded colour.
 */

const makeCanvas = (size: number) => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
};

const finish = (canvas: HTMLCanvasElement, srgb: boolean, repeat = 1) => {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
};

const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Height map -> tangent-space normal map. */
const heightToNormal = (src: HTMLCanvasElement, strength: number) => {
  const size = src.width;
  const sctx = src.getContext("2d")!;
  const data = sctx.getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(size, size);
  const h = (x: number, y: number) => {
    const xi = (x + size) % size;
    const yi = (y + size) % size;
    return data[(yi * size + xi) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
};

export interface SurfaceMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

/** Worn industrial hull plating: panel seams, rivets, scorch and grime. */
const hullCanvases = (seed: number) => {
  const size = 512;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const c = colour.getContext("2d")!;
  const hc = height.getContext("2d")!;
  const rc = rough.getContext("2d")!;
  const rnd = rand(seed);

  c.fillStyle = "#6e747c";
  c.fillRect(0, 0, size, size);
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  rc.fillStyle = "#8a8a8a";
  rc.fillRect(0, 0, size, size);

  // panels
  for (let i = 0; i < 90; i++) {
    const w = 24 + rnd() * 120;
    const h = 20 + rnd() * 90;
    const x = rnd() * size;
    const y = rnd() * size;
    const v = 0.72 + rnd() * 0.36;
    c.fillStyle = `rgba(${110 * v},${118 * v},${126 * v},0.75)`;
    c.fillRect(x, y, w, h);
    hc.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.08})`;
    hc.fillRect(x, y, w, h);
    rc.fillStyle = `rgba(255,255,255,${rnd() * 0.35})`;
    rc.fillRect(x, y, w, h);
    // seam
    hc.strokeStyle = "rgba(0,0,0,0.85)";
    hc.lineWidth = 2;
    hc.strokeRect(x, y, w, h);
    c.strokeStyle = "rgba(24,26,30,0.65)";
    c.lineWidth = 1.5;
    c.strokeRect(x, y, w, h);
  }

  // rivets
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    hc.fillStyle = "rgba(255,255,255,0.55)";
    hc.beginPath();
    hc.arc(x, y, 1.4, 0, Math.PI * 2);
    hc.fill();
    c.fillStyle = "rgba(40,44,50,0.35)";
    c.beginPath();
    c.arc(x, y, 1.6, 0, Math.PI * 2);
    c.fill();
  }

  // grime, oxidation and scorch marks
  for (let i = 0; i < 160; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 6 + rnd() * 60;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.6;
    g.addColorStop(0, warm ? "rgba(92,54,28,0.30)" : "rgba(18,20,24,0.30)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    rc.fillStyle = "rgba(255,255,255,0.10)";
    rc.beginPath();
    rc.arc(x, y, r, 0, Math.PI * 2);
    rc.fill();
  }

  return { colour, height, rough };
};

/** Reptilian scale skin for the Draco. */
const scaleCanvases = (seed: number, base: [number, number, number]) => {
  const size = 512;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const c = colour.getContext("2d")!;
  const hc = height.getContext("2d")!;
  const rc = rough.getContext("2d")!;
  const rnd = rand(seed);

  c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  c.fillRect(0, 0, size, size);
  hc.fillStyle = "#606060";
  hc.fillRect(0, 0, size, size);
  rc.fillStyle = "#b0b0b0";
  rc.fillRect(0, 0, size, size);

  const step = 13;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const ox = (y / step) % 2 === 0 ? 0 : step / 2;
      const px = x + ox;
      const v = 0.75 + rnd() * 0.5;
      c.fillStyle = `rgba(${base[0] * v},${base[1] * v},${base[2] * v},0.9)`;
      c.beginPath();
      c.ellipse(px, y, step * 0.52, step * 0.42, 0, 0, Math.PI * 2);
      c.fill();
      const g = hc.createRadialGradient(px, y - 1, 0, px, y, step * 0.6);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0.55)");
      hc.fillStyle = g;
      hc.beginPath();
      hc.ellipse(px, y, step * 0.52, step * 0.42, 0, 0, Math.PI * 2);
      hc.fill();
      rc.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.35})`;
      rc.beginPath();
      rc.ellipse(px, y, step * 0.5, step * 0.4, 0, 0, Math.PI * 2);
      rc.fill();
    }
  }
  return { colour, height, rough };
};

/** Smooth, slightly translucent-looking Grey skin with fine pores. */
const skinCanvases = (seed: number, base: [number, number, number]) => {
  const size = 512;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const c = colour.getContext("2d")!;
  const hc = height.getContext("2d")!;
  const rc = rough.getContext("2d")!;
  const rnd = rand(seed);

  c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  c.fillRect(0, 0, size, size);
  hc.fillStyle = "#7a7a7a";
  hc.fillRect(0, 0, size, size);
  rc.fillStyle = "#6e6e6e";
  rc.fillRect(0, 0, size, size);

  for (let i = 0; i < 9000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.6 + rnd() * 1.5;
    hc.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`;
    hc.beginPath();
    hc.arc(x, y, r, 0, Math.PI * 2);
    hc.fill();
    c.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  // subtle mottling
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 18 + rnd() * 60;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,140,150,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  return { colour, height, rough };
};

/** Cratered regolith for mined asteroids and planet surfaces. */
const rockCanvases = (seed: number, base: [number, number, number]) => {
  const size = 512;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const c = colour.getContext("2d")!;
  const hc = height.getContext("2d")!;
  const rc = rough.getContext("2d")!;
  const rnd = rand(seed);

  c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  c.fillRect(0, 0, size, size);
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  rc.fillStyle = "#d8d8d8";
  rc.fillRect(0, 0, size, size);

  for (let i = 0; i < 5000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.8 + rnd() * 5;
    const v = 0.6 + rnd() * 0.8;
    c.fillStyle = `rgba(${base[0] * v},${base[1] * v},${base[2] * v},0.5)`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    hc.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},255,0.10)`;
    hc.beginPath();
    hc.arc(x, y, r, 0, Math.PI * 2);
    hc.fill();
  }
  // craters
  for (let i = 0; i < 120; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 4 + rnd() * 30;
    const g = hc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0.7)");
    g.addColorStop(0.75, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(255,255,255,0.35)");
    hc.fillStyle = g;
    hc.beginPath();
    hc.arc(x, y, r, 0, Math.PI * 2);
    hc.fill();
  }
  return { colour, height, rough };
};

const build = (
  parts: { colour: HTMLCanvasElement; height: HTMLCanvasElement; rough: HTMLCanvasElement },
  normalStrength: number,
  repeat: number,
): SurfaceMaps => ({
  map: finish(parts.colour, true, repeat),
  normalMap: finish(heightToNormal(parts.height, normalStrength), false, repeat),
  roughnessMap: finish(parts.rough, false, repeat),
});

/** Cached so switching background views never rebuilds the same maps. */
const cache = new Map<string, SurfaceMaps>();

const cached = (key: string, make: () => SurfaceMaps) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = make();
  cache.set(key, made);
  return made;
};

export const hullMaps = () => cached("hull", () => build(hullCanvases(17), 5.5, 2));
export const plateMaps = () => cached("plate", () => build(hullCanvases(91), 4.5, 1));
export const dracoSkinMaps = () =>
  cached("draco", () => build(scaleCanvases(5, [58, 92, 52]), 3.2, 2));
export const greySkinMaps = () =>
  cached("grey", () => build(skinCanvases(23, [176, 182, 188]), 1.6, 1));
export const rockMaps = () => cached("rock", () => build(rockCanvases(41, [104, 96, 88]), 6.0, 1));
export const oreMaps = () => cached("ore", () => build(rockCanvases(77, [72, 84, 96]), 6.0, 1));
