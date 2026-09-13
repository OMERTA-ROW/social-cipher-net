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

/* ------------------------------------------------------------------ *
 * High-fidelity hull plating for the vessel.
 *
 * Unlike the generic worn-hull maps above this one lays out a regular
 * panel grid with welded seams, rivet lines that follow the seams,
 * gravity-aligned grime streaks, scuffed plate edges and a separate
 * metalness map, so the ship reads as machined metal under real lighting
 * rather than a noisy grey blob.
 * ------------------------------------------------------------------ */

export interface HullSurfaceMaps extends SurfaceMaps {
  metalnessMap: THREE.Texture;
}

const shipHullCanvases = (seed: number, tint: [number, number, number], gridPx: number) => {
  const size = 1024;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const rough = makeCanvas(size);
  const metal = makeCanvas(size);
  const c = colour.getContext("2d")!;
  const hc = height.getContext("2d")!;
  const rc = rough.getContext("2d")!;
  const mc = metal.getContext("2d")!;
  const rnd = rand(seed);
  const shade = (v: number, a = 1) =>
    `rgba(${Math.round(tint[0] * v)},${Math.round(tint[1] * v)},${Math.round(tint[2] * v)},${a})`;

  c.fillStyle = shade(1);
  c.fillRect(0, 0, size, size);
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, size, size);
  rc.fillStyle = "#6f6f6f"; // fairly polished base
  rc.fillRect(0, 0, size, size);
  mc.fillStyle = "#e6e6e6"; // metal nearly everywhere
  mc.fillRect(0, 0, size, size);

  // --- fine machining grain, so flat areas never look like plastic ---
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const v = 0.9 + rnd() * 0.2;
    c.fillStyle = shade(v, 0.16);
    c.fillRect(x, y, 1.4, 1);
    rc.fillStyle = `rgba(255,255,255,${rnd() * 0.10})`;
    rc.fillRect(x, y, 1.4, 1);
  }

  // --- panel grid: each cell is a plate with its own tone and finish ---
  const cells = Math.max(2, Math.round(size / gridPx));
  const step = size / cells;
  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      // merge some neighbours into wider plates
      const wide = rnd() > 0.78 ? 2 : 1;
      const tall = rnd() > 0.86 ? 2 : 1;
      const x = gx * step;
      const y = gy * step;
      const w = step * wide;
      const h = step * tall;
      const v = 0.88 + rnd() * 0.26;
      c.fillStyle = shade(v, 0.5);
      c.fillRect(x, y, w, h);
      // plates sit at slightly different depths
      hc.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.06})`;
      hc.fillRect(x, y, w, h);
      // and take polish differently
      rc.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},255,${0.05 + rnd() * 0.18})`;
      rc.fillRect(x, y, w, h);

      // recessed seam
      hc.strokeStyle = "rgba(0,0,0,0.9)";
      hc.lineWidth = 3;
      hc.strokeRect(x, y, w, h);
      c.strokeStyle = "rgba(16,18,22,0.55)";
      c.lineWidth = 1.5;
      c.strokeRect(x, y, w, h);
      // weld bead just inside the seam
      hc.strokeStyle = "rgba(255,255,255,0.35)";
      hc.lineWidth = 1.5;
      hc.strokeRect(x + 2.5, y + 2.5, Math.max(1, w - 5), Math.max(1, h - 5));
      rc.strokeStyle = "rgba(255,255,255,0.4)";
      rc.lineWidth = 3;
      rc.strokeRect(x, y, w, h);

      // rivets marching along the seam
      const pitch = 22;
      for (let p = pitch / 2; p < w; p += pitch) {
        for (const ry of [y + 5, y + h - 5]) {
          hc.fillStyle = "rgba(255,255,255,0.7)";
          hc.beginPath();
          hc.arc(x + p, ry, 1.7, 0, Math.PI * 2);
          hc.fill();
          c.fillStyle = "rgba(30,33,38,0.35)";
          c.beginPath();
          c.arc(x + p, ry, 1.9, 0, Math.PI * 2);
          c.fill();
        }
      }
      for (let p = pitch / 2; p < h; p += pitch) {
        for (const rx of [x + 5, x + w - 5]) {
          hc.fillStyle = "rgba(255,255,255,0.7)";
          hc.beginPath();
          hc.arc(rx, y + p, 1.7, 0, Math.PI * 2);
          hc.fill();
        }
      }

      // scuffed, bare-metal plate edges
      if (rnd() > 0.6) {
        c.strokeStyle = "rgba(214,220,228,0.30)";
        c.lineWidth = 1;
        c.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        rc.strokeStyle = "rgba(0,0,0,0.35)";
        rc.lineWidth = 2;
        rc.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
      }

      // occasional vent / hatch greeble drawn into the maps
      if (rnd() > 0.9) {
        const vw = w * 0.5;
        const vh = h * 0.26;
        const vx = x + (w - vw) / 2;
        const vy = y + (h - vh) / 2;
        for (let l = 0; l < 5; l++) {
          const ly = vy + (vh / 5) * l;
          hc.fillStyle = "rgba(0,0,0,0.8)";
          hc.fillRect(vx, ly, vw, 2.5);
          c.fillStyle = "rgba(18,20,24,0.6)";
          c.fillRect(vx, ly, vw, 2.5);
          mc.fillStyle = "rgba(255,255,255,0.6)";
          mc.fillRect(vx, ly, vw, 2.5);
        }
      }
    }
  }

  // --- weathering: streaks running along the hull ---
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 30 + rnd() * 260;
    const w = 1 + rnd() * 5;
    const g = c.createLinearGradient(x, y, x, y + len);
    const warm = rnd() > 0.72;
    g.addColorStop(0, warm ? "rgba(96,58,30,0.34)" : "rgba(14,16,20,0.30)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(x, y, w, len);
    rc.fillStyle = "rgba(255,255,255,0.16)";
    rc.fillRect(x, y, w, len);
    mc.fillStyle = "rgba(0,0,0,0.22)"; // dirt is not metal
    mc.fillRect(x, y, w, len);
  }

  // --- soot blooms and oxidation patches ---
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 12 + rnd() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const warm = rnd() > 0.65;
    g.addColorStop(0, warm ? "rgba(104,62,30,0.26)" : "rgba(12,14,18,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    const gr = rc.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,0.30)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    rc.fillStyle = gr;
    rc.beginPath();
    rc.arc(x, y, r, 0, Math.PI * 2);
    rc.fill();
    const gm = mc.createRadialGradient(x, y, 0, x, y, r);
    gm.addColorStop(0, "rgba(0,0,0,0.35)");
    gm.addColorStop(1, "rgba(0,0,0,0)");
    mc.fillStyle = gm;
    mc.beginPath();
    mc.arc(x, y, r, 0, Math.PI * 2);
    mc.fill();
  }

  // --- chipped paint down to bright metal ---
  for (let i = 0; i < 400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.8 + rnd() * 3.4;
    c.fillStyle = `rgba(206,214,222,${0.18 + rnd() * 0.3})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    rc.fillStyle = "rgba(0,0,0,0.45)";
    rc.beginPath();
    rc.arc(x, y, r, 0, Math.PI * 2);
    rc.fill();
    mc.fillStyle = "rgba(255,255,255,0.9)";
    mc.beginPath();
    mc.arc(x, y, r, 0, Math.PI * 2);
    mc.fill();
  }

  return { colour, height, rough, metal };
};

const buildHull = (
  seed: number,
  tint: [number, number, number],
  gridPx: number,
  normalStrength: number,
  repeat: number,
): HullSurfaceMaps => {
  const parts = shipHullCanvases(seed, tint, gridPx);
  return {
    map: finish(parts.colour, true, repeat),
    normalMap: finish(heightToNormal(parts.height, normalStrength), false, repeat),
    roughnessMap: finish(parts.rough, false, repeat),
    metalnessMap: finish(parts.metal, false, repeat),
  };
};

/** Primary hull plating. */
export const shipHullMaps = () =>
  cached("shipHull", () => buildHull(1337, [124, 132, 142], 128, 4.2, 2)) as HullSurfaceMaps;
/** Darker structural / secondary plating. */
export const shipPlateMaps = () =>
  cached("shipPlate", () => buildHull(4711, [86, 92, 100], 96, 3.6, 3)) as HullSurfaceMaps;
/** Painted hazard-orange trim, still metal underneath. */
export const shipTrimMaps = () =>
  cached("shipTrim", () => buildHull(9091, [164, 104, 42], 72, 3.2, 3)) as HullSurfaceMaps;
