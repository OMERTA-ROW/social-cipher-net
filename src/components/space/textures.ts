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

/* --------------------------------------------------- High-fidelity surfaces */

/** Grayscale height/bump map derived from a colour surface (luminance + contrast). */
const deriveBump = (source: HTMLCanvasElement, strength = 1.6): THREE.CanvasTexture => {
  const w = source.width;
  const h = source.height;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, 128 + (l - 128) * strength));
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

export interface PlanetSurface {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

/**
 * Detailed surface map: multi-octave value noise warped into continents /
 * cloud bands, craters for airless worlds, plus a matching bump map.
 */
export const makePlanetSurface = ({
  colors,
  banded = false,
  seed = 1,
  speckle,
  craters = false,
  size = 1024,
}: PlanetTextureOptions & { craters?: boolean }): PlanetSurface => {
  const w = size;
  const h = size / 2;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (banded) {
    // turbulent latitude bands with sheared eddies
    ctx.globalCompositeOperation = "overlay";
    const bands = 46;
    for (let i = 0; i < bands; i++) {
      const y = (i / bands) * h + (rand() - 0.5) * 4;
      const bh = (h / bands) * (0.7 + rand() * 1.9);
      ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,248,232" : "40,26,14"},${0.05 + rand() * 0.18})`;
      ctx.fillRect(0, y, w, bh);
    }
    for (let i = 0; i < 260; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const rx = 8 + rand() * (w / 14);
      const ry = rx * (0.12 + rand() * 0.25);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      const light = rand() > 0.5;
      g.addColorStop(0, `rgba(${light ? "255,250,235" : "35,22,12"},${0.06 + rand() * 0.14})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (rand() - 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // great storm
    ctx.globalCompositeOperation = "source-over";
    const sx = rand() * w;
    const sy = h * (0.36 + rand() * 0.28);
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, h * 0.18);
    g.addColorStop(0, "rgba(232,146,98,0.9)");
    g.addColorStop(0.6, "rgba(198,110,70,0.45)");
    g.addColorStop(1, "rgba(198,110,70,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, h * 0.24, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // multi-octave blobs → continents / maria
    ctx.globalCompositeOperation = "overlay";
    for (let octave = 0; octave < 4; octave++) {
      const count = 120 * (octave + 1);
      const scale = w / (8 + octave * 12);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = scale * (0.4 + rand());
        const dark = rand() > 0.48;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${dark ? "8,14,26" : "236,240,232"},${0.05 + rand() * 0.16})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (craters) {
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 130; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 3 + rand() * (w / 55);
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,0.16)");
        g.addColorStop(0.55, "rgba(0,0,0,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0.05)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalCompositeOperation = "source-over";
  if (speckle) {
    const cap = ctx.createLinearGradient(0, 0, 0, h * 0.13);
    cap.addColorStop(0, speckle);
    cap.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cap;
    ctx.fillRect(0, 0, w, h * 0.13);
    const cap2 = ctx.createLinearGradient(0, h, 0, h * 0.87);
    cap2.addColorStop(0, speckle);
    cap2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cap2;
    ctx.fillRect(0, h * 0.87, w, h * 0.13);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = 4;

  return { map, bump: deriveBump(canvas, banded ? 1.1 : 1.9) };
};

/** Transparent cloud shell texture (Earth, Venus). */
export const makeCloudTexture = (
  seed = 5,
  size = 512,
  color = "255,255,255",
  coverage = 0.55,
): THREE.CanvasTexture => {
  const w = size;
  const h = size / 2;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);
  ctx.clearRect(0, 0, w, h);
  const puffs = Math.floor(420 * coverage * 2);
  for (let i = 0; i < puffs; i++) {
    const lat = rand();
    // cluster clouds into latitude belts
    const y = h * lat;
    const belt = Math.abs(Math.sin(lat * Math.PI * 3));
    if (rand() > coverage * (0.45 + belt * 0.9)) continue;
    const x = rand() * w;
    const r = 4 + rand() * (w / 26);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${0.22 + rand() * 0.5})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1 + rand()), r * (0.4 + rand() * 0.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

/** Radial ring texture (Saturn): banded colour with gaps in the alpha channel. */
export const makeRingTexture = (seed = 9, size = 512): THREE.CanvasTexture => {
  const canvas = makeCanvas(size, 8);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);
  ctx.clearRect(0, 0, size, 8);
  for (let x = 0; x < size; x++) {
    const u = x / size;
    // Cassini-style gaps
    const gap =
      Math.abs(u - 0.42) < 0.022 || Math.abs(u - 0.63) < 0.012 || u < 0.04 || u > 0.985 ? 0 : 1;
    const fine = 0.55 + 0.45 * Math.sin(u * 160 + rand() * 0.4) * Math.sin(u * 37);
    const a = gap * (0.18 + 0.62 * Math.max(0, fine)) * (1 - Math.pow(Math.abs(u - 0.5) * 2, 3) * 0.4);
    const l = 175 + Math.floor(fine * 60);
    ctx.fillStyle = `rgba(${l},${l - 18},${l - 52},${a.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};

/* ------------------------------------------------- Deep-field star sky */

/**
 * Equirectangular deep-sky map: a dense, colour-varied star field with a
 * realistic Milky Way galactic band (dust lanes, bulge, faint nebulosity).
 * Mapped onto the inside of a large sphere so it reads as real sky, not dots.
 */
export const makeStarSkyTexture = (size = 4096, seed = 101): THREE.CanvasTexture => {
  const w = size;
  const h = size / 2;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry(seed);

  ctx.fillStyle = "#03040a";
  ctx.fillRect(0, 0, w, h);

  // --- galactic band: a great circle traced across the equirect projection
  const bandY = (x: number) => h * 0.5 + Math.sin((x / w) * Math.PI * 2 + 0.6) * h * 0.26;

  ctx.globalCompositeOperation = "lighter";
  // diffuse glow of the band
  for (let i = 0; i < 2600; i++) {
    const x = rand() * w;
    const cy = bandY(x);
    const spread = h * (0.035 + rand() * 0.1);
    const y = cy + (rand() + rand() + rand() - 1.5) * spread;
    const r = h * (0.01 + rand() * 0.07);
    const bulge = 1 - Math.min(1, Math.abs(((x / w) - 0.28) * 3));
    const warm = rand() < 0.35 + bulge * 0.4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = (0.012 + rand() * 0.05) * (0.5 + bulge);
    g.addColorStop(0, warm ? `rgba(255,226,182,${a})` : `rgba(168,192,255,${a * 0.9})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.4 + rand()), r * (0.5 + rand() * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // faint coloured nebulosity inside the band
  for (let i = 0; i < 140; i++) {
    const x = rand() * w;
    const y = bandY(x) + (rand() - 0.5) * h * 0.16;
    const r = h * (0.02 + rand() * 0.06);
    const hue = rand() < 0.5 ? 200 + rand() * 40 : 340 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue % 360},70%,60%,${0.03 + rand() * 0.05})`);
    g.addColorStop(1, "hsla(0,0%,0%,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- dark dust lanes cutting through the band
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 420; i++) {
    const x = rand() * w;
    const y = bandY(x) + (rand() - 0.5) * h * 0.08;
    const r = h * (0.006 + rand() * 0.045);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(3,4,10,${0.25 + rand() * 0.5})`);
    g.addColorStop(1, "rgba(3,4,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.8 + rand() * 2), r * (0.3 + rand() * 0.4), (rand() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- stars: realistic magnitude distribution + spectral colours
  ctx.globalCompositeOperation = "lighter";
  const STAR_COLORS = [
    [155, 176, 255], // O/B blue
    [202, 215, 255],
    [248, 247, 255], // A/F white
    [255, 244, 234],
    [255, 210, 161], // K orange
    [255, 170, 120], // M red
  ];
  const total = Math.floor((w * h) / 210);
  for (let i = 0; i < total; i++) {
    let x = rand() * w;
    let y = rand() * h;
    // concentrate ~55% of stars toward the galactic band
    if (rand() < 0.55) {
      x = rand() * w;
      y = bandY(x) + (rand() + rand() + rand() - 1.5) * h * 0.14;
      if (y < 0 || y > h) continue;
    }
    const mag = Math.pow(rand(), 6); // few bright, many faint
    const r = 0.35 + mag * 2.6;
    const c = STAR_COLORS[Math.floor(Math.pow(rand(), 1.6) * STAR_COLORS.length) % STAR_COLORS.length];
    const a = 0.25 + mag * 0.75;
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (mag > 0.35) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.22 * mag})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 7, 0, Math.PI * 2);
      ctx.fill();
      // subtle diffraction spikes on the brightest stars
      if (mag > 0.72) {
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * mag})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - r * 6, y);
        ctx.lineTo(x + r * 6, y);
        ctx.moveTo(x, y - r * 6);
        ctx.lineTo(x, y + r * 6);
        ctx.stroke();
      }
    }
  }

  ctx.globalCompositeOperation = "source-over";
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

/** Irregular, cratered rock body for asteroid instancing variants. */
export const makeRockGeometry = (seed = 1, detail = 1): THREE.BufferGeometry => {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const rand = mulberry(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const offs = Array.from({ length: 9 }, () => ({
    n: new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(),
    amp: 0.12 + rand() * 0.35,
    sharp: 1.5 + rand() * 4,
  }));
  const seen = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(4)}|${v.y.toFixed(4)}|${v.z.toFixed(4)}`;
    let scale = seen.get(key);
    if (scale === undefined) {
      scale = 1;
      for (const o of offs) {
        const d = Math.max(0, v.dot(o.n));
        scale -= Math.pow(d, o.sharp) * o.amp;
      }
      scale *= 0.85 + rand() * 0.3;
      seen.set(key, scale);
    }
    v.multiplyScalar(scale);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
};
