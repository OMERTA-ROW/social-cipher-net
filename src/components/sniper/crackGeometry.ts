// Deterministic radial glass-crack geometry generated from a hit seed.

const rng = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export interface CrackWeb {
  spokes: string[];
  webs: string[];
  shards: string[];
}

/** Builds crack paths in a 0-100 viewBox space around an impact point. */
export const buildCrackWeb = (
  seed: number,
  cx: number,
  cy: number,
  scale = 1,
): CrackWeb => {
  const rand = rng(seed || 1);
  const spokeCount = 9 + Math.floor(rand() * 5);
  const spokes: string[] = [];
  const webs: string[] = [];
  const shards: string[] = [];
  const tips: Array<{ x: number; y: number; a: number }> = [];

  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2 + rand() * 0.35;
    const length = (14 + rand() * 26) * scale;
    let x = cx;
    let y = cy;
    let a = angle;
    let d = `M ${cx} ${cy}`;
    const segments = 3 + Math.floor(rand() * 3);
    for (let s = 0; s < segments; s++) {
      a += (rand() - 0.5) * 0.5;
      const step = length / segments;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      if (s === segments - 2) tips.push({ x, y, a });
    }
    spokes.push(d);
    tips.push({ x, y, a });

    // splinter branches
    if (rand() > 0.45) {
      const bx = x - Math.cos(a) * length * 0.4;
      const by = y - Math.sin(a) * length * 0.4;
      const ba = a + (rand() - 0.5) * 1.6;
      const bl = length * (0.25 + rand() * 0.4);
      shards.push(
        `M ${bx.toFixed(2)} ${by.toFixed(2)} L ${(bx + Math.cos(ba) * bl).toFixed(2)} ${(
          by + Math.sin(ba) * bl
        ).toFixed(2)}`,
      );
    }
  }

  // concentric webbing joining neighbouring spokes
  const ringCount = 2 + Math.floor(rand() * 2);
  for (let r = 1; r <= ringCount; r++) {
    const t = r / (ringCount + 0.6);
    let d = "";
    for (let i = 0; i < spokeCount; i++) {
      const tip = tips[i * 2] ?? tips[i];
      if (!tip) continue;
      const px = cx + (tip.x - cx) * t + (rand() - 0.5) * 1.6;
      const py = cy + (tip.y - cy) * t + (rand() - 0.5) * 1.6;
      d += `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)} `;
    }
    if (d) webs.push(`${d}Z`);
  }

  return { spokes, webs, shards };
};
